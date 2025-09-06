/**
 * 海康威视 OpenAPI 客户端
 */

const axios = require("axios");
const https = require("https");
const { HikvisionAuth } = require("./auth");
const { ApiError, AuthError, NetworkError } = require("../../utils/errors/cameraErrors");
const { Logger } = require("../../utils/logger");
const { HikvisionAPI } = require("./api");

// 创建logger实例
const logger = new Logger();

class HikvisionClient {
  /**
   * 初始化海康威视客户端
   * @param {Object} config 配置对象
   * @param {string} config.host 海康威视平台地址
   * @param {number} config.port 端口号，默认443
   * @param {string} config.protocol 协议，默认https
   * @param {string|number} config.appKey 应用密钥
   * @param {string} config.appSecret 应用秘钥
   * @param {boolean} config.debug 是否开启调试模式，默认false
   * @param {number} config.timeout 请求超时时间(ms)，默认30000
   * @param {boolean} config.rejectUnauthorized 是否验证SSL证书，默认false
   */
  constructor(config) {
    // 验证必需参数
    this.validateConfig(config);

    // 配置属性
    this.host = config.host;
    this.port = config.port || 443;
    this.protocol = config.protocol || "https";
    this.appKey = String(config.appKey); // 确保是字符串格式
    this.appSecret = config.appSecret;
    this.debug = config.debug || false;
    this.timeout = config.timeout || 30000;

    // 构建基础URL
    this.baseURL = `${this.protocol}://${this.host}:${this.port}`;

    // 初始化认证处理器
    this.auth = new HikvisionAuth(this.appKey, this.appSecret, this.debug);

    // 创建logger实例
    this.logger = new Logger(this.debug);

    // 初始化HTTP客户端
    this.initHttpClient(config);

    // 初始化API封装
    this.api = new HikvisionAPI(this);

    // 自动代理API方法，使可以直接调用client.methodName()而不是client.api.methodName()
    this.setupAPIMethodProxy();

    if (this.debug) {
      this.logger.info("海康威视SDK初始化成功", {
        baseURL: this.baseURL,
        appKey: this.appKey,
        timeout: this.timeout,
      });
    }
  }

  /**
   * 验证配置参数
   * @param {Object} config 配置对象
   */
  validateConfig(config) {
    if (!config) {
      throw new Error("配置对象不能为空");
    }

    if (!config.host) {
      throw new Error("host参数不能为空");
    }

    if (!config.appKey) {
      throw new Error("appKey参数不能为空");
    }

    if (!config.appSecret) {
      throw new Error("appSecret参数不能为空");
    }
  }

  /**
   * 初始化HTTP客户端
   * @param {Object} config 配置对象
   */
  initHttpClient(config) {
    const httpsAgent = new https.Agent({
      rejectUnauthorized: config.rejectUnauthorized || false,
      keepAlive: true,
      timeout: this.timeout,
    });

    this.httpClient = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      httpsAgent: httpsAgent,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "Hikvision-Node-SDK/1.0.0",
      },
    });

    // 添加请求拦截器
    this.httpClient.interceptors.request.use(
      (requestConfig) => {
        // 构建完整的URL（包含查询参数，用于签名）
        let fullUrl = requestConfig.url;
        if (
          requestConfig.params &&
          Object.keys(requestConfig.params).length > 0
        ) {
          const searchParams = new URLSearchParams(requestConfig.params);
          fullUrl = `${requestConfig.url}?${searchParams.toString()}`;
        }

        // 生成签名并添加认证头
        const authHeaders = this.auth.generateAuthHeaders(
          requestConfig.method.toUpperCase(),
          fullUrl,
          requestConfig.data
        );

        requestConfig.headers = {
          ...requestConfig.headers,
          ...authHeaders,
        };

        if (this.debug) {
          this.logger.debug("请求配置", {
            method: requestConfig.method,
            url: requestConfig.url,
            fullUrl: fullUrl,
            params: requestConfig.params,
            headers: requestConfig.headers,
            data: requestConfig.data,
          });

          // 生成并输出对应的curl命令
          const curlCommand = this.generateCurlCommand(requestConfig, fullUrl);
          console.log("\n🔗 对应的 curl 命令：");
          console.log("─".repeat(80));
          console.log(curlCommand);
          console.log("─".repeat(80));
        }

        return requestConfig;
      },
      (error) => {
        if (this.debug) {
          this.logger.error("请求拦截器错误", error);
        }
        return Promise.reject(new NetworkError("请求配置失败", error));
      }
    );

    // 添加响应拦截器
    this.httpClient.interceptors.response.use(
      (response) => {
        if (this.debug) {
          this.logger.debug("响应数据", {
            status: response.status,
            headers: response.headers,
            data: response.data,
          });
        }
        return response;
      },
      (error) => {
        return this.handleResponseError(error);
      }
    );
  }

  /**
   * 处理响应错误
   * @param {Error} error 错误对象
   */
  handleResponseError(error) {
    if (this.debug) {
      this.logger.error("响应错误", error);
    }

    // axios 1.x 版本的错误对象结构有所不同
    if (error.response) {
      // 服务器返回了错误状态码
      const { status, data } = error.response;

      if (status === 401 || status === 403) {
        return Promise.reject(new AuthError("认证失败", data));
      }

      return Promise.reject(new ApiError(`API错误 (${status})`, data, status));
    } else if (error.request) {
      // 请求已发出但没有收到响应
      return Promise.reject(
        new NetworkError("网络错误，请检查网络连接", error)
      );
    } else {
      // 其他错误
      return Promise.reject(new NetworkError("未知错误", error));
    }
  }

  /**
   * 发送GET请求
   * @param {string} path API路径
   * @param {Object} params 查询参数
   * @returns {Promise} 响应数据
   */
  async get(path, params = {}) {
    try {
      const response = await this.httpClient.get(path, { params });
      return this.processResponse(response);
    } catch (error) {
      throw this.enhanceError(error, "GET", path);
    }
  }

  /**
   * 发送POST请求
   * @param {string} path API路径
   * @param {Object} data 请求体数据
   * @returns {Promise} 响应数据
   */
  async post(path, data = {}) {
    try {
      const response = await this.httpClient.post(path, data);
      return this.processResponse(response);
    } catch (error) {
      throw this.enhanceError(error, "POST", path);
    }
  }

  /**
   * 发送PUT请求
   * @param {string} path API路径
   * @param {Object} data 请求体数据
   * @returns {Promise} 响应数据
   */
  async put(path, data = {}) {
    try {
      const response = await this.httpClient.put(path, data);
      return this.processResponse(response);
    } catch (error) {
      throw this.enhanceError(error, "PUT", path);
    }
  }

  /**
   * 发送DELETE请求
   * @param {string} path API路径
   * @returns {Promise} 响应数据
   */
  async delete(path) {
    try {
      const response = await this.httpClient.delete(path);
      return this.processResponse(response);
    } catch (error) {
      throw this.enhanceError(error, "DELETE", path);
    }
  }

  /**
   * 通用请求方法，允许用户直接发送请求
   * @param {string} method HTTP方法 (GET, POST, PUT, DELETE)
   * @param {string} path API路径
   * @param {Object} options 请求选项
   * @param {Object} options.params 查询参数
   * @param {Object} options.data 请求体数据
   * @returns {Promise} 响应数据
   */
  async request(method, path, options = {}) {
    try {
      const config = {
        method: method.toUpperCase(),
        url: path,
        params: options.params || {},
        data: options.data || {}
      };

      const response = await this.httpClient.request(config);
      return this.processResponse(response);
    } catch (error) {
      throw this.enhanceError(error, method, path);
    }
  }

  /**
   * 处理响应数据
   * @param {Object} response axios响应对象
   * @returns {Object} 处理后的响应数据
   */
  processResponse(response) {
    const { status, data } = response;

    // 检查海康威视API返回的业务状态码
    if (data && data.code && data.code !== "0") {
      throw new ApiError(
        `API业务错误: ${data.msg || "未知错误"}`,
        data,
        status
      );
    }

    return {
      success: true,
      status: status,
      data: data,
      message: data.msg || "success",
    };
  }

  /**
   * 增强错误信息
   * @param {Error} error 原始错误
   * @param {string} method HTTP方法
   * @param {string} path API路径
   * @returns {Error} 增强后的错误
   */
  enhanceError(error, method, path) {
    if (error.isCameraError) {
      return error;
    }

    error.method = method;
    error.path = path;
    error.timestamp = new Date().toISOString();

    return error;
  }

  /**
   * 生成对应的curl命令
   * @param {Object} requestConfig axios请求配置
   * @param {string} fullUrl 完整的URL路径
   * @returns {string} curl命令字符串
   */
  generateCurlCommand(requestConfig, fullUrl) {
    const method = requestConfig.method.toUpperCase();
    const completeUrl = `${this.baseURL}${fullUrl}`;

    // 开始构建curl命令
    let curlCommand = `curl -X ${method}`;

    // 添加URL，用引号包围以处理特殊字符
    curlCommand += ` '${completeUrl}'`;

    // 添加headers
    if (requestConfig.headers) {
      Object.entries(requestConfig.headers).forEach(([key, value]) => {
        // 跳过一些axios自动添加的headers
        if (
          !["content-length", "host", "connection"].includes(key.toLowerCase())
        ) {
          curlCommand += ` \\\n  -H '${key}: ${value}'`;
        }
      });
    }

    // 添加请求体数据（对于POST、PUT等请求）
    if (
      requestConfig.data &&
      (method === "POST" || method === "PUT" || method === "PATCH")
    ) {
      let dataString;
      if (typeof requestConfig.data === "object") {
        dataString = JSON.stringify(requestConfig.data);
      } else {
        dataString = requestConfig.data;
      }

      // 转义单引号
      dataString = dataString.replace(/'/g, "'\"'\"'");
      curlCommand += ` \\\n  -d '${dataString}'`;
    }

    // 添加一些有用的curl选项
    curlCommand += " \\\n  --insecure \\\n  --connect-timeout 30 \\\n  --max-time 60 \\\n  -v";

    return curlCommand;
  }
  
  /**
   * 设置API方法代理，自动将API对象上的方法代理到客户端实例上
   */
  setupAPIMethodProxy() {
    // 遍历API对象的所有属性
    Object.getOwnPropertyNames(Object.getPrototypeOf(this.api)).forEach(key => {
      // 跳过构造函数和非函数属性
      if (key === 'constructor' || typeof this.api[key] !== 'function') {
        return;
      }
      
      // 将API方法绑定到客户端实例上
      this[key] = this.api[key].bind(this.api);
    });
  }
}

module.exports = { HikvisionClient };
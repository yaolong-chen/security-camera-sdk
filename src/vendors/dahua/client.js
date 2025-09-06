/**
 * 大华ICC平台 OpenAPI 客户端
 */

const axios = require("axios");
const https = require("https");
const { DahuaAuth } = require("./auth");
const { ApiError, AuthError, NetworkError, ParameterError } = require("../../utils/errors/cameraErrors");
const { Logger } = require("../../utils/logger");
const { DahuaAPI } = require("./api");

// 创建logger实例
const logger = new Logger();

class DahuaClient {
  /**
   * 初始化大华ICC平台客户端
   * @param {Object} config 配置对象
   * @param {string} config.host 大华平台地址
   * @param {number} config.port 端口号，默认443
   * @param {string} config.protocol 协议，默认https
   * @param {string} config.username 用户名
   * @param {string} config.password 密码
   * @param {string} config.client_id 客户端ID
   * @param {string} config.client_secret 客户端密钥
   * @param {boolean} config.debug 是否开启调试模式，默认false
   * @param {number} config.timeout 请求超时时间(ms)，默认10000
   * @param {boolean} config.rejectUnauthorized 是否验证SSL证书，默认false
   */
  constructor(config) {
    // 验证必需参数
    this.validateConfig(config);

    // 配置属性
    this.host = config.host.trim();
    this.port = config.port || 443;
    this.protocol = config.protocol || "https";
    this.username = config.username;
    this.password = config.password;
    this.clientId = config.client_id;
    this.clientSecret = config.client_secret;
    this.debug = config.debug || false;
    this.timeout = config.timeout || 10000;

    // 构建基础URL
    this.baseURL = `${this.protocol}://${this.host}:${this.port}`;

    // 认证相关
    this.accessToken = null;
    this.tokenType = 'bearer';
    this.tokenExpiresAt = null;
    
    // ICC OAuth 接口前缀
    this.iccApiPrefix = '/evo-apigw/evo-oauth/1.0.0/oauth';

    // 初始化认证处理器
    this.auth = new DahuaAuth(
      this.username, 
      this.password, 
      this.clientId, 
      this.clientSecret, 
      this.debug
    );

    // 创建logger实例
    this.logger = new Logger(this.debug);

    // 初始化HTTP客户端
    this.initHttpClient(config);

    // 初始化API封装
    this.api = new DahuaAPI(this);
    
    // 自动代理API方法，使可以直接调用client.methodName()而不是client.api.methodName()
    this.setupAPIMethodProxy();

    if (this.debug) {
      this.logger.info("大华ICC SDK初始化成功", {
        baseURL: this.baseURL,
        username: this.username,
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

    if (!config.username) {
      throw new Error("username参数不能为空");
    }

    if (!config.password) {
      throw new Error("password参数不能为空");
    }

    if (!config.client_id) {
      throw new Error("client_id参数不能为空");
    }

    if (!config.client_secret) {
      throw new Error("client_secret参数不能为空");
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
        "Accept": "application/json",
        "User-Agent": "Dahua-ICC-SDK/1.0.0",
      },
    });

    // 添加请求拦截器
    this.httpClient.interceptors.request.use(
      async (requestConfig) => {
        // 自动确保认证
        await this.ensureAuthenticated();

        // 添加认证头
        if (this.isAuthenticated()) {
          requestConfig.headers.Authorization = `${this.tokenType} ${this.accessToken}`;
        }

        if (this.debug) {
          this.logger.debug("请求配置", {
            method: requestConfig.method,
            url: requestConfig.url,
            params: requestConfig.params,
            headers: requestConfig.headers,
            data: requestConfig.data,
          });
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
      async (error) => {
        // 如果是认证错误，尝试重新登录
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          if (this.debug) {
            this.logger.info("检测到认证错误，尝试重新登录...");
          }
          
          const loginResult = await this.login();
          if (loginResult.success) {
            // 重新发送请求
            try {
              const retryResponse = await this.httpClient.request(error.config);
              return retryResponse;
            } catch (retryError) {
              return Promise.reject(this.handleResponseError(retryError));
            }
          }
        }
        
        return Promise.reject(this.handleResponseError(error));
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
        return new AuthError("认证失败", data);
      }

      return new ApiError(`API错误 (${status})`, data, status);
    } else if (error.request) {
      // 请求已发出但没有收到响应
      return new NetworkError("网络错误，请检查网络连接", error);
    } else {
      // 其他错误
      return new NetworkError("未知错误", error);
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

    // 检查大华API返回的业务状态
    if (data && data.hasOwnProperty('success') && !data.success) {
      throw new ApiError(
        `API业务错误: ${data.errMsg || "未知错误"}`,
        data,
        status
      );
    }

    return {
      success: true,
      status: status,
      data: data,
      message: data.desc || data.errMsg || "success",
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
   * 判断是否已认证且 token 未过期
   * @returns {boolean}
   */
  isAuthenticated() {
    if (!this.accessToken) return false;
    if (this.tokenExpiresAt && Date.now() >= this.tokenExpiresAt) {
      return false; // token 已过期
    }
    return true;
  }

  /**
   * 获取访问令牌（登录）
   * @returns {Promise<{ success: boolean, data?: object, msg?: string }>}
   */
  async login() {
    try {
      const publicKey = await this.api.getPublicKey();
      const tokenData = await this.api.getAccessToken(publicKey);
      
      if (tokenData?.success) {
        const { access_token, token_type, expires_in } = tokenData.data;
        this.accessToken = access_token;
        this.tokenType = token_type || 'bearer';

        // 设置过期时间（提前 60 秒刷新）
        this.tokenExpiresAt = Date.now() + (expires_in - 60) * 1000;

        if (this.debug) {
          this.logger.info('ICC 登录成功，access_token 已设置');
          this.logger.info('token 过期时间:', new Date(this.tokenExpiresAt).toLocaleString());
        }
        
        return { success: true, data: tokenData.data };
      } else {
        return { success: false, msg: `登录失败: ${tokenData?.errMsg || '未知错误'}` };
      }
    } catch (err) {
      if (this.debug) {
        this.logger.error('登录失败:', err.message);
        if (err.response) {
          this.logger.error('响应:', err.response.data);
        }
      }
      return { success: false, msg: err.message };
    }
  }

  /**
   * 确保已认证
   * @returns {Promise<{ success: boolean, msg?: string }>}
   */
  async ensureAuthenticated() {
    if (this.isAuthenticated()) {
      return { success: true, msg: '已认证' };
    }

    if (this.debug) {
      this.logger.info('token 无效或未登录，正在重新登录...');
    }
    
    const result = await this.login();
    return result;
  }

  /**
   * 关闭客户端
   */
  async close() {
    this.accessToken = null;
    this.tokenExpiresAt = null;
    
    if (this.debug) {
      this.logger.info('大华 SDK 已关闭');
    }
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

module.exports = { DahuaClient };
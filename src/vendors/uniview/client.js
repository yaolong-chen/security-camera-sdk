/**
 * 宇视平台 OpenAPI 客户端
 */

const axios = require("axios");
const https = require("https");
const { UniviewAuth } = require("./auth");
const { ApiError, AuthError, NetworkError, ParameterError } = require("../../utils/errors/cameraErrors");
const { Logger } = require("../../utils/logger");
const { UniviewAPI, API_PATHS } = require("./api");

// 创建logger实例
const logger = new Logger();

class UniviewClient {
  /**
   * 初始化宇视平台客户端
   * @param {Object} config 配置对象
   * @param {string} config.host 宇视平台地址
   * @param {number} config.port 端口号，默认80
   * @param {string} config.protocol 协议，默认http
   * @param {string} config.username 用户名
   * @param {string} config.password 密码
   * @param {string} config.defaultOrg 默认组织编码
   * @param {boolean} config.debug 是否开启调试模式，默认false
   * @param {number} config.timeout 请求超时时间(ms)，默认10000
   * @param {boolean} config.rejectUnauthorized 是否验证SSL证书，默认false
   */
  constructor(config) {
    // 验证必需参数
    this.validateConfig(config);

    // 配置属性
    this.host = config.host.trim();
    this.port = config.port || 80;
    this.protocol = config.protocol || "http";
    this.username = config.username;
    this.password = config.password;
    this.defaultOrg = config.defaultOrg || 'iccsid';
    this.debug = config.debug || false;
    this.timeout = config.timeout || 10000;

    // 构建基础URL
    this.baseURL = `${this.protocol}://${this.host}:${this.port}`;

    // 认证相关
    this.accessToken = null;
    this.tokenExpiresAt = null;
    this.keepAliveInterval = null;

    // 初始化认证处理器
    this.auth = new UniviewAuth(
      this.username, 
      this.password, 
      this.debug
    );

    // 创建logger实例
    this.logger = new Logger(this.debug);

    // 初始化HTTP客户端
    this.initHttpClient(config);

    // 初始化API封装
    this.api = new UniviewAPI(this);
    
    // 自动代理API方法，使可以直接调用client.methodName()而不是client.api.methodName()
    this.setupAPIMethodProxy();

    if (this.debug) {
      this.logger.info("宇视SDK初始化成功", {
        baseURL: this.baseURL,
        username: this.username,
        defaultOrg: this.defaultOrg,
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

    // 创建带拦截器的 axios 实例
    this.httpClient = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      httpsAgent: httpsAgent,
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Uniview-SDK/1.0.0'
      },
    });

    // 创建无拦截器的 rawAxios（用于登录）
    this.rawAxios = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      httpsAgent: httpsAgent,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Uniview-SDK/1.0.0'
      },
    });

    // 请求拦截器：注入 Authorization
    this.httpClient.interceptors.request.use(
      async (requestConfig) => {
        // 自动确保认证
        await this.ensureAuthenticated();
        
        if (this.accessToken) {
          requestConfig.headers['Authorization'] = this.accessToken;
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
    
    // 为rawAxios添加响应拦截器
    this.rawAxios.interceptors.response.use(
      (response) => {
        if (this.debug) {
          this.logger.debug("Raw响应数据", {
            status: response.status,
            headers: response.headers,
            data: response.data,
          });
        }
        return response;
      },
      (error) => {
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
   * @param {Object} config 请求配置
   * @returns {Promise} 响应数据
   */
  async post(path, data = {}, config = {}) {
    try {
      const response = await this.httpClient.post(path, data, config);
      return this.processResponse(response);
    } catch (error) {
      throw this.enhanceError(error, "POST", path);
    }
  }

  /**
   * 发送原始POST请求（用于登录等特殊场景）
   * @param {string} path API路径
   * @param {Object} data 请求体数据
   * @param {Object} config 请求配置
   * @returns {Promise} 响应数据
   */
  async rawPost(path, data = {}, config = {}) {
    try {
      const response = await this.rawAxios.post(path, data, config);
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

    // 检查宇视API返回的业务状态
    if (data && data.hasOwnProperty('ErrCode') && data.ErrCode !== 0) {
      throw new ApiError(
        `API业务错误: ${data.ErrMsg || "未知错误"}`,
        data,
        status
      );
    }

    return {
      success: true,
      status: status,
      data: data,
      message: data.ErrMsg || "success",
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
    return this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt;
  }

  /**
   * 登录
   * @returns {Promise<{ success: boolean, data?: object, msg?: string }>}
   */
  async login() {
    if (this.debug) {
      this.logger.info('开始登录流程...');
    }

    // 清除旧 token
    this.accessToken = null;
    this.tokenExpiresAt = null;

    let attempts = 0;
    const maxRetries = 3;

    while (attempts <= maxRetries) {
      try {
        // 第一步：获取 AccessCode
        const res = await this.rawPost(API_PATHS.LOGIN);

        if (res.data?.AccessCode && !res.data.AccessToken) {
          const accessCode = res.data.AccessCode;
          if (this.debug) {
            this.logger.info('获取到 AccessCode，准备提交登录信息');
          }

          // 构建登录数据
          const loginData = JSON.stringify(this.auth.buildLoginData(accessCode));

          // 第二步：提交登录
          const loginRes = await this.rawPost(API_PATHS.LOGIN, loginData, {
            headers: { 'Content-Type': 'text/plain' },
          });

          const data = loginRes.data;

          // 兼容无 ErrCode 或 ErrCode === 0
          if ((data.ErrCode == null || data.ErrCode === 0) && data.AccessToken) {
            this.accessToken = data.AccessToken;
            this.tokenExpiresAt = Date.now() + (48 * 3600 - 60) * 1000; // 47小时59分
            
            if (this.debug) {
              const expireTime = new Date(this.tokenExpiresAt);
              this.logger.info(`登录成功！Token 有效期至: ${expireTime.toLocaleString()}`);
            }
            
            this.startKeepAlive();
            return { success: true, data };
          } else {
            throw new Error(`登录失败 [${data.ErrCode}]: ${data.ErrMsg || '未知错误'}`);
          }
        }
        else if (res.data?.AccessToken) {
          // 直接返回 token（会话复用）
          this.accessToken = res.data.AccessToken;
          this.tokenExpiresAt = Date.now() + (48 * 3600 - 60) * 1000;
          
          if (this.debug) {
            const expireTime = new Date(this.tokenExpiresAt);
            this.logger.info(`会话复用成功，Token 有效期至: ${expireTime.toLocaleString()}`);
          }
          
          this.startKeepAlive();
          return { success: true, data: res.data };
        }
        else {
          throw new Error(`登录失败：响应格式错误 ${JSON.stringify(res.data)}`);
        }
      } catch (err) {
        attempts++;
        if (attempts > maxRetries) {
          if (this.debug) {
            this.logger.error('登录失败（已达最大重试次数）:', err.message);
          }
          return { success: false, msg: err.message };
        }

        if (this.debug) {
          this.logger.warn(`登录尝试 ${attempts} 失败，${1000 * attempts}ms 后重试...`);
        }
        await new Promise(r => setTimeout(r, 1000 * attempts)); // 指数退避
      }
    }

    return { success: false, msg: '登录失败：重试次数耗尽' };
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
   * 确保Token有效
   * @returns {Promise<string>} 访问令牌
   */
  async ensureToken() {
    const result = await this.ensureAuthenticated();
    if (!result.success) {
      throw new AuthError(`认证失败: ${result.msg}`);
    }
    return this.accessToken;
  }

  /**
   * 保持Token活跃
   * @returns {Promise<boolean>} 是否成功
   */
  async keepTokenAlive() {
    try {
      if (!this.isAuthenticated()) {
        if (this.debug) {
          this.logger.warn('Token 已失效，尝试重新登录');
        }
        const result = await this.login();
        return result.success;
      }

      const res = await this.get(API_PATHS.TOKEN_KEEP_ALIVE);
      if (res.data.ErrCode === 0) {
        if (this.debug) {
          this.logger.info('Token 保活成功');
        }
        return true;
      } else {
        if (this.debug) {
          this.logger.warn('保活失败:', res.data.ErrMsg);
        }
        const result = await this.login();
        return result.success;
      }
    } catch (err) {
      if (this.debug) {
        this.logger.error('保活请求失败:', err.message);
      }
      const result = await this.login();
      return result.success;
    }
  }

  /**
   * 启动自动保活
   */
  startKeepAlive() {
    if (this.keepAliveInterval) {
      if (this.debug) {
        this.logger.debug('保活定时器已存在');
      }
      return;
    }

    const intervalMs = 24 * 60 * 60 * 1000; // 24小时
    this.keepAliveInterval = setInterval(async () => {
      if (this.debug) {
        this.logger.info('执行自动 token 保活...');
      }
      await this.keepTokenAlive();
    }, intervalMs);

    if (this.debug) {
      this.logger.info('自动保活已启动，每 24 小时执行一次');
    }
  }

  /**
   * 停止自动保活
   */
  stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
      if (this.debug) {
        this.logger.info('自动保活已停止');
      }
    }
  }

  /**
   * 关闭客户端
   */
  async close() {
    this.stopKeepAlive();
    this.accessToken = null;
    this.tokenExpiresAt = null;
    
    if (this.debug) {
      this.logger.info('宇视 SDK 已关闭');
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

module.exports = { UniviewClient };
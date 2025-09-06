/**
 * 海康威视 SDK 工具类
 */

/**
 * 简单的日志记录器
 */
class Logger {
  constructor(debug = false) {
    this.debugEnabled = debug;
  }

  /**
   * 记录调试信息
   * @param {string} message 消息
   * @param {Object} data 附加数据
   */
  debug(message, data = null) {
    if (this.debugEnabled) {
      const timestamp = new Date().toISOString();
      console.log(`[DEBUG ${timestamp}] ${message}`);
      if (data) {
        console.log(JSON.stringify(data, null, 2));
      }
    }
  }

  /**
   * 记录信息
   * @param {string} message 消息
   * @param {Object} data 附加数据
   */
  info(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[INFO ${timestamp}] ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  /**
   * 记录警告
   * @param {string} message 消息
   * @param {Object} data 附加数据
   */
  warn(message, data = null) {
    const timestamp = new Date().toISOString();
    console.warn(`[WARN ${timestamp}] ${message}`);
    if (data) {
      console.warn(JSON.stringify(data, null, 2));
    }
  }

  /**
   * 记录错误
   * @param {string} message 消息
   * @param {Error|Object} error 错误对象或附加数据
   */
  error(message, error = null) {
    const timestamp = new Date().toISOString();
    console.error(`[ERROR ${timestamp}] ${message}`);
    if (error) {
      if (error instanceof Error) {
        console.error(error.stack || error.message);
      } else {
        console.error(JSON.stringify(error, null, 2));
      }
    }
  }
}

// 创建默认日志实例
const logger = new Logger();

/**
 * 工具函数集合
 */
class Utils {
  /**
   * 检查是否为空值
   * @param {*} value 待检查的值
   * @returns {boolean} 是否为空
   */
  static isEmpty(value) {
    return value === null || value === undefined || value === "";
  }

  /**
   * 检查是否为有效的字符串
   * @param {*} value 待检查的值
   * @returns {boolean} 是否为有效字符串
   */
  static isValidString(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  /**
   * 检查是否为有效的数字
   * @param {*} value 待检查的值
   * @returns {boolean} 是否为有效数字
   */
  static isValidNumber(value) {
    return typeof value === "number" && !isNaN(value);
  }

  /**
   * 格式化URL路径
   * @param {string} path 路径
   * @returns {string} 格式化后的路径
   */
  static formatPath(path) {
    if (!path) return "/";

    // 确保路径以/开头
    if (!path.startsWith("/")) {
      path = "/" + path;
    }

    // 移除重复的斜杠
    path = path.replace(/\/+/g, "/");

    return path;
  }

  /**
   * 深度合并对象
   * @param {Object} target 目标对象
   * @param {Object} source 源对象
   * @returns {Object} 合并后的对象
   */
  static deepMerge(target, source) {
    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (
          source[key] &&
          typeof source[key] === "object" &&
          !Array.isArray(source[key])
        ) {
          result[key] = this.deepMerge(result[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }

    return result;
  }

  /**
   * 安全的JSON解析
   * @param {string} jsonString JSON字符串
   * @param {*} defaultValue 默认值
   * @returns {*} 解析结果或默认值
   */
  static safeJsonParse(jsonString, defaultValue = null) {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      logger.warn("JSON解析失败", { jsonString, error: error.message });
      return defaultValue;
    }
  }

  /**
   * 安全的JSON字符串化
   * @param {*} value 待字符串化的值
   * @param {string} defaultValue 默认值
   * @returns {string} JSON字符串或默认值
   */
  static safeJsonStringify(value, defaultValue = "{}") {
    try {
      return JSON.stringify(value);
    } catch (error) {
      logger.warn("JSON字符串化失败", { value, error: error.message });
      return defaultValue;
    }
  }

  /**
   * 延迟执行
   * @param {number} ms 延迟毫秒数
   * @returns {Promise} Promise对象
   */
  static sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 重试函数
   * @param {Function} fn 待重试的函数
   * @param {number} retries 重试次数
   * @param {number} delay 重试间隔（毫秒）
   * @returns {Promise} Promise对象
   */
  static async retry(fn, retries = 3, delay = 1000) {
    let lastError;

    for (let i = 0; i <= retries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (i === retries) {
          logger.error(`重试${retries}次后仍然失败`, error);
          throw error;
        }

        logger.warn(`第${i + 1}次尝试失败，${delay}ms后重试`, error.message);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * 格式化文件大小
   * @param {number} bytes 字节数
   * @returns {string} 格式化后的文件大小
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return "0 B";

    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * 生成随机字符串
   * @param {number} length 长度
   * @returns {string} 随机字符串
   */
  static generateRandomString(length = 16) {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";

    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
  }

  /**
   * 验证邮箱格式
   * @param {string} email 邮箱地址
   * @returns {boolean} 是否为有效邮箱
   */
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * 验证IP地址格式
   * @param {string} ip IP地址
   * @returns {boolean} 是否为有效IP
   */
  static isValidIP(ip) {
    const ipRegex =
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  }

  /**
   * 创建查询参数字符串
   * @param {Object} params 参数对象
   * @returns {string} 查询参数字符串
   */
  static createQueryString(params) {
    if (!params || typeof params !== "object") {
      return "";
    }

    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined) {
        searchParams.append(key, String(value));
      }
    }

    const queryString = searchParams.toString();
    return queryString ? `?${queryString}` : "";
  }

  /**
   * 节流函数
   * @param {Function} func 待节流的函数
   * @param {number} wait 等待时间
   * @returns {Function} 节流后的函数
   */
  static throttle(func, wait) {
    let timeout;
    let previous = 0;

    return function (...args) {
      const now = Date.now();
      const remaining = wait - (now - previous);

      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = now;
        func.apply(this, args);
      } else if (!timeout) {
        timeout = setTimeout(() => {
          previous = Date.now();
          timeout = null;
          func.apply(this, args);
        }, remaining);
      }
    };
  }

  /**
   * 防抖函数
   * @param {Function} func 待防抖的函数
   * @param {number} wait 等待时间
   * @returns {Function} 防抖后的函数
   */
  static debounce(func, wait) {
    let timeout;

    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }
}

module.exports = {
  Logger,
  logger,
  Utils,
};
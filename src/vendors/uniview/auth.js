/**
 * 宇视平台 OpenAPI 认证模块
 * 实现MD5签名算法
 */

const crypto = require("crypto");
const { Logger } = require("../../utils/logger");

// 创建logger实例
const logger = new Logger();

class UniviewAuth {
  /**
   * 初始化认证处理器
   * @param {string} username 用户名
   * @param {string} password 密码
   * @param {boolean} debug 是否开启调试模式
   */
  constructor(username, password, debug = false) {
    this.username = username;
    this.password = password;
    this.debug = debug;
    // 创建logger实例，传入debug参数
    this.logger = new Logger(debug);
  }

  /**
   * 计算登录签名
   * @param {string} usernameBase64 Base64编码的用户名
   * @param {string} accessCode 访问码
   * @param {string} passwordMd5 MD5编码的密码
   * @returns {string} 登录签名
   */
  calculateLoginSignature(usernameBase64, accessCode, passwordMd5) {
    try {
      return crypto
        .createHash('md5')
        .update(usernameBase64 + accessCode + passwordMd5)
        .digest('hex');
    } catch (err) {
      if (this.debug) {
        this.logger.error('登录签名计算失败:', err.message);
      }
      throw err;
    }
  }

  /**
   * 构建登录数据
   * @param {string} accessCode 访问码
   * @returns {Object} 登录数据
   */
  buildLoginData(accessCode) {
    const usernameBase64 = Buffer.from(this.username).toString('base64');
    const passwordMd5 = crypto.createHash('md5').update(this.password).digest('hex');
    const loginSignature = this.calculateLoginSignature(usernameBase64, accessCode, passwordMd5);
    
    return {
      UserName: this.username,
      AccessCode: accessCode,
      LoginSignature: loginSignature,
    };
  }
}

module.exports = { UniviewAuth };
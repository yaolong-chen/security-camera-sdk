/**
 * 大华ICC平台 OpenAPI 认证模块
 * 实现RSA加密算法
 */

const forge = require("node-forge");
const { Logger } = require("../../utils/logger");

// 创建logger实例
const logger = new Logger();

class DahuaAuth {
  /**
   * 初始化认证处理器
   * @param {string} username 用户名
   * @param {string} password 密码
   * @param {string} clientId 客户端ID
   * @param {string} clientSecret 客户端密钥
   * @param {boolean} debug 是否开启调试模式
   */
  constructor(username, password, clientId, clientSecret, debug = false) {
    this.username = username;
    this.password = password;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.debug = debug;
    // 创建logger实例，传入debug参数
    this.logger = new Logger(debug);
  }

  /**
   * 使用公钥 RSA 加密密码
   * @param {string} password 明文密码
   * @param {string} publicKeyPem PEM 格式公钥
   * @returns {string} Base64 编码的加密密码
   */
  rsaEncrypt(password, publicKeyPem) {
    try {
      const publicKeyPemFixed = `-----BEGIN PUBLIC KEY-----\n${publicKeyPem}\n-----END PUBLIC KEY-----`;
      const publicKey = forge.pki.publicKeyFromPem(publicKeyPemFixed);
      const encrypted = publicKey.encrypt(password, 'RSAES-PKCS1-V1_5');
      return forge.util.encode64(encrypted);
    } catch (err) {
      if (this.debug) {
        this.logger.error('RSA 加密失败:', err.message);
      }
      throw err;
    }
  }

  /**
   * 构建认证数据
   * @param {string} publicKey 公钥
   * @returns {Object} 认证数据
   */
  buildAuthData(publicKey) {
    const encryptedPassword = this.rsaEncrypt(this.password, publicKey);
    
    return {
      grant_type: 'password',
      username: this.username,
      password: encryptedPassword,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      public_key: publicKey,
    };
  }
}

module.exports = { DahuaAuth };
/**
 * 海康威视 OpenAPI 认证模块
 * 实现HMAC-SHA256签名算法
 */

const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const { Logger } = require("../../utils/logger");

// 创建logger实例
const logger = new Logger();

class HikvisionAuth {
  /**
   * 初始化认证处理器
   * @param {string} appKey 应用密钥
   * @param {string} appSecret 应用秘钥
   * @param {boolean} debug 是否开启调试模式
   */
  constructor(appKey, appSecret, debug = false) {
    this.appKey = appKey;
    this.appSecret = appSecret;
    this.debug = debug;
    // 创建logger实例，传入debug参数
    this.logger = new Logger(debug);
  }

  /**
   * 生成认证请求头
   * @param {string} method HTTP方法
   * @param {string} url 请求URL路径
   * @param {Object|string} body 请求体
   * @returns {Object} 认证请求头
   */
  generateAuthHeaders(method, url, body = "") {
    // 生成时间戳（毫秒）
    const timestamp = Date.now().toString();

    // 生成UUID作为nonce
    const nonce = uuidv4();

    // 处理请求体
    let bodyStr = "";
    if (body && typeof body === "object") {
      bodyStr = JSON.stringify(body);
    } else if (body && typeof body === "string") {
      bodyStr = body;
    }

    // 构建签名字符串
    const signatureData = this.buildSignatureString(
      method,
      url,
      bodyStr,
      timestamp,
      nonce
    );

    // 生成HMAC-SHA256签名
    const signature = this.generateSignature(signatureData);

    const headers = {
      "X-Ca-Key": this.appKey,
      "X-Ca-Nonce": nonce,
      "X-Ca-Timestamp": timestamp,
      "X-Ca-Signature": signature,
      "X-Ca-Signature-Headers": "x-ca-key,x-ca-nonce,x-ca-timestamp",
    };

    if (this.debug) {
      this.logger.debug("认证信息生成", {
        method,
        url,
        timestamp,
        nonce,
        signatureData,
        signature,
        headers,
      });
    }

    return headers;
  }

  /**
   * 构建签名字符串
   * @param {string} method HTTP方法
   * @param {string} url 请求URL路径
   * @param {string} body 请求体字符串
   * @param {string} timestamp 时间戳
   * @param {string} nonce 随机数
   * @returns {string} 签名字符串
   */
  buildSignatureString(method, url, body, timestamp, nonce) {
    // 清理URL路径，确保以/开头
    const cleanUrl = url.startsWith("/") ? url : `/${url}`;

    // 构建签名字符串，按照海康威视API实际格式
    // 从错误信息可以看出格式：HTTP方法\nContent-Type\nAccept\n自定义头部\nURL路径
    const signatureParts = [
      method.toUpperCase(),
      "application/json", // Content-Type
      "application/json", // Accept（不需要Content-MD5）
    ];

    // 添加自定义头部（按字典序排序）
    const customHeaders = [
      `x-ca-key:${this.appKey}`,
      `x-ca-nonce:${nonce}`,
      `x-ca-timestamp:${timestamp}`,
    ].sort();

    // 将自定义头部添加到签名字符串中
    signatureParts.push(...customHeaders);

    // 最后添加URL路径
    signatureParts.push(cleanUrl);

    // 用换行符连接所有部分
    const signatureString = signatureParts.join("\n");

    return signatureString;
  }

  /**
   * 生成HMAC-SHA256签名
   * @param {string} data 待签名数据
   * @returns {string} 签名结果（Base64编码）
   */
  generateSignature(data) {
    const hmac = crypto.createHmac("sha256", this.appSecret);
    hmac.update(data, "utf8");
    return hmac.digest("base64");
  }

  /**
   * 验证签名（用于调试和测试）
   * @param {string} method HTTP方法
   * @param {string} url 请求URL路径
   * @param {string} body 请求体
   * @param {string} timestamp 时间戳
   * @param {string} nonce 随机数
   * @param {string} expectedSignature 期望的签名
   * @returns {boolean} 验证结果
   */
  verifySignature(method, url, body, timestamp, nonce, expectedSignature) {
    const signatureData = this.buildSignatureString(
      method,
      url,
      body,
      timestamp,
      nonce
    );
    const actualSignature = this.generateSignature(signatureData);

    const isValid = actualSignature === expectedSignature;

    if (this.debug) {
      this.logger.debug("签名验证", {
        method,
        url,
        timestamp,
        nonce,
        signatureData,
        expectedSignature,
        actualSignature,
        isValid,
      });
    }

    return isValid;
  }

  /**
   * 生成OAuth Token（如果需要）
   * 某些海康威视API可能需要先获取Token
   */
  async getOAuthToken(httpClient) {
    try {
      const tokenUrl = "/artemis/api/v1/oauth/token";
      const response = await httpClient.post(tokenUrl);

      if (response.data && response.data.access_token) {
        return {
          accessToken: response.data.access_token,
          tokenType: response.data.token_type || "Bearer",
          expiresIn: response.data.expires_in,
        };
      }

      throw new Error("获取OAuth Token失败：响应格式不正确");
    } catch (error) {
      if (this.debug) {
        this.logger.error("获取OAuth Token失败", error);
      }
      throw error;
    }
  }
}

module.exports = { HikvisionAuth };
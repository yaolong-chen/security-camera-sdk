/**
 * 统一摄像头SDK错误处理类
 */

/**
 * 摄像头SDK基础错误类
 */
class CameraError extends Error {
  constructor(message, originalError = null) {
    super(message);
    this.name = "CameraError";
    this.isCameraError = true;
    this.timestamp = new Date().toISOString();
    this.originalError = originalError;

    // 保持错误堆栈
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * 转换为JSON格式
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      timestamp: this.timestamp,
      isCameraError: this.isCameraError,
      originalError: this.originalError
        ? {
          name: this.originalError.name,
          message: this.originalError.message,
        }
        : null,
    };
  }
}

/**
 * API错误类
 * 当摄像头API返回错误时抛出
 */
class ApiError extends CameraError {
  constructor(message, responseData = null, statusCode = null) {
    super(message);
    this.name = "ApiError";
    this.responseData = responseData;
    this.statusCode = statusCode;

    // 尝试从响应数据中提取更多错误信息
    if (responseData) {
      this.errorCode = responseData.code || null;
      this.errorMessage = responseData.errMsg || responseData.desc || responseData.message || null;
      this.errorDetails = responseData.data || null;
    }
  }

  toJSON() {
    return {
      ...super.toJSON(),
      statusCode: this.statusCode,
      errorCode: this.errorCode,
      errorMessage: this.errorMessage,
      errorDetails: this.errorDetails,
      responseData: this.responseData,
    };
  }
}

/**
 * 认证错误类
 * 当认证失败时抛出
 */
class AuthError extends CameraError {
  constructor(message, responseData = null) {
    super(message);
    this.name = "AuthError";
    this.responseData = responseData;

    if (responseData) {
      this.errorCode = responseData.code || "AUTH_FAILED";
      this.errorMessage =
        responseData.errMsg || responseData.desc || responseData.message || "Authentication failed";
    }
  }

  toJSON() {
    return {
      ...super.toJSON(),
      errorCode: this.errorCode,
      errorMessage: this.errorMessage,
      responseData: this.responseData,
    };
  }
}

/**
 * 网络错误类
 * 当网络请求失败时抛出
 */
class NetworkError extends CameraError {
  constructor(message, originalError = null) {
    super(message, originalError);
    this.name = "NetworkError";

    if (originalError) {
      this.code = originalError.code;
      this.errno = originalError.errno;
      this.syscall = originalError.syscall;
      this.hostname = originalError.hostname;
      this.port = originalError.port;
    }
  }

  toJSON() {
    return {
      ...super.toJSON(),
      code: this.code,
      errno: this.errno,
      syscall: this.syscall,
      hostname: this.hostname,
      port: this.port,
    };
  }
}

/**
 * 参数错误类
 * 当传入的参数不正确时抛出
 */
class ParameterError extends CameraError {
  constructor(message, parameterName = null, parameterValue = null) {
    super(message);
    this.name = "ParameterError";
    this.parameterName = parameterName;
    this.parameterValue = parameterValue;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      parameterName: this.parameterName,
      parameterValue: this.parameterValue,
    };
  }
}

/**
 * 超时错误类
 * 当请求超时时抛出
 */
class TimeoutError extends CameraError {
  constructor(message, timeout = null) {
    super(message);
    this.name = "TimeoutError";
    this.timeout = timeout;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      timeout: this.timeout,
    };
  }
}

module.exports = {
  CameraError,
  ApiError,
  AuthError,
  NetworkError,
  ParameterError,
  TimeoutError,
};
/**
 * 统一摄像头SDK主入口文件
 */

const { HikvisionClient } = require('./src/vendors/hikvision/client');
const { DahuaClient } = require('./src/vendors/dahua/client');
const { UniviewClient } = require('./src/vendors/uniview/client');
const { 
  CameraError, 
  ApiError, 
  AuthError, 
  NetworkError, 
  ParameterError, 
  TimeoutError 
} = require('./src/utils/errors/cameraErrors');

module.exports = {
  HikvisionClient,
  DahuaClient,
  UniviewClient,
  CameraError,
  ApiError,
  AuthError,
  NetworkError,
  ParameterError,
  TimeoutError
};
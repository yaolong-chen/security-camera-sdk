/**
 * 简单测试文件 - 演示如何使用统一摄像头SDK
 */
require('dotenv').config();
const { 
  HikvisionClient, 
  DahuaClient, 
  UniviewClient,
  ApiError,
  AuthError,
  NetworkError
} = require('../index');

// 请根据实际情况修改以下配置
const config = {
  // 选择要测试的厂商: hikvision, dahua, uniview
  vendor: 'hikvision',
  
  // 海康威视配置
  hikvision: {
    host: process.env.HIKVISION_HOST || 'your_hikvision_host',
    port: process.env.HIKVISION_PORT || 443,
    protocol: process.env.HIKVISION_PROTOCOL || 'https',
    appKey: process.env.HIKVISION_APPKEY || 'your_app_key',
    appSecret: process.env.HIKVISION_APPSECRET || 'your_app_secret',
    rejectUnauthorized: process.env.HIKVISION_VERIFY_SSL === 'true' ? true : false,
    debug: true
  },
  
  // 大华配置
  dahua: {
    host: process.env.DAHUA_HOST || 'your_dahua_host',
    port: process.env.DAHUA_PORT || 443,
    protocol: process.env.DAHUA_PROTOCOL || 'https',
    username: process.env.DAHUA_USERNAME || 'your_username',
    password: process.env.DAHUA_PASSWORD || 'your_password',
    client_id: process.env.DAHUA_CLIENT_ID || 'your_client_id',
    client_secret: process.env.DAHUA_CLIENT_SECRET || 'your_client_secret',
    debug: true
  },
  
  // 宇视配置
  uniview: {
    host: process.env.UNIVIEW_HOST || 'your_uniview_host',
    port: process.env.UNIVIEW_PORT || 80,
    protocol: process.env.UNIVIEW_PROTOCOL || 'http',
    username: process.env.UNIVIEW_USERNAME || 'your_username',
    password: process.env.UNIVIEW_PASSWORD || 'your_password',
    debug: true
  }
};

async function testCamera() {
  let client;
  
  try {
    // 根据配置创建相应的客户端
    switch (config.vendor) {
      case 'hikvision':
        console.log('创建海康威视客户端...');
        client = new HikvisionClient(config.hikvision);
        break;
        
      case 'dahua':
        console.log('创建大华客户端...');
        client = new DahuaClient(config.dahua);
        break;
        
      case 'uniview':
        console.log('创建宇视客户端...');
        client = new UniviewClient(config.uniview);
        break;
        
      default:
        throw new Error(`不支持的厂商: ${config.vendor}`);
    }
    
    console.log(`开始测试 ${config.vendor} SDK...`);
    
    // 现在可以直接调用API方法，无需使用 .api 前缀
    if (config.vendor === 'hikvision') {
      console.log('1. 获取设备信息...');
      const deviceInfo = await client.getDeviceInfo();
      console.log('设备信息:', JSON.stringify(deviceInfo, null, 2));
    } else if (config.vendor === 'dahua') {
      console.log('1. 获取设备分页信息...');
      const devices = await client.getDevicesPage({
        pageNum: 1,
        pageSize: 10
      });
      console.log('设备信息:', JSON.stringify(devices, null, 2));
    } else if (config.vendor === 'uniview') {
      console.log('1. 查询摄像机信息...');
      const cameras = await client.queryAllCameras({
        org: 'iccsid',
        pageSize: 10
      });
      console.log('摄像机信息:', JSON.stringify(cameras, null, 2));
    }
    
    console.log('测试完成');
    
  } catch (error) {
    console.error('测试过程中发生错误:');
    if (error instanceof ApiError) {
      console.error('API错误:', error.message);
    } else if (error instanceof AuthError) {
      console.error('认证错误:', error.message);
    } else if (error instanceof NetworkError) {
      console.error('网络错误:', error.message);
    } else {
      console.error('未知错误:', error.message);
    }
  } finally {
    // 如果是宇视客户端，需要关闭连接以清理资源
    if (client && config.vendor === 'uniview') {
      await client.close();
      console.log('客户端连接已关闭');
    }
  }
}

// 运行测试
testCamera().catch(console.error);
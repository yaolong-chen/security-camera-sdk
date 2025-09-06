/**
 * 统一摄像头SDK使用示例
 * 
 * 此文件演示了如何使用SDK连接到不同厂商的设备
 */
// 加载env
require('dotenv').config();
const { 
  HikvisionClient, 
  DahuaClient, 
  UniviewClient,
  ApiError,
  AuthError,
  NetworkError
} = require('../index');

// 海康威视配置示例
const hikvisionConfig = {
  host: process.env.HIKVISION_HOST || 'your_hikvision_host',
  port: process.env.HIKVISION_PORT || 443,
  protocol: process.env.HIKVISION_PROTOCOL || 'https',
  appKey: process.env.HIKVISION_APPKEY || 'your_app_key',
  appSecret: process.env.HIKVISION_APPSECRET || 'your_app_secret',
  rejectUnauthorized: process.env.HIKVISION_VERIFY_SSL === 'true' ? true : false,
  debug: true
};

// 大华配置示例
const dahuaConfig = {
  host: process.env.DAHUA_HOST || 'your_dahua_host',
  port: process.env.DAHUA_PORT || 443,
  protocol: process.env.DAHUA_PROTOCOL || 'https',
  username: process.env.DAHUA_USERNAME || 'your_username',
  password: process.env.DAHUA_PASSWORD || 'your_password',
  client_id: process.env.DAHUA_CLIENT_ID || 'your_client_id',
  client_secret: process.env.DAHUA_CLIENT_SECRET || 'your_client_secret',
  debug: true
};

// 宇视配置示例
const univiewConfig = {
  host: process.env.UNIVIEW_HOST || 'your_uniview_host',
  port: process.env.UNIVIEW_PORT || 80,
  protocol: process.env.UNIVIEW_PROTOCOL || 'http',
  username: process.env.UNIVIEW_USERNAME || 'your_username',
  password: process.env.UNIVIEW_PASSWORD || 'your_password',
  debug: true
};

async function testHikvision() {
  console.log('=== 测试海康威视 SDK ===');
  const client = new HikvisionClient(hikvisionConfig);
  
  try {
    // 现在可以直接调用API方法，无需使用 .api 前缀
    console.log('1. 获取设备信息...');
    const deviceInfo = await client.getDeviceInfo();
    console.log('设备信息:', JSON.stringify(deviceInfo, null, 2));
    
    // 使用通用请求方法
    console.log('2. 使用通用请求方法获取设备信息...');
    const deviceInfo2 = await client.request('GET', '/ISAPI/System/deviceInfo');
    console.log('设备信息(通用方法):', JSON.stringify(deviceInfo2, null, 2));
    
  } catch (error) {
    if (error instanceof ApiError) {
      console.error('海康威视API错误:', error.message);
    } else if (error instanceof AuthError) {
      console.error('海康威视认证错误:', error.message);
    } else if (error instanceof NetworkError) {
      console.error('海康威视网络错误:', error.message);
    } else {
      console.error('海康威视未知错误:', error.message);
    }
  }
}

async function testDahua() {
  console.log('\n=== 测试大华 SDK ===');
  const client = new DahuaClient(dahuaConfig);
  
  try {
    // 现在可以直接调用API方法，无需使用 .api 前缀
    console.log('1. 获取设备分页信息...');
    const devices = await client.getDevicesPage({
      pageNum: 1,
      pageSize: 10
    });
    console.log('设备信息:', JSON.stringify(devices, null, 2));
    
    // 使用通用请求方法
    console.log('2. 使用通用请求方法获取设备信息...');
    const devices2 = await client.request('POST', '/evo-apigw/evo-brm/1.2.0/device/subsystem/page', {
      data: {
        pageNum: 1,
        pageSize: 10,
        showChildNodeData: 1
      }
    });
    console.log('设备信息(通用方法):', JSON.stringify(devices2, null, 2));
    
  } catch (error) {
    if (error instanceof ApiError) {
      console.error('大华API错误:', error.message);
    } else if (error instanceof AuthError) {
      console.error('大华认证错误:', error.message);
    } else if (error instanceof NetworkError) {
      console.error('大华网络错误:', error.message);
    } else {
      console.error('大华未知错误:', error.message);
    }
  }
}

async function testUniview() {
  console.log('\n=== 测试宇视 SDK ===');
  const client = new UniviewClient(univiewConfig);
  
  try {
    // 现在可以直接调用API方法，无需使用 .api 前缀
    console.log('1. 查询摄像机信息...');
    const cameras = await client.queryAllCameras({
      org: 'iccsid',
      pageSize: 10
    });
    console.log('摄像机信息:', JSON.stringify(cameras, null, 2));
    
    // 使用通用请求方法
    console.log('2. 使用通用请求方法查询组织信息...');
    const orgs = await client.request('GET', '/VIID/query', {
      params: {
        org: 'iccsid',
        condition: JSON.stringify({
          ItemNum: 1,
          Condition: [],
          QueryCount: 1,
          PageFirstRowNumber: 0,
          PageRowNum: 10
        })
      }
    });
    console.log('组织信息(通用方法):', JSON.stringify(orgs, null, 2));
    
  } catch (error) {
    if (error instanceof ApiError) {
      console.error('宇视API错误:', error.message);
    } else if (error instanceof AuthError) {
      console.error('宇视认证错误:', error.message);
    } else if (error instanceof NetworkError) {
      console.error('宇视网络错误:', error.message);
    } else {
      console.error('宇视未知错误:', error.message);
    }
  } finally {
    // 关闭客户端以清理资源
    await client.close();
  }
}

async function main() {
  console.log('开始测试统一摄像头SDK...');
  
  // 测试各个厂商的SDK
  await testHikvision();
  await testDahua();
  await testUniview();
  
  console.log('\n=== 测试完成 ===');
}

// 运行测试
main().catch(console.error);
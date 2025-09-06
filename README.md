# 统一摄像头SDK (security-camera-sdk)

[![NPM Version](https://img.shields.io/npm/v/security-camera-sdk.svg)](https://www.npmjs.com/package/security-camera-sdk)
[![License](https://img.shields.io/npm/l/security-camera-sdk.svg)](https://github.com/yaolo/security-camera-sdk/blob/main/LICENSE)

一个统一的 Node.js SDK，用于对接多种品牌的安防摄像头设备，包括海康威视(Hikvision)、大华(Dahua)、宇视(Uniview)等厂商。

> **注意**: 本SDK尚处于开发阶段，部分功能还未经过完整测试。我们将在后续版本中进行充分测试，也欢迎大家提供反馈和建议。

## 功能特性

- 🎯 **统一接口**: 为不同厂商提供一致的API接口
- 🔐 **自动认证**: 自动处理各厂商的认证机制
- 📡 **通用请求**: 支持直接调用厂商原生API
- 🌈 **错误处理**: 统一的错误处理机制
- 🛠️ **厂商支持**: 
  - 海康威视 (Hikvision)
  - 大华 (Dahua)
  - 宇视 (Uniview)
- 📦 **模块化**: 各厂商SDK独立实现，便于扩展

## 致谢

本项目在海康威视SDK的实现中参考了 [hikvision-openapi-sdk](https://www.npmjs.com/package/hikvision-openapi-sdk) 项目，在此表示感谢。

## 安装

```bash
npm install security-camera-sdk
```

## 快速开始

### 1. 导入SDK

```javascript
const { 
  HikvisionClient, 
  DahuaClient, 
  UniviewClient,
  ApiError,
  AuthError,
  NetworkError
} = require('security-camera-sdk');
```

### 2. 创建客户端实例

#### 海康威视客户端

```javascript
const hikvisionConfig = {
  host: '192.168.1.100',
  port: 443,
  protocol: 'https',
  appKey: 'your_app_key',
  appSecret: 'your_app_secret',
  rejectUnauthorized: false, // SSL证书验证
  debug: true // 调试模式
};

const hikvisionClient = new HikvisionClient(hikvisionConfig);
```

#### 大华客户端

```javascript
const dahuaConfig = {
  host: '192.168.1.101',
  port: 443,
  protocol: 'https',
  username: 'your_username',
  password: 'your_password',
  client_id: 'your_client_id',
  client_secret: 'your_client_secret',
  debug: true
};

const dahuaClient = new DahuaClient(dahuaConfig);
```

#### 宇视客户端

```javascript
const univiewConfig = {
  host: '192.168.1.102',
  port: 80,
  protocol: 'http',
  username: 'your_username',
  password: 'your_password',
  debug: true
};

const univiewClient = new UniviewClient(univiewConfig);
```

### 3. 使用客户端

#### 自动认证

所有厂商SDK都支持自动认证处理，无需手动登录。SDK支持两种调用方式：

方式一（推荐）- 直接调用：
```
// 海康威视示例
const deviceInfo = await hikvisionClient.getDeviceInfo();

// 大华示例
const devices = await dahuaClient.getDevicesPage({
  pageNum: 1,
  pageSize: 100
});

// 宇视示例
const cameras = await univiewClient.queryAllCameras({
  org: 'iccsid',
  pageSize: 100
});
```

方式二 - 通过API对象调用（向后兼容）：
```
// 海康威视示例
const deviceInfo = await hikvisionClient.api.getDeviceInfo();

// 大华示例
const devices = await dahuaClient.api.getDevicesPage({
  pageNum: 1,
  pageSize: 100
});

// 宇视示例
const cameras = await univiewClient.api.queryAllCameras({
  org: 'iccsid',
  pageSize: 100
});
```

两种方式功能完全相同，您可以根据喜好选择使用。

```
try {
  // 海康威视示例 - 现在可以直接调用API方法，无需使用 .api 前缀
  const deviceInfo = await hikvisionClient.getDeviceInfo();
  console.log('设备信息:', deviceInfo);
  
  // 大华示例
  const devices = await dahuaClient.getDevicesPage({
    pageNum: 1,
    pageSize: 100
  });
  console.log('设备列表:', devices);
  
  // 宇视示例
  const cameras = await univiewClient.queryAllCameras({
    org: 'iccsid',
    pageSize: 100
  });
  console.log('摄像机列表:', cameras);
} catch (error) {
  if (error instanceof ApiError) {
    console.error('API错误:', error.message);
  } else if (error instanceof AuthError) {
    console.error('认证错误:', error.message);
  } else if (error instanceof NetworkError) {
    console.error('网络错误:', error.message);
  } else {
    console.error('未知错误:', error.message);
  }
}
```

#### 通用请求方法

如果需要调用SDK中未封装的API，可以使用通用的request方法：

```
try {
  // 海康威视示例
  const result = await hikvisionClient.request('GET', '/ISAPI/System/deviceInfo');
  console.log('设备信息:', result.data);
  
  // 大华示例
  const devices = await dahuaClient.request('POST', '/evo-apigw/evo-brm/1.2.0/device/subsystem/page', {
    data: {
      pageNum: 1,
      pageSize: 10
    }
  });
  console.log('设备分页信息:', devices.data);
  
  // 宇视示例
  const orgs = await univiewClient.request('GET', '/VIID/query', {
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
  console.log('组织信息:', orgs.data);
} catch (error) {
  console.error('请求失败:', error.message);
}
```

## 项目结构

```
security-camera-sdk/
├── index.js                 # 主入口文件
├── package.json             # 项目配置文件
├── README.md                # 说明文档
├── USAGE.md                 # 详细使用文档
├── src/                     # 源代码目录
│   ├── utils/               # 工具类
│   │   ├── logger.js        # 日志工具
│   │   └── errors/          # 错误处理
│   │       └── cameraErrors.js  # 统一错误处理类
│   └── vendors/             # 各厂商SDK实现
│       ├── hikvision/       # 海康威视SDK
│       │   ├── auth.js      # 认证模块
│       │   ├── api.js       # API接口封装
│       │   └── client.js    # 客户端实现
│       ├── dahua/           # 大华SDK
│       │   ├── auth.js      # 认证模块
│       │   ├── api.js       # API接口封装
│       │   └── client.js    # 客户端实现
│       └── uniview/         # 宇视SDK
│           ├── auth.js      # 认证模块
│           ├── api.js       # API接口封装
│           └── client.js    # 客户端实现
└── test/                   # 测试文件
    ├── simple-test.js      # 简单测试文件
    └── example.js          # 完整示例文件
```

## 支持的厂商

| 厂商 | 认证方式 | 协议 | 端口 |
|------|----------|------|------|
| 海康威视 (Hikvision) | App Key/Secret | HTTPS | 443 |
| 大华 (Dahua) | Username/Password + Client ID/Secret | HTTPS | 443 |
| 宇视 (Uniview) | Username/Password | HTTP | 80 |

## 错误处理

所有厂商SDK都使用统一的错误处理机制：

```
try {
  // 调用任意厂商的SDK方法
} catch (error) {
  if (error instanceof ApiError) {
    // 处理API错误
    console.error('API错误:', error.message);
  } else if (error instanceof AuthError) {
    // 处理认证错误
    console.error('认证错误:', error.message);
  } else if (error instanceof NetworkError) {
    // 处理网络错误
    console.error('网络错误:', error.message);
  } else {
    // 处理其他错误
    console.error('未知错误:', error.message);
  }
}
```

## 资源清理

使用完毕后，建议关闭客户端连接以释放资源：

```
// 关闭宇视客户端（清理保活定时器）
await univiewClient.close();

// 关闭大华客户端
await dahuaClient.close();

// 海康威视客户端不需要特殊关闭处理
```

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request 来帮助改进这个项目。
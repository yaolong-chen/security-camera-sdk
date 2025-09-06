# 统一摄像头SDK使用指南

本文档介绍了如何使用统一摄像头SDK来对接海康威视、大华、宇视等不同厂商的设备。

## 安装

```bash
npm install security-camera-sdk
```

## 支持的厂商

- 海康威视 (Hikvision)
- 大华 (Dahua)
- 宇视 (Uniview)

## 配置参数

不同厂商需要不同的配置参数：

### 海康威视配置参数

```env
HIKVISION_HOST=your_hikvision_host
HIKVISION_PORT=443
HIKVISION_PROTOCOL=https
HIKVISION_APPKEY=your_app_key
HIKVISION_APPSECRET=your_app_secret
HIKVISION_VERIFY_SSL=false
```

### 大华配置参数

```env
DAHUA_HOST=your_dahua_host
DAHUA_PORT=443
DAHUA_PROTOCOL=https
DAHUA_USERNAME=your_username
DAHUA_PASSWORD=your_password
DAHUA_CLIENT_ID=your_client_id
DAHUA_CLIENT_SECRET=your_client_secret
```

### 宇视配置参数

```env
UNIVIEW_HOST=your_uniview_host
UNIVIEW_PORT=8088
UNIVIEW_PROTOCOL=http
UNIVIEW_USERNAME=your_username
UNIVIEW_PASSWORD=your_password
```

## 使用方法

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
  host: process.env.HIKVISION_HOST,
  port: process.env.HIKVISION_PORT,
  protocol: process.env.HIKVISION_PROTOCOL,
  appKey: process.env.HIKVISION_APPKEY,
  appSecret: process.env.HIKVISION_APPSECRET,
  rejectUnauthorized: process.env.HIKVISION_VERIFY_SSL === 'true',
  debug: true
};

const hikvisionClient = new HikvisionClient(hikvisionConfig);
```

#### 大华客户端

```javascript
const dahuaConfig = {
  host: process.env.DAHUA_HOST,
  port: process.env.DAHUA_PORT,
  protocol: process.env.DAHUA_PROTOCOL,
  username: process.env.DAHUA_USERNAME,
  password: process.env.DAHUA_PASSWORD,
  client_id: process.env.DAHUA_CLIENT_ID,
  client_secret: process.env.DAHUA_CLIENT_SECRET,
  debug: true
};

const dahuaClient = new DahuaClient(dahuaConfig);
```

#### 宇视客户端

```javascript
const univiewConfig = {
  host: process.env.UNIVIEW_HOST,
  port: process.env.UNIVIEW_PORT,
  protocol: process.env.UNIVIEW_PROTOCOL,
  username: process.env.UNIVIEW_USERNAME,
  password: process.env.UNIVIEW_PASSWORD,
  debug: true
};

const univiewClient = new UniviewClient(univiewConfig);
```

### 3. 使用客户端

所有厂商现在都支持自动认证处理，无需手动登录。SDK支持两种调用方式：

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

#### 调用API

##### 海康威视示例

```javascript
try {
  // 获取摄像头列表
  const cameras = await hikvisionClient.getCameras({
    pageNo: 1,
    pageSize: 100
  });
  console.log('海康威视摄像头列表:', cameras);
  
  // 获取设备信息
  const deviceInfo = await hikvisionClient.getDeviceInfo();
  console.log('海康威视设备信息:', deviceInfo);
} catch (error) {
  if (error instanceof ApiError) {
    console.error('海康威视API错误:', error.message);
  } else if (error instanceof AuthError) {
    console.error('海康威视认证错误:', error.message);
  } else {
    console.error('海康威视其他错误:', error.message);
  }
}
```

##### 大华示例

```
try {
  // 获取设备列表（自动处理认证）
  const devices = await dahuaClient.api.getDevicesPage({
    pageNum: 1,
    pageSize: 100
  });
  console.log('大华设备列表:', devices);
  
  // 获取组织结构
  const organizations = await dahuaClient.api.getAllOrganizations();
  console.log('大华组织结构:', organizations);
} catch (error) {
  if (error instanceof ApiError) {
    console.error('大华API错误:', error.message);
  } else if (error instanceof AuthError) {
    console.error('大华认证错误:', error.message);
  } else {
    console.error('大华其他错误:', error.message);
  }
}
```

##### 宇视示例

```
try {
  // 查询所有摄像机（自动处理认证）
  const cameras = await univiewClient.api.queryAllCameras({
    org: 'iccsid',
    pageSize: 100
  });
  console.log('宇视摄像机列表:', cameras);
  
  // 查询所有组织
  const organizations = await univiewClient.api.queryAllOrgs({
    org: 'iccsid',
    pageSize: 100
  });
  console.log('宇视组织结构:', organizations);
} catch (error) {
  if (error instanceof ApiError) {
    console.error('宇视API错误:', error.message);
  } else if (error instanceof AuthError) {
    console.error('宇视认证错误:', error.message);
  } else {
    console.error('宇视其他错误:', error.message);
  }
}
```

### 4. 使用通用请求方法

如果需要调用SDK中未封装的API，可以使用通用的request方法：

#### 海康威视通用请求示例

```
try {
  // 使用通用请求方法调用海康威视API
  const result = await hikvisionClient.request('GET', '/ISAPI/System/deviceInfo');
  console.log('设备信息:', result.data);
  
  // POST请求示例
  const postData = await hikvisionClient.request('POST', '/ISAPI/ContentMgmt/StreamingProxy/channels', {
    data: {
      // 请求体数据
    }
  });
  console.log('POST请求结果:', postData);
} catch (error) {
  console.error('请求失败:', error.message);
}
```

#### 大华通用请求示例

```
try {
  // 使用通用请求方法调用大华API
  const result = await dahuaClient.request('GET', '/evo-apigw/evo-brm/1.2.0/device/subsystem/page', {
    params: {
      pageNum: 1,
      pageSize: 10
    }
  });
  console.log('设备分页信息:', result.data);
} catch (error) {
  console.error('请求失败:', error.message);
}
```

#### 宇视通用请求示例

```
try {
  // 使用通用请求方法调用宇视API
  const result = await univiewClient.request('GET', '/VIID/query', {
    params: {
      org: 'iccsid',
      condition: JSON.stringify({
        ItemNum: 1,
        Condition: [],
        QueryCount: 1,
        PageFirstRowNumber: 0,
        PageRowNum: 20
      })
    }
  });
  console.log('查询结果:', result.data);
} catch (error) {
  console.error('请求失败:', error.message);
}
```

## 统一错误处理

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

## 关闭连接

使用完毕后，建议关闭客户端连接以释放资源：

```
// 关闭宇视客户端（清理保活定时器）
await univiewClient.close();

// 关闭大华客户端
await dahuaClient.close();

// 海康威视客户端不需要特殊关闭处理
```

## 注意事项

1. 不同厂商的认证机制不同，但现在已经统一为自动处理，无需手动登录
2. 宇视和大华提供了保活机制，会自动维持连接
3. 所有API调用都是异步的，应使用async/await或Promise处理
4. 建议在生产环境中关闭debug模式
5. 宇视SDK使用了定时器进行保活，因此在程序退出前应调用close()方法清理资源
6. 如果不调用close()方法，对于宇视客户端，可能会导致程序无法正常退出，因为保活定时器仍在运行
7. 通用request方法允许直接调用厂商原生API，提供了更大的灵活性
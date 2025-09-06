/**
 * 海康威视 OpenAPI 常用接口封装
 * 基于海康威视 Artemis 开放平台
 */

const { ParameterError } = require("../../utils/errors/cameraErrors");
const { Logger } = require("../../utils/logger");

/**
 * API接口常量
 */
const API_PATHS = {
  // OAuth相关
  OAUTH_TOKEN: "/artemis/api/v1/oauth/token",

  // 资源管理
  CAMERAS: "/artemis/api/resource/v1/cameras",
  CAMERA_PREVIEW_URLS: "/artemis/api/video/v1/cameras/previewURLs",
  REGIONS: "/artemis/api/resource/v1/regions",
  ORGANIZATIONS: "/artemis/api/resource/v1/org/orgList",

  // 事件管理
  EVENTS: "/artemis/api/event/v1/events",
  EVENTS_SUBSCRIPTION: "/artemis/api/event/v1/eventSubscriptionByEventTypes",

  // 设备管理
  DEVICES: "/artemis/api/resource/v1/devices",
  DEVICE_STATUS: "/artemis/api/nms/v1/online/device/get",

  // 人员管理
  PERSONS: "/artemis/api/resource/v1/person",
  FACE_PICTURES: "/artemis/api/resource/v1/face/picture",

  // 车辆管理
  VEHICLES: "/artemis/api/resource/v1/vehicle",
  VEHICLE_PICTURES: "/artemis/api/resource/v1/vehicle/picture",

  // 门禁管理
  ACCESS_CONTROL_POINTS: "/artemis/api/acs/v1/accessControlPoint",
  CARD_READERS: "/artemis/api/acs/v1/cardReader",
  DOORS: "/artemis/api/acs/v1/door",

  // 报警管理
  ALARM_INPUTS: "/artemis/api/resource/v1/alarmInputs",
  ALARM_OUTPUTS: "/artemis/api/resource/v1/alarmOutputs",
};

/**
 * API方法封装类
 */
class HikvisionAPI {
  constructor(client) {
    this.client = client;
  }

  // =================== OAuth相关 ===================

  /**
   * 获取OAuth Token
   * @returns {Promise<Object>} Token信息
   */
  async getOAuthToken() {
    const response = await this.client.post(API_PATHS.OAUTH_TOKEN);
    return response.data;
  }

  // =================== 摄像头管理 ===================

  /**
   * 获取摄像头列表
   * @param {Object} options 查询选项
   * @param {number} options.pageNo 页码，默认1
   * @param {number} options.pageSize 每页大小，默认1000
   * @param {string} options.cameraName 摄像头名称（模糊查询）
   * @param {string} options.regionIndexCode 区域编码
   * @returns {Promise<Object>} 摄像头列表
   */
  async getCameras(options = {}) {
    const params = {
      pageNo: options.pageNo || 1,
      pageSize: options.pageSize || 1000,
      ...options,
    };

    const response = await this.client.post(API_PATHS.CAMERAS, params);
    return response.data;
  }

  /**
   * 获取单个摄像头信息
   * @param {string} cameraIndexCode 摄像头编码
   * @returns {Promise<Object>} 摄像头信息
   */
  async getCamera(cameraIndexCode) {
    if (!cameraIndexCode) {
      throw new ParameterError(
        "摄像头编码不能为空",
        "cameraIndexCode",
        cameraIndexCode
      );
    }

    const params = {
      cameraIndexCode: cameraIndexCode,
    };

    const response = await this.client.post(API_PATHS.CAMERAS, params);
    return response.data;
  }

  /**
   * 获取摄像头预览地址
   * @param {Object} options 选项
   * @param {string} options.cameraIndexCode 摄像头编码
   * @param {number} options.streamType 码流类型：0-主码流，1-子码流，2-第三码流
   * @param {string} options.protocol 协议类型：rtsp，rtmp，hls等
   * @param {number} options.transmode 传输模式：0-UDP，1-TCP
   * @returns {Promise<Object>} 预览地址信息
   */
  async getCameraPreviewUrl(options) {
    if (!options.cameraIndexCode) {
      throw new ParameterError(
        "摄像头编码不能为空",
        "cameraIndexCode",
        options.cameraIndexCode
      );
    }

    const params = {
      cameraIndexCode: options.cameraIndexCode,
      streamType: options.streamType || 0,
      protocol: options.protocol || "rtsp",
      transmode: options.transmode || 0,
    };

    const response = await this.client.post(
      API_PATHS.CAMERA_PREVIEW_URLS,
      params
    );
    return response.data;
  }

  // =================== 区域管理 ===================

  /**
   * 获取区域列表
   * @param {Object} options 查询选项
   * @param {number} options.pageNo 页码，默认1
   * @param {number} options.pageSize 每页大小，默认1000
   * @param {string} options.treeCode 树节点编码
   * @returns {Promise<Object>} 区域列表
   */
  async getRegions(options = {}) {
    const params = {
      pageNo: options.pageNo || 1,
      pageSize: options.pageSize || 1000,
      treeCode: options.treeCode || "0",
      ...options,
    };

    const response = await this.client.post(API_PATHS.REGIONS, params);
    return response.data;
  }

  // =================== 组织管理 ===================

  /**
   * 获取组织列表
   * @param {Object} options 查询选项
   * @param {number} options.pageNo 页码，默认1
   * @param {number} options.pageSize 每页大小，默认1000
   * @returns {Promise<Object>} 组织列表
   */
  async getOrganizations(options = {}) {
    const params = {
      pageNo: options.pageNo || 1,
      pageSize: options.pageSize || 1000,
      ...options,
    };

    const response = await this.client.post(API_PATHS.ORGANIZATIONS, params);
    return response.data;
  }

  // =================== 事件管理 ===================

  /**
   * 获取事件列表
   * @param {Object} options 查询选项
   * @param {string} options.startTime 开始时间（ISO格式）
   * @param {string} options.endTime 结束时间（ISO格式）
   * @param {Array} options.eventTypes 事件类型列表
   * @param {number} options.pageNo 页码，默认1
   * @param {number} options.pageSize 每页大小，默认1000
   * @returns {Promise<Object>} 事件列表
   */
  async getEvents(options = {}) {
    const params = {
      pageNo: options.pageNo || 1,
      pageSize: options.pageSize || 1000,
      ...options,
    };

    const response = await this.client.post(API_PATHS.EVENTS, params);
    return response.data;
  }

  /**
   * 订阅事件
   * @param {Object} options 订阅选项
   * @param {Array} options.eventTypes 事件类型列表
   * @param {string} options.eventDest 事件推送地址
   * @returns {Promise<Object>} 订阅结果
   */
  async subscribeEvents(options) {
    if (!options.eventTypes || !Array.isArray(options.eventTypes)) {
      throw new ParameterError(
        "事件类型列表不能为空",
        "eventTypes",
        options.eventTypes
      );
    }

    const response = await this.client.post(
      API_PATHS.EVENTS_SUBSCRIPTION,
      options
    );
    return response.data;
  }

  // =================== 设备管理 ===================

  /**
   * 获取设备列表
   * @param {Object} options 查询选项
   * @param {number} options.pageNo 页码，默认1
   * @param {number} options.pageSize 每页大小，默认1000
   * @returns {Promise<Object>} 设备列表
   */
  async getDevices(options = {}) {
    const params = {
      pageNo: options.pageNo || 1,
      pageSize: options.pageSize || 1000,
      ...options,
    };

    const response = await this.client.post(API_PATHS.DEVICES, params);
    return response.data;
  }

  /**
   * 获取设备在线状态
   * @param {Object} options 查询选项
   * @param {Array} options.indexCodes 设备编码列表
   * @returns {Promise<Object>} 设备状态列表
   */
  async getDeviceStatus(options) {
    if (!options.indexCodes || !Array.isArray(options.indexCodes)) {
      throw new ParameterError(
        "设备编码列表不能为空",
        "indexCodes",
        options.indexCodes
      );
    }

    const response = await this.client.post(API_PATHS.DEVICE_STATUS, options);
    return response.data;
  }

  // =================== 人员管理 ===================

  /**
   * 获取人员列表
   * @param {Object} options 查询选项
   * @param {number} options.pageNo 页码，默认1
   * @param {number} options.pageSize 每页大小，默认1000
   * @returns {Promise<Object>} 人员列表
   */
  async getPersons(options = {}) {
    const params = {
      pageNo: options.pageNo || 1,
      pageSize: options.pageSize || 1000,
      ...options,
    };

    const response = await this.client.post(API_PATHS.PERSONS, params);
    return response.data;
  }

  /**
   * 添加人员
   * @param {Object} personData 人员数据
   * @param {string} personData.personName 人员姓名
   * @param {string} personData.orgIndexCode 组织编码
   * @returns {Promise<Object>} 添加结果
   */
  async addPerson(personData) {
    if (!personData.personName) {
      throw new ParameterError(
        "人员姓名不能为空",
        "personName",
        personData.personName
      );
    }

    const response = await this.client.post(API_PATHS.PERSONS, personData);
    return response.data;
  }

  // =================== 车辆管理 ===================

  /**
   * 获取车辆列表
   * @param {Object} options 查询选项
   * @param {number} options.pageNo 页码，默认1
   * @param {number} options.pageSize 每页大小，默认1000
   * @returns {Promise<Object>} 车辆列表
   */
  async getVehicles(options = {}) {
    const params = {
      pageNo: options.pageNo || 1,
      pageSize: options.pageSize || 1000,
      ...options,
    };

    const response = await this.client.post(API_PATHS.VEHICLES, params);
    return response.data;
  }

  // =================== 门禁管理 ===================

  /**
   * 获取门禁点列表
   * @param {Object} options 查询选项
   * @param {number} options.pageNo 页码，默认1
   * @param {number} options.pageSize 每页大小，默认1000
   * @returns {Promise<Object>} 门禁点列表
   */
  async getAccessControlPoints(options = {}) {
    const params = {
      pageNo: options.pageNo || 1,
      pageSize: options.pageSize || 1000,
      ...options,
    };

    const response = await this.client.post(
      API_PATHS.ACCESS_CONTROL_POINTS,
      params
    );
    return response.data;
  }

  /**
   * 获取读卡器列表
   * @param {Object} options 查询选项
   * @param {number} options.pageNo 页码，默认1
   * @param {number} options.pageSize 每页大小，默认1000
   * @returns {Promise<Object>} 读卡器列表
   */
  async getCardReaders(options = {}) {
    const params = {
      pageNo: options.pageNo || 1,
      pageSize: options.pageSize || 1000,
      ...options,
    };

    const response = await this.client.post(API_PATHS.CARD_READERS, params);
    return response.data;
  }

  /**
   * 获取门列表
   * @param {Object} options 查询选项
   * @param {number} options.pageNo 页码，默认1
   * @param {number} options.pageSize 每页大小，默认1000
   * @returns {Promise<Object>} 门列表
   */
  async getDoors(options = {}) {
    const params = {
      pageNo: options.pageNo || 1,
      pageSize: options.pageSize || 1000,
      ...options,
    };

    const response = await this.client.post(API_PATHS.DOORS, params);
    return response.data;
  }

  // =================== 通用方法 ===================

  /**
   * 通用分页查询方法
   * @param {string} apiPath API路径
   * @param {Object} options 查询选项
   * @returns {Promise<Object>} 查询结果
   */
  async paginatedQuery(apiPath, options = {}) {
    const params = {
      pageNo: options.pageNo || 1,
      pageSize: options.pageSize || 1000,
      ...options,
    };

    const response = await this.client.post(apiPath, params);
    return response.data;
  }

  /**
   * 批量处理数据
   * @param {Function} apiMethod API方法
   * @param {Array} dataList 数据列表
   * @param {number} batchSize 批次大小
   * @returns {Promise<Array>} 处理结果列表
   */
  async batchProcess(apiMethod, dataList, batchSize = 10) {
    const results = [];

    for (let i = 0; i < dataList.length; i += batchSize) {
      const batch = dataList.slice(i, i + batchSize);
      const batchPromises = batch.map((data) => apiMethod.call(this, data));

      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      } catch (error) {
        throw new Error(
          `批量处理失败，批次: ${Math.floor(i / batchSize) + 1}, 错误: ${
            error.message
          }`
        );
      }
    }

    return results;
  }
}

module.exports = { HikvisionAPI, API_PATHS };
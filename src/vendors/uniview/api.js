/**
 * 宇视平台 OpenAPI 常用接口封装
 */

const { ParameterError } = require("../../utils/errors/cameraErrors");
const { Logger } = require("../../utils/logger");

/**
 * API接口常量
 */
const API_PATHS = {
  // 认证相关
  LOGIN: '/VIID/login',
  TOKEN_KEEP_ALIVE: '/VIID/token/alive/keep',

  // 资源管理
  QUERY_RESOURCES: '/VIID/query',
  
  // 第三方设备管理
  QUERY_THIRD_PARTY_IPC: '/VIID/hadesadapter/third/party/ec/v2/query',
};

/**
 * API方法封装类
 */
class UniviewAPI {
  constructor(client) {
    this.client = client;
  }

  // =================== 认证相关 ===================

  /**
   * 获取访问码
   * @returns {Promise<Object>} 访问码信息
   */
  async getAccessCode() {
    const response = await this.client.rawPost(API_PATHS.LOGIN);
    return response.data;
  }

  /**
   * 登录
   * @param {string} loginData 登录数据
   * @returns {Promise<Object>} 登录结果
   */
  async login(loginData) {
    const response = await this.client.rawPost(API_PATHS.LOGIN, loginData, {
      headers: { 'Content-Type': 'text/plain' },
    });
    return response.data;
  }

  /**
   * 保持Token活跃
   * @returns {Promise<Object>} 保活结果
   */
  async keepTokenAlive() {
    const response = await this.client.get(API_PATHS.TOKEN_KEEP_ALIVE);
    return response.data;
  }

  // =================== 资源查询 ===================

  /**
   * 查询资源
   * @param {Object} options 查询选项
   * @param {string} options.org 组织编码
   * @param {Object} options.condition 查询条件
   * @returns {Promise<Object>} 查询结果
   */
  async queryResources(options = {}) {
    if (!options.org) {
      throw new ParameterError("组织编码不能为空", "org", options.org);
    }

    if (!options.condition) {
      throw new ParameterError("查询条件不能为空", "condition", options.condition);
    }

    const params = {
      org: options.org,
      condition: options.condition
    };

    const response = await this.client.get(API_PATHS.QUERY_RESOURCES, { params });
    return response.data;
  }

  /**
   * 查询所有资源（自动翻页）
   * @param {Object} options 查询选项
   * @param {string} options.org 组织编码
   * @param {Object} options.condition 查询条件
   * @param {number} options.pageSize 每页大小
   * @returns {Promise<Object>} 查询结果
   */
  async queryAllResources(options = {}) {
    const defaultOptions = {
      pageSize: 200
    };

    const finalOptions = { ...defaultOptions, ...options };
    
    // 设置分页参数
    const finalCondition = { ...finalOptions.condition };
    finalCondition.QueryCount = 1;
    finalCondition.PageRowNum = finalOptions.pageSize;

    let allItems = [];
    let currentPage = 0;
    let total = 0;

    while (true) {
      finalCondition.PageFirstRowNumber = currentPage * finalOptions.pageSize;

      try {
        const response = await this.queryResources({
          org: finalOptions.org,
          condition: finalCondition,
        });

        const items = response.Result?.InfoList || [];
        const pageInfo = response.Result?.RspPageInfo;

        allItems = allItems.concat(items);
        total = pageInfo?.TotalRowNum || 0;

        // 判断是否还有下一页
        if (allItems.length >= total || items.length === 0) {
          break;
        }

        currentPage++;
      } catch (err) {
        throw err;
      }
    }

    return {
      ErrCode: 0,
      Result: {
        InfoList: allItems,
        RspPageInfo: {
          TotalRowNum: allItems.length,
          PageFirstRowNumber: 0,
          PageRowNum: allItems.length,
        }
      }
    };
  }

  /**
   * 查询所有摄像机
   * @param {Object} options 查询选项
   * @param {string} options.org 组织编码
   * @param {number} options.pageSize 每页大小
   * @returns {Promise<Object>} 查询结果
   */
  async queryAllCameras(options = {}) {
    const condition = {
      ItemNum: 2,
      Condition: [
        {
          QueryType: 256,
          LogicFlag: 0,
          QueryData: "1001"  // 1001 = 摄像机
        },
        {
          QueryType: 257,
          LogicFlag: 0,
          QueryData: "1"     // 1 = 查子组织
        }
      ]
    };

    return await this.queryAllResources({ 
      org: options.org, 
      condition, 
      pageSize: options.pageSize 
    });
  }

  /**
   * 查询所有组织
   * @param {Object} options 查询选项
   * @param {string} options.org 组织编码
   * @param {number} options.pageSize 每页大小
   * @returns {Promise<Object>} 查询结果
   */
  async queryAllOrgs(options = {}) {
    const defaultOptions = {
      org: 'iccsid',
      pageSize: 200
    };

    const finalOptions = { ...defaultOptions, ...options };

    const condition = {
      ItemNum: 3,
      Condition: [
        {
          QueryType: 256,
          LogicFlag: 0,
          QueryData: "1"
        },
        {
          QueryType: 257,
          LogicFlag: 0,
          QueryData: "1"
        },
        {
          QueryType: 1,
          LogicFlag: 5,
          QueryData: ""
        }
      ]
    };

    return await this.queryAllResources({ 
      org: finalOptions.org, 
      condition, 
      pageSize: finalOptions.pageSize 
    });
  }

  /**
   * 查询第三方IPC设备信息
   * @param {string} ipcCode IPC设备编码
   * @returns {Promise<Object>} 查询结果
   */
  async queryThirdPartyIPC(ipcCode = '192168002041') {
    const params = {
      pszThirdPartyIPCCode: ipcCode
    };
    
    const response = await this.client.get(API_PATHS.QUERY_THIRD_PARTY_IPC, { params });
    return response.data;
  }
}

module.exports = { UniviewAPI, API_PATHS };
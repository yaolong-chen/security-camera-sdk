/**
 * 大华ICC平台 OpenAPI 常用接口封装
 */

const { ParameterError } = require("../../utils/errors/cameraErrors");
const { Logger } = require("../../utils/logger");

/**
 * API接口常量
 */
const API_PATHS = {
  // OAuth相关
  PUBLIC_KEY: '/evo-apigw/evo-oauth/1.0.0/oauth/public-key',
  ACCESS_TOKEN: '/evo-apigw/evo-oauth/1.0.0/oauth/extend/token',

  // 设备管理
  DEVICES_PAGE: '/evo-apigw/evo-brm/1.2.0/device/subsystem/page',

  // 组织管理
  ORGANIZATIONS_PAGE: '/evo-apigw/evo-brm/1.2.0/organization/page',

  // 录像回放
  PLAYBACK_BY_TIME: '/evo-apigw/admin/API/SS/Playback/StartPlaybackByTime',
};

/**
 * API方法封装类
 */
class DahuaAPI {
  constructor(client) {
    this.client = client;
  }

  // =================== OAuth相关 ===================

  /**
   * 获取ICC公钥
   * @returns {Promise<string>} 公钥
   */
  async getPublicKey() {
    const response = await this.client.get(API_PATHS.PUBLIC_KEY);
    if (response.data?.success) {
      return response.data.data?.publicKey;
    } else {
      throw new Error(response.data?.errMsg || '获取公钥失败');
    }
  }

  /**
   * 获取访问令牌
   * @param {string} publicKey 公钥
   * @returns {Promise<Object>} 访问令牌信息
   */
  async getAccessToken(publicKey) {
    const response = await this.client.post(API_PATHS.ACCESS_TOKEN, 
      this.client.auth.buildAuthData(publicKey));
    return response.data;
  }

  // =================== 设备管理 ===================

  /**
   * 分页查询设备
   * @param {Object} options 查询选项
   * @param {number} options.pageNum 页码，默认1
   * @param {number} options.pageSize 每页大小，默认50
   * @param {number} options.showChildNodeData 是否包含子节点，默认1
   * @returns {Promise<Object>} 设备列表
   */
  async getDevicesPage(options = {}) {
    const params = {
      pageNum: options.pageNum || 1,
      pageSize: options.pageSize || 50,
      showChildNodeData: options.showChildNodeData || 1,
      ...options,
    };

    const response = await this.client.post(API_PATHS.DEVICES_PAGE, params);
    return response.data;
  }

  // =================== 组织管理 ===================

  /**
   * 分页查询组织结构
   * @param {Object} options 查询选项
   * @param {number} options.pageNum 页码，默认1
   * @param {number} options.pageSize 每页大小，默认1000
   * @returns {Promise<Object>} 组织列表
   */
  async getOrganizationsPage(options = {}) {
    const defaultParams = {
      pageNum: 1,
      pageSize: 1000,
    };

    const params = { ...defaultParams, ...options };
    const response = await this.client.get(API_PATHS.ORGANIZATIONS_PAGE, { params });
    return response.data;
  }

  /**
   * 获取全量组织结构（自动分页）
   * @returns {Promise<Array>} 全量组织结构
   */
  async getAllOrganizations() {
    const allOrgs = [];
    let pageNum = 1;
    const pageSize = 1000;

    while (true) {
      const result = await this.getOrganizationsPage({
        pageNum,
        pageSize
      });

      if (!result.success) {
        throw new Error(`获取组织分页失败: ${result.msg}`);
      }

      if (!result.data) {
        throw new Error('接口返回数据为空');
      }

      const { pageData, totalRows } = result.data;
      const total = totalRows;

      // 检查 pageData 是否为数组
      if (!Array.isArray(pageData)) {
        throw new Error(`第 ${pageNum} 页返回的 pageData 不是数组`);
      }

      // 合并数据
      allOrgs.push(...pageData);

      // 判断是否拉取完成
      if (typeof total === 'number' && !isNaN(total)) {
        if (allOrgs.length >= total) {
          break;
        }
      } else {
        // 防止无限循环：如果没有 totalRows，最多拉 100 页
        if (pageData.length < pageSize) {
          break;
        }

        // 防止死循环
        if (pageNum >= 100) {
          break;
        }
      }

      pageNum++;
    }

    return allOrgs;
  }

  // =================== 录像回放 ===================

  /**
   * 以时间形式回放录像，获取 RTSP 流地址
   * @param {Object} data 请求参数
   * @returns {Promise<Object>} 回放结果
   */
  async startPlaybackByTime(data) {
    const response = await this.client.post(API_PATHS.PLAYBACK_BY_TIME, data);
    return response.data;
  }
}

module.exports = { DahuaAPI, API_PATHS };
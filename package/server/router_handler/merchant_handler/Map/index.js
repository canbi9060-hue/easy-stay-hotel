const { success, serverFail, validationFail } = require('../../../utils/response');
const {
  getClientIp,
  getMerchantInitialLocation,
  getMerchantDistrictOptions,
  geocodeAddressText,
  reverseGeocodeCoordinates,
} = require('./service');

const handleMapError = (res, error, messages = {}) => {
  if (error.kind === 'validation') {
    return res.json(validationFail(error.message, error.field || 'keyword'));
  }

  if (error.kind === 'config') {
    console.error('地图服务配置异常:', error);
    return res.json(serverFail(messages.config || '地图服务未配置，请联系管理员'));
  }

  console.error(messages.log || '地图服务调用失败:', error);
  return res.json(serverFail(messages.server || '地图服务调用失败，请稍后重试'));
};

exports.getMerchantMapInitialLocation = async (req, res) => {
  try {
    const initialLocation = await getMerchantInitialLocation(req.user.id, getClientIp(req));
    res.json(success(initialLocation, '获取地图初始化位置成功'));
  } catch (error) {
    handleMapError(res, error, {
      config: '地图初始化服务未配置，请联系管理员',
      server: '获取地图初始化位置失败，请稍后重试',
      log: '获取地图初始化位置失败:',
    });
  }
};

exports.getMerchantMapDistrictOptions = async (req, res) => {
  try {
    const districtOptions = await getMerchantDistrictOptions(req.query?.keyword);
    res.json(success(districtOptions, '获取行政区选项成功'));
  } catch (error) {
    handleMapError(res, error, {
      config: '地图行政区服务未配置，请联系管理员',
      server: '获取行政区选项失败，请稍后重试',
      log: '获取行政区选项失败:',
    });
  }
};

exports.getMerchantMapGeocode = async (req, res) => {
  try {
    const location = await geocodeAddressText(req.query?.address);
    res.json(success(location, '地址定位成功'));
  } catch (error) {
    handleMapError(res, error, {
      config: '地图地理编码服务未配置，请联系管理员',
      server: '地址定位失败，请稍后重试',
      log: '地图地理编码失败:',
    });
  }
};

exports.getMerchantMapRegeocode = async (req, res) => {
  try {
    const location = await reverseGeocodeCoordinates({
      longitude: req.query?.longitude,
      latitude: req.query?.latitude,
    });
    res.json(success(location, '坐标解析成功'));
  } catch (error) {
    handleMapError(res, error, {
      config: '地图逆地理编码服务未配置，请联系管理员',
      server: '坐标解析失败，请稍后重试',
      log: '地图逆地理编码失败:',
    });
  }
};

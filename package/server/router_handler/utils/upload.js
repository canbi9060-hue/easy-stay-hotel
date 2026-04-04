const { validationFail, notFoundFail, serverFail } = require('../../utils/response');
const { cleanupUploadedTempFiles } = require('./files');

const withMulterUpload = ({
  uploader,
  getFiles = (req) => req.files,
  mapMulterError,
  contextLabel = '上传处理',
  serverMessage = '处理失败，请稍后重试',
}, handler) => (req, res) => {
  uploader(req, res, async (err) => {
    if (err) {
      cleanupUploadedTempFiles(getFiles(req));
      const uploadError = typeof mapMulterError === 'function'
        ? mapMulterError(err)
        : { message: err.message || serverMessage, field: 'payload' };
      return res.json(validationFail(uploadError.message, uploadError.field || 'payload'));
    }

    try {
      await handler(req, res);
    } catch (error) {
      cleanupUploadedTempFiles(getFiles(req));
      if (error.kind === 'validation') {
        return res.json(validationFail(error.message, error.field || 'payload'));
      }
      if (error.kind === 'notFound') {
        return res.json(notFoundFail(error.message, error.field || 'id'));
      }
      console.error(`${contextLabel}失败:`, error);
      return res.json(serverFail(serverMessage));
    }
  });
};

module.exports = {
  withMulterUpload,
};

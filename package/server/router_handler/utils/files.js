const fs = require('fs');
const path = require('path');

const resolveServerPathByUploadPath = (filePath) =>
  path.join(__dirname, '..', '..', filePath.replace(/^\//, ''));

const cleanupUploadedTempFile = (file) => {
  if (!file?.path || !fs.existsSync(file.path)) {
    return;
  }
  fs.unlinkSync(file.path);
};

const cleanupUploadedTempFiles = (filesByField) => {
  if (!filesByField) {
    return;
  }

  if (Array.isArray(filesByField)) {
    filesByField.forEach(cleanupUploadedTempFile);
    return;
  }

  Object.values(filesByField).forEach((fileList) => {
    if (Array.isArray(fileList)) {
      fileList.forEach(cleanupUploadedTempFile);
    }
  });
};

const deleteLocalUploadSafely = (filePath, allowedPrefix) => {
  if (!filePath || !filePath.startsWith(allowedPrefix)) {
    return { ok: false, message: '文件路径不合法' };
  }

  const absolutePath = resolveServerPathByUploadPath(filePath);
  if (!fs.existsSync(absolutePath)) {
    return { ok: true, missing: true };
  }

  fs.unlinkSync(absolutePath);
  return { ok: true };
};

module.exports = {
  resolveServerPathByUploadPath,
  cleanupUploadedTempFile,
  cleanupUploadedTempFiles,
  deleteLocalUploadSafely,
};

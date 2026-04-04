const fs = require('fs');
const path = require('path');
const multer = require('multer');

const avatarDir = path.join(__dirname, '..', 'uploads', 'avatars');
const hotelImageDir = path.join(__dirname, '..', 'uploads', 'hotel-images');
const hotelCertificateDir = path.join(__dirname, '..', 'uploads', 'hotel-certificates');
const roomTypeImageDir = path.join(__dirname, '..', 'uploads', 'room-type-images');
fs.mkdirSync(avatarDir, { recursive: true });
fs.mkdirSync(hotelImageDir, { recursive: true });
fs.mkdirSync(hotelCertificateDir, { recursive: true });
fs.mkdirSync(roomTypeImageDir, { recursive: true });

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, avatarDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.png';
    cb(null, `avatar-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const avatarFileFilter = (_req, file, cb) => {
  if (!file.mimetype || !file.mimetype.startsWith('image/')) {
    return cb(new Error('仅支持上传图片文件'));
  }

  cb(null, true);
};

const avatarUpload = multer({
  storage: avatarStorage,
  fileFilter: avatarFileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});

const supportedHotelImageMimes = new Set(['image/jpeg', 'image/png']);
const hotelProfileMediaFieldConfig = {
  hotelImageFiles: {
    dir: hotelImageDir,
    prefix: 'hotel-image',
    maxCount: 14,
  },
  hotelCertificateFiles: {
    dir: hotelCertificateDir,
    prefix: 'hotel-certificate',
    maxCount: 7,
  },
};

const resolveSafeImageExtension = (file) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  return ext === '.jpg' || ext === '.jpeg' || ext === '.png' ? ext : '.jpg';
};

const hotelProfileMediaStorage = multer.diskStorage({
  destination: (_req, file, cb) => {
    const config = hotelProfileMediaFieldConfig[file?.fieldname];
    if (!config) {
      return cb(new Error('不支持的酒店媒体字段'));
    }
    cb(null, config.dir);
  },
  filename: (_req, file, cb) => {
    const config = hotelProfileMediaFieldConfig[file?.fieldname];
    if (!config) {
      return cb(new Error('不支持的酒店媒体字段'));
    }
    cb(null, `${config.prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}${resolveSafeImageExtension(file)}`);
  },
});

const hotelProfileMediaFileFilter = (_req, file, cb) => {
  if (!hotelProfileMediaFieldConfig[file?.fieldname]) {
    return cb(new Error('不支持的酒店媒体字段'));
  }
  if (!supportedHotelImageMimes.has(file?.mimetype)) {
    return cb(new Error('仅支持 JPG/PNG 格式图片'));
  }

  cb(null, true);
};

const hotelProfileMediaUpload = multer({
  storage: hotelProfileMediaStorage,
  fileFilter: hotelProfileMediaFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 21,
  },
});

const roomTypeImageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, roomTypeImageDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ext === '.jpg' || ext === '.jpeg' || ext === '.png' ? ext : '.jpg';
    cb(null, `room-type-image-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

const roomTypeImageFileFilter = (_req, file, cb) => {
  if (!supportedHotelImageMimes.has(file?.mimetype)) {
    return cb(new Error('仅支持 JPG/PNG 格式图片'));
  }

  cb(null, true);
};

const roomTypeImageUpload = multer({
  storage: roomTypeImageStorage,
  fileFilter: roomTypeImageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 12,
  },
});

module.exports = {
  avatarUpload: avatarUpload.single('avatar'),
  hotelProfileMediaUpload: hotelProfileMediaUpload.fields([
    {
      name: 'hotelImageFiles',
      maxCount: hotelProfileMediaFieldConfig.hotelImageFiles.maxCount,
    },
    {
      name: 'hotelCertificateFiles',
      maxCount: hotelProfileMediaFieldConfig.hotelCertificateFiles.maxCount,
    },
  ]),
  roomTypeImageUpload: roomTypeImageUpload.array('images', 12),
};

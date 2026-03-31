const fs = require('fs');
const path = require('path');
const multer = require('multer');

const avatarDir = path.join(__dirname, '..', 'uploads', 'avatars');
const hotelImageDir = path.join(__dirname, '..', 'uploads', 'hotel-images');
const hotelCertificateDir = path.join(__dirname, '..', 'uploads', 'hotel-certificates');
fs.mkdirSync(avatarDir, { recursive: true });
fs.mkdirSync(hotelImageDir, { recursive: true });
fs.mkdirSync(hotelCertificateDir, { recursive: true });

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
const hotelImageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, hotelImageDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ext === '.jpg' || ext === '.jpeg' || ext === '.png' ? ext : '.jpg';
    cb(null, `hotel-image-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

const hotelImageFileFilter = (_req, file, cb) => {
  if (!supportedHotelImageMimes.has(file?.mimetype)) {
    return cb(new Error('仅支持 JPG/PNG 格式图片'));
  }

  cb(null, true);
};

const hotelImageUpload = multer({
  storage: hotelImageStorage,
  fileFilter: hotelImageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

const hotelCertificateStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, hotelCertificateDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ext === '.jpg' || ext === '.jpeg' || ext === '.png' ? ext : '.jpg';
    cb(null, `hotel-certificate-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`);
  },
});

const hotelCertificateFileFilter = (_req, file, cb) => {
  if (!supportedHotelImageMimes.has(file?.mimetype)) {
    return cb(new Error('仅支持 JPG/PNG 格式图片'));
  }

  cb(null, true);
};

const hotelCertificateUpload = multer({
  storage: hotelCertificateStorage,
  fileFilter: hotelCertificateFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = {
  avatarUpload: avatarUpload.single('avatar'),
  hotelImageUpload: hotelImageUpload.single('image'),
  hotelCertificateUpload: hotelCertificateUpload.single('image'),
};

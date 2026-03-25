const bcrypt = require('bcryptjs');

// 加密密码
exports.encryptPassword = (password) => {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
};

// 验证密码
exports.comparePassword = (password, hash) => {
  return bcrypt.compareSync(password, hash);
};
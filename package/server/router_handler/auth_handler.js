const fs = require('fs');
const path = require('path');

const { query } = require('../db/index');
const { encryptPassword, comparePassword } = require('../utils/encrypt');
const { generateToken } = require('../utils/jwt');
const {
  success,
  validationFail,
  authFail,
  notFoundFail,
  serverFail,
} = require('../utils/response');
const { validateCaptcha, createCaptcha } = require('../utils/captcha');
const { avatarUpload } = require('../middleware/upload');

const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_]{3,9}$/;
const passwordMinLen = 6;
const passwordMaxLen = 10;
const phoneRegex = /^1[3-9]\d{9}$/;
const emailRegex = /^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
const nameMaxLen = 50;

const validateUsername = (username) => {
  if (!username) return '账号不能为空';
  if (!usernameRegex.test(username)) {
    return '账号需以字母开头，长度 4-10 位，仅支持字母、数字和下划线';
  }
  return null;
};

const validatePassword = (password) => {
  if (!password) return '密码不能为空';
  if (password.length < passwordMinLen || password.length > passwordMaxLen) {
    return `密码需为 ${passwordMinLen}-${passwordMaxLen} 位`;
  }
  return null;
};

const validatePhone = (phone) => {
  if (!phone) return '手机号不能为空';
  if (!phoneRegex.test(phone)) {
    return '请输入正确的 11 位手机号';
  }
  return null;
};

const validateEmail = (email) => {
  if (!email) return '邮箱不能为空';
  if (!emailRegex.test(email)) {
    return '请输入正确的邮箱格式';
  }
  return null;
};

const validateName = (name) => {
  if (!name) return null;
  if (name.length > nameMaxLen) {
    return `姓名长度不能超过 ${nameMaxLen} 个字符`;
  }
  return null;
};

const formatAvatarPath = (avatar) => {
  if (!avatar) return '';
  return avatar.startsWith('/') ? avatar : `/${avatar.replace(/\\/g, '/')}`;
};

const mapUser = (user) => ({
  id: user.id,
  username: user.username,
  role: user.role,
  name: user.name || '',
  phone: user.phone || '',
  email: user.email || '',
  avatar: formatAvatarPath(user.avatar || ''),
  status: user.status,
  createTime: user.createTime,
  updateTime: user.updateTime,
});

const removeLocalAvatar = (avatarPath) => {
  if (!avatarPath || !avatarPath.startsWith('/uploads/avatars/')) {
    return;
  }

  const filePath = path.join(__dirname, '..', avatarPath.replace(/^\//, ''));
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

const getUserById = async (id) => {
  const [user] = await query(
    `SELECT
      id,
      username,
      role,
      name,
      phone,
      email,
      avatar,
      status,
      create_time AS createTime,
      update_time AS updateTime
    FROM users
    WHERE id = ?`,
    [id]
  );

  return user || null;
};

exports.getCaptcha = (req, res) => {
  try {
    const captchaId = req.query.captchaId || Date.now().toString();
    const { captchaId: id, captchaSvg } = createCaptcha(captchaId);
    res.json(success({ captchaId: id, captchaSvg }, '验证码生成成功'));
  } catch (err) {
    console.error('生成验证码失败:', err);
    res.json(serverFail('验证码生成失败'));
  }
};

exports.register = async (req, res) => {
  try {
    const {
      username,
      password,
      confirmPassword,
      phone,
      email,
      role = 'user',
      captcha,
      captchaId,
    } = req.body;

    const usernameErr = validateUsername(username);
    if (usernameErr) return res.json(validationFail(usernameErr, 'username'));

    const passwordErr = validatePassword(password);
    if (passwordErr) return res.json(validationFail(passwordErr, 'password'));

    if (password !== confirmPassword) {
      return res.json(validationFail('两次输入的密码不一致', 'confirmPassword'));
    }

    if (!['admin', 'merchant', 'user'].includes(role)) {
      return res.json(validationFail('请选择合法角色', 'role'));
    }

    const phoneErr = validatePhone(phone);
    if (phoneErr) return res.json(validationFail(phoneErr, 'phone'));

    const emailErr = validateEmail(email);
    if (emailErr) return res.json(validationFail(emailErr, 'email'));

    const captchaErr = validateCaptcha(captcha, captchaId);
    if (captchaErr) return res.json(validationFail(captchaErr, 'captcha'));

    const users = await query('SELECT id FROM users WHERE username = ?', [username]);
    if (users.length > 0) {
      return res.json(validationFail('该账号已被注册', 'username'));
    }

    const encryptedPwd = encryptPassword(password);
    await query(
      'INSERT INTO users (username, password, phone, email, role) VALUES (?, ?, ?, ?, ?)',
      [username, encryptedPwd, phone, email, role]
    );

    const [user] = await query('SELECT id, username, role FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.json(serverFail('注册成功，但获取用户信息失败'));
    }

    const token = generateToken({ id: user.id, username: user.username, role: user.role });
    res.json(success({ token }, '注册成功，已为您自动登录'));
  } catch (err) {
    console.error('注册接口异常:', err);
    res.json(serverFail('注册失败，请稍后重试'));
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password, role, captcha, captchaId } = req.body;

    const usernameErr = validateUsername(username);
    if (usernameErr) return res.json(validationFail(usernameErr, 'username'));

    const passwordErr = validatePassword(password);
    if (passwordErr) return res.json(validationFail(passwordErr, 'password'));

    if (!role || !['admin', 'merchant', 'user'].includes(role)) {
      return res.json(validationFail('请选择合法角色', 'role'));
    }

    const captchaErr = validateCaptcha(captcha, captchaId);
    if (captchaErr) return res.json(validationFail(captchaErr, 'captcha'));

    const users = await query('SELECT * FROM users WHERE username = ? AND role = ?', [username, role]);
    if (users.length === 0) {
      return res.json(notFoundFail('账号或角色不存在', 'username'));
    }

    const user = users[0];
    const isPwdValid = comparePassword(password, user.password);
    if (!isPwdValid) {
      return res.json(authFail('密码错误', 'password'));
    }

    if (Number(user.status) !== 1) {
      return res.json(authFail('当前账号已被禁用，请联系管理员', 'username'));
    }

    const token = generateToken({ id: user.id, username: user.username, role: user.role });
    res.json(success({ token }, '登录成功'));
  } catch (err) {
    console.error('登录接口异常:', err);
    res.json(serverFail('登录失败，请稍后重试'));
  }
};

exports.forgetPassword = async (req, res) => {
  try {
    const { username, password, confirmPassword } = req.body;

    const usernameErr = validateUsername(username);
    if (usernameErr) return res.json(validationFail(usernameErr, 'username'));

    const passwordErr = validatePassword(password);
    if (passwordErr) return res.json(validationFail(passwordErr, 'password'));

    if (password !== confirmPassword) {
      return res.json(validationFail('两次输入的密码不一致', 'confirmPassword'));
    }

    const users = await query('SELECT id FROM users WHERE username = ?', [username]);
    if (users.length === 0) {
      return res.json(notFoundFail('账号不存在', 'username'));
    }

    const encryptedPwd = encryptPassword(password);
    await query('UPDATE users SET password = ? WHERE username = ?', [encryptedPwd, username]);
    res.json(success(null, '密码重置成功'));
  } catch (err) {
    console.error('忘记密码接口异常:', err);
    res.json(serverFail('重置失败，请稍后重试'));
  }
};

exports.getUserInfo = async (req, res) => {
  try {
    const user = await getUserById(req.user.id);
    if (!user) {
      return res.json(notFoundFail('用户信息不存在', 'user'));
    }

    res.json(success(mapUser(user), '获取用户信息成功'));
  } catch (err) {
    console.error('获取用户信息接口异常:', err);
    res.json(serverFail('获取用户信息失败，请稍后重试'));
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name = '', phone = '', email = '' } = req.body;
    const trimmedName = String(name).trim();
    const trimmedPhone = String(phone).trim();
    const trimmedEmail = String(email).trim();

    const nameErr = validateName(trimmedName);
    if (nameErr) return res.json(validationFail(nameErr, 'name'));

    const phoneErr = validatePhone(trimmedPhone);
    if (phoneErr) return res.json(validationFail(phoneErr, 'phone'));

    const emailErr = validateEmail(trimmedEmail);
    if (emailErr) return res.json(validationFail(emailErr, 'email'));

    await query(
      'UPDATE users SET name = ?, phone = ?, email = ? WHERE id = ?',
      [trimmedName, trimmedPhone, trimmedEmail, req.user.id]
    );

    const user = await getUserById(req.user.id);
    if (!user) {
      return res.json(notFoundFail('用户信息不存在', 'user'));
    }

    res.json(success(mapUser(user), '个人资料更新成功'));
  } catch (err) {
    console.error('更新个人资料接口异常:', err);
    res.json(serverFail('更新个人资料失败，请稍后重试'));
  }
};

exports.updateAvatar = (req, res) => {
  avatarUpload(req, res, async (err) => {
    try {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.json(validationFail('头像图片不能超过 2MB', 'avatar'));
        }

        return res.json(validationFail(err.message || '头像上传失败', 'avatar'));
      }

      if (!req.file) {
        return res.json(validationFail('请选择要上传的头像图片', 'avatar'));
      }

      const currentUser = await getUserById(req.user.id);
      const avatarPath = `/uploads/avatars/${req.file.filename}`;
      await query('UPDATE users SET avatar = ? WHERE id = ?', [avatarPath, req.user.id]);

      const user = await getUserById(req.user.id);
      if (!user) {
        return res.json(notFoundFail('用户信息不存在', 'user'));
      }

      if (currentUser?.avatar && currentUser.avatar !== avatarPath) {
        removeLocalAvatar(currentUser.avatar);
      }

      res.json(success(mapUser(user), '头像更新成功'));
    } catch (error) {
      if (req.file?.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      console.error('更新头像接口异常:', error);
      res.json(serverFail('更新头像失败，请稍后重试'));
    }
  });
};

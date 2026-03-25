// server/controller/auth.js（最终版）
const { query } = require('../db/index');
const { encryptPassword, comparePassword } = require('../utils/encrypt');
const { generateToken } = require('../utils/jwt');
// 引入修正后的响应工具（支持field参数）
const { success, fail, validationFail, authFail, notFoundFail, serverFail } = require('../utils/response');
const { validateCaptcha, createCaptcha } = require('../utils/captcha');

// ===================== 通用校验规则（保留不变） =====================
const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_]{3,9}$/;
const passwordMinLen = 6;
const passwordMaxLen = 10;
const phoneRegex = /^1[3-9]\d{9}$/;
const emailRegex = /^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

// 校验账号格式
const validateUsername = (username) => {
  if (!username) return '账号不能为空';
  if (!usernameRegex.test(username)) return '账号需以字母开头，长度4-10位，仅支持字母、数字、下划线';
  return null;
};

// 校验密码格式
const validatePassword = (password) => {
  if (!password) return '密码不能为空';
  if (password.length < passwordMinLen || password.length > passwordMaxLen) return `密码需${passwordMinLen}-${passwordMaxLen}位`;
  return null;
};

// 校验手机号格式
const validatePhone = (phone) => {
  if (!phone) return '手机号不能为空';
  if (!phoneRegex.test(phone)) return '请输入正确的11位手机号（以13/14/15/16/17/18/19开头）';
  return null;
};

// 校验邮箱格式
const validateEmail = (email) => {
  if (!email) return '邮箱不能为空';
  if (!emailRegex.test(email)) return '请输入正确的邮箱格式（如：example@xxx.com）';
  return null;
};

// ===================== 验证码接口（优化响应） =====================
exports.getCaptcha = (req, res) => {
  try {
    const captchaId = req.query.captchaId || Date.now().toString();
    const { captchaId: id, captchaSvg } = createCaptcha(captchaId);
    // 成功响应（携带timestamp）
    res.json(success({ captchaId: id, captchaSvg }, '验证码生成成功'));
  } catch (err) {
    console.error('生成验证码失败:', err);
    // 服务器错误，返回友好提示（无field）
    res.json(serverFail('验证码生成失败'));
  }
};

// ===================== 注册接口（语义化错误 + 完整field） =====================
exports.register = async (req, res) => {
  try {
    const { username, password, confirmPassword, phone, email, role = 'user', captcha, captchaId } = req.body;

    // 1. 基础格式校验（全部携带对应field）
    const usernameErr = validateUsername(username);
    if (usernameErr) return res.json(validationFail(usernameErr, 'username'));

    const passwordErr = validatePassword(password);
    if (passwordErr) return res.json(validationFail(passwordErr, 'password'));

    if (password !== confirmPassword) return res.json(validationFail('两次输入的密码不一致！', 'confirmPassword'));

    // 新增：角色合法性校验
    if (!['admin', 'merchant', 'user'].includes(role)) {
      return res.json(validationFail('请选择合法角色（管理员/商家/普通用户）', 'role'));
    }

    const phoneErr = validatePhone(phone);
    if (phoneErr) return res.json(validationFail(phoneErr, 'phone'));

    const emailErr = validateEmail(email);
    if (emailErr) return res.json(validationFail(emailErr, 'email'));

    const captchaErr = validateCaptcha(captcha, captchaId);
    if (captchaErr) return res.json(validationFail(captchaErr, 'captcha'));

    // 2. 校验账号是否已存在（携带field: username）
    const users = await query('SELECT id FROM users WHERE username = ?', [username]);
    if (users.length > 0) return res.json(notFoundFail('该账号已被注册', 'username'));

    // 3. 密码加密
    const encryptedPwd = encryptPassword(password);

    // 4. 插入数据库
    await query(
      'INSERT INTO users (username, password, phone, email, role) VALUES (?, ?, ?, ?, ?)',
      [username, encryptedPwd, phone, email, role]
    );

    // 新增：查询刚插入的用户信息（核心修复）
    const [user] = await query('SELECT id, username, role FROM users WHERE username = ?', [username]);
    if (!user) return res.json(serverFail('注册成功但获取用户信息失败'));

    // 5. 生成JWT Token（此时 user 已定义）
    const token = generateToken({ id: user.id, username: user.username, role: user.role });
    // 只返回token，用户信息由前端通过 /auth/info 获取
    res.json(success({ token }, '注册成功，已为您自动登录'));

  } catch (err) {
    console.error('注册接口异常:', err);
    res.json(serverFail('注册失败，请稍后重试'));
  }
};

// ===================== 登录接口（语义化错误 + 完整field） =====================
exports.login = async (req, res) => {
  try {
    const { username, password, role, captcha, captchaId } = req.body;

    // 1. 基础格式校验（全部携带对应field）
    const usernameErr = validateUsername(username);
    if (usernameErr) return res.json(validationFail(usernameErr, 'username'));

    const passwordErr = validatePassword(password);
    if (passwordErr) return res.json(validationFail(passwordErr, 'password'));

    if (!role || !['admin', 'merchant', 'user'].includes(role)) {
      return res.json(validationFail('请选择合法角色', 'role'));
    }

    const captchaErr = validateCaptcha(captcha, captchaId);
    if (captchaErr) return res.json(validationFail(captchaErr, 'captcha'));

    // 2. 查询用户（携带field: username）
    const users = await query('SELECT * FROM users WHERE username = ? AND role = ?', [username, role]);
    if (users.length === 0) return res.json(notFoundFail('账号或角色不存在', 'username'));

    const user = users[0];

    // 3. 验证密码（携带field: password）
    const isPwdValid = comparePassword(password, user.password);
    if (!isPwdValid) return res.json(authFail('密码错误', 'password'));

    // 4. 生成JWT Token
    const token = generateToken({ id: user.id, username: user.username, role: user.role });
    // 只返回token，用户信息由前端通过 /auth/info 获取
    res.json(success({ token }, '登录成功'));

  } catch (err) {
    console.error('登录接口异常:', err);
    // 服务器错误（无field，前端会全局提示）
    res.json(serverFail('登录失败，请稍后重试'));
  }
};

// ===================== 忘记密码接口（语义化错误 + 完整field） =====================
exports.forgetPassword = async (req, res) => {
  try {
    const { username, password, confirmPassword } = req.body;

    // 1. 基础格式校验（全部携带对应field）
    const usernameErr = validateUsername(username);
    if (usernameErr) return res.json(validationFail(usernameErr, 'username'));

    const passwordErr = validatePassword(password);
    if (passwordErr) return res.json(validationFail(passwordErr, 'password'));

    if (password !== confirmPassword) return res.json(validationFail('两次输入的密码不一致！', 'confirmPassword'));

    // 2. 验证账号是否存在（携带field: username）
    const users = await query('SELECT id FROM users WHERE username = ?', [username]);
    if (users.length === 0) return res.json(notFoundFail('账号不存在', 'username'));

    // 3. 加密新密码并更新
    const encryptedPwd = encryptPassword(password);
    await query('UPDATE users SET password = ? WHERE username = ?', [encryptedPwd, username]);
    res.json(success(null, '密码重置成功'));

  } catch (err) {
    console.error('忘记密码接口异常:', err);
    // 服务器错误（无field，前端会全局提示）
    res.json(serverFail('重置失败，请稍后重试'));
  }
};


// ===================== 获取用户信息接口（最终版，复用auth中间件） =====================
exports.getUserInfo = async (req, res) => {
  try {
    // 1. req.user 已由 authMiddleware 挂载（包含id/username/role）
    const { id } = req.user;
    // 2. 查询用户信息（仅返回必要字段，脱敏处理）
    const [user] = await query(
      'SELECT id, username, phone, email, role, create_time AS createTime FROM users WHERE id = ?',
      [id]
    );

    // 3. 校验用户是否存在（防止token有效但用户已被删除）
    if (!user) {
      return res.json(notFoundFail('用户信息不存在', 'user'));
    }

    // 4. 数据脱敏（保护隐私，仅返回必要信息）
    const safeUser = {
      id: user.id,
      username: user.username,
      role: user.role,
      phone: user.phone ? `${user.phone.slice(0, 3)}****${user.phone.slice(7)}` : '',
      email: user.email ? `${user.email.split('@')[0].slice(0, 3)}****@${user.email.split('@')[1]}` : '',
      createTime: user.createTime
    };

    // 5. 成功响应
    res.json(success(safeUser, '获取用户信息成功'));

  } catch (err) {
    console.error('获取用户信息接口异常:', err);
    // 服务器内部错误（无具体field，前端全局提示）
    res.json(serverFail('获取用户信息失败，请稍后重试'));
  }
};
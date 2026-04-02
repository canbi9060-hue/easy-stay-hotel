// 校验用户名格式，要求字母开头且只允许字母、数字和下划线。
export const validateUsername = (_, value) => {
  if (!value) return Promise.reject('请输入账号');

  const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_]{3,9}$/;
  if (!usernameRegex.test(value)) {
    return Promise.reject('账号需以字母开头，长度 4-10 位，仅支持字母、数字和下划线');
  }

  return Promise.resolve();
};

// 校验密码长度是否满足基础要求。
export const validatePassword = (_, value) => {
  if (!value) return Promise.reject('请输入密码');
  if (value.length < 6 || value.length > 10) {
    return Promise.reject('密码需为 6-10 位');
  }

  return Promise.resolve();
};

// 校验确认密码是否和当前表单中的密码一致。
export const validateConfirmPassword = (_, value, form) => {
  if (!value) return Promise.reject('请确认密码');
  if (value !== form.getFieldValue('password')) {
    return Promise.reject('两次输入的密码不一致');
  }

  return Promise.resolve();
};

// 根据密码长度和字符类型计算密码强度分值。
export const calculatePasswordStrength = (password) => {
  if (!password) return 0;

  let strength = 0;
  if (password.length >= 6) strength += 25;
  if (password.length >= 8) strength += 25;
  if (/[a-zA-Z]/.test(password)) strength += 15;
  if (/[0-9]/.test(password)) strength += 15;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 20;

  return Math.min(strength, 100);
};

// 将密码强度分值转换为页面展示所需的等级和颜色。
export const getPasswordStrengthInfo = (strength) => {
  if (strength === 0) return { level: '', color: '#d9d9d9' };
  if (strength <= 25) return { level: '弱', color: '#ff4d4f' };
  if (strength <= 50) return { level: '较弱', color: '#faad14' };
  if (strength <= 75) return { level: '中等', color: '#1890ff' };
  return { level: '强', color: '#52c41a' };
};

// 校验手机号是否符合中国大陆手机号格式。
export const validatePhone = (_, value) => {
  if (!value) return Promise.reject('请输入手机号');

  const phoneRegex = /^1[3-9]\d{9}$/;
  if (!phoneRegex.test(value)) {
    return Promise.reject('请输入正确的 11 位手机号');
  }

  return Promise.resolve();
};

// 校验邮箱地址格式是否有效。
export const validateEmail = (_, value) => {
  if (!value) return Promise.reject('请输入邮箱');

  const emailRegex = /^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  if (!emailRegex.test(value)) {
    return Promise.reject('请输入正确的邮箱格式');
  }

  return Promise.resolve();
};

// 校验个人资料中的姓名长度，允许为空但限制最大字符数。
export const validateProfileName = (_, value) => {
  if (!value) return Promise.resolve();
  if (String(value).trim().length > 50) {
    return Promise.reject('姓名长度不能超过 50 个字符');
  }

  return Promise.resolve();
};

// 刷新验证码并同步更新表单状态、验证码 id 和图片内容。
export const refreshCaptcha = async (
  form,
  captchaAPI,
  setCaptchaId,
  setCaptchaSvg,
  message
) => {
  form.resetFields(['captcha']);

  const newCaptchaId = Date.now().toString();

  try {
    const res = await captchaAPI.getCaptcha(newCaptchaId);
    setCaptchaId(res.data.captchaId);
    setCaptchaSvg(res.data.captchaSvg);
  } catch (error) {
    console.error('刷新验证码失败:', error.errorMsg);
    message.error(error.errorMsg || '刷新验证码失败');
  }
};

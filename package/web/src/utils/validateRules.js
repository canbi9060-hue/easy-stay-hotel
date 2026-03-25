// src/utils/validateRules.js

// ===================== 通用工具函数 =====================

  // ===================== 账号验证规则 =====================
  export const validateUsername = (_, value) => {
    if (!value) return Promise.reject("请输入账号！");
    const usernameRegex = /^[a-zA-Z][a-zA-Z0-9_]{3,9}$/;
    if (!usernameRegex.test(value)) {
      return Promise.reject("账号需以字母开头，长度4-10位，仅支持字母、数字、下划线");
    }
    return Promise.resolve();
  };
  
  // ===================== 密码验证规则 =====================
  export const validatePassword = (_, value) => {
    if (!value) return Promise.reject("请输入密码！");
    if (value.length < 6 || value.length > 10) return Promise.reject("密码需6-10位");
    return Promise.resolve();
  };
  
  // ===================== 确认密码验证 =====================
  export const validateConfirmPassword = (_, value, form) => {
    if (!value) return Promise.reject("请确认密码！");
    if (value !== form.getFieldValue('password')) {
      return Promise.reject("两次输入的密码不一致！");
    }
    return Promise.resolve();
  };
  
  // ===================== 密码强度计算 =====================
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
  
  // ===================== 密码强度等级映射 =====================
  export const getPasswordStrengthInfo = (strength) => {
    if (strength === 0) return { level: "", color: "#d9d9d9" };
    if (strength <= 25) return { level: "弱", color: "#ff4d4f" };
    if (strength <= 50) return { level: "较弱", color: "#faad14" };
    if (strength <= 75) return { level: "中等", color: "#1890ff" };
    return { level: "强", color: "#52c41a" };
  };
  
  // ===================== 手机号验证规则 =====================
  export const validatePhone = (_, value) => {
    if (!value) return Promise.reject("请输入手机号！");
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(value)) {
      return Promise.reject("请输入正确的11位手机号（以13/14/15/16/17/18/19开头）");
    }
    return Promise.resolve();
  };
  
  // ===================== 邮箱验证规则 =====================
  export const validateEmail = (_, value) => {
    if (!value) return Promise.reject("请输入邮箱！");
    const emailRegex = /^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    if (!emailRegex.test(value)) {
      return Promise.reject("请输入正确的邮箱格式（如：example@xxx.com）");
    }
    return Promise.resolve();
};


/**
 * 刷新验证码的通用逻辑
 * @param {object} form - AntD Form 实例
 * @param {object} captchaAPI - 验证码 API 实例
 * @param {Function} setCaptchaId - 更新 captchaId 的 setState 函数
 * @param {Function} setCaptchaSvg - 更新 captchaSvg 的 setState 函数
 * @param {object} message - AntD message 实例
 * @returns {Promise<void>}
 */
export const refreshCaptcha = async (
  form,
  captchaAPI,
  setCaptchaId,
  setCaptchaSvg,
  message
) => {
  // 清空验证码输入框
  form.resetFields(['captcha']);
  // 生成新的临时 captchaId
  const newCaptchaId = Date.now().toString();
  try {
    // 请求新验证码
    const res = await captchaAPI.getCaptcha(newCaptchaId);
    // 更新状态
    setCaptchaId(res.data.captchaId);
    setCaptchaSvg(res.data.captchaSvg);
    console.log(`[${window.location.pathname}] 验证码刷新成功，新captchaId：`, res.data.captchaId);
  } catch (error) {
    console.error("刷新验证码失败:", error.errorMsg);
    message.error(error.errorMsg || '刷新验证码失败');
  }
}
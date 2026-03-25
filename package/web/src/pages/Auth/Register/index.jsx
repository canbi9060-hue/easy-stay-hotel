import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { LockOutlined, UserOutlined, MailOutlined, PhoneOutlined, ReloadOutlined } from "@ant-design/icons";
import { Button, Flex, Form, Input, Select, Progress, message } from "antd";
import { Link } from "react-router-dom";
import AuthLayout from '../AuthLayout';

import {
  validateUsername,
  validatePassword,
  validateConfirmPassword,
  calculatePasswordStrength,
  getPasswordStrengthInfo,
  validatePhone,
  validateEmail,
  refreshCaptcha
} from "../../../utils";

import { captchaAPI, registerAPI } from "../../../utils/request";
import { setToken, fetchUserInfo } from "../../../store/slices/userSlice";

const RegisterForm = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [password, setPassword] = useState("");
  const [captchaId, setCaptchaId] = useState("");
  const [captchaSvg, setCaptchaSvg] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordStrength = useMemo(() => calculatePasswordStrength(password), [password]);
  const strengthInfo = useMemo(() => getPasswordStrengthInfo(passwordStrength), [passwordStrength]);

  const handleManualRefreshCaptcha = useCallback(() => {
    return refreshCaptcha(
      form,
      captchaAPI,
      setCaptchaId,
      setCaptchaSvg,
      message
    );
  }, [form, setCaptchaId, setCaptchaSvg]);

  const fetchCaptcha = useCallback(async () => {
    await handleManualRefreshCaptcha();
  }, [handleManualRefreshCaptcha]);

  useEffect(() => {
    fetchCaptcha();
  }, [fetchCaptcha]);

  const onFinish = async (values) => {
    if (loading) return;

    form.setFields([
      { name: 'username', errors: [] },
      { name: 'password', errors: [] },
      { name: 'confirmPassword', errors: [] },
      { name: 'phone', errors: [] },
      { name: 'email', errors: [] },
      { name: 'role', errors: [] },
      { name: 'captcha', errors: [] }
    ]);

    try {
      setLoading(true);
      // 1. 注册拿 token
      const res = await registerAPI({
        username: values.username,
        password: values.password,
        confirmPassword: values.confirmPassword,
        phone: values.phone,
        email: values.email,
        role: values.role,
        captcha: values.captcha,
        captchaId: captchaId
      });
      const token = res.data.token;

      // 2. 保存 token 到 Redux 和 localStorage
      dispatch(setToken(token));

      // 3. 获取用户信息 & 角色
      const userInfo = await dispatch(fetchUserInfo()).unwrap();

      // 4. 根据角色跳转
      message.success('注册成功，已为您自动登录');
      navigate(
        ['admin', 'merchant'].includes(userInfo.role)
          ? `/${userInfo.role}/dashboard`
          : '/login'
      );
    } catch (err) {
      const { errorMsg, field } = err;
      console.error("注册失败:", errorMsg, "错误字段:", field, "当前captchaId:", captchaId);

      if (field === 'captcha') {
        handleManualRefreshCaptcha();
        setTimeout(() => {
          form.setFields([{ name: 'captcha', errors: [errorMsg] }]);
        }, 0);
      } else if (field) {
        form.setFields([{ name: field, errors: [errorMsg] }]);
      } else {
        message.error(errorMsg || '注册失败');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      form={form}
      name="register"
      layout="vertical"
      style={{ maxWidth: 360 }}
      onFinish={onFinish}
      validateMessages={{
        required: `{label}不能为空`,
      }}
    >
      <Form.Item
        label="账号"
        name="username"
        rules={[{ required: true, validator: validateUsername }]}
      >
        <Input prefix={<UserOutlined />} placeholder="请输入账号" />
      </Form.Item>

      <Form.Item
        label="密码"
        name="password"
        rules={[{ required: true, validator: validatePassword }]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="请输入密码"
          onChange={(e) => setPassword(e.target.value)}
        />
      </Form.Item>

      {password && (
        <div className="password-strength">
          <Progress
            percent={passwordStrength}
            size="small"
            showInfo={false}
            strokeColor={strengthInfo.color}
            railColor="#f0f0f0"
          />
          <span style={{ color: strengthInfo.color, fontSize: 12 }}>
            密码强度：{strengthInfo.level}
          </span>
        </div>
      )}

      <Form.Item
        label="确认密码"
        name="confirmPassword"
        dependencies={['password']}
        rules={[{ required: true, validator: (_, value) => validateConfirmPassword(_, value, form) }]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="请确认密码"
        />
      </Form.Item>

      <Form.Item
        label="手机号"
        name="phone"
        rules={[{ required: true, validator: validatePhone }]}
      >
        <Input prefix={<PhoneOutlined />} placeholder="请输入手机号" />
      </Form.Item>

      <Form.Item
        label="邮箱"
        name="email"
        rules={[{ required: true, validator: validateEmail }]}
      >
        <Input prefix={<MailOutlined />} placeholder="请输入邮箱" />
      </Form.Item>

      <Form.Item
        label="角色"
        name="role"
        rules={[{ required: true, message: "请选择角色!" }]}
      >
        <Select
          placeholder="请选择角色"
          options={[
            { label: "管理员", value: "admin" },
            { label: "商家", value: "merchant" },
          ]}
        />
      </Form.Item>

      <Form.Item
        label="验证码"
        name="captcha"
        rules={[{ required: true, message: "请输入验证码!" }]}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Input
            placeholder="请输入验证码"
            maxLength={4}
            style={{ flex: 1 }}
            onChange={() => form.setFields([{ name: 'captcha', errors: [] }])}
          />
          <div
            onClick={handleManualRefreshCaptcha}
            dangerouslySetInnerHTML={{ __html: captchaSvg || '验证码加载中...' }}
            style={{
              display: 'inline-block',
              cursor: 'pointer',
              minWidth: 100,
              height: 40,
              lineHeight: '40px',
              textAlign: 'center',
              border: '1px solid #d9d9d9',
              borderRadius: 4
            }}
          />
          <span
            onClick={handleManualRefreshCaptcha}
            style={{ cursor: 'pointer', color: '#1890ff' }}
          >
            <ReloadOutlined />
          </span>
        </div>
      </Form.Item>

      <Form.Item>
        <Button
          block
          type="primary"
          htmlType="submit"
          loading={loading}
        >
          {loading ? "注册中..." : "注册"}
        </Button>
      </Form.Item>

      <Form.Item>
        <Flex justify="center" align="center">
          <span>
            已有账号？<Link to="/login">立即登录</Link>
          </span>
        </Flex>
      </Form.Item>
    </Form>
  );
};

const Register = () => {
  return (
    <AuthLayout
      title="用户注册"
      desc="填写信息，创建您的账号"
    >
      <RegisterForm />
    </AuthLayout>
  );
};

export default Register;

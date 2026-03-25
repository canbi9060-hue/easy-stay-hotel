// src/pages/Auth/ForgetPassword/index.jsx
import React, { useState, useMemo} from "react";
import { useNavigate } from "react-router-dom";
import { LockOutlined, UserOutlined} from "@ant-design/icons";
import { Button, Flex, Form, Input, Progress,message} from "antd";
import { Link } from "react-router-dom";
import AuthLayout from '../AuthLayout';

// 导入utils工具函数
import {
  validateUsername,
  validatePassword,
  validateConfirmPassword,
  calculatePasswordStrength,
  getPasswordStrengthInfo
} from "../../../utils";


// 导入API（替换为 registerAPI）
import { forgetPasswordAPI } from "../../../utils/request";

// 内部表单组件
const ForgetPasswordForm = () => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
 
  // 密码强度计算
  const passwordStrength = useMemo(() => calculatePasswordStrength(password), [password]);
  const strengthInfo = useMemo(() => getPasswordStrengthInfo(passwordStrength), [passwordStrength]);

  // 适配找回密码场景
  const validateNewPassword = validatePassword;

  const onFinish = async (values) => {
     // 防止重复点击
  if (isLoading) return;
  setIsLoading(true);
    try {
      const res = await forgetPasswordAPI({
        username: values.username,
        password: values.password,
        confirmPassword: values.confirmPassword,       
      });
      console.log("重置密码成功:", res);
      message.success('密码重置成功，请登录');
      navigate('/login');
    } catch (error) {
      console.error("重置密码失败:", error.message);
      message.error(error.message || '重置密码失败');
     
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      form={form}
      name="forgetPassword"
      layout="vertical"
      style={{ maxWidth: 360 }}
      onFinish={onFinish}
    >
      {/* 账号 */}
      <Form.Item
        label="账号"
        name="username"
        rules={[{ required: true, validator: validateUsername }]}
      >
        <Input prefix={<UserOutlined />} placeholder="请输入账号" />
      </Form.Item>

      {/* 新密码 */}
      <Form.Item
        label="新密码"
        name="password"
        rules={[{ required: true, validator: validateNewPassword}]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="请输入新密码"
          onChange={(e) => setPassword(e.target.value)}
        />
      </Form.Item>

      {/* 密码强度展示 */}
      {password && (
        <div className="password-strength">
          <Progress
            percent={passwordStrength}
            size="small"
            showInfo={false}
            strokeColor={strengthInfo.color}
            railColor="#f0f0f0"
            style={{ flex: 1 }}
          />
          <span style={{ color: strengthInfo.color, fontSize: 12 }}>
            密码强度：{strengthInfo.level}
          </span>
        </div>
      )}

      {/* 确认密码 */}
      <Form.Item
        label="确认新密码"
        name="confirmPassword"
        dependencies={['password']}
        rules={[
          { 
            required: true, 
            validator: (_, value) => validateConfirmPassword(_, value, form) 
          }
        ]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder="请确认新密码"
        />
      </Form.Item>

     
      {/* 重置密码按钮 */}
      <Form.Item>
        <Button block type="primary" htmlType="submit" loading={isLoading}>
          重置密码
        </Button>
      </Form.Item>

      {/* 返回登录链接 */}
      <Form.Item>
        <Flex justify="center" align="center">
          <span>
            <Link to="/login">返回登录</Link>
          </span>
        </Flex>
      </Form.Item>
    </Form>
  );
};

// 页面入口组件（默认导出）
const ForgetPassword = () => {
  return (
    <AuthLayout
      title="忘记密码"
      desc="输入账号和验证码，重置您的密码"
    >
      <ForgetPasswordForm />
    </AuthLayout>
  );
};

export default ForgetPassword;
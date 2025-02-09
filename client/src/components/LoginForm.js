import React, { useState } from 'react';
import styled from 'styled-components';
import authService from '../services/authService';

// 样式组件
const LoginContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: #f5f5f5;
`;

const LoginCard = styled.div`
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
`;

const Title = styled.h1`
  text-align: center;
  color: #333;
  margin-bottom: 2rem;
  font-size: 1.8rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const Input = styled.input`
  padding: 0.8rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  width: 100%;
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #0099ff;
  }
`;

const Button = styled.button`
  padding: 0.8rem;
  background-color: #0099ff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #0077cc;
  }

  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
`;

const RegisterLink = styled.div`
  text-align: center;
  margin-top: 1rem;

  a {
    color: #0099ff;
    text-decoration: none;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }
`;

const ErrorMessage = styled.div`
  color: #ff4444;
  text-align: center;
  margin-top: 1rem;
`;

const LoginForm = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    username: '',
    password: '',
    nickname: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 基本验证
      if (!form.username || !form.password) {
        throw new Error('请填写用户名和密码');
      }

      if (!isLogin && !form.nickname) {
        throw new Error('请填写昵称');
      }

      if (form.username.length < 3) {
        throw new Error('用户名至少需要3个字符');
      }

      // 发送请求
      const response = isLogin
        ? await authService.login(form.username, form.password)
        : await authService.register(form.username, form.password, form.nickname);

      if (response.success) {
        onLogin(response.user);
      } else {
        setError(response.message || '操作失败');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginContainer>
      <LoginCard>
        <Title>{isLogin ? '登录' : '注册'}</Title>
        <Form onSubmit={handleSubmit}>
          <Input
            type="text"
            name="username"
            placeholder="用户名"
            value={form.username}
            onChange={e => setForm({...form, username: e.target.value})}
          />
          <Input
            type="password"
            name="password"
            placeholder="密码"
            value={form.password}
            onChange={e => setForm({...form, password: e.target.value})}
          />
          {!isLogin && (
            <Input
              type="text"
              name="nickname"
              placeholder="昵称"
              value={form.nickname}
              onChange={e => setForm({...form, nickname: e.target.value})}
            />
          )}
          <Button type="submit" disabled={loading}>
            {loading ? '处理中...' : (isLogin ? '登录' : '注册')}
          </Button>
        </Form>
        {error && <ErrorMessage>{error}</ErrorMessage>}
        <RegisterLink>
          <a onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? '没有账号？点击注册' : '已有账号？点击登录'}
          </a>
        </RegisterLink>
      </LoginCard>
    </LoginContainer>
  );
};

export default LoginForm; 
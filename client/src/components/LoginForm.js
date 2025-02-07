import React, { useState } from 'react';
import styled from 'styled-components';
import { Button } from './StyledComponents';
import authService from '../services/authService';

const LoginContainer = styled.div`
  max-width: 400px;
  margin: 100px auto;
  padding: 20px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
`;

const Input = styled.input`
  width: 100%;
  padding: 10px;
  margin: 10px 0;
  border: 1px solid #ddd;
  border-radius: 5px;
`;

const ErrorMessage = styled.div`
  color: red;
  margin: 10px 0;
`;

const SwitchButton = styled.button`
  background: none;
  border: none;
  color: #2196f3;
  cursor: pointer;
  margin-top: 10px;
  text-decoration: underline;
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

  const handleChange = (e) => {
    setForm(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <LoginContainer>
      <h2>{isLogin ? '登录' : '注册'}</h2>
      {error && <ErrorMessage>{error}</ErrorMessage>}
      
      <form onSubmit={handleSubmit}>
        <Input
          name="username"
          type="text"
          placeholder="用户名"
          value={form.username}
          onChange={handleChange}
          disabled={loading}
        />
        <Input
          name="password"
          type="password"
          placeholder="密码"
          value={form.password}
          onChange={handleChange}
          disabled={loading}
        />
        {!isLogin && (
          <Input
            name="nickname"
            type="text"
            placeholder="昵称"
            value={form.nickname}
            onChange={handleChange}
            disabled={loading}
          />
        )}
        <Button 
          type="submit" 
          variant="primary"
          disabled={loading}
        >
          {loading ? '处理中...' : (isLogin ? '登录' : '注册')}
        </Button>
      </form>

      <SwitchButton 
        onClick={() => !loading && setIsLogin(!isLogin)}
        disabled={loading}
      >
        {isLogin ? '没有账号？点击注册' : '已有账号？点击登录'}
      </SwitchButton>
    </LoginContainer>
  );
};

export default LoginForm; 
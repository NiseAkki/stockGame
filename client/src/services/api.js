import config from '../config';

const BASE_URL = process.env.NODE_ENV === 'production'
  ? config.server.production.httpUrl
  : config.server.development.httpUrl;

// 注册
export const register = async (userData) => {
  const response = await fetch(`${BASE_URL}/api/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });
  return response.json();
};

// 登录
export const login = async (credentials) => {
  const response = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });
  return response.json();
};

// 测试连接
export const testConnection = async () => {
  const response = await fetch(`${BASE_URL}/api/test`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response.json();
};

// ... 其他 API 方法保持类似的修改 ... 
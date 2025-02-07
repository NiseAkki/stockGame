import config from '../config';

const BASE_URL = process.env.NODE_ENV === 'production'
  ? config.server.production.httpUrl
  : config.server.development.httpUrl;

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

// ... 其他 API 方法保持类似的修改 ... 
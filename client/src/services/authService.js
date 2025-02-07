import API_CONFIG from '../config/api';
import HttpClient from '../utils/httpClient';

// 使用更安全的方式获取 API URL
const getApiUrl = () => {
  const baseUrl = process.env.NODE_ENV === 'production'
    ? 'https://your-production-domain.com'
    : `http://${window.location.hostname}:8080`;
  return `${baseUrl}/api`;
};

class AuthService {
  constructor() {
    this.baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://stockgame-mntf.onrender.com/api'
      : 'http://localhost:8080/api';
  }

  async login(username, password) {
    try {
      const response = await fetch(`${this.baseUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || '登录失败');
      }

      return data;
    } catch (error) {
      throw new Error(error.message || '登录失败，请稍后重试');
    }
  }

  async register(username, password, nickname) {
    try {
      const response = await fetch(`${this.baseUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, nickname })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || '注册失败');
      }

      return data;
    } catch (error) {
      throw new Error(error.message || '注册失败，请稍后重试');
    }
  }
}

export default new AuthService(); 
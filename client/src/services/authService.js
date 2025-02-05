class AuthService {
  constructor() {
    this.baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://stockgame.onrender.com'  // 你的 Render API URL
      : 'http://localhost:8080';
  }

  async register(username, password, nickname) {
    const response = await fetch(`${this.baseUrl}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password, nickname }),
    });
    return response.json();
  }

  async login(username, password) {
    const response = await fetch(`${this.baseUrl}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });
    return response.json();
  }
}

export default new AuthService(); 
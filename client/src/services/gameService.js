class GameService {
  constructor() {
    this.ws = null;
    this.callbacks = {
      onGameStateUpdate: null,
      onStockUpdate: null,
      onTradeResult: null,
      onBonus: null
    };
  }

  connect() {
    // 替换为你的 Render URL
    const wsUrl = process.env.NODE_ENV === 'production'
      ? 'wss://stockgame.onrender.com'
      : 'ws://localhost:8080';

    this.ws = new WebSocket(wsUrl);
    // ... 其余代码保持不变
  }
  // ... 其余代码保持不变
} 
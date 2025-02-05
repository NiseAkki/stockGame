class GameService {
  constructor() {
    this.ws = null;
    this.callbacks = {
      onGameStateUpdate: null,
      onStockUpdate: null,
      onTradeResult: null,
      onBonus: null  // 添加奖励通知回调
    };
  }

  connect() {
    const wsUrl = process.env.NODE_ENV === 'production'
      ? 'wss://your-render-app.onrender.com'
      : 'ws://localhost:8080';

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('WebSocket连接已建立');
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'gameState':
          this.callbacks.onGameStateUpdate?.(data.payload);
          break;
        case 'stockUpdate':
          this.callbacks.onStockUpdate?.(data.payload);
          break;
        case 'tradeResult':
          this.callbacks.onTradeResult?.(data.payload);
          break;
        case 'bonus':
          this.callbacks.onBonus?.(data);
          // 可以显示一个提示消息
          alert(data.message);
          break;
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket连接已关闭');
      // 尝试重新连接
      setTimeout(() => this.connect(), 3000);
    };
  }

  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  joinGame() {
    this.ws?.send(JSON.stringify({
      type: 'joinGame'
    }));
  }

  trade(stockCode, action, quantity) {
    this.ws?.send(JSON.stringify({
      type: 'trade',
      payload: {
        stockCode,
        action,
        quantity
      }
    }));
  }
}

export default new GameService(); 
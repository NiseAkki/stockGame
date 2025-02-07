import WS_CONFIG from '../config/websocket';

class GameService {
  constructor() {
    this.ws = null;
    this.user = null;
    this.callbacks = {
      onGameStateUpdate: null,
      onStockUpdate: null,
      onTradeResult: null,
      onSettlement: null,
      onError: null
    };
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = null;
    this.isConnecting = false;
    this.connectionAttempts = 0;
  }

  getWebSocketUrl() {
    return WS_CONFIG.url;
  }

  async connect(user) {
    if (this.isConnecting) {
      console.log('已经在连接中，跳过重复连接');
      return;
    }

    if (this.ws) {
      console.log('清理现有连接');
      this.disconnect();
    }

    this.isConnecting = true;
    this.user = user;

    try {
      const wsUrl = this.getWebSocketUrl();
      console.log('开始连接WebSocket:', wsUrl);
      
      await new Promise((resolve, reject) => {
        this.ws = new WebSocket(wsUrl);
        
        const connectionTimeout = setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            console.log('连接超时，关闭连接');
            this.ws?.close();
            reject(new Error('连接超时'));
          }
        }, 10000);
        
        this.ws.onopen = () => {
          clearTimeout(connectionTimeout);
          console.log('WebSocket连接成功');
          this.connectionAttempts = 0;
          this.isConnecting = false;

          if (this.user) {
            console.log('发送用户初始化信息:', this.user);
            this.ws.send(JSON.stringify({
              type: 'init',
              user: this.user
            }));
          }
          resolve();
        };

        this.ws.onerror = (error) => {
          clearTimeout(connectionTimeout);
          console.error('WebSocket连接错误:', error);
          this.isConnecting = false;
          reject(error);
        };

        this.ws.onclose = this.handleClose.bind(this);
        this.ws.onmessage = this.handleMessage.bind(this);
      });

    } catch (error) {
      this.isConnecting = false;
      console.error('WebSocket连接失败:', error);
      throw error;
    }
  }

  setupWebSocketHandlers() {
    this.ws.onerror = (error) => {
      console.error('WebSocket连接错误:', error);
      this.isConnecting = false;
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket连接关闭:', event.code, event.reason);
      this.isConnecting = false;
      
      if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
        console.log('准备重新连接');
        this.attemptReconnect();
      }
    };

    this.ws.onmessage = this.handleMessage.bind(this);
  }

  handleMessage(event) {
    try {
      const data = JSON.parse(event.data);
      console.log('收到消息:', data);

      switch (data.type) {
        case 'gameState':
          if (data.payload.status === 'finished' && this.user?.inGame) {
            console.log('游戏结束，等待结算');
          }
          this.callbacks.onGameStateUpdate?.(data.payload);
          break;
        case 'stockUpdate':
          this.callbacks.onStockUpdate?.(data.payload);
          break;
        case 'tradeResult':
          this.callbacks.onTradeResult?.(data.payload);
          break;
        case 'settlement':
          console.log('收到结算结果');
          this.callbacks.onSettlement?.(data);
          break;
        case 'error':
          this.callbacks.onError?.(data.message);
          break;
      }
    } catch (error) {
      console.error('处理消息错误:', error);
    }
  }

  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  attemptReconnect() {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      console.log('跳过重连：已连接或正在连接');
      return;
    }

    this.reconnectAttempts++;
    console.log(`尝试重新连接 (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect(this.user).catch(error => {
        console.error('重连失败:', error);
      });
    }, 2000);
  }

  joinGame() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket未连接');
      return;
    }

    if (!this.user) {
      console.error('用户信息未初始化');
      return;
    }

    console.log('发送加入游戏请求:', {
      userId: this.user.id,
      nickname: this.user.nickname,
      totalAsset: this.user.totalAsset
    });

    this.ws.send(JSON.stringify({
      type: 'joinGame',
      userId: this.user.id,
      totalAsset: this.user.totalAsset
    }));
  }

  trade(stockCode, action, quantity) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket未连接');
      return;
    }

    this.ws.send(JSON.stringify({
      type: 'trade',
      stockCode,
      action,
      quantity: parseInt(quantity, 10)
    }));
  }

  requestGameState() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket未连接');
      return;
    }

    this.ws.send(JSON.stringify({ type: 'requestGameState' }));
  }

  disconnect() {
    if (this.ws) {
      console.log('正在断开WebSocket连接');
      this.ws.onclose = null;
      this.ws.close(1000, '正常关闭');
      this.ws = null;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  handleClose(event) {
    console.log('WebSocket连接关闭:', event.code, event.reason);
    this.isConnecting = false;
    
    if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
      console.log('准备重新连接');
      this.attemptReconnect();
    }
  }
}

export default new GameService(); 
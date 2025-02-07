import config from '../config';

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
    this.loadGameState();
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
      const wsUrl = process.env.NODE_ENV === 'production'
        ? 'wss://stockgame-mntf.onrender.com'
        : 'ws://localhost:8080';
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
            const savedState = this.loadGameState();
            if (savedState) {
              this.ws.send(JSON.stringify({
                type: 'init',
                user: this.user,
                savedState: savedState
              }));
            }
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
          this.saveGameState(data.payload);
          if (data.payload.status === 'finished') {
            console.log('游戏结束，等待结算');
            localStorage.removeItem('gameState');
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
          const settlementData = data.payload;
          
          localStorage.removeItem('gameState');
          
          const user = this.user;
          if (user) {
            user.totalAsset = settlementData.totalAsset;
            user.cash = settlementData.cash;
            
            if (settlementData.totalAsset < config.entryFee) {
              console.log('资产不足，等待系统补助');
            }
            
            localStorage.setItem('user', JSON.stringify(user));
          }
          
          this.callbacks.onSettlement?.(settlementData);
          break;
        case 'bonus':
          console.log('收到补助:', data.payload);
          if (this.user) {
            this.user.totalAsset = data.payload.newTotalAsset;
            this.user.cash = data.payload.newCash;
            localStorage.setItem('user', JSON.stringify(this.user));
          }
          this.callbacks.onBonus?.(data.payload);
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

  saveGameState(gameState) {
    if (gameState) {
      if (gameState.status === 'running') {
        localStorage.setItem('gameState', JSON.stringify({
          inGame: gameState.playerInfo?.inGame || false,
          cash: gameState.playerInfo?.cash || 0,
          positions: gameState.playerInfo?.positions || [],
          timestamp: Date.now()
        }));
      } else if (gameState.status === 'finished') {
        localStorage.removeItem('gameState');
      }
    }
  }

  loadGameState() {
    const savedState = localStorage.getItem('gameState');
    if (savedState) {
      const state = JSON.parse(savedState);
      if (Date.now() - state.timestamp < 24 * 60 * 60 * 1000) {
        return state;
      } else {
        localStorage.removeItem('gameState');
      }
    }
    return null;
  }
}

export default new GameService(); 
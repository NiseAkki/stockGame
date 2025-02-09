import config from '../config';

class CardService {
  constructor() {
    this.ws = null;
  }

  setWebSocket(ws) {
    this.ws = ws;
  }

  // 使用功能卡
  useCard(cardInstanceId, targetId = null) {
    if (!this.ws) {
      console.error('WebSocket 未连接');
      return Promise.reject(new Error('网络连接失败'));
    }
    
    return new Promise((resolve, reject) => {
      try {
        console.log('发送使用卡片请求:', { cardInstanceId, targetId });
        
        this.ws.send(JSON.stringify({
          type: 'useCard',
          cardId: cardInstanceId,
          targetId
        }));

        resolve();
      } catch (error) {
        console.error('发送卡片使用请求失败:', error);
        reject(error);
      }
    });
  }

  // 获取玩家持有的卡片
  getPlayerCards() {
    if (!this.ws) return;
    
    this.ws.send(JSON.stringify({
      type: 'getCards'
    }));
  }
}

export default new CardService(); 
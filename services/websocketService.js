const WebSocket = require('ws');
const gameController = require('../controllers/gameController');
const userController = require('../controllers/userController');

class WebSocketService {
  initialize(server) {
    const wss = new WebSocket.Server({ server });

    gameController.setNotifyCallback((userId, notification) => {
      this.notifyUser(userId, notification);
    });

    wss.on('connection', async (ws, req) => {
      // 这里假设我们已经通过某种方式获取到了用户ID
      // 实际项目中需要进行proper的身份验证
      const userId = req.userId; 
      
      // 存储WebSocket连接
      this.clients.set(userId, ws);

      // 检查用户资金并在必要时发放补助
      const bonus = await userController.checkAndProvideFunds(userId);
      if (bonus) {
        ws.send(JSON.stringify(bonus));
      }

      ws.on('message', async (message) => {
        const data = JSON.parse(message);
        
        switch (data.type) {
          case 'joinGame':
            // 在加入游戏前检查资金
            const bonus = await userController.checkAndProvideFunds(userId);
            if (bonus) {
              ws.send(JSON.stringify(bonus));
            }
            gameController.joinGame(userId);
            break;
          // ... 其他消息处理
        }
      });
    });
  }

  notifyUser(userId, data) {
    const ws = this.clients.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }
}

module.exports = new WebSocketService(); 
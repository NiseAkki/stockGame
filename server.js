const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const { sequelize } = require('./models');
const dotenv = require('dotenv');

dotenv.config();

const config = require('./config');
const gameController = require('./controllers/gameController');
const userController = require('./controllers/userController');

// 替换 MongoDB 连接代码
sequelize.authenticate()
  .then(() => {
    console.log('PostgreSQL connected');
    // 强制重新创建表
    return sequelize.sync({ force: true }); 
  })
  .then(() => {
    console.log('Database synchronized');
  })
  .catch(err => {
    console.error('Database connection error:', err);
  });

const app = express();
app.use(cors());
app.use(express.json());

// API路由
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, nickname } = req.body;
    if (!username || !password || !nickname) {
      console.log('缺少必要字段:', { username: !!username, password: !!password, nickname: !!nickname });
      return res.status(400).json({
        success: false,
        message: '请填写所有必要信息'
      });
    }

    console.log('收到注册请求:', { username, nickname });
    
    const result = await userController.register(username, password, nickname);
    console.log('注册结果:', result);
    
    res.json(result);
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({
      success: false,
      message: '注册失败: ' + error.message
    });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const result = await userController.login(username, password);
  res.json(result);
});

app.get('/api/test', async (req, res) => {
  try {
    // 测试数据库连接
    await sequelize.authenticate();
    
    // 尝试创建一个测试用户
    const testUser = await sequelize.models.User.create({
      username: `test_${Date.now()}`,
      password: 'test123',
      nickname: '测试用户',
      totalAsset: 10000
    });

    // 删除测试用户
    await testUser.destroy();

    res.json({
      success: true,
      message: '服务器和数据库连接正常',
      dbStatus: 'connected'
    });
  } catch (error) {
    console.error('测试连接失败:', error);
    res.status(500).json({
      success: false,
      message: '连接测试失败',
      error: error.message
    });
  }
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ 
  server,
  path: '/'  // 使用根路径
});

// 存储所有连接的客户端
const clients = new Map();

// WebSocket连接处理
wss.on('connection', (ws) => {
  console.log('新的客户端连接');
  
  const clientId = Date.now();
  clients.set(clientId, ws);

  // 发送初始游戏状态
  const initialGameState = {
    type: 'gameState',
    payload: {
      status: 'waiting',
      currentRound: 0,
      nextRoundTime: null,
      stocks: [
        {
          code: 'AAPL',
          name: '苹果',
          price: 180.5,
          priceChange: 2.3,
          position: 0,
          averagePrice: 0
        },
        {
          code: 'GOOGL',
          name: '谷歌',
          price: 2750.8,
          priceChange: -1.2,
          position: 0,
          averagePrice: 0
        },
        {
          code: 'MSFT',
          name: '微软',
          price: 338.5,
          priceChange: 0.8,
          position: 0,
          averagePrice: 0
        }
      ],
      playerInfo: {
        nickname: '测试玩家',
        totalAsset: config.entryFee,
        cash: config.entryFee,
        positions: []
      }
    }
  };

  ws.send(JSON.stringify(initialGameState));

  // 处理客户端消息
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    console.log('收到消息:', data);

    switch (data.type) {
      case 'joinGame':
        // 模拟加入游戏
        const gameState = {
          type: 'gameState',
          payload: {
            ...initialGameState.payload,
            status: 'running'
          }
        };
        ws.send(JSON.stringify(gameState));
        break;

      case 'trade':
        // 模拟交易结果
        const tradeResult = {
          type: 'tradeResult',
          payload: {
            success: true,
            newCash: config.entryFee,
            newPositions: []
          }
        };
        ws.send(JSON.stringify(tradeResult));
        break;
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket错误:', error);
  });

  ws.on('close', () => {
    console.log('客户端断开连接');
    clients.delete(clientId);
  });
});

// 定时更新股价
setInterval(() => {
  const stockUpdate = {
    type: 'stockUpdate',
    payload: config.stockList.map(stock => ({
      code: stock.code,
      price: Math.random() * (1000 - 50) + 50,
      priceChange: (Math.random() * 10 - 5).toFixed(2)
    }))
  };

  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(stockUpdate));
    }
  });
}, config.roundInterval * 1000);

// 启动服务器
const PORT = 8080;
server.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
}); 
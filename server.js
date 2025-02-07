const express = require('express');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const { sequelize } = require('./models');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
const gameManager = require('./server/services/GameManager');
const playerManager = require('./server/services/PlayerManager');
const { v4: uuidv4 } = require('uuid');

dotenv.config();

const config = require('./config');
const gameController = require('./controllers/gameController');
const userController = require('./controllers/userController');

// 在文件顶部定义全局变量
let currentStockPrices = new Map();  // 存储当前股票价格

// 在文件顶部添加错误处理
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的 Promise 拒绝:', reason);
});

// 替换 MongoDB 连接代码
sequelize.authenticate()
  .then(() => {
    console.log('PostgreSQL connected');
    // 在开发环境使用 force 同步，但要小心使用
    return sequelize.sync({ force: true, logging: console.log }); 
  })
  .then(() => {
    console.log('Database synchronized');
  })
  .catch(err => {
    console.error('Database connection error:', err.stack);
  });

const app = express();

// 在 app.use(cors()) 之前添加
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? 'https://stockgame-mntf.onrender.com'
    : 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Accept']
};

app.use(cors(corsOptions));
app.use(express.json());

// 添加静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// API路由
app.post('/api/register', async (req, res) => {
  try {
    const { username, password, nickname } = req.body;
    console.log('收到注册请求:', { username, nickname });
    
    // 基本验证
    if (!username || !password || !nickname) {
      console.log('缺少必要字段');
      return res.status(400).json({
        success: false,
        message: '请填写所有必填字段'
      });
    }

    // 检查用户名是否已存在
    const existingUser = await sequelize.models.User.findOne({ 
      where: { username } 
    });

    console.log('检查用户名是否存在:', { exists: !!existingUser });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '用户名已存在'
      });
    }

    // 密码加密
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建新用户
    const user = await sequelize.models.User.create({
      username,
      password: hashedPassword,
      nickname,
      totalAsset: config.initialAsset,
      cash: 0,
      inGame: false
    });

    console.log('用户创建成功:', {
      id: user.id,
      username: user.username,
      nickname: user.nickname
    });

    // 修复：确保返回完整的用户信息
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        totalAsset: user.totalAsset,
        cash: user.cash,
        inGame: user.inGame
      }
    });

  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({
      success: false,
      message: '注册失败，请稍后重试'
    });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // 查找用户
    const user = await sequelize.models.User.findOne({ where: { username } });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: '密码错误'
      });
    }

    // 返回成功响应
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        totalAsset: user.totalAsset,
        cash: user.cash
      }
    });

  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      success: false,
      message: '登录失败，请稍后重试'
    });
  }
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

// 创建 HTTP 服务器
const server = http.createServer(app);

// 创建 WebSocket 服务器
const wss = new WebSocket.Server({ 
  server,
  clientTracking: true,
  pingInterval: 30000,
  pingTimeout: 5000
});

// WebSocket 错误处理
wss.on('error', (error) => {
  console.error('WebSocket 服务器错误:', error);
});

// WebSocket 连接处理
wss.on('connection', (ws, req) => {
  const clientId = req.headers['sec-websocket-key'];
  ws.clientId = clientId;
  console.log(`新客户端连接: ${clientId}`);

  // 设置心跳检测
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // 发送连接成功消息
  ws.send(JSON.stringify({
    type: 'system',
    message: '连接成功'
  }));

  // 发送当前游戏状态
  gameManager.broadcastGameState(
    new Map([[clientId, ws]]), 
    playerManager
  );

  // 消息处理
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('收到消息:', data);

      switch (data.type) {
        case 'init':
          if (data.user) {
            playerManager.addPlayer(clientId, data.user);
            console.log('用户信息已初始化:', data.user);
          }
          break;

        case 'joinGame':
          try {
            // 处理玩家加入游戏
            handleJoinGame(ws, clientId);
            // 只更新排行榜，不重置计时器
            gameManager.updateLeaderboard(playerManager);
            // 只向所有客户端广播更新后的游戏状态
            broadcastToAll();
          } catch (error) {
            console.error('处理玩家加入游戏时出错:', error);
            ws.send(JSON.stringify({
              type: 'error',
              message: error.message
            }));
          }
          break;

        case 'trade':
          handleTrade(ws, clientId, data);
          break;
      }
    } catch (error) {
      console.error('处理消息错误:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: '服务器处理消息出错'
      }));
    }
  });

  // 错误处理
  ws.on('error', (error) => {
    console.error(`客户端 ${clientId} 错误:`, error);
  });

  // 关闭处理
  ws.on('close', () => {
    console.log(`客户端断开连接: ${clientId}`);
    playerManager.removePlayer(clientId);
  });
});

// 心跳检测
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log('检测到死连接，关闭');
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// 清理
wss.on('close', () => {
  clearInterval(interval);
});

// 在初始化部分
gameManager.setPlayerManager(playerManager);
playerManager.setGameManager(gameManager);

// 在处理玩家加入游戏后
wss.on('connection', (ws, req) => {
  // ... 其他代码保持不变 ...
  
  ws.on('message', async (message) => {
    const data = JSON.parse(message);
    if (data.type === 'joinGame') {
      handleJoinGame(ws, clientId);
      // 玩家加入后立即更新排行榜
      gameManager.updateLeaderboard(playerManager);
      broadcastToAll();
    }
    // ... 其他代码保持不变 ...
  });
});

// 设置 gameManager 引用
playerManager.setGameManager(gameManager);

// 在初始化部分
gameManager.setRoundUpdateCallback(() => {
  // 如果游戏状态变为 finished，进行清算广播
  if (gameManager.gameState.status === 'finished') {
    console.log('游戏结束，开始清算');
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        playerManager.broadcastSettlement(client, client.clientId);
      }
    });
    // 清算后重置所有玩家
    playerManager.resetAllPlayers();
  }
  
  // 如果游戏状态变为 waiting，不进行任何清算
  if (gameManager.gameState.status === 'waiting') {
    console.log('新游戏准备开始');
  }
  
  broadcastToAll();
});

// 修改广播函数
function broadcastToAll() {
  if (!wss.clients) return;
  
  const clientsMap = new Map();
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      clientsMap.set(client.clientId, client);
    }
  });
  
  if (clientsMap.size > 0) {
    console.log('广播游戏状态:', {
      status: gameManager.gameState.status,
      round: gameManager.gameState.currentRound,
      stockCount: gameManager.stockPrices.size
    });
    gameManager.broadcastGameState(clientsMap, playerManager);
  }
}

// 启动服务器
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
  // 只初始化游戏，不开始回合
  gameManager.startNewGame();
  // 立即进行一次广播
  broadcastToAll();
});

// 将 WebSocket 连接处理逻辑提取到单独的函数
function handleWebSocketConnection(ws, req) {
  const clientId = req.headers['sec-websocket-key'];
  console.log(`新客户端连接: ${clientId}`);
  
  // 设置心跳检测
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // 发送当前游戏状态
  ws.send(JSON.stringify({
    type: 'gameState',
    payload: {
      status: gameManager.gameState.status,
      currentRound: gameManager.gameState.currentRound,
      nextRoundTime: gameManager.gameState.nextRoundTime
    }
  }));

  // 错误处理
  ws.on('error', (error) => {
    console.error(`客户端 ${clientId} 错误:`, error);
  });

  // 关闭处理
  ws.on('close', (code, reason) => {
    console.log(`客户端 ${clientId} 断开连接:`, code, reason);
    playerManager.removePlayer(clientId);
  });

  // 消息处理
  ws.on('message', handleClientMessage.bind(null, ws, clientId));
}

// 将消息处理逻辑提取到单独的函数
async function handleClientMessage(ws, clientId, message) {
  try {
    const data = JSON.parse(message);
    console.log(`收到客户端 ${clientId} 消息:`, data);

    switch (data.type) {
      case 'init':
        if (data.user) {
          playerManager.addPlayer(clientId, data.user);
          console.log('用户信息已初始化:', data.user);
        }
        break;

      case 'joinGame':
        handleJoinGame(ws, clientId, data);
        break;

      case 'trade':
        handleTrade(ws, clientId, data);
        break;

      default:
        console.warn(`未知的消息类型: ${data.type}`);
    }
  } catch (error) {
    console.error('处理消息错误:', error);
    ws.send(JSON.stringify({
      type: 'error',
      message: '服务器处理消息出错'
    }));
  }
}

// 添加结算处理函数
function handleGameSettlement() {
  if (gameManager.gameState.isSettling) return;
  gameManager.gameState.isSettling = true;

  try {
    console.log('开始游戏结算');
    gameManager.gameState.status = 'finished';
    
    // 广播游戏结束状态
    const settlementMessage = {
      type: 'gameState',
      payload: {
        status: 'finished',
        currentRound: gameManager.gameState.currentRound,
        nextRoundTime: Date.now() + (config.matchInterval * 1000),
        message: '游戏结束，正在结算'
      }
    };

    // 广播给所有玩家
    handleWebSocketConnection(null, null);

    // 设置下一局开始时间
    setTimeout(() => {
      gameManager.startNewGame();
    }, config.matchInterval * 1000);

  } catch (error) {
    console.error('游戏结算错误:', error);
  } finally {
    gameManager.gameState.isSettling = false;
  }
}

// 修改回合更新函数
function updateGameRound() {
  if (gameManager.gameState.status !== 'running') return;

  gameManager.gameState.currentRound++;
  console.log(`开始第 ${gameManager.gameState.currentRound} 回合`);

  gameManager.updateStockPrices();
  broadcastToAll();

  if (gameManager.gameState.currentRound >= config.maxRounds) {
    handleGameSettlement();
    return;
  }

  gameManager.gameState.nextRoundTime = Date.now() + (config.roundInterval * 1000);
}

// 添加开始新游戏函数
function startNewGame() {
  gameManager.startNewGame();
}

// 6. 广播游戏状态的统一函数
function broadcastGameState() {
  handleWebSocketConnection(null, null);
}

// 添加初始化股价的函数
function initializeStockPrices() {
  gameManager.initializeStockPrices();
}

// 添加更新股价的函数
function updateStockPrices() {
  gameManager.updateStockPrices();
}

// 修改结算玩家的函数
function settlePlayers() {
  for (const [clientId, player] of playerManager.players.entries()) {
    // 1. 计算持仓变现的价值
    let positionValue = 0;
    player.positions.forEach(position => {
      const stock = currentStockPrices.get(position.code);
      if (stock && position.quantity > 0) {
        positionValue += Number(stock.price) * Number(position.quantity);
      }
    });

    // 2. 计算最终总资产（游戏结束时才加上门票补助）
    const user = playerManager.userInfo.get(clientId);
    if (user) {
      // 更新总资产（原总资产 + 游戏内总价值）
      const gameValue = Number(player.cash) + Number(positionValue);
      user.totalAsset = Number(user.totalAsset) + gameValue + Number(config.entryFee);
    }

    // 3. 发送结算通知
    const client = handleWebSocketConnection(null, null);
    if (client?.readyState === WebSocket.OPEN) {
      // 发送详细的结算信息
      client.send(JSON.stringify({
        type: 'settlement',
        message: `游戏结束！\n` +
                `游戏资金: ¥${player.cash}\n` +
                `持仓变现: ¥${positionValue}\n` +
                `游戏收益: ¥${Number(player.cash) + Number(positionValue) - Number(config.entryFee)}\n` +
                `门票返还: ¥${config.entryFee}`,
        details: {
          beforeTotalAsset: user.totalAsset - gameValue - Number(config.entryFee), // 结算前的总资产
          gameCash: player.cash,
          positionValue: positionValue,
          gameProfit: Number(player.cash) + Number(positionValue) - Number(config.entryFee),
          entryFeeRefund: Number(config.entryFee),
          finalTotalAsset: user.totalAsset
        }
      }));

      // 同时发送更新后的游戏状态
      client.send(JSON.stringify({
        type: 'gameState',
        payload: {
          status: 'finished',
          currentRound: gameManager.gameState.currentRound,
          nextRoundTime: gameManager.gameState.nextRoundTime,
          stocks: Array.from(currentStockPrices.values()).map(stock => ({
            ...stock,
            position: 0,
            averagePrice: 0
          })),
          playerInfo: {
            nickname: user.nickname,
            totalAsset: user.totalAsset,
            cash: 0,
            inGame: false
          }
        }
      }));
    }
  }
}

// 修改处理玩家加入游戏的函数
function handleJoinGame(ws, clientId) {
  try {
    // 检查游戏状态
    if (gameManager.gameState.status === 'finished') {
      throw new Error('游戏已结束，请等待下一局');
    }

    // 让玩家加入游戏
    const { user, player } = playerManager.joinGame(clientId);
    console.log(`玩家 ${user.nickname} 加入游戏，扣除入场费 ${config.entryFee}`);
    
    // 发送加入成功消息
    ws.send(JSON.stringify({
      type: 'joinGameSuccess',
      message: '成功加入游戏'
    }));

    // 只更新排行榜，不影响游戏流程
    gameManager.updateLeaderboard(playerManager);
    broadcastToAll();

  } catch (error) {
    console.error('处理玩家加入游戏时出错:', error);
    throw error;
  }
}

// 修改交易处理逻辑
function handleTrade(ws, clientId, data) {
  try {
    // 检查玩家是否存在且在游戏中
    const player = playerManager.players.get(clientId);
    if (!player || !player.inGame) {
      throw new Error('玩家未在游戏中');
    }

    // 检查股票是否存在
    const stock = gameManager.stockPrices.get(data.stockCode);
    if (!stock) {
      throw new Error('股票不存在');
    }

    // 检查游戏状态
    if (gameManager.gameState.status !== 'running') {
      throw new Error('游戏未在进行中');
    }

    console.log('处理交易请求:', {
      clientId,
      stockCode: data.stockCode,
      action: data.action,
      quantity: data.quantity,
      currentPrice: stock.price,
      playerCash: player.cash
    });

    // 执行交易
    const result = playerManager.handleTrade(clientId, {
      stockCode: data.stockCode,
      action: data.action,
      quantity: data.quantity,
      currentPrice: stock.price
    });

    // 发送交易结果
    ws.send(JSON.stringify({
      type: 'tradeResult',
      payload: {
        success: true,
        message: `${data.action === 'buy' ? '买入' : '卖出'}成功`,
        newCash: result.newCash,
        newPosition: result.newPosition
      }
    }));

    // 广播最新状态
    broadcastToAll();

  } catch (error) {
    console.error('交易处理错误:', error);
    ws.send(JSON.stringify({
      type: 'tradeResult',
      payload: {
        success: false,
        message: error.message
      }
    }));
  }
}

// 在广播游戏状态时添加其他玩家信息
gameManager.broadcastGameState(wss.clients, playerManager);

// 在 PlayerManager.js 中添加获取其他玩家信息的方法
const otherPlayers = Array.from(playerManager.players.entries())
  .filter(([id]) => id !== clientId)
  .map(([_, player]) => ({
    nickname: player.nickname,
    cash: player.cash,
    positions: player.positions
  }));

// 在游戏状态消息中添加其他玩家信息
const gameStateMessage = {
  type: 'gameState',
  payload: {
    // ... 其他游戏状态信息 ...
    otherPlayers  // 添加这个字段
  }
};

// 所有其他请求都返回 index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
}); 
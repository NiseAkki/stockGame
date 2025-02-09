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
const cardManager = require('./server/services/CardManager');
const bodyParser = require('body-parser');

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

// 修改数据库连接部分
const sequelizeConfig = {
  dialect: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'your_password',
  database: process.env.DB_NAME || 'stockgame',
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  retry: {
    match: [
      /SequelizeConnectionError/,
      /SequelizeConnectionRefusedError/,
      /SequelizeHostNotFoundError/,
      /SequelizeHostNotReachableError/,
      /SequelizeInvalidConnectionError/,
      /SequelizeConnectionTimedOutError/,
      /TimeoutError/,
      /ECONNRESET/
    ],
    max: 3
  }
};

// 添加连接重试逻辑
const connectWithRetry = async () => {
  let retries = 5;
  while (retries > 0) {
    try {
      await sequelize.authenticate();
      console.log('PostgreSQL connected successfully');
      
      // 在开发环境使用 force 同步
      if (process.env.NODE_ENV !== 'production') {
        await sequelize.sync({ force: true });
        console.log('Database synchronized');
      }
      
      break;
    } catch (err) {
      retries -= 1;
      console.error('Database connection error:', err);
      console.log(`Retries left: ${retries}`);
      if (retries === 0) {
        console.error('Max retries reached, exiting...');
        process.exit(1);
      }
      // 等待5秒后重试
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};

// 创建 Express 应用
const app = express();

// 添加中间件
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// API路由
app.post('/api/register', async (req, res) => {
  try {
    const { nickname } = req.body;
    // 简单的验证
    if (!nickname || nickname.length < 2 || nickname.length > 10) {
      return res.status(400).json({
        success: false,
        message: '昵称长度必须在2-10个字符之间'
      });
    }

    // 生成初始用户数据
    const userData = {
      nickname,
      totalAsset: config.initialAsset,
      registeredAt: new Date()
    };

    res.json({
      success: true,
      user: userData
    });
  } catch (error) {
    console.error('注册失败:', error);
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

// 添加 WebSocket 客户端映射
const clients = new Map();

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
  // 确保每个连接都有一个唯一的 clientId
  const clientId = req.headers['sec-websocket-key'];
  ws.clientId = clientId;  // 将 clientId 存储在 ws 对象上
  clients.set(clientId, ws);

  console.log(`新的WebSocket连接: ${clientId}`);

  // 添加心跳检测
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // 消息处理
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('收到WebSocket消息:', { clientId: ws.clientId, type: data.type });

      switch (data.type) {
        case 'init':
          try {
            if (data.user) {
              // 检查是否有保存的状态
              const savedPlayer = playerManager.players.get(ws.clientId);
              if (savedPlayer && savedPlayer.inGame) {
                console.log(`恢复玩家状态: ${data.user.nickname}`);
              } else {
                playerManager.addPlayer(ws.clientId, data.user);
                console.log(`玩家初始化成功: ${data.user.nickname}`);
              }
              
              ws.send(JSON.stringify({
                type: 'initSuccess',
                message: '初始化成功'
              }));

              // 广播最新游戏状态
              broadcastGameState();
            } else {
              throw new Error('缺少用户信息');
            }
          } catch (error) {
            console.error('处理初始化消息时出错:', error);
            ws.send(JSON.stringify({
              type: 'error',
              message: error.message
            }));
          }
          break;

        case 'joinGame':
          try {
            // 确保玩家已经初始化
            if (!playerManager.players.has(ws.clientId)) {
              throw new Error('请先初始化玩家信息');
            }

            const { user, player } = playerManager.joinGame(ws.clientId);
            console.log(`玩家 ${user.nickname} 加入游戏，扣除入场费 ${config.entryFee}`);
            
            // 发送加入成功消息
            ws.send(JSON.stringify({
              type: 'joinGameSuccess',
              message: '成功加入游戏'
            }));

            // 更新排行榜和游戏状态
            gameManager.handlePlayerJoin(playerManager, ws.clientId);
            broadcastGameState();
          } catch (error) {
            console.error('处理玩家加入游戏时出错:', error);
            ws.send(JSON.stringify({
              type: 'error',
              message: error.message
            }));
          }
          break;

        case 'useCard':
          try {
            // 确保玩家已经初始化
            if (!playerManager.players.has(ws.clientId)) {
              throw new Error('请先初始化玩家信息');
            }

            const success = cardManager.useCard(ws.clientId, data.cardId, data.targetId);
            if (success) {
              broadcastGameState();
            }
          } catch (error) {
            console.error('处理使用卡片时出错:', error);
            ws.send(JSON.stringify({
              type: 'error',
              message: error.message
            }));
          }
          break;

        case 'getCards':
          try {
            // 确保玩家已经初始化
            if (!playerManager.players.has(ws.clientId)) {
              throw new Error('请先初始化玩家信息');
            }

            const cards = cardManager.getPlayerCards(ws.clientId);
            ws.send(JSON.stringify({
              type: 'cards',
              cards: cards
            }));
          } catch (error) {
            console.error('获取卡片时出错:', error);
            ws.send(JSON.stringify({
              type: 'error',
              message: error.message
            }));
          }
          break;

        case 'trade':
          handleTrade(ws, ws.clientId, data);
          break;

        default:
          console.log('未知的消息类型:', data.type);
      }
    } catch (error) {
      console.error('处理WebSocket消息时出错:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: '消息处理失败'
      }));
    }
  });

  // 修改断开连接处理
  ws.on('close', () => {
    console.log(`WebSocket连接关闭: ${ws.clientId}`);
    // 直接从客户端列表中移除
    clients.delete(ws.clientId);
  });
});

// 修改心跳检测定时器
const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log(`检测到无响应连接: ${ws.clientId}`);
      return ws.terminate();
    }
    
    ws.isAlive = false;
    ws.ping(() => {});
  });
}, 30000);

// 清理心跳检测
wss.on('close', () => {
  clearInterval(heartbeat);
});

// 在初始化部分
gameManager.setPlayerManager(playerManager);
gameManager.setClients(clients);
playerManager.setGameManager(gameManager);
cardManager.setPlayerManager(playerManager);
cardManager.setGameManager(gameManager);

// 在所有依赖设置完成后，初始化游戏管理器
gameManager.initialize();

// 在处理玩家加入游戏后
wss.on('connection', (ws, req) => {
  // ... 其他代码保持不变 ...
  
  ws.on('message', async (message) => {
    const data = JSON.parse(message);
    if (data.type === 'joinGame') {
      handleJoinGame(ws, ws.clientId);
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
function startServer() {
  const port = process.env.PORT || 8080;
  server.listen(port, () => {
    console.log(`服务器运行在端口 ${port}`);
    gameManager.startNewGame();
    broadcastToAll();
  });
}

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
  const gameState = gameManager.gameState;
  
  clients.forEach((ws, clientId) => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        const player = playerManager.players.get(clientId);
        const user = playerManager.userInfo.get(clientId);
        
        const playerInfo = player ? {
          clientId,
          nickname: user?.nickname || '',
          totalAsset: user?.totalAsset || 0,
          cash: player.cash,
          inGame: player.inGame
        } : null;

        ws.send(JSON.stringify({
          type: 'gameState',
          payload: {
            ...gameState,
            playerInfo
          }
        }));
      } catch (error) {
        console.error(`向客户端 ${clientId} 广播状态时出错:`, error);
      }
    }
  });
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
    console.log('开始处理交易请求:', {
      clientId,
      stockCode: data.stockCode,
      action: data.action,
      quantity: data.quantity
    });

    // 检查玩家是否存在且在游戏中
    const player = playerManager.players.get(clientId);
    console.log('当前玩家状态:', {
      inGame: player?.inGame,
      cash: player?.cash,
      currentPositions: player?.positions
    });

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

    // 执行交易
    const result = playerManager.handleTrade(clientId, {
      stockCode: data.stockCode,
      action: data.action,
      quantity: data.quantity,
      currentPrice: stock.price
    });

    console.log('交易执行结果:', {
      newCash: result.newCash,
      newPositions: player.positions,
      returnedPosition: result.newPosition
    });

    // 发送交易结果
    ws.send(JSON.stringify({
      type: 'tradeResult',
      payload: {
        success: true,
        message: `${data.action === 'buy' ? '买入' : '卖出'}成功`,
        newCash: result.newCash,
        newPositions: player.positions
      }
    }));

    console.log('发送交易结果后的玩家状态:', {
      cash: player.cash,
      positions: player.positions
    });

    // 更新并广播游戏状态
    gameManager.updateLeaderboard(playerManager);
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

// 设置卡片管理器的通知回调
cardManager.setNotifyCallback((clientId, message) => {
  const client = clients.get(clientId);
  if (client && client.readyState === WebSocket.OPEN) {
    try {
      client.send(JSON.stringify(message));
    } catch (error) {
      console.error('发送卡片通知失败:', error);
    }
  }
});

// 启动服务器
startServer(); 
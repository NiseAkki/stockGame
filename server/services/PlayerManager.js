const config = require('../../config');

class PlayerManager {
  constructor() {
    this.players = new Map();
    this.userInfo = new Map();
    this.gameManager = null;  // 将 gameManager 移到实例属性中
  }

  // 修改：用户管理
  addPlayer(clientId, userInfo) {
    console.log('添加玩家:', userInfo);
    
    // 保存用户基本信息
    this.userInfo.set(clientId, userInfo);
    
    // 初始化玩家游戏状态
    this.players.set(clientId, {
      inGame: false,
      cash: 0,
      positions: [],
      nickname: userInfo.nickname
    });

    // 如果游戏正在进行，立即更新排行榜
    if (this.gameManager && this.gameManager.gameState.status === 'running') {
      this.gameManager.updateLeaderboard(this);
    }
  }

  // 修改：游戏参与管理
  joinGame(clientId) {
    const player = this.players.get(clientId);
    const user = this.userInfo.get(clientId);
    
    if (!player || !user) {
      console.error('玩家信息不存在:', { 
        clientId,
        hasPlayer: !!player,
        hasUser: !!user
      });
      throw new Error('玩家信息不存在');
    }

    // 检查玩家是否已在游戏中
    if (player.inGame) {
      throw new Error('玩家已在游戏中');
    }

    // 检查是否有足够资产
    if (user.totalAsset < config.entryFee) {
      throw new Error(`资产不足，需要 ¥${config.entryFee}`);
    }

    // 扣除入场费
    user.totalAsset -= config.entryFee;

    // 更新玩家状态
    player.inGame = true;
    player.cash = config.entryFee;  // 设置初始游戏资金
    player.positions = config.stockList.map(stock => ({
      code: stock.code,
      quantity: 0,
      averagePrice: 0
    }));

    console.log(`玩家 ${user.nickname} 加入游戏:`, {
      initialCash: player.cash,
      remainingAsset: user.totalAsset,
      inGame: player.inGame
    });
    
    // 立即更新排行榜
    if (this.gameManager) {
      this.gameManager.updateLeaderboard(this);
    }

    return { user, player };
  }

  // 移除玩家时清理所有相关数据
  removePlayer(clientId) {
    this.players.delete(clientId);
    this.userInfo.delete(clientId);
    console.log(`移除玩家 ${clientId}`);
  }

  // 修改：重置玩家状态，加入清算逻辑
  resetPlayer(clientId) {
    const player = this.players.get(clientId);
    const user = this.userInfo.get(clientId);
    
    if (player && user) {
      // 计算持仓价值
      let positionValue = 0;
      player.positions.forEach(position => {
        if (this.gameManager) {
          const currentPrice = this.gameManager.stockPrices.get(position.code)?.price || 0;
          positionValue += currentPrice * position.quantity;
        }
      });

      // 计算最终收益（现金 + 持仓市值）
      const finalValue = player.cash + positionValue;
      
      // 更新总资产（加上游戏收益和新门票）
      user.totalAsset += finalValue + config.entryFee;  // 加上新门票钱
      
      console.log(`玩家 ${user.nickname} 游戏结束清算:`, {
        cash: player.cash,
        positionValue,
        finalValue,
        newEntryFee: config.entryFee,
        newTotalAsset: user.totalAsset
      });

      // 重置玩家状态
      player.inGame = false;
      player.cash = 0;
      player.positions = config.stockList.map(stock => ({
        code: stock.code,
        quantity: 0,
        averagePrice: 0
      }));

      // 广播清算结果
      if (this.gameManager && this.gameManager.ws) {
        this.broadcastSettlement(this.gameManager.ws, clientId);
      }
    }
  }

  // 新增：重置所有玩家
  resetAllPlayers() {
    for (const [clientId] of this.players) {
      this.resetPlayer(clientId);
    }
  }

  // 交易管理
  handleTrade(clientId, { stockCode, action, quantity = 1, currentPrice }) {
    const player = this.players.get(clientId);
    if (!player || !player.inGame) {
      throw new Error('玩家未在游戏中');
    }

    const position = player.positions.find(p => p.code === stockCode);
    if (!position) {
      throw new Error('无效的股票代码');
    }

    // 确保 quantity 是数字且为 1
    quantity = 1;
    const totalCost = Math.floor(currentPrice * quantity);
    
    console.log('处理交易:', { 
      action, 
      stockCode, 
      quantity, 
      currentPrice, 
      totalCost,
      playerCash: player.cash,
      currentPosition: position
    });

    if (action === 'buy') {
      if (player.cash < totalCost) {
        throw new Error('资金不足');
      }
      
      this.executeBuy(player, position, quantity, currentPrice, totalCost);
    } else if (action === 'sell') {
      if (position.quantity < quantity) {
        throw new Error('持仓不足');
      }
      
      this.executeSell(player, position, quantity, totalCost);
    } else {
      throw new Error('无效的交易类型');
    }

    console.log('交易完成:', {
      cash: player.cash,
      position: position
    });

    return {
      newCash: player.cash,
      newPosition: position,
      message: `${action === 'buy' ? '买入' : '卖出'}成功`
    };
  }

  // 交易执行
  executeBuy(player, position, quantity, price, totalCost) {
    // 确保所有数值都是整数
    price = Math.floor(price);
    totalCost = Math.floor(totalCost);
    
    if (position.quantity === 0) {
      position.averagePrice = price;
    } else {
      position.averagePrice = Math.floor(
        (position.averagePrice * position.quantity + totalCost) / 
        (position.quantity + quantity)
      );
    }
    
    position.quantity += quantity;
    player.cash -= totalCost;
    
    // 添加日志
    console.log('买入执行:', {
      price,
      totalCost,
      newQuantity: position.quantity,
      newCash: player.cash,
      newAveragePrice: position.averagePrice
    });
  }

  executeSell(player, position, quantity, totalCost) {
    position.quantity -= quantity;
    player.cash += totalCost;
    if (position.quantity === 0) {
      position.averagePrice = 0;
    }
  }

  // 修改：广播清算信息
  broadcastSettlement(ws, clientId) {
    const info = this.getSettlementInfo(clientId);
    if (!info) return;

    const gameValue = info.cash + info.positionValue;  // 游戏总价值

    ws.send(JSON.stringify({
      type: 'settlement',
      payload: {
        message: `游戏结束清算结果：\n` +
                `持仓市值：¥${info.positionValue}\n` +
                `剩余资金：¥${info.cash}\n` +
                `游戏总价值：¥${gameValue}\n` +
                `系统发放新门票：¥${config.entryFee}`,  // 显示新门票
        details: {
          ...info,
          gameValue,
          newEntryFee: config.entryFee
        }
      }
    }));
  }

  // 修改：获取玩家清算信息
  getSettlementInfo(clientId) {
    const player = this.players.get(clientId);
    const user = this.userInfo.get(clientId);
    
    if (!player || !user || !this.gameManager) return null;

    let positionValue = 0;
    const positions = player.positions.map(position => {
      const currentPrice = this.gameManager.stockPrices.get(position.code)?.price || 0;
      const value = currentPrice * position.quantity;
      positionValue += value;
      
      return {
        ...position,
        currentPrice,
        value
      };
    });

    const gameValue = player.cash + positionValue;  // 游戏总价值

    return {
      nickname: user.nickname,
      cash: player.cash,
      positions,
      positionValue,
      gameValue,
      beforeTotalAsset: user.totalAsset,
      afterTotalAsset: user.totalAsset + gameValue + config.entryFee  // 加上游戏价值和新门票
    };
  }

  // 修改：设置 gameManager 的方法
  setGameManager(manager) {
    this.gameManager = manager;  // 使用实例属性
    console.log('PlayerManager: gameManager 已设置');
  }

  // 修改：设置玩家信息
  setPlayerInfo(clientId, userInfo) {
    this.userInfo.set(clientId, userInfo);
    this.players.set(clientId, {
      inGame: false,
      cash: 0,
      positions: [],
      nickname: userInfo.nickname
    });
  }
}

module.exports = new PlayerManager(); 
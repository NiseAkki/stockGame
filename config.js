module.exports = {
  // 游戏配置 - 根据环境设置不同参数
  maxRounds: process.env.NODE_ENV === 'production' ? 60 : 10,           // 生产环境10回合，测试环境5回合
  roundInterval: process.env.NODE_ENV === 'production' ? 60 : 5,      // 生产环境60秒，测试环境10秒
  matchInterval: process.env.NODE_ENV === 'production' ? 300 : 10,      // 生产环境60秒，测试环境10秒
  entryFee: 1000,        // 入场费
  
  // 股票配置
  stockList: process.env.NODE_ENV === 'production' ? [
    { 
      code: 'AAPL', 
      name: '苹果',
      volatility: 0.15,    // 较稳定
      upwardBias: 0.50     // 所有股票的基础涨跌概率设为50%
    },
    { 
      code: 'GOOGL', 
      name: '谷歌',
      volatility: 0.18,
      upwardBias: 0.50
    },
    { 
      code: 'MSFT', 
      name: '微软',
      volatility: 0.16,
      upwardBias: 0.50
    },
    { 
      code: 'TSLA', 
      name: '特斯拉',
      volatility: 0.25,    // 波动较大
      upwardBias: 0.50     // 所有股票的基础涨跌概率设为50%
    },
    { 
      code: 'META', 
      name: 'Meta',
      volatility: 0.20,
      upwardBias: 0.50
    },
    { 
      code: 'BABA', 
      name: '阿里巴巴',
      volatility: 0.22,
      upwardBias: 0.50
    },
    { 
      code: 'NFLX', 
      name: '奈飞',
      volatility: 0.21,
      upwardBias: 0.50
    },
    { 
      code: 'AMZN', 
      name: '亚马逊',
      volatility: 0.19,
      upwardBias: 0.50
    },
    { 
      code: '700', 
      name: '腾讯',
      volatility: 0.20,
      upwardBias: 0.50
    },
    { 
      code: 'NVDA', 
      name: '英伟达',
      volatility: 0.23,    // 波动较大
      upwardBias: 0.50     // 所有股票的基础涨跌概率设为50%
    }
  ] : [  // 测试环境只显示3支股票
    { 
      code: 'AAPL', 
      name: '苹果',
      volatility: 0.15,
      upwardBias: 0.50
    },
    { 
      code: 'GOOGL', 
      name: '谷歌',
      volatility: 0.18,
      upwardBias: 0.50
    },
    { 
      code: 'MSFT', 
      name: '微软',
      volatility: 0.16,
      upwardBias: 0.50
    }
  ],
  
  // 价格配置
  priceRange: {
    min: 50,             // 最低价格
    max: 200,            // 最高价格
    volatility: 0.2      // 波动率（0-1）
  },
  initialAsset: 2000,         // 初始总资产
  database: {
    development: {
      use_env_variable: 'DATABASE_URL',
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    },
    production: {
      use_env_variable: 'DATABASE_URL',
      dialect: 'postgres',
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    }
  },

  // 服务器配置
  server: {
    development: {
      httpUrl: 'http://localhost:8080',
      wsUrl: 'ws://localhost:8080'
    },
    production: {
      httpUrl: 'https://stockgame-mntf.onrender.com',
      wsUrl: 'wss://stockgame-mntf.onrender.com'
    }
  },

  // 功能卡配置
  cards: {
    // 稀有度概率分布
    rarityDistribution: {
      UR: 0.05,    // 0 ~ 0.05     (5%)
      SR: 0.15,    // 0.05 ~ 0.2   (15%)
      R: 0.3,      // 0.2 ~ 0.5    (30%)
      N: 0.5       // 0.5 ~ 1      (50%)
    },

    // 卡片类型模板
    types: {
      FORCE_RISE: {
        id: 'FORCE_RISE',
        name: '涨涨涨',
        rarity: 'N',
        target: 'stock',
        duration: 1,
        effect: '选择一支股票，使其下回合必定上涨。',
        timing: 'next'
      },
      FORCE_FALL: {
        id: 'FORCE_FALL',
        name: '跌跌跌',
        rarity: 'N',
        target: 'stock',
        duration: 1,
        timing: 'next',
        effect: '选择一支股票，使其下回合必定下跌。'
      },
      PRICE_FREEZE: {
        id: 'PRICE_FREEZE',
        name: '车门焊死谁也别跑',
        rarity: 'SR',
        target: 'stock',
        duration: 1,
        timing: 'next',
        effect: '选择一支股票，使其下回合股价冻结。'
      },
      SMALL_MONEY: {
        id: 'SMALL_MONEY',
        name: 'V我50',
        rarity: 'R',
        target: 'player',
        duration: 1,
        timing: 'current',
        effect: '发财了！立刻获得50元！'
      },
      BIG_MONEY: {
        id: 'BIG_MONEY',
        name: '这就是彩票！',
        rarity: 'UR',
        target: 'player',
        duration: 1,
        timing: 'current',
        effect: '发财了！立刻获得500元！'
      }
    },

    distribution: {
      cardsPerRound: 1,  // 每回合发放卡片数量
      maxCards: 10        // 玩家最多持有卡片数量
    }
  }
}; 
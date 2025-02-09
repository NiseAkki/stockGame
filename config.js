const config = {
  // 游戏基础设置
  initialAsset: 1000,         // 初始总资产
  entryFee: 1000,             // 游戏入场费
  
  // 对局设置
  maxRounds: 30,              // 统一设置为60回合
  roundInterval: 60,          // 统一设置为60秒
  matchInterval: 300,         // 统一设置为300秒
  
  // 股票设置
  stockList: [
    { 
      code: 'XLS', 
      name: '熊力斯',
      volatility: 0.4,    // 较稳定
      upwardBias: 0.50     // 基础涨跌概率
    },
    { 
      code: 'FTMT', 
      name: '飞天谋台',
      volatility: 0.18,
      upwardBias: 0.50
    },
    { 
      code: 'JYKJ', 
      name: '巨硬科技',
      volatility: 0.2,
      upwardBias: 0.50
    },
    { 
      code: 'TZKJ', 
      name: '腾子科技',
      volatility: 0.25,
      upwardBias: 0.50
    },
    { 
      code: 'ALMM', 
      name: '阿里麻麻',
      volatility: 0.25,
      upwardBias: 0.50
    },
    { 
      code: 'SZTD', 
      name: '数字跳动',
      volatility: 0.2,
      upwardBias: 0.50
    },
    { 
      code: 'BYD', 
      name: '比样德',
      volatility: 0.2,
      upwardBias: 0.50
    },
    { 
      code: 'JZ', 
      name: '橘子',
      volatility: 0.18,
      upwardBias: 0.50
    },
    { 
      code: 'ZYHG', 
      name: '中远海狗',
      volatility: 0.18,
      upwardBias: 0.50
    }
  ],

  // 功能卡设置
  cards: {
    // 稀有度概率分布
    rarityDistribution: {
      UR: 0.05,    // 0 ~ 0.05
      SR: 0.15,    // 0.05 ~ 0.15
      R: 0.3,      // 0.15 ~ 0.3
      N: 0.5       // 0.3 ~ 1
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
  },

  // 抽奖系统配置
  luckyDraw: {
    cost: 648,  // 抽奖费用
    prizes: [
      { id: 1, name: '神秘奖品', probability: 0.5 },
      { id: 2, name: '神秘奖品', probability: 0.3 },
      { id: 3, name: '神秘奖品', probability: 0.2 }
    ]
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

  // 数据库配置
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

  // 价格配置
  priceRange: {
    min: 50,             // 最低价格
    max: 1000,            // 最高价格
    volatility: 0.2      // 波动率（0-1）
  }
};

module.exports = config; 
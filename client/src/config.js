const config = {
  // 游戏基础设置
  initialAsset: 1000,         // 初始总资产
  entryFee: 1000,             // 游戏入场费
  
  // 对局设置 - 根据环境设置不同参数
  maxRounds: process.env.NODE_ENV === 'production' ? 60 : 5,           // 生产环境60回合，测试环境5回合
  roundInterval: process.env.NODE_ENV === 'production' ? 60 : 10,      // 生产环境60秒，测试环境10秒
  matchInterval: process.env.NODE_ENV === 'production' ? 300 : 10,     // 生产环境300秒，测试环境10秒
  
  // 股票设置
  stockList: [
    { code: 'AAPL', name: '苹果' },
    { code: 'GOOGL', name: '谷歌' },
    { code: 'MSFT', name: '微软' }
  ],
  priceRange: {
    min: 50,                   // 最低股价
    max: 1000,                 // 最高股价
    volatility: 0.1            // 波动幅度 (10%)
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
  }
};

export default config; 
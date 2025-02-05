module.exports = {
  // 游戏基础设置
  initialAsset: 100000,         // 初始总资产
  entryFee: 10000,             // 游戏入场费
  
  // 对局设置
  maxRounds: 20,               // 最大回合数
  roundInterval: 30,           // 回合间隔(秒)
  matchInterval: 300,          // 对局间隔(秒)
  
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
  database: {
    development: {
      username: 'postgres',
      password: 'postgres',
      database: 'stockgame',
      host: 'localhost',
      dialect: 'postgres'
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
  }
}; 
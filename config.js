module.exports = {
  // 游戏基础设置
  initialAsset: 10000,         // 初始总资产
  entryFee: 1000,             // 游戏入场费
  
  // 对局设置
  maxRounds: 2,               // 修改为2回合
  roundInterval: 5,           // 回合间隔(秒)
  matchInterval: 5,          // 对局间隔(秒)
  
  // 股票设置
  stockList: [
    { code: 'AAPL', name: '苹果' },
    { code: 'GOOGL', name: '谷歌' },
    { code: 'MSFT', name: '微软' },
    { code: 'AMZN', name: '亚马逊' },
    { code: 'TSLA', name: '特斯拉' },
    { code: 'META', name: 'Meta' },
    { code: 'NFLX', name: '奈飞' },
    { code: 'NVDA', name: '英伟达' },
    { code: 'BABA', name: '阿里巴巴' },
    { code: 'TCEHY', name: '腾讯' }
  ],
  priceRange: {
    min: 50,                   // 最低股价
    max: 200,                  // 最高股价
    volatility: 0.1            // 波动幅度 (10%)
  },
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
  }
}; 
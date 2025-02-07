module.exports = {
  // 游戏配置
  maxRounds: 2,           // 每局游戏回合数
  roundInterval: 10,       // 每回合间隔（秒）
  matchInterval: 20,       // 对局间隔（秒）
  entryFee: 1000,        // 入场费
  
  // 股票配置
  stockList: [
    { code: 'AAPL', name: '苹果' },
    { code: 'GOOGL', name: '谷歌' },
    { code: 'MSFT', name: '微软' },
    { code: 'TSLA', name: '特斯拉' },
    { code: 'META', name: 'Meta' },
    { code: 'BABA', name: '阿里巴巴' },
    { code: 'NFLX', name: '奈飞' },
    { code: 'AMZN', name: '亚马逊' },
    { code: '700', name: '腾讯' },
    { code: 'NVDA', name: '英伟达' }
  ],
  
  // 价格配置
  priceRange: {
    min: 50,             // 最低价格
    max: 200,            // 最高价格
    volatility: 0.2      // 波动率（0-1）
  },
  initialAsset: 0,         // 初始总资产
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
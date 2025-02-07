const config = {
  // 游戏基础设置
  initialAsset: 10000,         // 初始总资产改为10000
  entryFee: 1000,             // 游戏入场费改为1000
  
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
  }
};

export default config; 
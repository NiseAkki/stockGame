const { Sequelize } = require('sequelize');
const config = require('../config');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  ssl: process.env.NODE_ENV === 'production',
  dialectOptions: process.env.NODE_ENV === 'production' ? {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  } : {}
});

const db = {};
db.sequelize = sequelize;
db.Sequelize = Sequelize;

// 导入模型
db.User = require('./User')(sequelize, Sequelize);
db.Game = require('./Game')(sequelize, Sequelize);
db.StockPrice = require('./StockPrice')(sequelize, Sequelize);
db.Position = require('./Position')(sequelize, Sequelize);

// 设置关联关系
db.Game.hasMany(db.StockPrice);
db.StockPrice.belongsTo(db.Game);

db.Game.hasMany(db.Position);
db.Position.belongsTo(db.Game);

db.User.hasMany(db.Position);
db.Position.belongsTo(db.User);

module.exports = db; 
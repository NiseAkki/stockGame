const { Sequelize } = require('sequelize');
const config = require('../config');
const dotenv = require('dotenv');

// 确保环境变量被加载
dotenv.config();

const env = process.env.NODE_ENV || 'development';
const dbConfig = config.database[env];

let sequelize;
try {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: console.log
  });
} catch (error) {
  console.error('Database connection error:', error);
  process.exit(1);
}

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
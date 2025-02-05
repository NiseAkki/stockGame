const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    nickname: {
      type: DataTypes.STRING,
      allowNull: false
    },
    totalAsset: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 100000.00
    },
    cash: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 100000.00
    },
    inGame: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  });

  return User;
}; 
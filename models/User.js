module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true
      }
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
      defaultValue: 10000.00
    },
    inGame: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  });

  return User;
}; 
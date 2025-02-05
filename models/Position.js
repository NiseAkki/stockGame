module.exports = (sequelize, DataTypes) => {
  const Position = sequelize.define('Position', {
    code: {
      type: DataTypes.STRING,
      allowNull: false
    },
    quantity: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    averagePrice: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    }
  });

  return Position;
}; 
module.exports = (sequelize, DataTypes) => {
  const StockPrice = sequelize.define('StockPrice', {
    code: {
      type: DataTypes.STRING,
      allowNull: false
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    priceChange: {
      type: DataTypes.DECIMAL(5, 2)
    }
  });

  return StockPrice;
}; 
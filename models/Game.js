module.exports = (sequelize, DataTypes) => {
  const Game = sequelize.define('Game', {
    status: {
      type: DataTypes.ENUM('waiting', 'running', 'finished'),
      defaultValue: 'waiting'
    },
    currentRound: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    startTime: DataTypes.DATE,
    endTime: DataTypes.DATE,
    nextRoundTime: DataTypes.DATE,
    minPlayers: {
      type: DataTypes.INTEGER,
      defaultValue: 2
    }
  });

  return Game;
}; 
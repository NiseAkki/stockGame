const User = require('../models/User');
const config = require('../config');
const bcrypt = require('bcrypt');

class UserController {
  async register(username, password, nickname) {
    try {
      // 检查用户名是否已存在
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        throw new Error('用户名已存在');
      }

      // 密码加密
      const hashedPassword = await bcrypt.hash(password, 10);

      // 创建新用户，并发放初始资金（等同于门票费用）
      const user = await User.create({
        username,
        password: hashedPassword,
        nickname,
        totalAsset: config.entryFee // 初始资金等同于门票费用
      });

      return {
        success: true,
        user: {
          id: user._id,
          username: user.username,
          nickname: user.nickname,
          totalAsset: user.totalAsset
        },
        message: `注册成功！您获得了 ¥${config.entryFee} 的新手奖励`
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  async login(username, password) {
    try {
      const user = await User.findOne({ username });
      if (!user) {
        throw new Error('用户名或密码错误');
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        throw new Error('用户名或密码错误');
      }

      return {
        success: true,
        user: {
          id: user._id,
          username: user.username,
          nickname: user.nickname,
          totalAsset: user.totalAsset
        }
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  // 检查用户资金是否不足并发放补助
  async checkAndProvideFunds(userId) {
    const user = await User.findById(userId);
    if (!user) return;

    if (user.totalAsset < config.entryFee) {
      // 如果用户资金不足以支付入场费，发放补助
      await User.updateOne(
        { _id: userId },
        { $set: { totalAsset: config.entryFee } }
      );

      // 返回补助信息
      return {
        type: 'bonus',
        message: `系统已为您补助 ¥${config.entryFee} 的游戏资金`,
        amount: config.entryFee
      };
    }
    return null;
  }
}

module.exports = new UserController(); 
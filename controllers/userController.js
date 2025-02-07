const { User } = require('../models');
const config = require('../config');
const bcrypt = require('bcrypt');

class UserController {
  async register(username, password, nickname) {
    try {
      console.log('开始注册流程:', { username, nickname });

      // 检查用户名是否已存在
      const existingUser = await User.findOne({ 
        where: { username },
        raw: true 
      });
      
      console.log('检查用户名存在:', { exists: !!existingUser });
      
      if (existingUser) {
        return {
          success: false,
          message: '用户名已存在'
        };
      }

      // 密码加密
      const hashedPassword = await bcrypt.hash(password, 10);
      console.log('密码加密完成');

      // 创建新用户
      const user = await User.create({
        username,
        password: hashedPassword,
        nickname,
        totalAsset: 10000,
        cash: 0,
        inGame: false
      });

      console.log('用户创建成功:', { userId: user.id });

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          totalAsset: user.totalAsset,
          cash: user.cash,
          inGame: false
        }
      };
    } catch (error) {
      console.error('注册错误详情:', error);
      return {
        success: false,
        message: error.name === 'SequelizeUniqueConstraintError' 
          ? '用户名已存在' 
          : '注册失败，请稍后重试'
      };
    }
  }

  async login(username, password) {
    try {
      // 使用 Sequelize 查询语法
      const user = await User.findOne({ 
        where: { username }
      });
      
      if (!user) {
        return {
          success: false,
          message: '用户不存在，请先注册'
        };
      }

      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        return {
          success: false,
          message: '密码错误'
        };
      }

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          totalAsset: user.totalAsset,
          cash: user.cash
        }
      };
    } catch (error) {
      console.error('登录错误:', error);
      return {
        success: false,
        message: '登录失败，请稍后重试'
      };
    }
  }

  // 检查用户资金是否不足并发放补助
  async checkAndProvideFunds(userId) {
    const user = await User.findByPk(userId);
    if (!user) return;

    if (user.totalAsset < config.entryFee) {
      // 使用 Sequelize 更新语法
      await user.update({ 
        totalAsset: config.entryFee 
      });

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
// server/middleware/auth.js
const { verifyToken } = require('../utils/jwt');
const { fail } = require('../utils/response');

// 验证token的中间件
exports.authMiddleware = (req, res, next) => {
  // 从请求头获取token
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json(fail('请先登录', 401));
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = verifyToken(token);
    // 将用户信息挂载到req对象上，供后续路由使用
    req.user = decoded;
    next();
  } catch (error) {
    return res.json(fail('token已过期，请重新登录', 401));
  }
};

// 验证角色的中间件
exports.roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.json(fail('请先登录', 401));
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.json(fail('没有权限访问', 403));
    }
    
    next();
  };
};

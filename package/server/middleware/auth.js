const { verifyToken } = require('../utils/jwt');
const { fail } = require('../utils/response');

exports.authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.json(fail('请先登录', 401));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.json(fail('登录状态已失效，请重新登录', 401));
  }
};

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

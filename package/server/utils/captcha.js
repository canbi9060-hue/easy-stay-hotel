// server/utils/captcha.js

// ===================== 验证码生成 =====================
const generateCaptchaCode = () => {
  const sCode = "a,b,b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y,z,A,B,C,E,F,G,H,J,K,L,M,N,P,Q,R,S,T,W,X,Y,Z,1,2,3,4,5,6,7,8,9,0";
  const aCode = sCode.split(",");
  let code = '';
  for (let i = 0; i < 4; i++) {
    const j = Math.floor(Math.random() * aCode.length);
    code += aCode[j];
  }
  return code;
};

// 生成SVG验证码图片
const generateCaptchaSVG = (code) => {
  const width = 100;
  const height = 40;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`;

  // 背景
  svg += `<rect width="${width}" height="${height}" fill="#f5f5f5"/>`;

  // 字符
  const chars = code.split('');
  chars.forEach((char, i) => {
    const x = 15 + i * 20;
    const y = 25 + Math.random() * 10;
    const rotate = (Math.random() - 0.5) * 30;
    const color = `rgb(${Math.floor(Math.random()*256)},${Math.floor(Math.random()*256)},${Math.floor(Math.random()*256)})`;
    svg += `<text x="${x}" y="${y}" fill="${color}" font-family="Microsoft YaHei" font-size="22" font-weight="bold" transform="rotate(${rotate} ${x} ${y})">${char}</text>`;
  });

  // 干扰线
  for (let i = 0; i < 3; i++) {
    const x1 = Math.random() * width;
    const y1 = Math.random() * height;
    const x2 = Math.random() * width;
    const y2 = Math.random() * height;
    const color = `rgb(${Math.floor(Math.random()*256)},${Math.floor(Math.random()*256)},${Math.floor(Math.random()*256)})`;
    svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1"/>`;
  }

  // 干扰点
  for (let i = 0; i < 20; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const color = `rgb(${Math.floor(Math.random()*256)},${Math.floor(Math.random()*256)},${Math.floor(Math.random()*256)})`;
    svg += `<circle cx="${x}" cy="${y}" r="1" fill="${color}"/>`;
  }

  svg += '</svg>';
  return svg;
};

// 使用Map存储验证码（生产环境建议用redis）
const captchaStore = new Map();

// 生成验证码
const createCaptcha = (captchaId) => {
  const originalCode = generateCaptchaCode(); // 2. 获取大小写混合的原始验证码
  const lowerCode = originalCode.toLowerCase(); // 3. 单独转小写用于存储验证

  // 存储小写版验证码（用于不区分大小写验证）
  captchaStore.set(captchaId, {
    code: lowerCode, // 验证时用小写对比
    expires: Date.now() + 5 * 60 * 1000 // 5分钟过期
  });

  // 生成SVG时传入原始大小写混合的验证码（展示用）
  const svg = generateCaptchaSVG(originalCode);
  return {
    captchaId,
    captchaSvg: svg
  };
};

// 验证验证码（核心修改：仅验证码输入错误时删除captchaId）
const validateCaptcha = (inputCode, captchaId) => {
  // 1. 空输入：仅提示，不删除captchaId
  if (!inputCode) return '请输入验证码！';
  
  // 2. 无captchaId/不存在：提示过期，不删除（本身就不存在）
  if (!captchaId || !captchaStore.has(captchaId)) return '验证码已过期，请刷新';
  
  const captchaData = captchaStore.get(captchaId);
  
  // 3. 验证码过期：删除captchaId（必须刷新）
  if (Date.now() > captchaData.expires) {
    captchaStore.delete(captchaId);
    return '验证码已过期，请刷新';
  }

  // 4. 验证码输入错误：删除captchaId（必须刷新）
  if (inputCode.toLowerCase() !== captchaData.code) {
    captchaStore.delete(captchaId); // 关键：仅错误时删除
    return '验证码输入错误！';
  }

  // 5. 验证成功：删除captchaId（防止复用）
  captchaStore.delete(captchaId);
  return null;
};

// 清理过期验证码（可以定期调用）
const cleanExpiredCaptchas = () => {
  const now = Date.now();
  for (const [key, value] of captchaStore.entries()) {
    if (now > value.expires) {
      captchaStore.delete(key);
    }
  }
};

module.exports = {
  createCaptcha,
  validateCaptcha,
  cleanExpiredCaptchas
};
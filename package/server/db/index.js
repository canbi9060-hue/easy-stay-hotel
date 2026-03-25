// 导入 mysql 模块
const mysql = require('mysql')
// 创建数据库连接对象
const db = mysql.createPool({
    host:'127.0.0.1',
    user:'root',
    password:'200425bc',
    database:'easy-stay-hotel',
})

// Promisify db.query for await usage
const query = (sql, values) => {
  return new Promise((resolve, reject) => {
    db.query(sql, values, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

// 向外共享 db 数据库连接对象
module.exports = {
  db,
  query
}

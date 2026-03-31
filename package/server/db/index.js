const mysql = require('mysql');

const db = mysql.createPool({
  host: '127.0.0.1',
  user: 'root',
  password: '200425bc',
  database: 'easy-stay-hotel',
});

const query = (sql, values) => {
  return new Promise((resolve, reject) => {
    db.query(sql, values, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

const getConnection = () => {
  return new Promise((resolve, reject) => {
    db.getConnection((err, connection) => {
      if (err) return reject(err);
      resolve(connection);
    });
  });
};

const queryWithConnection = (connection, sql, values) => {
  return new Promise((resolve, reject) => {
    connection.query(sql, values, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

const beginTransaction = (connection) => {
  return new Promise((resolve, reject) => {
    connection.beginTransaction((err) => {
      if (err) return reject(err);
      resolve();
    });
  });
};

const commitTransaction = (connection) => {
  return new Promise((resolve, reject) => {
    connection.commit((err) => {
      if (err) return reject(err);
      resolve();
    });
  });
};

const rollbackTransaction = (connection) => {
  return new Promise((resolve) => {
    connection.rollback(() => {
      resolve();
    });
  });
};

const withTransaction = async (runner) => {
  const connection = await getConnection();
  try {
    await beginTransaction(connection);
    const tx = {
      query: (sql, values) => queryWithConnection(connection, sql, values),
    };
    const result = await runner(tx);
    await commitTransaction(connection);
    return result;
  } catch (error) {
    await rollbackTransaction(connection);
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  db,
  query,
  withTransaction,
  queryWithConnection,
};

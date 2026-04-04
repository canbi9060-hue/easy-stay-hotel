const { query } = require('../../db/index');

const runQuery = (executor, sql, values) => {
  if (executor?.query) {
    return executor.query(sql, values);
  }
  return query(sql, values);
};

const lockUserRow = async (executor, userId) => {
  await runQuery(
    executor,
    `SELECT id FROM users WHERE id = ? FOR UPDATE`,
    [userId]
  );
};

module.exports = {
  runQuery,
  lockUserRow,
};

const path = require('path');
const express = require('express');
const cors = require('cors');
const { formatResponseTime } = require('./middleware/formatResponseTime');

const app = express();

app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(formatResponseTime);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const router = require('./router');
app.use('/api', router);

app.listen(3007, () => {
  console.log('express server running at http://127.0.0.1:3007');
});

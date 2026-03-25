// app.js
const express = require('express');
const app = express();
const cors = require('cors');
app.use(cors());
app.use(express.urlencoded({extended:false}));
app.use(express.json());



// 导入总路由
const router = require('./router');
// 把总路由挂载到 /api 路径下
// 此时所有接口都会再加上 /api 前缀
app.use('/api', router); 

app.listen(3007,()=>{
    console.log('express server running at http://127.0.0.1:3007')
})
const express = require('express');
const app = express();
const morgan = require('morgan');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv/config');
const serverless = require('serverless-http');

app.use(cors());
app.options('/{*any}', cors());


//Middleware
app.use(express.json());
app.use(morgan('tiny'));

//routes
const productsRoutes = require('./routers/products');
const usersRoutes = require('./routers/users');
const categoryRoutes = require('./routers/categories');
const ordersRoutes = require('./routers/orders');
const cartRoutes = require('./routers/cart');

const api = process.env.API_URL;
app.use(`${api}/products`, productsRoutes);
app.use(`${api}/users`, usersRoutes);
app.use(`${api}/categories`, categoryRoutes);
app.use(`${api}/orders`, ordersRoutes);
app.use(`${api}/cart`, cartRoutes);


//Database
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  dbName: 'Ekoseller',
})
.then(() => {
  console.log('MongoDB connected');
})
.catch((err) => {
  console.error('MongoDB connection error:', err);
});

module.exports = app;
module.exports.handler = serverless(app);
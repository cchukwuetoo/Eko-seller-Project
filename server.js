const express = require('express');
const app = express();
const morgan = require('morgan');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv/config');

app.use(cors());
app.options('/{*any}', cors());


//Middleware
app.use(express.json());
app.use(morgan('tiny'));

//routes
const productsRoutes = require('./routers/products');
const usersRoutes = require('./routers/users');
const categoryRoutes = require('./routers/categories');

const api = process.env.API_URL;
app.use(`${api}/products`, productsRoutes);
app.use(`${api}/users`, usersRoutes);
app.use(`${api}/categories`, categoryRoutes);


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

//Server
app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
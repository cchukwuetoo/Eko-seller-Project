const { Order } = require('../models/orders');
const { OrderItem } = require('../models/order-item');
const { Product } = require('../models/products');

const jwt = require('jsonwebtoken');
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');


// Authentication middleware
const auth = (req, res, next) => {
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
  
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(401).json({ success: false, message: 'Authentication failed' });
    }
};

// Seller authorization middleware
const sellerAuth = (req, res, next) => {
    if (req.user.role !== 'seller' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Seller privileges required' });
    }
    next();
};

//get all orders
router.get('/', async (req, res) => {
    try {
        const orderList = await Order.find()
            .populate('user', 'name')
            .populate({ 
                path: 'orderItems', populate: { 
                    path: 'product', populate: 'category' 
                } 
            })
            .sort({ dateOrdered: -1 });
            if (!orderList) {
                return res.status(500).json({
                    success: false,
                    message: 'No orders found',
                });
            }
        res.status(200).json(orderList);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

//get order by id
router.get('/:id', async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid order ID',
            });
        }
        const order = await Order.findById(req.params.id)
            .populate('user', 'name')
            .populate({ 
                path: 'orderItems', populate: { 
                    path: 'product', populate: 'category' 
                } 
            })
            if (!order) {
                return res.status(500).json({
                    success: false,
                    message: 'Order not found',
                });
            }
        res.status(200).json(order);

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
        
    }
})

//Create new order
router.post('/', async (req,res)=>{
    try {
        const orderItemsIdsPromises = req.body.orderItems.map(async (orderItem) =>{
            const product = await Product.findById(orderItem.product);
            if (!product) {
                throw new Error(`Product with ID ${orderItem.product} not found`)
            }
            let newOrderItem = new OrderItem({
                quantity: orderItem.quantity,
                product: orderItem.product,
                price: product.price
            })
    
            newOrderItem = await newOrderItem.save();
    
            return newOrderItem._id;
        })
        const orderItemsIds =  await Promise.all(orderItemsIdsPromises);
    
        const totalPricesPromises = orderItemsIds.map(async (orderItemId)=>{
            const orderItem = await OrderItem.findById(orderItemId).populate('product', 'price');
            const totalPrice = orderItem.product.price * orderItem.quantity;
            return totalPrice
        })
        const totalPrices = await Promise.all(totalPricesPromises);
        const totalPrice = totalPrices.reduce((a,b) => a +b , 0);
    
        let order = new Order({
            orderItems: orderItemsIds,
                shippingAddress1: req.body.shippingAddress1,
                shippingAddress2: req.body.shippingAddress2,
                state: req.body.state,
                zip: req.body.zip,
                country: req.body.country,
                phone: req.body.phone,
                status: req.body.status  || 'Pending',
                totalPrice: totalPrice,
                user: req.body.user,
        })
        order = await order.save();
    
        if(!order)
        return res.status(400).send('the order cannot be created!')
    
        res.send(order);
    } catch (error) {
        console.error('order creation error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}) 

//Update order status
router.put('/:id', async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid order ID',
            });
        }
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            {
                status: req.body.status,
            },
            { new: true }
        );
        if (!order) {
            return res.status(500).json({
                success: false,
                message: 'Order not found',
            });
        }
        res.status(200).json(order);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

//Delete order
router.delete('/:id', async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid order ID',
            });
        }
        const order = await Order.findByIdAndRemove(req.params.id);
        if (!order) {
            return res.status(500).json({
                success: false,
                message: 'Order not found',
            });
        }
        res.status(200).json({
            success: true,
            message: 'Order deleted successfully',
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

//Get total sales
router.get('/get/totalsales', auth, sellerAuth, async (req, res) => {
    try {
        const totalSales = await Order.aggregate([
            { $group: { _id: null, totalSales: { $sum: '$totalPrice' } } },
        ]);
        if (!totalSales) {
            return res.status(500).json({
                success: false,
                message: 'Total sales not found',
            });
        }
        res.status(200).json({ totalSales: totalSales.pop().totalSales });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

//Get order count
router.get('/get/count', auth, sellerAuth, async (req, res) => {
    try {
        const orderCount = await Order.countDocuments();
        if (!orderCount) {
            return res.status(500).json({
                success: false,
                message: 'Order count not found',
            });
        }
        res.status(200).json({ orderCount });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});

//Get user orders
router.get('/get/userorders/:userid', auth, sellerAuth, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.userid)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID',
            });
        }
        const userOrderList = await Order.find({ user: req.params.userid })
           .populate({
               path: 'orderitems', populate: {
                 path: 'product', populate: 'category'
               }
           })
           .sort({ dateOrdered: -1 });
           if(!userOrderList || userOrderList.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No orders found for this user',
                });
            }
        res.status(200).json(userOrderList);
            return res.status(500).json({
                success: false,
                message: 'No orders found for this user',
            });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
        });
        
    }
})
module.exports = router;
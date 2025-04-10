const Product = require('../models/products');
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { Category } = require('../models/category');
const multer = require('multer');


// Configure multer for file uploads
const FILE_TYPE_MAP = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpg'
};

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const isValid = FILE_TYPE_MAP[file.mimetype];
        let uploadError = new Error('Invalid image type');

        if (isValid) {
            uploadError = null;
        }
        cb(uploadError, 'public/uploads');
    },
    filename: function (req, file, cb) {
        const fileName = file.originalname.split(' ').join('-');
        const extension = FILE_TYPE_MAP[file.mimetype];
        cb(null, `${fileName}-${Date.now()}.${extension}`);
    }
});

const uploadOptions = multer({ storage: storage });


//Get all products
router.get('/', async (req, res) => {
    try {
        // Filtering options
        let filter = {};
        
        if (req.query.categories) {
            filter.category = { $in: req.query.categories.split(',') };
        }
        
        if (req.query.brand) {
            filter.brand = req.query.brand;
        }
        
        if (req.query.colour) {
            filter.colour = req.query.colour;
        }
        
        if (req.query.minPrice && req.query.maxPrice) {
            filter.price = { $gte: req.query.minPrice, $lte: req.query.maxPrice };
        } else if (req.query.minPrice) {
            filter.price = { $gte: req.query.minPrice };
        } else if (req.query.maxPrice) {
            filter.price = { $lte: req.query.maxPrice };
        }
        
        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        
        // Sorting
        let sort = {};
        if (req.query.sort) {
            const sortField = req.query.sort.split(':')[0] || 'dateCreated';
            const sortOrder = req.query.sort.split(':')[1] === 'desc' ? -1 : 1;
            sort[sortField] = sortOrder;
        } else {
            sort = { dateCreated: -1 }; // Default sort by newest
        }
        
        // Execute query
        const productList = await Product.find(filter)
            .populate('category')
            .skip(skip)
            .limit(limit)
            .sort(sort);
            
        const count = await Product.countDocuments(filter);
        
        res.status(200).json({
            products: productList,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            totalProducts: count
        });
    } catch (error) {
        res.status(500).json({
            message: 'Error retrieving products',
            error: error.message
        });
    }
})


//Create new product
router.post('/', uploadOptions.single('image'), async (req, res) => {
    try {
        const category = await Category.findById(req.body.category);
        if (!category) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category'
            });
        }
        const file = req.file;
        if (!file) {
            return res.status(400).json({
                success: false,
                message: 'No image provided'
            });
        }
        const fileName = file.filename;
        const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;
        const product = new Product({
            name: req.body.name,
            description: req.body.description,
            image: `${basePath}${fileName}`,
            images: req.body.images,
            brand: req.body.brand,
            price: req.body.price,
            colour: req.body.colour,
            size: req.body.size,
            category: req.body.category,
            countInStock: req.body.countInStock,
        });
        const savedProduct = await product.save();
        if (!savedProduct) {
            return res.status(500).json({
                success: false,
                message: 'Product cannot be created'
            });
        }
        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            product: savedProduct
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});


module.exports = router;   
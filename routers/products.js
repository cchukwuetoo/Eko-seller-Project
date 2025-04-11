const { Product } = require('../models/products');
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

const fs = require('fs');
const path = require('path');

// Ensure uploads directory exists
const uploadPath = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}


// Set up storage engine for multer
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
router.post(`/`, uploadOptions.array('image', 5), async (req, res) =>{
    const category = await Category.findById(req.body.category);
    if(!category) return res.status(400).json({
        success: false,
        message: 'Invalid category ID'
    })

    const files = req.files;
    if(!files || files.length === 0) return res.status(400).json({
        success: false,
        message: 'No images uploaded'
    });

    const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;
    const imagePaths = files.map((file) => `${basePath}${file.filename}`);
    let product = new Product({
        name: req.body.name,
        description: req.body.description,
        image: imagePaths[0],
        images: imagePaths,
        brand: req.body.brand,
        price: req.body.price,
        colour: req.body.colour,
        size: req.body.size,
        category: req.body.category,
        countInStock: req.body.countInStock,
        rating: req.body.rating || 0,
        dateCreated: req.body.dateCreated || Date.now()
    })

    product = await product.save();

    if(!product) 
    return res.status(500).json({
        success: false,
        message: 'The product cannot be created'
    });

    res.send(product);
})


//Get product by ID
router.get('/:id', async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid product ID' 
            });
        }
        const product = await Product.findById(req.params.id).populate('category');
        if (!product) {
            return res.status(404).json({ 
                success: false, 
                message: 'Product not found' 
            });
        }
        res.status(200).json(product);
    } catch (error) {
        res.status(500).json({
            message: 'Error retrieving product',
            error: error.message
        });
    }
})

//Update product by ID
router.put('/:id', uploadOptions.array('image', 5), async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid product ID'
        });
    }

    const category = await Category.findById(req.body.category);
    if (!category) return res.status(400).json({
        success: false,
        message: 'Invalid category ID'
    });

    const files = req.files;
    let imagePaths = [];

    if (files && files.length > 0) {
        const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;
        imagePaths = files.map((file) => `${basePath}${file.filename}`);
    }

    const updatedProduct = await Product.findByIdAndUpdate(
        req.params.id,
        {
            name: req.body.name,
            description: req.body.description,
            image: imagePaths.length > 0 ? imagePaths[0] : req.body.image, 
            images: imagePaths.length > 0 ? imagePaths : req.body.images,
            brand: req.body.brand,
            price: req.body.price,
            colour: req.body.colour,
            size: req.body.size,
            category: req.body.category,
            countInStock: req.body.countInStock,
            rating: req.body.rating || 0,
        },
        { new: true }
    );

    if (!updatedProduct)
        return res.status(500).json({
            success: false,
            message: 'The product cannot be updated'
        });

    res.status(200).send(updatedProduct);
});

//Delete product by ID
router.delete('/:id', async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid product ID'
        });
    }

    const deletedProduct = await Product.findByIdAndRemove(req.params.id);

    if (!deletedProduct) {
        return res.status(500).json({
            success: false,
            message: 'The product cannot be deleted'
        });
    }

    res.status(200).json({
        success: true,
        message: 'The product has been deleted'
    });
});

//Get count of products
router.get('/get/count', async (req, res) => {
    try {
        const productCount = await Product.countDocuments();
        res.status(200).json({ count: productCount });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error retrieving product count',
            error: error.message
        });
    }
});


//Get product by category
router.get('/category/:categoryId', async (req, res) => {
    const categoryId = req.params.categoryId;

    if (!mongoose.isValidObjectId(categoryId)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid category ID'
        });
    }

    try {
        const products = await Product.find({ category: categoryId }).populate('category');
        res.status(200).json({ success: true, products });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error retrieving products by category',
            error: error.message
        });
    }
});

//Get product by unique attributes(brand, colour, size)
router.get('/', async (req, res) => {
    try {
        const filter = {};
        
        if (req.query.colour) filter.colour = req.query.colour;
        if (req.query.size) filter.size = req.query.size;
        if (req.query.brand) filter.brand = req.query.brand;
        
        const products = await Product.find(filter);
        
        res.status(200).json(products);
        
    } catch (error) {
        res.status(500).json({
            message: 'Error retrieving product attributes',
            error: error.message
        });
    }
});



module.exports = router;   
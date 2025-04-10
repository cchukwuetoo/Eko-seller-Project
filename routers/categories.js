const {Category} = require('../models/category');
const express = require('express');
const router = express.Router();


//Get all category
router.get('/', async (req, res) => {
    try {
        const categoryList = await Category.find().populate('parentCategory', 'name');
        if (!categoryList) {
        res.status(500).json({
            success: false, 
            message: 'No category found'
        });
        }
        res.status(200).json(categoryList);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
})

//Get Category by id
router.get('/:id', async (req, res) => {
    try {
        const category = await Category.findById(req.params.id).populate('parentCategory', 'name');
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Category with given ID not found'
            });
        }
        res.status(200).json(category);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
})

//Create a new Parent category and New category
router.post('/', async (req, res) => {
    const {name, icon, color, parentCategory} = req.body;
    let parentCategoryObj = null;
    if (parentCategory) {
        parentCategoryObj = await Category.findById(parentCategory);

        if (!parentCategoryObj) {
            const newParentCategory = new Category({
                name: parentCatergory,
                icon: 'default_icon',
                color: 'default-color,'
            });
            try {
                parentCategoryObj = await newParentCategory.save();
            } catch (error) {
                return res.status(400).json({
                    success: false,
                    message: 'Parent category not found and unable to create new parent category'
                });
            }
        }
    }
    const category = new Category({
        name,
        icon,
        color,
        parentCategory: parentCategoryObj ? parentCategoryObj._id : null
    });
    try {
        const savedCategory = await category.save();
        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            category: savedCategory
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
    
})

//Update a category
router.put('/:id', async (req, res) => {
     const updatedCategory = await Category.findByIdAndUpdate(
            req.params.id,
            {
                name: req.body.name,
                icon: req.body.icon || category.icon,
                color: req.body.color,
            },
            {new: true }
        );
        if (!updatedCategory) return res.status(404).json({
           success: false,
           message:  'Category not found'
    })
    res.send(updatedCategory);
    
});

//Delete a category
router.delete('/:id', async (req, res) => {
    try {
       const deletedCategory = await Category.findByIdAndDelete(req.params.id);
       if (!deletedCategory) 
        return res.status(404).json({
          success: false, 
          message: 'Category not found!'
        });

       res.status(200).json({
        success: true, 
        message: 'Category deleted'
       });
    } catch (error) {
        res.status(500).json({success: false, error: error.message})
    }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const {User} = require('../models/users');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const randomstring = require('randomstring');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
dotenv.config();

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

// Admin authorization middleware
const adminAuth = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Admin privileges required' });
  }
  next();
};


const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // limit each IP to 3 OTP requests per windowMs
  message: {
    success: false,
    message: 'Too many OTP requests from this IP, please try again later.'
  }
})

//Email configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  secure: true,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

transporter.verify(function(error, success){
  if (error) {
    console.log('SMTP server connection error:', error);
  } else {
    console.log('SMTP server connection successful');
  }
});

//get all sellers(public route)
router.get('/sellers', async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Filtering
    let filter = { role: 'seller' };
    if (req.query.state) filter.state = req.query.state;
    if (req.query.localGovernmentArea) filter.localGovernmentArea = req.query.localGovernmentArea;
    if (req.query.marketLocation) filter.marketLocation = req.query.marketLocation;


   const sellers = await User.find({ role: 'seller' })
     .select('-password -passwordHash -verificationCode -otp -otpExpiry')
     .limit(10); // Limit to 10 sellers for public view

   res.status(200).json({
     success: true,
     sellers: sellers
   });
 } catch (error) {
   console.error('Error fetching sellers:', error);
   res.status(500).json({
     success: false,
     message: 'An error occurred while fetching sellers'
   });
  }
});


//get all users admin only
router.get('/', auth, adminAuth, async (req, res) => {
 try {
   // Pagination
   const page = parseInt(req.query.page) || 1;
   const limit = parseInt(req.query.limit) || 10;
   const skip = (page - 1) * limit;
   
   // Filtering
   let filter = {};
   if (req.query.role) filter.role = req.query.role;
   if (req.query.state) filter.state = req.query.state;
   if (req.query.country) filter.country = req.query.country;
   if (req.query.isVerified) filter.isVerified = req.query.isVerified === 'true';

   const users = await User.find(filter)
      .select('-password -passwordHash -verificationCode -otp -otpExpiry')
      .skip(skip)
      .limit(limit);
   
   const count = await User.countDocuments(filter);   
   res.status(200).json({
     success: true,
     totalPages: Math.ceil(count / limit),
     currentPage: page,
     users: users
   });
 } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching users'
    });
 }
});


// Get user by ID (admin only)
router.get('/:id', auth, adminAuth, async (req, res) => {
 try {
   const userId = req.params.id;
   const user = await User.findById(userId).select('-password -passwordHash -verificationCode -otp -otpExpiry');
   if (!user) {
     return res.status(404).json({
       success: false,
       message: 'User not found'
     });
   }
   res.status(200).json({
     success: true,
     user: user
   });
 } catch (error) {
   console.error('Error fetching user:', error);
   res.status(500).json({
     success: false,
     message: 'An error occurred while fetching the user'
   });
 }
});

//Register New Users
router.post('/register', async(req, res) => {
    try {
      const { name, email, password, phone, role, marketLocation, description, localGovernmentArea, state, country } = req.body;
      const requiredFields = [name, email, password, phone, role, state, country];
      if (role === 'seller') {
        requiredFields.push(marketLocation, description, localGovernmentArea);
      }
      if (requiredFields.some(field => !field)) {
        return res.status(400).json({ message: 'All fields are required' });
      }

      //validate email and phone number

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
           success: false,
          message: 'Invaild email format'
        });
      }

      const phoneRegex = /^(?:(?:\+?234)|0)(?:70|71|80|81|90|91|809|817|818|908|909)\d{7,8}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({
          success: false,
          message: 'invalid phone number format'
        })
      }


      const existingUser = await User.findOne({$or: [{ email }, { phone }] });
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'User with this email or phone number already exists'
        });
      }
      //generate OTP
      const otp = randomstring.generate({
        length: 6,
        charset: 'numeric'
      });
     const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
   
      //hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      //create user
      const user = new User({
        name, 
        email,
        password: passwordHash,
        phone,
        role,
        marketLocation,
        description,
        localGovernmentArea,
        state,
        country,
        isVerified: false,
        otp: otp,
        verificationCode: otp,
        otpExpiry: otpExpiry

      });
      const savedUser = await user.save();

      // Send OTP email
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Verify your account - Eko Seller',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <h1 style="color: #4CAF50; text-align: center;">Welcome to Fresh Farm!</h1>
            <p style="font-size: 16px;">Hello ${name},</p>
            <p style="font-size: 16px;">Thank you for registering. To verify your account, please use the code below:</p>
            
            <div style="background-color: #f8f8f8; padding: 15px; text-align: center; margin: 20px 0; border-radius: 4px;">
              <h2 style="margin: 0; color: #4CAF50; letter-spacing: 5px; font-size: 28px;">${otp}</h2>
            </div>
            
            <p style="font-size: 16px;">This code will expire in 15 minutes.</p>
            <p style="font-size: 16px;">If you did not request this verification, please ignore this email.</p>
          </div>
        `
      };
      
      await transporter.sendMail(mailOptions);



      res.status(201).json({
        success: true,
        message: 'User registered successfully. Please verify email with the OTP sent',
        userId: savedUser._id
      })
    } catch (error) {
      console.error('Registration error:', error);

      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(error => error.message);
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validationErrors
        })
      }
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'User with this information already exists'
        });
      }
      res.status(500).json({
        success: false,
        message: 'An error occured during registration'
      });
    }
  });

  // OTP verfification
  router.post('/verify-otp', async (req, res) => {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          message: 'Email and OTP are required'
        });
      }

      const user = await User.findOne({email: email});
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (user.verificationCode!== otp) {
        return res.status(400).json({
          success: false,
          message: 'Invalid OTP'
        });
      }

      if (user.otpExpiry < new Date) {
        return res.status(400).json({
          success: false,
          message: 'OTP has expired. Please request a new one'
        });
      }


      user.isVerified = true;
      user.verificationCode = undefined; // Clear the OTP after successful verification
      user.otpExpiry = undefined; // Clear the OTP expiry time
      await user.save();

      res.status(200).json({
        success: true,
        message: 'User verified successfully'
      });
    } catch (error) {
      console.error('OTP verification error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred during OTP verification'
      });
    }
  });

  //Resend OTP
  router.post('/resend-otp', otpRateLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({
          success: false,
          message: 'Email is required'
        });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }
      const user = await User.findOne({ email });
      if (user.isVerified) {
        return res.status(400).json({
          success: false,
          message: 'User already verified'
        });
      }
      const otp = randomstring.generate({
        length: 6,
        charset: 'numeric'
      });
      const otpExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
      user.otp = otp;
      user.verificationCode = otp;
      user.otpExpiry = otpExpiry;
      await user.save();

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'New verfication code - Eko Seller',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <h1 style="color: #4CAF50; text-align: center;">Fresh Farm Verification</h1>
            <p style="font-size: 16px;">Hello ${user.name},</p>
            <p style="font-size: 16px;">You requested a new verification code. Please use the code below:</p>
            
            <div style="background-color: #f8f8f8; padding: 15px; text-align: center; margin: 20px 0; border-radius: 4px;">
              <h2 style="margin: 0; color: #4CAF50; letter-spacing: 5px; font-size: 28px;">${otp}</h2>
            </div>
            
            <p style="font-size: 16px;">This code will expire in 15 minutes.</p>
            <p style="font-size: 16px;">If you did not request this verification, please ignore this email.</p>
          </div>
        `
      };
      
      await transporter.sendMail(mailOptions);
      
      // Log OTP for debugging
      console.log(`Resent OTP to user ${email}: , expires: ${otpExpiry}`);
  
      return res.status(200).json({
        success: true,
        message: 'New OTP has been sent to your email'
      });

    } catch (error) {
      console.error('Resend OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while resending OTP'
      });
      
    }
  })

  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }
      
      //validate email and password
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      //check if user is verfied

      if (!user.isVerified) {
        return res.status(401).json({
          success: false,
          message: 'Please verify your email before logging in'
        });
        
      }

      //verfiy password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }
      //generate JWT token
      const token = jwt.sign({ 
        userId: user._id,
        email: user.email, 
        role: user.role 
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        userId: user._id,
        token: token,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred during login'
      });
    }
  });
  
  //Update user profile
router.put('/update-profile/:id', auth, async (req, res) => {
    try {
      const userId = req.user.userId;
      const { name, email, phone, marketLocation, description, localGovernmentArea, state, country } = req.body;
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      user.name = name || user.name;
      user.email = email || user.email;
      user.phone = phone || user.phone;
      user.marketLocation = marketLocation || user.marketLocation;
      user.description = description || user.description;
      user.localGovernmentArea = localGovernmentArea || user.localGovernmentArea;
      user.state = state || user.state;
      user.country = country || user.country;

      const updatedUser = await user.save();
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        user: updatedUser
      });
    } catch (error) {
      console.error('Profile update error:', error);
      res.status(500).json({
        success: false,
        message: 'An error occurred while updating profile'
      });
    }
})

//delete user (admin only)
router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while deleting the user'
    });
  }
})
  module.exports = router;
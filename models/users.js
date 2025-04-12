const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
        minLength: 8
    },
    passwordHash: {
        type: String,
        required: false,
    },
    phone: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'seller'],
        default: 'user',
    },
    marketLocation: {
        type: String,
        required: function() {
            return this.role === 'seller';
        }
    },
    description: {
        type: String,
        required: function() {
            return this.role === 'seller';
        }
    },
    localGovernmentArea :{
        type: String,
        required: function() {
            return this.role === 'seller';
        },
        maxlength: 500
    },
    state: {
        type: String,
        default: '',
        required: true,
    },
    country: {
        type: String,
        default: '',
        required: true,
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    verificationCode: {
        type: String,
        default: null,
    },
    otp: {
        type: String,
        default: null,
    },
    otpExpiry: {
        type: Date,
        default: null,
    },

});

userSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

userSchema.set('toJSON', {
    virtuals: true,
});

const userOTPVerificationSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    otp: {
        type: String,
        required: true,
    },
    expiryTime: {
        type: Date,
        required: true,
    },
});

exports.User = mongoose.model('User', userSchema);
exports.UserOTPVerification = mongoose.model('UserOTPVerification', userOTPVerificationSchema);
exports.userSchema = userSchema;
exports.userOTPVerificationSchema = userOTPVerificationSchema;
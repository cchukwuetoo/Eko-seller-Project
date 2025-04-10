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
        required: true,
    },
    phone: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ['user', 'admin', 'seller'],
        default: User,
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
    }

});

userSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

userSchema.set('toJSON', {
    virtuals: true,
});

exports.User = mongoose.model('User', userSchema);
exports.userSchema = userSchema;
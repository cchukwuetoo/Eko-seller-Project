const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
        default: 1,
    },
    price: {
        type: Number,
        required: true,
    },
    dateCreated: {
        type: Date,
        default: Date.now,
    },
});

orderItemSchema.virtual('id').get(function () {
    return this._id.toHexString();
});
orderItemSchema.set('toJSON', {
    virtuals: true,
});

exports.orderItemSchema = orderItemSchema;
exports.OrderItem = mongoose.model('OrderItem', orderItemSchema);
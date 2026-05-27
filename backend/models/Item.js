const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
    category: { 
        type: String, 
        required: true, 
        enum: ['Keyboard', 'Mouse', 'Monitor', 'CPU'] 
    },
    brand: { type: String, required: true },
    model: { type: String, required: true },
    specs: { type: String },
    quantity: { type: Number, required: true, min: 0 },
    purchaseDate: { type: Date }, // Optional field per requirements
    condition: { 
        type: String, 
        enum: ['Working', 'Faulty', 'Repair'], 
        default: 'Working' 
    }, // Optional field per requirements
    room: { type: String, default: 'Unassigned' } // Advanced Room-wise tracking feature
}, { timestamps: true });

module.exports = mongoose.model('Item', ItemSchema);
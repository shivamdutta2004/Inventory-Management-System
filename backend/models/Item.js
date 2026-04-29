const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema({
    category: String,
    brand: String,
    model: String,
    specifications: String,   // ✅ FIXED NAME
    quantity: Number,         // ✅ FIXED TYPE
    purchaseDate: Date,
    condition: String
});

module.exports = mongoose.model("Item", itemSchema);
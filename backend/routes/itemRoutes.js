const express = require('express');
const router = express.Router();
const Item = require('../models/Item');

// GET all items
router.get('/', async (req, res) => {
    try {
        const items = await Item.find().sort({ createdAt: -1 });
        res.json(items);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST create item
router.post('/', async (req, res) => {
    try {
        const newItem = new Item({
            category: req.body.category,
            brand: req.body.brand,
            model: req.body.model,
            specs: req.body.specs,
            quantity: Number(req.body.quantity),
            purchaseDate: req.body.purchaseDate || null,
            condition: req.body.condition || 'Working',
            room: req.body.room || 'Unassigned'
        });
        const savedItem = await newItem.save();
        res.status(201).json(savedItem);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUT update item
router.put('/:id', async (req, res) => {
    try {
        const updatedItem = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedItem) return res.status(404).json({ message: 'Item not found' });
        res.json(updatedItem);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE item
router.delete('/:id', async (req, res) => {
    try {
        const item = await Item.findByIdAndDelete(req.params.id);
        if (!item) return res.status(404).json({ message: 'Item not found' });
        res.json({ message: 'Item successfully wiped from directory' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
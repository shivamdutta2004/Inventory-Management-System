const express = require("express");
const router = express.Router();
const Item = require("../models/Item");

// CREATE
router.post("/", async (req, res) => {
    const item = new Item(req.body);
    await item.save();
    res.json(item);
});

// READ
router.get("/", async (req, res) => {
    const items = await Item.find();
    res.json(items);
});

// UPDATE
router.put("/:id", async (req, res) => {
    const updated = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
});

// DELETE
router.delete("/:id", async (req, res) => {
    await Item.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
});

module.exports = router;
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 1. JWT Secret Configuration (Fall back to a string if .env doesn't have it)
const JWT_SECRET = process.env.JWT_SECRET || 'ASSET_MATRIX_SUPER_SECRET_TOKEN_KEY_2026';

// 2. Database Models
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', UserSchema);

const ItemSchema = new mongoose.Schema({
    category: String,
    brand: String,
    model: String,
    room: String,
    quantity: Number,
    purchaseDate: Date,
    condition: String,
    specs: String
});
const Item = mongoose.model('Item', ItemSchema);

// 3. Security Authentication Middleware (Protects Inventory Routes)
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ message: 'Access Denied: No Token Provided' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Session Invalid or Expired' });
        req.user = user;
        next();
    });
};

// 4. Authentication Endpoints (Sign Up & Login)
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const existingUser = await User.findOne({ username });
        if (existingUser) return res.status(400).json({ message: 'Username already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: 'User registered successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ message: 'Invalid enterprise credentials' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ message: 'Invalid enterprise credentials' });

        const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '8h' });
        res.json({ token, username: user.username });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Protected Assets Inventory Endpoints (Added authenticateToken middleware)
app.get('/api/items', authenticateToken, async (req, res) => {
    const items = await Item.find();
    res.json(items);
});

app.post('/api/items', authenticateToken, async (req, res) => {
    const newItem = new Item(req.body);
    await newItem.save();
    res.json(newItem);
});

app.put('/api/items/:id', authenticateToken, async (req, res) => {
    const updated = await Item.findByIdAndUpdate(req.id || req.params.id, req.body, { new: true });
    res.json(updated);
});

app.delete('/api/items/:id', authenticateToken, async (req, res) => {
    await Item.findByIdAndDelete(req.params.id);
    res.json({ message: 'Asset removed' });
});

// Database Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/inventory')
    .then(() => console.log('🚀 DB connected securely with Auth Layers'))
    .catch(err => console.error(err));

app.listen(5000, () => console.log('✨ Server listening on port 5000'));
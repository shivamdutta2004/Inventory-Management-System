const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect("mongodb://127.0.0.1:27017/inventoryDB")
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

// Routes
const itemRoutes = require("./routes/itemRoutes");
app.use("/api/items", itemRoutes);

// Start Server
app.listen(5000, () => {
    console.log("Server running on port 5000");
});
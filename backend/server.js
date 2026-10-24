
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const pool = require("./config/db");

const profileRoutes = require("./routes/profileRoutes");
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const addressRoutes = require("./routes/addressRoutes");
const cartRoutes = require("./routes/cartRoutes");
const orderRoutes = require("./routes/orderRoutes");

const app = express();

// Paths
const frontendPath = path.resolve(__dirname, "..", "frontend");
const checkoutPath = path.join(frontendPath, "checkout.html");

console.log("Frontend folder:", frontendPath);
console.log("Checkout file exists:", fs.existsSync(checkoutPath));

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend HTML, CSS, JS and other static files
app.use(express.static(frontendPath));

// Home page
app.get("/", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
});

// Explicit checkout route for diagnosis
app.get("/checkout.html", (req, res) => {
    res.sendFile(checkoutPath, (error) => {
        if (error) {
            console.error("Checkout page error:", error.message);
            if (!res.headersSent) {
                res.status(404).send(
                    "Checkout page not found. Check the frontend path."
                );
            }
        }
    });
});

// Health check
app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "NovaMart backend is running!"
    });
});

// Database connection test
app.get("/api/db-test", async (req, res) => {
    try {
        const [rows] = await pool.query(
            "SELECT DATABASE() AS databaseName"
        );

        res.json({
            success: true,
            message: "MySQL connected successfully!",
            database: rows[0].databaseName
        });
    } catch (error) {
        console.error("Database error:", error.message);

        res.status(500).json({
            success: false,
            message: "MySQL connection failed"
        });
    }
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/profile", profileRoutes);

// Unknown API routes
app.use("/api", (req, res) => {
    res.status(404).json({
        success: false,
        message: "API route not found"
    });
});

// Unknown page routes
app.use((req, res) => {
    res.status(404).send("Page not found");
});

// Error handler
app.use((error, req, res, next) => {
    console.error("Server error:", error);

    if (res.headersSent) {
        return next(error);
    }

    res.status(500).json({
        success: false,
        message: "Internal server error"
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`NovaMart server running at http://localhost:${PORT}`);
});


const express = require("express");
const pool = require("../config/db");

const router = express.Router();

// GET ALL PRODUCTS
router.get("/", async (req, res) => {
    try {
        const { category, search } = req.query;

        let sql = `
            SELECT product_id, name, description, price,
                   image_url, stock, category, created_at
            FROM products
        `;

        const conditions = [];
        const values = [];

        if (category) {
            conditions.push("category = ?");
            values.push(category);
        }

        if (search) {
            conditions.push("(name LIKE ? OR description LIKE ?)");
            values.push(`%${search}%`, `%${search}%`);
        }

        if (conditions.length > 0) {
            sql += " WHERE " + conditions.join(" AND ");
        }

        sql += " ORDER BY product_id DESC";

        const [products] = await pool.execute(sql, values);

        res.json({
            success: true,
            count: products.length,
            products
        });
    } catch (error) {
        console.error("Product error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to fetch products"
        });
    }
});

// GET ONE PRODUCT
router.get("/:id", async (req, res) => {
    try {
        const productId = Number(req.params.id);

        if (!Number.isInteger(productId) || productId < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID"
            });
        }

        const [products] = await pool.execute(
            "SELECT * FROM products WHERE product_id = ?",
            [productId]
        );

        if (products.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        res.json({
            success: true,
            product: products[0]
        });
    } catch (error) {
        console.error("Product detail error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to fetch product"
        });
    }
});

module.exports = router;

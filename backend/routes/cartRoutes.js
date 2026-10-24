
const express = require("express");
const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

// VIEW CART
router.get("/", async (req, res) => {
    try {
        const [items] = await pool.execute(
            `SELECT
                ci.cart_item_id,
                ci.user_id,
                ci.product_id,
                ci.quantity,
                p.name,
                p.price,
                p.image_url,
                p.stock,
                (p.price * ci.quantity) AS subtotal
             FROM cart_items ci
             JOIN products p ON p.product_id = ci.product_id
             WHERE ci.user_id = ?
             ORDER BY ci.cart_item_id DESC`,
            [req.user.user_id]
        );

        const total = items.reduce(
            (sum, item) => sum + Number(item.subtotal),
            0
        );

        res.json({
            success: true,
            items,
            total: Number(total.toFixed(2))
        });
    } catch (error) {
        console.error("Cart fetch error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to fetch cart"
        });
    }
});

// ADD PRODUCT TO CART
router.post("/", async (req, res) => {
    try {
        const productId = Number(req.body.product_id);
        const quantity = Number(req.body.quantity ?? 1);

        if (
            !Number.isInteger(productId) || productId < 1 ||
            !Number.isInteger(quantity) || quantity < 1
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid product_id and positive quantity are required"
            });
        }

        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            const [products] = await connection.execute(
                "SELECT product_id, stock FROM products WHERE product_id = ? FOR UPDATE",
                [productId]
            );

            if (products.length === 0) {
                await connection.rollback();

                return res.status(404).json({
                    success: false,
                    message: "Product not found"
                });
            }

            const [existing] = await connection.execute(
                `SELECT quantity FROM cart_items
                 WHERE user_id = ? AND product_id = ?`,
                [req.user.user_id, productId]
            );

            const newQuantity =
                quantity + (existing.length ? existing[0].quantity : 0);

            if (newQuantity > products[0].stock) {
                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message: "Requested quantity exceeds available stock"
                });
            }

            await connection.execute(
                `INSERT INTO cart_items (user_id, product_id, quantity)
                 VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
                [req.user.user_id, productId, quantity, quantity]
            );

            await connection.commit();

            res.status(201).json({
                success: true,
                message: "Product added to cart"
            });
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    } catch (error) {
        console.error("Add cart error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to add product to cart"
        });
    }
});

// UPDATE CART QUANTITY
router.patch("/:id", async (req, res) => {
    try {
        const cartItemId = Number(req.params.id);
        const quantity = Number(req.body.quantity);

        if (
            !Number.isInteger(cartItemId) || cartItemId < 1 ||
            !Number.isInteger(quantity) || quantity < 1
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid cart item ID and positive quantity are required"
            });
        }

        const [items] = await pool.execute(
            `SELECT ci.cart_item_id, p.stock
             FROM cart_items ci
             JOIN products p ON p.product_id = ci.product_id
             WHERE ci.cart_item_id = ? AND ci.user_id = ?`,
            [cartItemId, req.user.user_id]
        );

        if (items.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Cart item not found"
            });
        }

        if (quantity > items[0].stock) {
            return res.status(400).json({
                success: false,
                message: "Quantity exceeds available stock"
            });
        }

        await pool.execute(
            `UPDATE cart_items SET quantity = ?
             WHERE cart_item_id = ? AND user_id = ?`,
            [quantity, cartItemId, req.user.user_id]
        );

        res.json({
            success: true,
            message: "Cart quantity updated"
        });
    } catch (error) {
        console.error("Cart update error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to update cart"
        });
    }
});

// REMOVE ITEM FROM CART
router.delete("/:id", async (req, res) => {
    try {
        const [result] = await pool.execute(
            `DELETE FROM cart_items
             WHERE cart_item_id = ? AND user_id = ?`,
            [req.params.id, req.user.user_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Cart item not found"
            });
        }

        res.json({
            success: true,
            message: "Product removed from cart"
        });
    } catch (error) {
        console.error("Cart delete error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to remove cart item"
        });
    }
});

module.exports = router;

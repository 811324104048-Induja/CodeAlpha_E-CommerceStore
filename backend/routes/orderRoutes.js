
const express = require("express");
const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

// CHECKOUT / CREATE ORDER
router.post("/", async (req, res) => {
    const addressId = Number(req.body.address_id);
    const paymentMethod = req.body.payment_method || "COD";

    if (!Number.isInteger(addressId) || addressId < 1) {
        return res.status(400).json({
            success: false,
            message: "Valid address_id is required"
        });
    }

    if (!["COD", "UPI", "CARD"].includes(paymentMethod)) {
        return res.status(400).json({
            success: false,
            message: "Invalid payment method"
        });
    }

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // Confirm that this address belongs to the logged-in user
        const [addresses] = await connection.execute(
            `SELECT address_id, recipient_name, phone, address_line,
                    city, state, postal_code, country
             FROM addresses
             WHERE address_id = ? AND user_id = ?`,
            [addressId, req.user.user_id]
        );

        if (addresses.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: "Delivery address not found"
            });
        }

        // Read and lock the products in the user's cart
        const [items] = await connection.execute(
            `SELECT ci.product_id, ci.quantity,
                    p.name, p.price, p.stock
             FROM cart_items ci
             JOIN products p ON p.product_id = ci.product_id
             WHERE ci.user_id = ?
             ORDER BY ci.product_id
             FOR UPDATE`,
            [req.user.user_id]
        );

        if (items.length === 0) {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: "Your cart is empty"
            });
        }

        let totalAmount = 0;

        for (const item of items) {
            if (item.quantity > item.stock) {
                await connection.rollback();

                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${item.name}`
                });
            }

            totalAmount += Number(item.price) * item.quantity;
        }

        totalAmount = Number(totalAmount.toFixed(2));

        const address = addresses[0];

        // Create order with a snapshot of the delivery address
        const [orderResult] = await connection.execute(
            `INSERT INTO orders (
                user_id, address_id, total_amount,
                order_status, payment_method, payment_status,
                shipping_name, shipping_phone, shipping_address,
                shipping_city, shipping_state, shipping_postal_code,
                shipping_country
            ) VALUES (?, ?, ?, 'PENDING', ?, 'PENDING', ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.user_id,
                address.address_id,
                totalAmount,
                paymentMethod,
                address.recipient_name,
                address.phone,
                address.address_line,
                address.city,
                address.state,
                address.postal_code,
                address.country
            ]
        );

        const orderId = orderResult.insertId;

        // Save each product in order_items
        for (const item of items) {
            const subtotal = Number(
                (Number(item.price) * item.quantity).toFixed(2)
            );

            await connection.execute(
                `INSERT INTO order_items (
                    order_id, product_id, product_name,
                    unit_price, quantity, subtotal
                ) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    orderId,
                    item.product_id,
                    item.name,
                    item.price,
                    item.quantity,
                    subtotal
                ]
            );

            // Reduce stock only after checking availability
            const [stockResult] = await connection.execute(
                `UPDATE products
                 SET stock = stock - ?
                 WHERE product_id = ? AND stock >= ?`,
                [item.quantity, item.product_id, item.quantity]
            );

            if (stockResult.affectedRows !== 1) {
                throw new Error(
                    `Stock changed during checkout for ${item.name}`
                );
            }
        }

        // Record the payment status.
        // This does NOT process an actual UPI/card payment.
        await connection.execute(
            `INSERT INTO payments
             (order_id, amount, payment_method, payment_status)
             VALUES (?, ?, ?, 'PENDING')`,
            [orderId, totalAmount, paymentMethod]
        );

        // Empty the user's cart after successful order creation
        await connection.execute(
            "DELETE FROM cart_items WHERE user_id = ?",
            [req.user.user_id]
        );

        await connection.commit();

        res.status(201).json({
            success: true,
            message: "Order placed successfully",
            order: {
                order_id: orderId,
                user_id: req.user.user_id,
                total_amount: totalAmount,
                order_status: "PENDING",
                payment_method: paymentMethod,
                payment_status: "PENDING"
            }
        });
    } catch (error) {
        await connection.rollback();

        console.error("Checkout error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to place order"
        });
    } finally {
        connection.release();
    }
});

// GET ALL ORDERS FOR THE LOGGED-IN USER
router.get("/", async (req, res) => {
    try {
        const [orders] = await pool.execute(
            `SELECT order_id, user_id, address_id, order_date,
                    total_amount, order_status, payment_method,
                    payment_status, shipping_name, shipping_phone,
                    shipping_address, shipping_city, shipping_state,
                    shipping_postal_code, shipping_country, updated_at
             FROM orders
             WHERE user_id = ?
             ORDER BY order_date DESC`,
            [req.user.user_id]
        );

        res.json({
            success: true,
            orders
        });
    } catch (error) {
        console.error("Order fetch error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to fetch orders"
        });
    }
});

// GET ONE ORDER WITH ITS ITEMS
router.get("/:id", async (req, res) => {
    try {
        const orderId = Number(req.params.id);

        if (!Number.isInteger(orderId) || orderId < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID"
            });
        }

        const [orders] = await pool.execute(
            `SELECT *
             FROM orders
             WHERE order_id = ? AND user_id = ?`,
            [orderId, req.user.user_id]
        );

        if (orders.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        const [items] = await pool.execute(
            `SELECT order_item_id, order_id, product_id,
                    product_name, unit_price, quantity, subtotal
             FROM order_items
             WHERE order_id = ?
             ORDER BY order_item_id`,
            [orderId]
        );

        const [payments] = await pool.execute(
            `SELECT payment_id, order_id, amount,
                    payment_method, payment_status,
                    transaction_reference, payment_date, created_at
             FROM payments
             WHERE order_id = ?
             ORDER BY payment_id DESC`,
            [orderId]
        );

        res.json({
            success: true,
            order: orders[0],
            items,
            payments
        });
    } catch (error) {
        console.error("Order detail error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to fetch order details"
        });
    }
});

router.patch("/:id/cancel", async (req, res) => {
    const orderId = Number(req.params.id);
    const connection = await pool.getConnection();

    if (!Number.isInteger(orderId) || orderId < 1) {
        connection.release();

        return res.status(400).json({
            success: false,
            message: "Invalid order ID"
        });
    }

    try {
        await connection.beginTransaction();

        const [orders] = await connection.execute(
            `SELECT order_id, order_status
             FROM orders
             WHERE order_id = ? AND user_id = ?
             FOR UPDATE`,
            [orderId, req.user.user_id]
        );

        if (orders.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        if (orders[0].order_status !== "PENDING") {
            await connection.rollback();

            return res.status(400).json({
                success: false,
                message: "Only pending orders can be cancelled"
            });
        }

        const [items] = await connection.execute(
            `SELECT product_id, quantity
             FROM order_items
             WHERE order_id = ? AND product_id IS NOT NULL`,
            [orderId]
        );

        for (const item of items) {
            await connection.execute(
                `UPDATE products
                 SET stock = stock + ?
                 WHERE product_id = ?`,
                [item.quantity, item.product_id]
            );
        }

        await connection.execute(
            `UPDATE orders
             SET order_status = 'CANCELLED'
             WHERE order_id = ? AND user_id = ?`,
            [orderId, req.user.user_id]
        );

        await connection.execute(
            `UPDATE payments
             SET payment_status = 'PENDING'
             WHERE order_id = ? AND payment_status = 'PENDING'`,
            [orderId]
        );

        await connection.commit();

        res.json({
            success: true,
            message: "Order cancelled successfully",
            order_id: orderId,
            order_status: "CANCELLED"
        });
    } catch (error) {
        await connection.rollback();

        console.error("Order cancellation error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to cancel order"
        });
    } finally {
        connection.release();
    }
});

module.exports = router;

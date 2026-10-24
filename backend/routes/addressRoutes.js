
const express = require("express");
const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

// ADD ADDRESS
router.post("/", async (req, res) => {
    try {
        const {
            recipient_name, phone, address_line,
            city, state, postal_code, country, is_default
        } = req.body;

        if (
            !recipient_name || !phone || !address_line ||
            !city || !state || !postal_code
        ) {
            return res.status(400).json({
                success: false,
                message: "All required address fields must be provided"
            });
        }

        const [result] = await pool.execute(
            `INSERT INTO addresses
             (user_id, recipient_name, phone, address_line,
              city, state, postal_code, country, is_default)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.user_id,
                recipient_name,
                phone,
                address_line,
                city,
                state,
                postal_code,
                country || "India",
                Boolean(is_default)
            ]
        );

        res.status(201).json({
            success: true,
            message: "Address saved successfully",
            address_id: result.insertId
        });
    } catch (error) {
        console.error("Address error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to save address"
        });
    }
});

// GET LOGGED-IN USER'S ADDRESSES
router.get("/", async (req, res) => {
    try {
        const [addresses] = await pool.execute(
            `SELECT address_id, user_id, recipient_name, phone,
                    address_line, city, state, postal_code,
                    country, is_default, created_at
             FROM addresses
             WHERE user_id = ?
             ORDER BY address_id DESC`,
            [req.user.user_id]
        );

        res.json({
            success: true,
            addresses
        });
    } catch (error) {
        console.error("Address fetch error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to fetch addresses"
        });
    }
});

module.exports = router;


const express = require("express");
const pool = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

// GET CUSTOMER PROFILE
router.get("/", async (req, res) => {
    try {
        const [users] = await pool.execute(
            `SELECT user_id, full_name, email, phone,
                    created_at, updated_at
             FROM users
             WHERE user_id = ?`,
            [req.user.user_id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.json({
            success: true,
            user: users[0]
        });
    } catch (error) {
        console.error("Profile fetch error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to fetch profile"
        });
    }
});

// UPDATE CUSTOMER PROFILE
router.patch("/", async (req, res) => {
    try {
        const { full_name, phone } = req.body;

        if (
            full_name !== undefined &&
            (typeof full_name !== "string" || !full_name.trim())
        ) {
            return res.status(400).json({
                success: false,
                message: "Full name cannot be empty"
            });
        }

        if (
            phone !== undefined &&
            phone !== null &&
            typeof phone !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Phone must be a string"
            });
        }

        if (full_name === undefined && phone === undefined) {
            return res.status(400).json({
                success: false,
                message: "Provide full_name or phone to update"
            });
        }

        const [result] = await pool.execute(
            `UPDATE users
             SET full_name = COALESCE(?, full_name),
                 phone = COALESCE(?, phone)
             WHERE user_id = ?`,
            [
                full_name === undefined ? null : full_name.trim(),
                phone === undefined ? null : phone.trim() || null,
                req.user.user_id
            ]
        );

        const [users] = await pool.execute(
            `SELECT user_id, full_name, email, phone,
                    created_at, updated_at
             FROM users
             WHERE user_id = ?`,
            [req.user.user_id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.json({
            success: true,
            message: "Profile updated successfully",
            user: users[0]
        });
    } catch (error) {
        console.error("Profile update error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to update profile"
        });
    }
});

module.exports = router;

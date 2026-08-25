const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');

const router = express.Router();
router.post('/login', async (req, res, next) => {
  try {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');
    if (!username || !password) return res.status(400).json({ success: false, message: 'Username and password are required', errorCode: 'VALIDATION_ERROR' });
    const { rows } = await pool.query('SELECT id, username, password_hash FROM app_users WHERE username = $1', [username]);
    if (!rows[0] || !(await bcrypt.compare(password, rows[0].password_hash))) return res.status(401).json({ success: false, message: 'Invalid credentials', errorCode: 'INVALID_CREDENTIALS' });
    const token = jwt.sign({ userId: rows[0].id, username: rows[0].username }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
    res.json({ success: true, token, user: { id: rows[0].id, username: rows[0].username } });
  } catch (error) { next(error); }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET /api/users/:id - get public user profile info
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('fullName bio photo joined');
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;

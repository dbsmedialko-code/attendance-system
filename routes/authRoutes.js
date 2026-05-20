const router  = require('express').Router();
const Admin   = require('../models/Admin');
const Student = require('../models/Student');

// Admin login
router.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username: username.trim().toLowerCase() });
    if (!admin || !(await admin.comparePassword(password)))
      return res.status(401).json({ error: 'Invalid credentials' });

    req.session.role     = 'admin';
    req.session.userId   = admin._id;
    req.session.username = admin.username;
    await new Promise((resolve, reject) =>
      req.session.save(err => err ? reject(err) : resolve()));
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Student login
router.post('/student/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const student = await Student.findOne({ username: username.trim().toLowerCase() });
    if (!student || !(await student.comparePassword(password)))
      return res.status(401).json({ error: 'Invalid credentials' });

    req.session.role      = 'student';
    req.session.userId    = student._id;
    req.session.username  = student.username;
    req.session.studentId = student._id;
    await new Promise((resolve, reject) =>
      req.session.save(err => err ? reject(err) : resolve()));
    res.json({ success: true, name: student.name });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// Session check
router.get('/me', (req, res) => {
  if (!req.session || !req.session.role)
    return res.status(401).json({ error: 'Not logged in' });
  res.json({ role: req.session.role, username: req.session.username });
});

module.exports = router;

const router      = require('express').Router();
const Student     = require('../models/Student');
const LeaveConfig = require('../models/LeaveConfig');
const LeaveRequest= require('../models/LeaveRequest');
const { requireStudent } = require('../middleware/auth');
const sse             = require('../sse');

router.use(requireStudent);

// ── Dashboard data ────────────────────────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  try {
    const [student, config] = await Promise.all([
      Student.findById(req.session.studentId, '-password -__v').lean(),
      LeaveConfig.findOne().lean()
    ]);
    if (!student) return res.status(404).json({ error: 'Student not found' });
    const leaveConfig = config || { public_holiday: 0, gazetted_holiday: 0, summer_vacation: 0, winter_vacation: 0, emergency_leave: 7 };
    res.json({ student, config: leaveConfig });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Raise leave request ───────────────────────────────────────────────────────
router.post('/leave-request', async (req, res) => {
  try {
    const student = await Student.findById(req.session.studentId);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const { reason, days_requested } = req.body;
    const days = Number(days_requested);

    if (!reason || !reason.trim()) return res.status(400).json({ error: 'Reason is required' });
    if (!days || days < 1)         return res.status(400).json({ error: 'Days must be at least 1' });

    const remaining = student.emergency_total - student.emergency_used;

    if (remaining <= 0)
      return res.status(400).json({ error: 'QUOTA_EXHAUSTED', message: 'Emergency leave quota exhausted. Visit the Principal\'s office with evidence.' });

    if (days > remaining)
      return res.status(400).json({ error: 'EXCEEDS_QUOTA', message: `You only have ${remaining} emergency day(s) remaining.` });

    // Check for existing pending request
    const pending = await LeaveRequest.findOne({ student: student._id, status: 'pending' });
    if (pending)
      return res.status(400).json({ error: 'You already have a pending leave request.' });

    const lr = await LeaveRequest.create({
      student:       student._id,
      sr_no:         student.sr_no,
      student_name:  student.name,
      class_section: student.class_section,
      reason:        reason.trim(),
      days_requested: days
    });

    sse.toAdmin("new-request", { student_name: student.name, sr_no: student.sr_no, class_section: student.class_section, days: lr.days_requested });
    res.json({ success: true, request: lr });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── My requests ───────────────────────────────────────────────────────────────
router.get('/leave-requests', async (req, res) => {
  try {
    const requests = await LeaveRequest
      .find({ student: req.session.studentId })
      .sort({ createdAt: -1 })
      .lean();
    res.json(requests);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

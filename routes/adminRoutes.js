const router      = require('express').Router();
const multer      = require('multer');
const XLSX        = require('xlsx');
const bcrypt      = require('bcryptjs');
const Student     = require('../models/Student');
const LeaveConfig = require('../models/LeaveConfig');
const LeaveRequest= require('../models/LeaveRequest');
const { requireAdmin } = require('../middleware/auth');
const sse         = require('../sse');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(requireAdmin);

// ── Dashboard stats ──────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const totalStudents  = await Student.countDocuments();
    const pendingCount   = await LeaveRequest.countDocuments({ status: 'pending' });
    const approvedCount  = await LeaveRequest.countDocuments({ status: 'approved' });
    const exhaustedCount = await Student.countDocuments({ $expr: { $gte: ['$emergency_used', '$emergency_total'] } });
    res.json({ totalStudents, pendingCount, approvedCount, exhaustedCount });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Leave config ─────────────────────────────────────────────────────────────
router.get('/leave-config', async (req, res) => {
  try {
    let config = await LeaveConfig.findOne();
    if (!config) config = await LeaveConfig.create({});
    res.json(config);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/leave-config', async (req, res) => {
  try {
    const { public_holiday, gazetted_holiday, summer_vacation, winter_vacation } = req.body;
    let config = await LeaveConfig.findOne();
    if (!config) config = new LeaveConfig();
    config.public_holiday   = Number(public_holiday)   || 0;
    config.gazetted_holiday = Number(gazetted_holiday) || 0;
    config.summer_vacation  = Number(summer_vacation)  || 0;
    config.winter_vacation  = Number(winter_vacation)  || 0;
    await config.save();
    sse.toAllStudents("config-updated", config);
    sse.toAdmin("config-updated", config);
    res.json({ success: true, config });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Students ─────────────────────────────────────────────────────────────────
router.get('/students', async (req, res) => {
  try {
    const students = await Student.find({}, '-password -__v').sort({ sr_no: 1 }).lean();
    res.json(students);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/students/bulk', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const wb   = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

    if (!rows.length) return res.status(400).json({ error: 'Excel file is empty' });

    // Pre-hash default password once
    const defaultHash = await bcrypt.hash('sainiklko', 10);

    let created = 0, updated = 0, errors = [];

    for (const row of rows) {
      try {
        const sr_no = String(row['SR_No'] || row['sr_no'] || row['Sr No'] || row['SR No'] || '').trim();
        if (!sr_no) { errors.push(`Row skipped: missing SR_No`); continue; }

        const name         = String(row['Student_Name'] || row['student_name'] || row['Name'] || '').trim();
        const father_name  = String(row['Father_Name']  || row['father_name']  || row['Father Name'] || '').trim();
        const class_section= String(row['Class_Section']|| row['class_section']|| row['Class'] || '').trim();
        const dob          = String(row['DOB'] || row['dob'] || '').trim();
        const username     = `cdt${sr_no}`;

        const existing = await Student.findOne({ sr_no });
        if (existing) {
          existing.name          = name || existing.name;
          existing.father_name   = father_name;
          existing.class_section = class_section;
          existing.dob           = dob;
          existing.username      = username;
          await existing.save();
          updated++;
        } else {
          await Student.create({ sr_no, name, father_name, class_section, dob, username, password: 'sainiklko' });
          created++;
        }
      } catch (rowErr) {
        errors.push(`SR_No ${row['SR_No'] || '?'}: ${rowErr.message}`);
      }
    }

    res.json({ success: true, created, updated, errors });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/students/:id', async (req, res) => {
  try {
    await Student.findByIdAndDelete(req.params.id);
    await LeaveRequest.deleteMany({ student: req.params.id });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Update student emergency leave total ──────────────────────────────────
router.put('/students/:id/emergency', async (req, res) => {
  try {
    const days = parseInt(req.body.emergency_total);
    if (isNaN(days) || days < 0)
      return res.status(400).json({ error: 'Invalid value' });
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      { emergency_total: days },
      { new: true, select: '-password -__v' }
    );
    if (!student) return res.status(404).json({ error: 'Student not found' });
    sse.toStudent(student._id, 'config-updated', {});
    res.json({ success: true, student });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/students', async (req, res) => {
  try {
    await Student.deleteMany({});
    await LeaveRequest.deleteMany({});
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Leave requests ────────────────────────────────────────────────────────────
router.get('/leave-requests', async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const requests = await LeaveRequest.find(filter).sort({ createdAt: -1 }).lean();
    res.json(requests);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/leave-requests/:id', async (req, res) => {
  try {
    const { action, admin_note } = req.body;  // action: 'approve' | 'reject'
    if (!['approve', 'reject'].includes(action))
      return res.status(400).json({ error: 'Invalid action' });

    const lr = await LeaveRequest.findById(req.params.id);
    if (!lr) return res.status(404).json({ error: 'Request not found' });
    if (lr.status !== 'pending')
      return res.status(400).json({ error: 'Already processed' });

    if (action === 'approve') {
      const student = await Student.findById(lr.student);
      if (!student) return res.status(404).json({ error: 'Student not found' });
      student.emergency_used = Math.min(
        student.emergency_used + lr.days_requested,
        student.emergency_total
      );
      await student.save();
      lr.status = 'approved';
    } else {
      lr.status = 'rejected';
    }

    lr.admin_note = admin_note || '';
    await lr.save();
    sse.toStudent(lr.student, "request-updated", { status: lr.status, admin_note: lr.admin_note, days: lr.days_requested });
    sse.toAdmin("stats-updated", {});
    res.json({ success: true, request: lr });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Summary ───────────────────────────────────────────────────────────────────
router.get('/summary', async (req, res) => {
  try {
    const students = await Student.find({}, '-password -__v').sort({ sr_no: 1 }).lean();
    const requests = await LeaveRequest.find({}).sort({ createdAt: -1 }).lean();

    const summary = students.map(s => ({
      ...s,
      requests: requests.filter(r => String(r.student) === String(s._id))
    }));

    res.json(summary);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Reset Demo ────────────────────────────────────────────────────────────────
router.delete('/reset-demo', async (req, res) => {
  try {
    await Student.deleteMany({});
    await LeaveRequest.deleteMany({});
    await LeaveConfig.deleteMany({});
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;

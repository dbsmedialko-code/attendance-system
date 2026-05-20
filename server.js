require('dotenv').config();
const express    = require('express');
const mongoose   = require('mongoose');
const session    = require('express-session');
const MongoStore = require('connect-mongo');
const path       = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/attendance_db';
const IS_PROD   = process.env.NODE_ENV === 'production';

// ── DB ───────────────────────────────────────────────────────────────────────
mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => { console.error('❌ MongoDB error:', err); process.exit(1); });

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'sainik_secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGO_URI }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 8,   // 8 hours
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? 'none' : 'lax'
  }
}));

app.use(express.static(path.join(__dirname, 'public')));

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',    require('./routes/authRoutes'));
app.use('/api/admin',   require('./routes/adminRoutes'));
app.use('/api/student', require('./routes/studentRoutes'));

// ── Page routes ──────────────────────────────────────────────────────────────
app.get('/admin/login', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'admin-login.html')));
app.get('/admin*',      (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'admin', 'index.html')));
app.get('/student/login', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'student-login.html')));
app.get('/student*',    (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'student', 'index.html')));
app.get('/',            (req, res) => res.redirect('/admin/login'));

// ── Seed admin ───────────────────────────────────────────────────────────────
const Admin = require('./models/Admin');
mongoose.connection.once('open', async () => {
  const exists = await Admin.findOne({ username: 'admin' });
  if (!exists) {
    await Admin.create({ username: 'admin', password: 'sainik_admin' });
    console.log('🔑 Admin seeded — admin / sainik_admin');
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));

// ── SSE endpoints ─────────────────────────────────────────────────────────────
const sse = require('./sse');
const { requireAdmin, requireStudent } = require('./middleware/auth');

app.get('/api/events/admin', requireAdmin, (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();
  res.write(':\n\n');
  sse.addAdmin(res);
  const ping = setInterval(() => { try { res.write(':\n\n'); } catch(_) {} }, 25000);
  req.on('close', () => { clearInterval(ping); sse.removeAdmin(res); });
});

app.get('/api/events/student', requireStudent, (req, res) => {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.flushHeaders();
  res.write(':\n\n');
  const id = req.session.studentId;
  sse.addStudent(id, res);
  const ping = setInterval(() => { try { res.write(':\n\n'); } catch(_) {} }, 25000);
  req.on('close', () => { clearInterval(ping); sse.removeStudent(id, res); });
});

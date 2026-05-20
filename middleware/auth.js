function requireAdmin(req, res, next) {
  if (req.session && req.session.role === 'admin') return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Unauthorized' });
  res.redirect('/admin/login');
}

function requireStudent(req, res, next) {
  if (req.session && req.session.role === 'student') return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Unauthorized' });
  res.redirect('/student/login');
}

module.exports = { requireAdmin, requireStudent };

// In-memory SSE client registry
const adminClients   = new Set();
const studentClients = new Map(); // studentId → Set of res objects

// ── Registration ─────────────────────────────────────────────────────────────
function addAdmin(res)    { adminClients.add(res); }
function removeAdmin(res) { adminClients.delete(res); }

function addStudent(id, res) {
  const key = String(id);
  if (!studentClients.has(key)) studentClients.set(key, new Set());
  studentClients.get(key).add(res);
}
function removeStudent(id, res) {
  const key = String(id);
  if (studentClients.has(key)) studentClients.get(key).delete(res);
}

// ── Broadcasting ──────────────────────────────────────────────────────────────
function send(res, event, data) {
  try { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); } catch(_) {}
}

function toAdmin(event, data) {
  adminClients.forEach(res => send(res, event, data));
}

function toStudent(id, event, data) {
  const set = studentClients.get(String(id));
  if (set) set.forEach(res => send(res, event, data));
}

function toAllStudents(event, data) {
  studentClients.forEach(set => set.forEach(res => send(res, event, data)));
}

module.exports = { addAdmin, removeAdmin, addStudent, removeStudent, toAdmin, toStudent, toAllStudents };

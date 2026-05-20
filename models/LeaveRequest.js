const mongoose = require('mongoose');

const LeaveRequestSchema = new mongoose.Schema({
  student:       { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  sr_no:         { type: String },
  student_name:  { type: String },
  class_section: { type: String },
  reason:        { type: String, required: true },
  days_requested:{ type: Number, required: true, min: 1 },
  status:        { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  admin_note:    { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('LeaveRequest', LeaveRequestSchema);

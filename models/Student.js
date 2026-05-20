const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const StudentSchema = new mongoose.Schema({
  sr_no:         { type: String, required: true, unique: true, trim: true },
  name:          { type: String, required: true, trim: true },
  father_name:   { type: String, trim: true, default: '' },
  class_section: { type: String, trim: true, default: '' },
  dob:           { type: String, default: '' },
  username:      { type: String, required: true, unique: true, trim: true },
  password:      { type: String, required: true },
  emergency_used:  { type: Number, default: 0 },
  emergency_total: { type: Number, default: 7 }
}, { timestamps: true });

StudentSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

StudentSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('Student', StudentSchema);

const mongoose = require('mongoose');

const LeaveConfigSchema = new mongoose.Schema({
  public_holiday:   { type: Number, default: 0 },
  gazetted_holiday: { type: Number, default: 0 },
  summer_vacation:  { type: Number, default: 0 },
  winter_vacation:  { type: Number, default: 0 },
  emergency_leave:  { type: Number, default: 7 }   // fixed, informational
}, { timestamps: true });

module.exports = mongoose.model('LeaveConfig', LeaveConfigSchema);

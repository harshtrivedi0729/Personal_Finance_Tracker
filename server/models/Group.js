const mongoose = require('mongoose');
const shortid = require('shortid');

const MemberSchema = new mongoose.Schema({
  id: { type: String, default: ()=> shortid.generate() },
  name: { type: String, required: true }
});

const GroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  members: { type: [MemberSchema], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Group', GroupSchema);

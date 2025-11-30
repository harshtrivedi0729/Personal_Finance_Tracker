const mongoose = require('mongoose');
const shortid = require('shortid');

const ExpenseSchema = new mongoose.Schema({
  id: { type: String, default: ()=> `R_${shortid.generate()}` },
  date: { type: Date, required: true },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  type: { type: String, enum: ['personal','group'], required: true },
  paidBy: { type: String, required: true }, // for group expenses: member.id; for personal: 'me' or username
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Group' },
  split: { type: mongoose.Schema.Types.Mixed, default: {} }
}, { timestamps: true });

module.exports = mongoose.model('Expense', ExpenseSchema);

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const morgan = require('morgan');
const cors = require('cors');

const Group = require('./models/Group');
const Expense = require('./models/Expense');

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI is required in env");
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

// Helper: load groups once (fresh every request in routes below)
async function getGroupsLookup() {
  const groups = await Group.find().lean();
  const memberLookup = {};   // id -> name
  const groupById = {};      // groupId -> group
  groups.forEach(g => {
    groupById[g._id.toString()] = g;
    g.members.forEach(m => {
      memberLookup[m.id] = m.name;
    });
  });
  return { memberLookup, groupById };
}

// ===============================================================
//      CREATE GROUP
// ===============================================================
app.post("/api/groups", async (req, res) => {
  try {
    const { name, members } = req.body;

    if (!name) return res.status(400).json({ message: "Group name required" });
    if (!Array.isArray(members) || members.length === 0)
      return res.status(400).json({ message: "Members required" });

    const g = new Group({ name, members });
    await g.save();

    res.status(201).json(g);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ===============================================================
//      GET GROUPS
// ===============================================================
app.get("/api/groups", async (req, res) => {
  try {
    const groups = await Group.find().sort({ createdAt: -1 });
    res.json(groups);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ===============================================================
//      CREATE EXPENSE (returns enriched expense so frontend can use names immediately)
// ===============================================================
app.post("/api/expenses", async (req, res) => {
  try {
    const payload = req.body;

    const required = ["date", "amount", "description", "category", "type", "paidBy"];
    for (const f of required) {
      if (payload[f] === undefined || payload[f] === null || payload[f] === '') {
        return res.status(400).json({ message: `${f} is required` });
      }
    }

    if (payload.type === "group") {
      if (!payload.groupId)
        return res.status(400).json({ message: "groupId is required for group expenses" });
      if (!payload.split || typeof payload.split !== "object")
        return res.status(400).json({ message: "split is required for group expenses" });
    }

    // Coerce numeric fields to numbers to avoid NaN later
    payload.amount = Number(payload.amount) || 0;

    // Ensure split values are numbers
    if (payload.split && typeof payload.split === 'object') {
      Object.entries(payload.split).forEach(([k, v]) => {
        // if client sent nested objects (memberId + memberName), handle gracefully
        if (v && typeof v === 'object' && ('amount' in v)) {
          payload.split[k] = Number(v.amount) || 0;
        } else {
          payload.split[k] = Number(v) || 0;
        }
      });
    }

    const expense = new Expense(payload);
    const saved = await expense.save();

    // Enrich response with names (so frontend doesn't need to refresh)
    const { memberLookup, groupById } = await getGroupsLookup();

    const memberNames = {};
    if (saved.split) {
      Object.keys(saved.split).forEach(uid => {
        memberNames[uid] = memberLookup[uid] || uid;
      });
    }

    const paidByName = memberLookup[saved.paidBy] || saved.paidBy;
    const group = saved.groupId ? groupById[saved.groupId.toString()] : null;

    const enriched = {
      ...saved.toObject(),
      paidByName,
      memberNames,
      group: group ? { _id: group._id, name: group.name, members: group.members } : undefined
    };

    res.status(201).json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ===============================================================
//      LIST EXPENSES  (returns memberNames + paidByName; ensures numbers)
// ===============================================================
app.get("/api/expenses", async (req, res) => {
  try {
    const { from, to, category } = req.query;

    const q = {};
    if (category) q.category = category;

    if (from || to) {
      q.date = {};
      if (from) q.date.$gte = new Date(from);
      if (to) q.date.$lte = new Date(to);
    }

    const expenses = await Expense.find(q).sort({ date: -1 }).lean();

    // Load all groups and create lookup maps
    const { memberLookup, groupById } = await getGroupsLookup();

    // Attach names for both paidBy AND split entries, and coerce numeric amounts
    const updatedExpenses = expenses.map(e => {
      // ensure numeric fields
      e.amount = Number(e.amount) || 0;

      // normalize split values to numbers (important if client sends strings)
      if (e.split && typeof e.split === 'object') {
        Object.entries(e.split).forEach(([uid, val]) => {
          e.split[uid] = Number(val) || 0;
        });
      }

      const memberNames = {};
      if (e.split) {
        Object.keys(e.split).forEach(uid => {
          memberNames[uid] = memberLookup[uid] || uid;
        });
      }

      const enriched = {
        ...e,
        paidByName: memberLookup[e.paidBy] || e.paidBy,
        memberNames
      };

      // include group info if available (useful to frontend)
      if (e.groupId && groupById[e.groupId.toString()]) {
        const g = groupById[e.groupId.toString()];
        enriched.group = { _id: g._id, name: g.name, members: g.members };
      }

      return enriched;
    });

    res.json(updatedExpenses);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ===============================================================
// MONTHLY REPORT (return numeric values, avoid NaN, no currency symbols)
// ===============================================================
app.get("/api/reports/monthly", async (req, res) => {
  try {
    const year = parseInt(req.query.year, 10);
    const month = parseInt(req.query.month, 10);

    if (!year || !month) return res.status(400).json({ message: "year and month required" });

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const expenses = await Expense.find({
      date: { $gte: start, $lte: end }
    }).lean();

    const { memberLookup } = await getGroupsLookup();

    // Normalize amounts and build category breakdown + personalTotal
    let personalTotal = 0;
    const categoryMap = {};

    expenses.forEach(e => {
      // coerce amounts to Number safely
      const amt = Number(e.amount) || 0;
      // accumulate category totals (use numeric values)
      categoryMap[e.category] = (categoryMap[e.category] || 0) + amt;

      if (e.type === "personal") {
        personalTotal += amt;
      }
    });

    // BALANCE CALCULATION (net map: id -> positive = others owe them)
    const net = {};
    const groupExpenses = expenses.filter(e => e.type === "group");

    groupExpenses.forEach(e => {
      const paidBy = e.paidBy;
      const split = e.split || {};

      // ensure split numbers
      Object.entries(split).forEach(([uid, owedRaw]) => {
        const owed = Number(owedRaw) || 0;
        if (uid === paidBy) return;
        net[paidBy] = (net[paidBy] || 0) + owed;
        net[uid] = (net[uid] || 0) - owed;
      });
    });

    // build creditors/debtors arrays
    const creditors = [];
    const debtors = [];

    for (const [id, amt] of Object.entries(net)) {
      const rounded = Math.round((amt + Number.EPSILON) * 100) / 100; // 2 decimals
      const name = memberLookup[id] || id;
      if (rounded > 0.005) creditors.push({ id, name, amount: rounded });
      else if (rounded < -0.005) debtors.push({ id, name, amount: Math.abs(rounded) });
    }

    // Produce settlements with numeric amounts (greedy algorithm)
    const settlements = [];
    let i = 0, j = 0;

    while (i < debtors.length && j < creditors.length) {
      const d = debtors[i];
      const c = creditors[j];
      const pay = Math.min(d.amount, c.amount);
      const payRounded = Math.round((pay + Number.EPSILON) * 100) / 100;

      settlements.push({
        from: d.name,
        to: c.name,
        amount: payRounded // numeric
      });

      d.amount -= pay;
      c.amount -= pay;

      if (d.amount < 0.01) i++;
      if (c.amount < 0.01) j++;
    }

    // Round categoryMap values to 2 decimals (numbers)
    const roundedCategory = {};
    Object.entries(categoryMap).forEach(([k, v]) => {
      roundedCategory[k] = Math.round((v + Number.EPSILON) * 100) / 100;
    });

    res.json({
      personalTotal: Number(personalTotal.toFixed(2)), // numeric
      categoryBreakdown: roundedCategory,
      settlements,
      expenses // raw expenses (they already have numeric amounts in GET /api/expenses)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

import React, { useState } from 'react';
import { format } from 'date-fns';

export default function ExpenseList({ expenses = [] }) {
  const [filterCategory, setFilterCategory] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const categories = Array.from(new Set(expenses.map(e => e.category))).sort();

  const filtered = expenses.filter(e => {
    if (filterCategory && e.category !== filterCategory) return false;
    if (from && new Date(e.date) < new Date(from)) return false;
    if (to && new Date(e.date) > new Date(to)) return false;
    return true;
  });

  // FIXED: Use backend mapping memberNames
  const getName = (exp, uid) => {
    if (exp.memberNames && exp.memberNames[uid]) {
      return exp.memberNames[uid];
    }
    return uid; // fallback
  };

  return (
    <div className="card p-3">
      <h5>Transactions</h5>

      <div className="row mb-2">
        <div className="col">
          <select className="form-select"
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="col">
          <input type="date"
            className="form-control"
            value={from}
            onChange={e => setFrom(e.target.value)}
          />
        </div>

        <div className="col">
          <input type="date"
            className="form-control"
            value={to}
            onChange={e => setTo(e.target.value)}
          />
        </div>
      </div>

      <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
        <table className="table table-sm">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Amount (₹)</th>
              <th>Split / Details</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map(exp => (
              <tr key={exp.id || exp._id}>
                <td>{format(new Date(exp.date), 'yyyy-MM-dd')}</td>
                <td>{exp.description}</td>
                <td>{exp.category}</td>
                <td>₹{Number(exp.amount).toFixed(2)}</td>

                <td>
                  {exp.type === 'personal' ? (
                    "Personal"
                  ) : (
                    <div>
                      <div><small><strong>Group</strong></small></div>

                      {/* FIXED: Use paidByName */}
                      <div>
                        <small>
                          Paid by: <strong>{exp.paidByName}</strong>
                        </small>
                      </div>

                      {/* FIXED: Use memberNames for split */}
                      <div className="small mt-1">
                        {Object.entries(exp.split || {}).map(([uid, amt]) => (
                          <div key={uid}>
                            {getName(exp, uid)}: ₹{Number(amt).toFixed(2)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ))}

            {filtered.length === 0 && (
              <tr>
                <td colSpan="5" className="text-muted">No transactions</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import React, { useState } from 'react';

export default function MonthlySummary({ onFetch, groups = [] }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  async function fetchReport() {
    setLoading(true);
    try {
      const r = await onFetch(year, month);
      setReport(r);
    } catch (e) {
      alert('Failed to fetch report');
    } finally { setLoading(false); }
  }

  return (
    <div className="card p-3">
      <div className="mb-2 d-flex gap-2">
        <input type="number" className="form-control" value={year} onChange={e=>setYear(Number(e.target.value))} />
        <select className="form-select" value={month} onChange={e=>setMonth(Number(e.target.value))}>
          {Array.from({length:12}).map((_,i)=> <option key={i+1} value={i+1}>{i+1}</option>)}
        </select>
      </div>
      <button className="btn btn-primary btn-sm mb-3" onClick={fetchReport} disabled={loading}>{loading ? 'Loading...' : 'Fetch'}</button>

      {report && (
        <>
          <div><strong>Personal Total:</strong> ₹{Number(report.personalTotal).toFixed(2)}</div>
          <div className="mt-2"><strong>Category Breakdown</strong>
            <ul>
              {Object.entries(report.categoryBreakdown || {}).map(([k,v])=> <li key={k}>{k}: ₹{Number(v).toFixed(2)}</li>)}
            </ul>
          </div>

          <div className="mt-2">
            <strong>Settlements</strong>
            <ul>
              {report.settlements.length === 0 && <li className="text-muted">No settlements</li>}
              {report.settlements.map((s,idx)=> (
                <li key={idx}>{s.from} owes {s.to} ₹{Number(s.amount).toFixed(2)}</li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

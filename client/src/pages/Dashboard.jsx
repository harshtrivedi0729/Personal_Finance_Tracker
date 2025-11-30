import React from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

export default function Dashboard({ groups = [], expenses = [] }) {
  const latest = expenses.slice(0,5);
  const total = expenses.reduce((s,e)=> s + Number(e.amount||0), 0);

  return (
    <div>
      <h3>Dashboard</h3>
      <div className="row mb-3">
        <div className="col-md-4">
          <div className="card p-3">
            <h6>Total recorded</h6>
            <div style={{fontSize:'1.6rem'}}>₹{total.toFixed(2)}</div>
            <Link to="/transactions" className="small">View transactions</Link>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card p-3">
            <h6>Groups</h6>
            <div>{groups.length} groups</div>
            <Link to="/groups" className="small">Manage groups</Link>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card p-3">
            <h6>Monthly summary</h6>
            <div><Link to="/summary">Open summary</Link></div>
          </div>
        </div>
      </div>

      <div className="card p-3">
        <h6>Latest transactions</h6>
        <table className="table table-sm">
          <thead><tr><th>Date</th><th>Description</th><th>Amount</th></tr></thead>
          <tbody>
            {latest.map(e => (
              <tr key={e.id || e._id}>
                <td>{format(new Date(e.date), 'yyyy-MM-dd')}</td>
                <td>{e.description}</td>
                <td>{Number(e.amount).toFixed(2)}</td>
              </tr>
            ))}
            {latest.length === 0 && <tr><td colSpan="3" className="text-muted">No transactions</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import React, { useState } from 'react';

export default function GroupManager({ groups = [], onCreateGroup }) {
  const [name, setName] = useState('');
  const [membersStr, setMembersStr] = useState('');

  function handleCreate(e) {
    e.preventDefault();
    if (!name) return alert('Group name required');
    const members = membersStr.split(',').map(s => s.trim()).filter(Boolean).map(n => ({ name: n }));
    if (members.length === 0) return alert('Add at least one member (comma-separated)');
    onCreateGroup({ name, members });
    setName(''); setMembersStr('');
  }

  return (
    <div className="card p-3">
      <h5>Create Group</h5>
      <form onSubmit={handleCreate}>
        <div className="mb-1">
          <input className="form-control" placeholder="Group name" value={name} onChange={e=>setName(e.target.value)} />
        </div>
        <div className="mb-1">
          <input className="form-control" placeholder="Members (comma separated, e.g. Alice,Bob,Charlie)" value={membersStr} onChange={e=>setMembersStr(e.target.value)} />
        </div>
        <button className="btn btn-success btn-sm" type="submit">Create Group</button>
      </form>

      <hr/>
      <h6>Existing Groups</h6>
      {groups.length === 0 && <div className="text-muted">No groups yet</div>}
      <ul className="list-group mt-2">
        {groups.map(g => (
          <li key={g._id} className="list-group-item">
            <div className="fw-bold">{g.name}</div>
            <div className="small text-muted">{g.members.map(m => m.name).join(', ')}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

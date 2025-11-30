import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

function MoneyInput({ value, onChange }) {
  return <input type="number" step="0.01" className="form-control" value={value} onChange={e=> onChange(e.target.value)} />;
}

export default function AddExpense({ onCreate, groups = [], categories = [] }) {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0,10));
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(categories[0] || 'Other');
  const [type, setType] = useState('personal');
  const [paidBy, setPaidBy] = useState('me');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [splitMode, setSplitMode] = useState('equal'); // equal/custom
  const [customSplit, setCustomSplit] = useState({});

  useEffect(()=> {
    setCustomSplit({});
    setPaidBy('me');
  }, [selectedGroupId, type]);

  function resetForm() {
    setDate(new Date().toISOString().slice(0,10));
    setAmount('');
    setDescription('');
    setCategory(categories[0] || 'Other');
    setType('personal');
    setPaidBy('me');
    setSelectedGroupId('');
    setSplitMode('equal');
    setCustomSplit({});
  }

  function validate() {
    if (!date) return 'Date required';
    if (!amount || Number(amount) <= 0) return 'Amount must be greater than 0';
    if (!description) return 'Description required';
    if (!category) return 'Category required';
    if (type === 'group' && !selectedGroupId) return 'Select a group for group expense';
    if (type === 'group') {
      const group = groups.find(g => g._id === selectedGroupId);
      if (!group) return 'Invalid group selected';
      if (splitMode === 'custom') {
        const total = Object.values(customSplit).reduce((s, v) => s + Number(v || 0), 0);
        const diff = Math.abs(Number(total) - Number(amount));
        if (diff > 0.01) return `Custom split does not sum to amount (diff ${diff.toFixed(2)})`;
      }
    }
    return null;
  }

  function buildSplit() {
    if (type === 'personal') {
      return { me: Number(amount) };
    } else {
      const group = groups.find(g => g._id === selectedGroupId);
      if (!group) return {};
      if (splitMode === 'equal') {
        const n = group.members.length;
        const per = Math.round((Number(amount) / n) * 100) / 100;
        const split = {};
        group.members.forEach((m,i) => {
          split[m.id] = (i === group.members.length - 1)
              ? Math.round((Number(amount) - per * (n - 1) + Number.EPSILON) * 100) / 100
              : per;
        });
        return split;
      } else {
        const split = {};
        for (const m of group.members) {
          split[m.id] = Number(customSplit[m.id] || 0);
        }
        return split;
      }
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) {
      window.alert(err);
      return;
    }

    const newExpense = {
      id: `R_${uuidv4().slice(0,8)}`,
      date: date,
      amount: Number(amount),
      description,
      category,
      type,
      paidBy: type === 'personal' ? 'me' : paidBy, // for group: paidBy is member.id
      groupId: selectedGroupId || null,
      split: buildSplit()
    };

    onCreate(newExpense);
    resetForm();
  }

  return (
    <div className="card p-3 mb-3">
      <h5>Add Expense</h5>
      <form onSubmit={handleSubmit}>
        <div className="mb-2">
          <label>Date</label>
          <input type="date" className="form-control" value={date} onChange={e=>setDate(e.target.value)} />
        </div>

        <div className="mb-2">
          <label>Amount</label>
          <MoneyInput value={amount} onChange={setAmount} />
        </div>

        <div className="mb-2">
          <label>Description</label>
          <input className="form-control" value={description} onChange={e=>setDescription(e.target.value)} />
        </div>

        <div className="mb-2">
          <label>Category</label>
          <select className="form-select" value={category} onChange={e=>setCategory(e.target.value)}>
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        <div className="mb-2">
          <label>Type</label>
          <select className="form-select" value={type} onChange={e=>setType(e.target.value)}>
            <option value="personal">Personal</option>
            <option value="group">Group</option>
          </select>
        </div>

        {type === 'group' && (
          <>
            <div className="mb-2">
              <label>Select Group</label>
              <select className="form-select" value={selectedGroupId} onChange={e=>setSelectedGroupId(e.target.value)}>
                <option value="">-- select --</option>
                {groups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
              </select>
            </div>

            {selectedGroupId && (() => {
              const group = groups.find(g => g._id === selectedGroupId);
              if (!group) return null;
              return (
                <div className="mb-2">
                  <label>Paid by</label>
                  <select className="form-select mb-2" value={paidBy} onChange={e=>setPaidBy(e.target.value)}>
                    <option value="">-- select payer --</option>
                    {group.members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>

                  <label>Split</label>
                  <div className="mb-2">
                    <select className="form-select" value={splitMode} onChange={e=>setSplitMode(e.target.value)}>
                      <option value="equal">Equal Split</option>
                      <option value="custom">Custom Split</option>
                    </select>
                  </div>

                  {splitMode === 'equal' && (
                    <div className="small text-muted">Equal split among {group.members.length} members</div>
                  )}

                  {splitMode === 'custom' && (
                    <div>
                      {group.members.map(m => (
                        <div className="input-group mb-1" key={m.id}>
                          <span className="input-group-text">{m.name}</span>
                          <input className="form-control" type="number" step="0.01"
                            value={customSplit[m.id] || ''}
                            onChange={e => setCustomSplit({...customSplit, [m.id]: e.target.value})}
                          />
                        </div>
                      ))}
                      <div className="small text-muted">Make sure the total equals amount</div>
                    </div>
                  )}
                </div>
              );
            })()}
          </>
        )}

        <div className="d-flex justify-content-between mt-3">
          <button type="submit" className="btn btn-primary">Add Expense</button>
          <button type="button" className="btn btn-secondary" onClick={resetForm}>Reset</button>
        </div>
      </form>
    </div>
  );
}

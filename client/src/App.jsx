import React, { useEffect, useState } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { fetchGroups, fetchExpenses, createExpense, createGroup, fetchMonthlyReport } from './api';
import { loadLocalExpenses, saveLocalExpenses } from './utils/localStorage';
import { Routes, Route, Link, useLocation } from 'react-router-dom';

import GroupsPage from './pages/GroupsPage';
import TransactionsPage from './pages/TransactionsPage';
import SummaryPage from './pages/SummaryPage';
import Dashboard from './pages/Dashboard';

export default function App() {
  const [groups, setGroups] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState(['Food','Bills','Transport','Shopping','Other']);
  const location = useLocation();

  useEffect(() => { loadInitial(); }, []);

  async function loadInitial() {
    // fetch groups
    try {
      const g = await fetchGroups();
      setGroups(g);
    } catch (e) {
      console.warn('Could not fetch groups', e);
    }

    // combine local and server expenses
    const local = loadLocalExpenses() || [];
    try {
      const server = await fetchExpenses();
      const map = {};
      [...local, ...server].forEach(x => map[x.id || x._id || JSON.stringify(x)] = x);
      const merged = Object.values(map).sort((a,b)=> new Date(b.date) - new Date(a.date));
      setExpenses(merged);
      saveLocalExpenses(merged);
    } catch (e) {
      console.warn('failed to fetch server expenses; using local', e);
      setExpenses(local);
    }
  }

  /**
   * Create expense
   *
   * Behavior:
   *  - Optimistically add the expense to UI (so user sees immediate feedback)
   *  - Attempt to save to server
   *  - On success: replace the optimistic entry with the server's enriched response (which includes memberNames/paidByName)
   *  - On failure: keep the optimistic entry (saved locally) and show a toast
   */
  async function handleCreateExpense(expenseObj) {
    // create a stable temp key for matching replacement later
    const tempKey = expenseObj.id || `local-${Date.now()}`;

    // ensure the optimistic object has an id so we can replace it later
    const optimistic = { ...expenseObj, id: expenseObj.id || tempKey, __local: true };

    // add optimistic to top
    const newExpenses = [optimistic, ...expenses];
    setExpenses(newExpenses);
    saveLocalExpenses(newExpenses);
    toast.success('Saved locally');

    try {
      // send to server and get enriched expense back
      const saved = await createExpense(expenseObj);

      // replace optimistic item with server response.
      // match by id if possible (server will use provided id if sent), otherwise fallback to matching by date+amount+description
      setExpenses(prev => {
        // find index of optimistic item
        const idx = prev.findIndex(e => e.id === optimistic.id || (e.__local && e.date === optimistic.date && e.amount === optimistic.amount && e.description === optimistic.description));
        const copy = [...prev];
        if (idx >= 0) {
          // replace at idx
          copy.splice(idx, 1, saved);
        } else {
          // not found (rare) — just add server item at top
          copy.unshift(saved);
        }
        // persist merged list to local storage
        saveLocalExpenses(copy);
        return copy;
      });

      toast.success('Saved to server');
    } catch (err) {
      console.warn('Server save failed', err);
      toast.error('Server save failed — saved locally only');
      // keep optimistic item in state/localStorage (already done)
    }
  }

  async function handleCreateGroup(payload) {
    try {
      const g = await createGroup(payload);
      setGroups(prev => [g, ...prev]);
      toast.success('Group created');
    } catch (err) {
      console.warn(err);
      toast.error('Could not create group');
    }
  }

  return (
    <div className="container py-3">
      <nav className="navbar navbar-expand-lg navbar-light bg-light rounded mb-3">
        <div className="container-fluid">
          <Link className="navbar-brand" to="/">PFT</Link>
          <div className="collapse navbar-collapse">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              <li className={`nav-item ${location.pathname === '/' ? 'active' : ''}`}><Link className="nav-link" to="/">Dashboard</Link></li>
              <li className={`nav-item ${location.pathname.startsWith('/groups') ? 'active' : ''}`}><Link className="nav-link" to="/groups">Groups</Link></li>
              <li className={`nav-item ${location.pathname.startsWith('/transactions') ? 'active' : ''}`}><Link className="nav-link" to="/transactions">Transactions</Link></li>
              <li className={`nav-item ${location.pathname.startsWith('/summary') ? 'active' : ''}`}><Link className="nav-link" to="/summary">Monthly Summary</Link></li>
            </ul>
          </div>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Dashboard groups={groups} expenses={expenses} />} />
        <Route path="/groups" element={<GroupsPage groups={groups} onCreateGroup={handleCreateGroup} />} />
        <Route path="/transactions" element={<TransactionsPage expenses={expenses} groups={groups} onCreateExpense={handleCreateExpense} categories={categories} />} />
        <Route path="/summary" element={<SummaryPage onFetch={fetchMonthlyReport} groups={groups} />} />
      </Routes>

      <ToastContainer position="top-right" />
    </div>
  );
}

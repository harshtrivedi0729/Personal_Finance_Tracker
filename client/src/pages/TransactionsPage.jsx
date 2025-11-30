import React from 'react';
import AddExpense from '../components/AddExpense';
import ExpenseList from '../components/ExpenseList';

export default function TransactionsPage({ expenses, groups, onCreateExpense, categories }) {
  return (
    <div className="row">
      <div className="col-md-5">
        <AddExpense onCreate={onCreateExpense} groups={groups} categories={categories} />
      </div>
      <div className="col-md-7">
        <ExpenseList expenses={expenses} />
      </div>
    </div>
  );
}

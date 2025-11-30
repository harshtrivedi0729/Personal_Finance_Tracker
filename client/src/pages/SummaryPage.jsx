import React from 'react';
import MonthlySummary from '../components/MonthlySummary';

export default function SummaryPage({ onFetch, groups }) {
  return (
    <div>
      <h3>Monthly Summary</h3>
      <MonthlySummary onFetch={onFetch} groups={groups} />
    </div>
  );
}

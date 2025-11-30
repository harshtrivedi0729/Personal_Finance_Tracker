const KEY = 'pft.expenses.v1';
export function loadLocalExpenses() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('loadLocalExpenses', e);
    return [];
  }
}
export function saveLocalExpenses(arr) {
  try {
    localStorage.setItem(KEY, JSON.stringify(arr));
  } catch (e) {
    console.error('saveLocalExpenses', e);
  }
}

/* =====================================================
   FORTUNE FLOW GUIDE — app.js
   ===================================================== */

'use strict';

/* =====================================================
   STATE
   ===================================================== */
let expenses   = [];
let budgets    = {};           // { category: amount }
let totalBudget = 0;
let settings   = { name: 'User', currency: '₹', dark: false };
let urlHistory = [];
let sortCol    = 'date';
let sortDir    = 'desc';
let filtered   = [];

/* Charts */
let barChart   = null;
let dChart     = null;
let lineChart  = null;
let predChart  = null;

/* =====================================================
   CATEGORIES
   ===================================================== */
const CATS = [
  { name: 'Food & Dining',    icon: '🍽️', color: '#F97316' },
  { name: 'Transportation',   icon: '🚗', color: '#2563EB' },
  { name: 'Entertainment',    icon: '🎮', color: '#7C3AED' },
  { name: 'Shopping',         icon: '🛍️', color: '#EC4899' },
  { name: 'Bills & Utilities',icon: '💡', color: '#0891B2' },
  { name: 'Healthcare',       icon: '🏥', color: '#10B981' },
  { name: 'Education',        icon: '📚', color: '#F59E0B' },
  { name: 'Others',           icon: '📦', color: '#64748B' },
];

const catColor = name => (CATS.find(c => c.name === name)?.color) || '#94A3B8';
const catIcon  = name => (CATS.find(c => c.name === name)?.icon)  || '📦';

/* =====================================================
   CHART COLORS
   ===================================================== */
const CHART_COLORS = ['#2563EB','#7C3AED','#0891B2','#10B981','#F59E0B','#F97316','#EC4899','#64748B'];

/* =====================================================
   SAMPLE DATA (pre-loaded if empty)
   ===================================================== */
function loadSampleData() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  const pad = n => String(n).padStart(2,'0');
  const d = (mo, day) => `${y}-${pad(mo+1)}-${pad(day)}`;

  return [
    // Current month
    { id: uid(), description:'Grocery Shopping',    category:'Food & Dining',    amount:2450, date:d(m,3),  notes:'Weekly groceries' },
    { id: uid(), description:'Electricity Bill',    category:'Bills & Utilities', amount:1850, date:d(m,4),  notes:'' },
    { id: uid(), description:'Uber Ride to Office', category:'Transportation',    amount:320,  date:d(m,5),  notes:'' },
    { id: uid(), description:'Netflix Subscription',category:'Entertainment',     amount:649,  date:d(m,6),  notes:'' },
    { id: uid(), description:'Restaurant Dinner',   category:'Food & Dining',    amount:1200, date:d(m,8),  notes:'Family outing' },
    { id: uid(), description:'Amazon Purchase',     category:'Shopping',          amount:3200, date:d(m,10), notes:'Electronics' },
    { id: uid(), description:'Doctor Visit',        category:'Healthcare',        amount:800,  date:d(m,12), notes:'General checkup' },
    { id: uid(), description:'Udemy Course',        category:'Education',         amount:1499, date:d(m,14), notes:'Python course' },
    { id: uid(), description:'Petrol',              category:'Transportation',    amount:1500, date:d(m,16), notes:'' },
    { id: uid(), description:'Swiggy Order',        category:'Food & Dining',    amount:450,  date:d(m,18), notes:'Dinner delivery' },
    { id: uid(), description:'Internet Bill',       category:'Bills & Utilities', amount:999,  date:d(m,20), notes:'' },
    { id: uid(), description:'Clothing',            category:'Shopping',          amount:2800, date:d(m,22), notes:'New clothes' },

    // Previous month
    { id: uid(), description:'Grocery Shopping',    category:'Food & Dining',    amount:2200, date:d(m-1,2),  notes:'' },
    { id: uid(), description:'Electricity Bill',    category:'Bills & Utilities', amount:1920, date:d(m-1,5),  notes:'' },
    { id: uid(), description:'Gym Membership',      category:'Healthcare',        amount:1200, date:d(m-1,7),  notes:'' },
    { id: uid(), description:'Movie Tickets',       category:'Entertainment',     amount:800,  date:d(m-1,10), notes:'' },
    { id: uid(), description:'Petrol',              category:'Transportation',    amount:1400, date:d(m-1,14), notes:'' },
    { id: uid(), description:'Online Shopping',     category:'Shopping',          amount:4500, date:d(m-1,16), notes:'Monthly haul' },
    { id: uid(), description:'Restaurant',          category:'Food & Dining',    amount:1800, date:d(m-1,20), notes:'' },
    { id: uid(), description:'Water Bill',          category:'Bills & Utilities', amount:350,  date:d(m-1,22), notes:'' },

    // Two months ago
    { id: uid(), description:'Grocery Shopping',    category:'Food & Dining',    amount:2600, date:d(m-2,3),  notes:'' },
    { id: uid(), description:'Electricity Bill',    category:'Bills & Utilities', amount:1750, date:d(m-2,5),  notes:'' },
    { id: uid(), description:'Uber Rides',          category:'Transportation',    amount:980,  date:d(m-2,8),  notes:'' },
    { id: uid(), description:'Book Purchase',       category:'Education',         amount:650,  date:d(m-2,12), notes:'' },
    { id: uid(), description:'Pharmacy',            category:'Healthcare',        amount:420,  date:d(m-2,15), notes:'' },
    { id: uid(), description:'Spotify Premium',     category:'Entertainment',     amount:119,  date:d(m-2,18), notes:'' },
    { id: uid(), description:'Clothes Shopping',    category:'Shopping',          amount:3100, date:d(m-2,22), notes:'' },
  ];
}

/* =====================================================
   UTILITIES
   ===================================================== */
function uid() {
  return '_' + Math.random().toString(36).slice(2,10) + Date.now().toString(36);
}

function fmt(n) {
  return settings.currency + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function monthKey(dateStr) { return dateStr.substring(0,7); }

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
}

function monthLabel(key) {
  const [y,m] = key.split('-');
  return new Date(y, m-1, 1).toLocaleString('default', { month:'short', year:'2-digit' });
}

function getMonthlyTotals(n = 6) {
  const labels = [], data = [];
  const now = new Date();
  for (let i = n-1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const total = expenses
      .filter(e => monthKey(e.date) === key)
      .reduce((s,e) => s + Number(e.amount), 0);
    labels.push(monthLabel(key));
    data.push(+total.toFixed(2));
  }
  return { labels, data };
}

function getCatTotals(mk = null) {
  const totals = {};
  expenses.forEach(e => {
    if (mk && monthKey(e.date) !== mk) return;
    totals[e.category] = (totals[e.category] || 0) + Number(e.amount);
  });
  return totals;
}

function getDailyTotals(mk) {
  const [ys,ms] = mk.split('-');
  const y = +ys, m = +ms;
  const days = new Date(y, m, 0).getDate();
  const labels = [], data = [];
  for (let d = 1; d <= days; d++) {
    const ds = `${ys}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const total = expenses.filter(e => e.date === ds).reduce((s,e) => s + Number(e.amount), 0);
    labels.push(d);
    data.push(+total.toFixed(2));
  }
  return { labels, data };
}

function forecast() {
  const { data } = getMonthlyTotals(6);
  const valid = data.filter(v => v > 0);
  if (!valid.length) return 0;
  const weights = valid.map((_,i) => i+1);
  const tw = weights.reduce((a,b) => a+b, 0);
  return Math.round(valid.reduce((s,v,i) => s + v*weights[i], 0) / tw);
}

function getAvailableMonths() {
  const keys = [...new Set(expenses.map(e => monthKey(e.date)))].sort().reverse();
  return keys;
}

/* =====================================================
   PERSISTENCE
   ===================================================== */
function save() {
  localStorage.setItem('ff_expenses',   JSON.stringify(expenses));
  localStorage.setItem('ff_budgets',    JSON.stringify(budgets));
  localStorage.setItem('ff_total_budget', totalBudget);
  localStorage.setItem('ff_settings',  JSON.stringify(settings));
  localStorage.setItem('ff_url_history', JSON.stringify(urlHistory));
}

function load() {
  const e = localStorage.getItem('ff_expenses');
  const b = localStorage.getItem('ff_budgets');
  const t = localStorage.getItem('ff_total_budget');
  const s = localStorage.getItem('ff_settings');
  const u = localStorage.getItem('ff_url_history');

  expenses    = e ? JSON.parse(e) : loadSampleData();
  budgets     = b ? JSON.parse(b) : { 'Food & Dining':5000, 'Transportation':3000, 'Entertainment':2000, 'Shopping':5000, 'Bills & Utilities':4000, 'Healthcare':2000, 'Education':2000, 'Others':1000 };
  totalBudget = t ? +t : 30000;
  settings    = s ? JSON.parse(s) : { name:'User', currency:'₹', dark: false };
  urlHistory  = u ? JSON.parse(u) : [];

  if (!e) save(); // persist sample
}

/* =====================================================
   NAVIGATION
   ===================================================== */
const PAGE_INFO = {
  dashboard: { title: 'Dashboard',         sub: "Welcome back! Here's your financial overview." },
  expenses:  { title: 'Expenses',          sub: 'Track and manage all your transactions.' },
  analysis:  { title: 'Analysis',          sub: 'Deep dive into your spending patterns.' },
  prediction:{ title: 'Prediction',        sub: 'AI-powered forecasts based on your history.' },
  budget:    { title: 'Budget',            sub: 'Set and monitor your spending limits.' },
  insights:  { title: 'Insights',          sub: 'Smart tips to improve your finances.' },
  urlsafety: { title: 'URL Safety Checker',sub: 'Verify financial links before you click.' },
  settings:  { title: 'Settings',          sub: 'Customize your FortuneFlow experience.' },
};

let activePage = 'dashboard';

function navigate(page) {
  if (activePage === page) return;

  // hide current
  document.getElementById('page-'+activePage)?.classList.remove('active');
  document.getElementById('nav-'+activePage)?.classList.remove('active');

  activePage = page;

  // show new
  const pg = document.getElementById('page-'+page);
  if (pg) pg.classList.add('active');

  const nav = document.getElementById('nav-'+page);
  if (nav) nav.classList.add('active');

  const info = PAGE_INFO[page] || {};
  document.getElementById('pageTitle').textContent = info.title || page;
  document.getElementById('pageSub').textContent   = info.sub   || '';

  // close mobile sidebar
  document.getElementById('sidebar').classList.remove('mobile-open');

  refreshPage(page);
}

function refreshPage(page) {
  switch(page) {
    case 'dashboard':  renderDashboard(); break;
    case 'expenses':   renderExpensesTable(); break;
    case 'analysis':   renderAnalysis(); break;
    case 'prediction': renderPrediction(); break;
    case 'budget':     renderBudget(); break;
    case 'insights':   renderInsights(); break;
    case 'urlsafety':  renderUrlHistory(); break;
    case 'settings':   renderSettings(); break;
  }
}

/* =====================================================
   DASHBOARD
   ===================================================== */
function renderDashboard() {
  const cmk = currentMonthKey();
  const monthExp = expenses.filter(e => monthKey(e.date) === cmk);
  const total = monthExp.reduce((s,e) => s + Number(e.amount), 0);

  // Stat: total spending
  document.getElementById('statTotal').textContent = fmt(total);

  // Stat: remaining budget
  const remaining = totalBudget - total;
  document.getElementById('statBudget').textContent = fmt(Math.max(0, remaining));
  const utilPct = totalBudget > 0 ? Math.round(total/totalBudget*100) : 0;
  document.getElementById('statBudgetChange').innerHTML = `<i class="fas fa-chart-pie"></i> ${utilPct}% utilized`;

  // Last month comparison
  const lmk = (() => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth()-1, 1);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  })();
  const lastTotal = expenses.filter(e => monthKey(e.date) === lmk).reduce((s,e) => s + Number(e.amount), 0);
  const diff = lastTotal > 0 ? Math.round((total - lastTotal) / lastTotal * 100) : 0;
  const chgEl = document.getElementById('statTotalChange');
  if (diff > 0) chgEl.innerHTML = `<i class="fas fa-arrow-up"></i> ${diff}% from last month`;
  else if (diff < 0) chgEl.innerHTML = `<i class="fas fa-arrow-down"></i> ${Math.abs(diff)}% from last month`;
  else chgEl.innerHTML = `<i class="fas fa-minus"></i> Same as last month`;

  // Stat: top category
  const cats = getCatTotals(cmk);
  const topCat = Object.entries(cats).sort((a,b) => b[1]-a[1])[0];
  document.getElementById('statTopCat').textContent = topCat ? topCat[0].split(' &')[0] : '—';
  document.getElementById('statTopCatAmt').innerHTML = `<i class="fas fa-tag"></i> ${topCat ? fmt(topCat[1]) : '₹0'} spent`;

  // Stat: forecast
  const fc = forecast();
  document.getElementById('statForecast').textContent = fmt(fc);

  // update badge label
  document.getElementById('catMonthLabel').textContent = monthLabel(cmk);

  updateBarChart();
  updateDoughnutChart();
  renderRecentTable();
}

function renderRecentTable() {
  const tbody = document.getElementById('recentBody');
  const recent = [...expenses]
    .sort((a,b) => b.date.localeCompare(a.date))
    .slice(0,8);

  if (!recent.length) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fas fa-inbox"></i><p>No expenses yet. Add your first expense!</p></div></td></tr>`;
    return;
  }

  tbody.innerHTML = recent.map(e => {
    const color = catColor(e.category);
    const pct = totalBudget > 0 ? Math.round(Number(e.amount)/totalBudget*100) : 0;
    return `<tr>
      <td><strong>${e.description}</strong></td>
      <td><span class="category-pill" style="background:${color}18;color:${color}">${catIcon(e.category)} ${e.category}</span></td>
      <td>${formatDate(e.date)}</td>
      <td><strong>${fmt(e.amount)}</strong></td>
      <td><span class="category-pill" style="background:${pct > 10 ? '#FEF2F215' : '#ECFDF515'};color:${pct > 10 ? '#EF4444' : '#10B981'}">${pct > 10 ? '⚠️ High' : '✅ Normal'}</span></td>
    </tr>`;
  }).join('');
}

/* =====================================================
   CHARTS
   ===================================================== */
function chartDefaults() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { font: { family:'Inter', size:12 }, color: getComputedStyle(document.documentElement).getPropertyValue('--text2').trim() }
      },
      tooltip: { bodyFont: { family:'Inter' }, titleFont: { family:'Inter', weight:'700' } }
    }
  };
}

function gridColor() {
  return getComputedStyle(document.documentElement).getPropertyValue('--border').trim() || '#E2E8F0';
}
function textColor() {
  return getComputedStyle(document.documentElement).getPropertyValue('--text2').trim() || '#475569';
}

function updateBarChart() {
  const n = parseInt(document.getElementById('barMonthRange')?.value || 6);
  const { labels, data } = getMonthlyTotals(n);

  const ctx = document.getElementById('barChart');
  if (!ctx) return;

  if (barChart) barChart.destroy();

  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Monthly Spending',
        data,
        backgroundColor: labels.map((_,i) => i === labels.length-1 ? '#2563EB' : '#2563EB55'),
        borderColor: '#2563EB',
        borderWidth: 0,
        borderRadius: 8,
        borderSkipped: false,
      }]
    },
    options: {
      ...chartDefaults(),
      plugins: { ...chartDefaults().plugins, legend: { display:false } },
      scales: {
        x: { grid:{ display:false }, ticks:{ font:{family:'Inter',size:11}, color: textColor() } },
        y: { grid:{ color: gridColor() }, ticks:{ font:{family:'Inter',size:11}, color: textColor(), callback: v => '₹'+v.toLocaleString('en-IN') }, beginAtZero:true }
      },
    }
  });
}

function updateDoughnutChart() {
  const cats = getCatTotals(currentMonthKey());
  const keys = Object.keys(cats);
  const vals = keys.map(k => cats[k]);

  const ctx = document.getElementById('doughnutChart');
  if (!ctx) return;
  if (dChart) dChart.destroy();

  if (!keys.length) {
    dChart = null;
    return;
  }

  dChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: keys,
      datasets: [{ data: vals, backgroundColor: keys.map(catColor), borderWidth: 2, borderColor: getComputedStyle(document.documentElement).getPropertyValue('--surface').trim() || '#fff', hoverOffset: 8 }]
    },
    options: {
      ...chartDefaults(),
      cutout: '65%',
      plugins: {
        legend: { position:'right', labels:{ font:{family:'Inter',size:11}, color: textColor(), boxWidth:12, padding:14 } },
        tooltip: { bodyFont:{family:'Inter'}, callbacks: { label: ctx => ` ${fmt(ctx.raw)}` } }
      }
    }
  });
}

function updateLineChart() {
  const sel = document.getElementById('trendMonthSel');
  const mk  = sel?.value || currentMonthKey();
  const { labels, data } = getDailyTotals(mk);

  const ctx = document.getElementById('lineChart');
  if (!ctx) return;
  if (lineChart) lineChart.destroy();

  lineChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Daily Spending',
        data,
        borderColor: '#7C3AED',
        backgroundColor: 'rgba(124,58,237,0.1)',
        borderWidth: 2.5,
        pointRadius: 4,
        pointBackgroundColor: '#7C3AED',
        pointHoverRadius: 6,
        fill: true,
        tension: 0.4,
      }]
    },
    options: {
      ...chartDefaults(),
      plugins: { legend:{display:false} },
      scales: {
        x: { grid:{display:false}, ticks:{ font:{family:'Inter',size:11}, color: textColor() } },
        y: { grid:{ color: gridColor() }, ticks:{ font:{family:'Inter',size:11}, color: textColor(), callback: v => '₹'+v.toLocaleString('en-IN') }, beginAtZero:true }
      }
    }
  });
}

function updatePredChart() {
  const { labels: hLabels, data: hData } = getMonthlyTotals(3);
  const fc = forecast();
  const now = new Date();
  const fMonths = [1,2,3].map(i => {
    const d = new Date(now.getFullYear(), now.getMonth()+i, 1);
    return d.toLocaleString('default',{month:'short',year:'2-digit'});
  });
  const variance = () => Math.round(fc * (0.93 + Math.random()*0.14));
  const fData = [variance(), variance(), variance()];

  // Combine
  const allLabels = [...hLabels, ...fMonths];
  const histDs    = [...hData, null, null, null];
  const foreDs    = [null, null, hData[hData.length-1] || fc, ...fData];

  const ctx = document.getElementById('predChart');
  if (!ctx) return;
  if (predChart) predChart.destroy();

  predChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: allLabels,
      datasets: [
        {
          label: 'Historical',
          data: histDs,
          borderColor: '#2563EB',
          backgroundColor: 'rgba(37,99,235,0.08)',
          fill: true,
          borderWidth: 2.5,
          pointRadius: 5,
          tension: 0.4,
          spanGaps: false,
        },
        {
          label: 'Forecast',
          data: foreDs,
          borderColor: '#F97316',
          backgroundColor: 'rgba(249,115,22,0.08)',
          fill: true,
          borderWidth: 2.5,
          borderDash: [6,4],
          pointRadius: 5,
          tension: 0.4,
          spanGaps: false,
        }
      ]
    },
    options: {
      ...chartDefaults(),
      scales: {
        x: { grid:{display:false}, ticks:{ font:{family:'Inter',size:11}, color: textColor() } },
        y: { grid:{ color: gridColor() }, ticks:{ font:{family:'Inter',size:11}, color: textColor(), callback: v => '₹'+v.toLocaleString('en-IN') }, beginAtZero:true }
      }
    }
  });
}

/* =====================================================
   EXPENSES
   ===================================================== */
function addExpense() {
  const desc   = document.getElementById('expDesc').value.trim();
  const amount = parseFloat(document.getElementById('expAmount').value);
  const cat    = document.getElementById('expCategory').value;
  const date   = document.getElementById('expDate').value;
  const notes  = document.getElementById('expNotes').value.trim();

  if (!desc)   return showToast('Missing field', 'Please enter a description.', 'warning');
  if (!amount || amount <= 0) return showToast('Missing field', 'Please enter a valid amount.', 'warning');
  if (!cat)    return showToast('Missing field', 'Please select a category.', 'warning');
  if (!date)   return showToast('Missing field', 'Please select a date.', 'warning');

  expenses.push({ id: uid(), description: desc, amount, category: cat, date, notes });
  save();
  clearExpenseForm();
  renderExpensesTable();
  showToast('Expense Added', `${desc} — ${fmt(amount)}`, 'success');
  updateInsightsBadge();
}

function deleteExpense(id) {
  expenses = expenses.filter(e => e.id !== id);
  save();
  filterExpenses();
  showToast('Deleted', 'Expense removed.', 'info');
  updateInsightsBadge();
}

function clearExpenseForm() {
  ['expDesc','expAmount','expCategory','expDate','expNotes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('expDate').value = new Date().toISOString().split('T')[0];
}

/* Filter + Sort */
function filterExpenses() {
  const search = (document.getElementById('expSearch')?.value || '').toLowerCase();
  const cat    = document.getElementById('catFilter')?.value || '';
  const month  = document.getElementById('monthFilter')?.value || '';

  filtered = expenses.filter(e => {
    const matchSearch = !search || e.description.toLowerCase().includes(search) || e.category.toLowerCase().includes(search);
    const matchCat    = !cat    || e.category === cat;
    const matchMonth  = !month  || monthKey(e.date) === month;
    return matchSearch && matchCat && matchMonth;
  });

  // Sort
  filtered.sort((a,b) => {
    let av = a[sortCol], bv = b[sortCol];
    if (sortCol === 'amount') { av = Number(av); bv = Number(bv); }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  renderExpensesTable(false);
}

function sortBy(col) {
  if (sortCol === col) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  else { sortCol = col; sortDir = 'desc'; }
  filterExpenses();
}

function renderExpensesTable(rebuild = true) {
  // populate month filter
  const mf = document.getElementById('monthFilter');
  if (mf && rebuild) {
    const months = getAvailableMonths();
    mf.innerHTML = '<option value="">All Months</option>' + months.map(mk =>
      `<option value="${mk}">${monthLabel(mk)}</option>`
    ).join('');
  }

  if (rebuild) filterExpenses();
  else renderFilteredRows();
}

function renderFilteredRows() {
  const tbody = document.getElementById('expTableBody');
  if (!tbody) return;

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fas fa-inbox"></i><p>No expenses found.</p></div></td></tr>`;
    document.getElementById('expCount').textContent = '0 expenses';
    document.getElementById('expTotal').textContent = 'Total: ₹0';
    return;
  }

  const total = filtered.reduce((s,e) => s + Number(e.amount), 0);

  tbody.innerHTML = filtered.map((e,i) => {
    const color = catColor(e.category);
    return `<tr>
      <td><strong>${i+1}. ${e.description}</strong></td>
      <td><span class="category-pill" style="background:${color}18;color:${color}">${catIcon(e.category)} ${e.category}</span></td>
      <td>${formatDate(e.date)}</td>
      <td><strong>${fmt(e.amount)}</strong></td>
      <td style="color:var(--text3);font-size:12.5px">${e.notes || '—'}</td>
      <td><button class="del-btn" onclick="deleteExpense('${e.id}')" title="Delete"><i class="fas fa-trash"></i></button></td>
    </tr>`;
  }).join('');

  document.getElementById('expCount').textContent = `${filtered.length} expense${filtered.length !== 1 ? 's' : ''}`;
  document.getElementById('expTotal').textContent = `Total: ${fmt(total)}`;
}

/* =====================================================
   ANALYSIS
   ===================================================== */
function renderAnalysis() {
  // populate month selector
  const sel = document.getElementById('trendMonthSel');
  if (sel) {
    const months = getAvailableMonths();
    sel.innerHTML = months.map(mk =>
      `<option value="${mk}">${monthLabel(mk)}</option>`
    ).join('');
  }

  updateLineChart();

  // category cards
  const grid = document.getElementById('categoryGrid');
  if (!grid) return;
  const cats = getCatTotals();
  const sorted = Object.entries(cats).sort((a,b)=>b[1]-a[1]);
  const grandTotal = sorted.reduce((s,[,v])=>s+v,0);

  if (!sorted.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-chart-bar"></i><p>No data yet.</p></div>`;
    return;
  }

  grid.innerHTML = sorted.map(([name, amt]) => {
    const color = catColor(name);
    const pct = grandTotal > 0 ? ((amt/grandTotal)*100).toFixed(1) : 0;
    return `
      <div class="cat-card">
        <div class="cat-card-header">
          <div class="cat-icon" style="background:${color}20;color:${color}">${catIcon(name)}</div>
          <span class="cat-name">${name}</span>
        </div>
        <div class="cat-amount">${fmt(amt)}</div>
        <div class="cat-pct">${pct}% of total spending</div>
        <div class="mini-bar-bg">
          <div class="mini-bar-fill" style="width:${pct}%;background:${color}"></div>
        </div>
      </div>`;
  }).join('');
}

/* =====================================================
   PREDICTION
   ===================================================== */
function renderPrediction() {
  const fc = forecast();
  document.getElementById('predBigVal').textContent = fmt(fc);

  const exp = expenses.filter(e => monthKey(e.date) === currentMonthKey());
  document.getElementById('predNote').textContent = exp.length < 3
    ? 'Add more expenses to improve prediction accuracy.'
    : `Based on ${expenses.length} transactions across your history.`;

  // Category forecasts
  const cats = getCatTotals();
  const allExp = expenses.length;
  const grid = document.getElementById('predCatGrid');
  if (grid) {
    if (!Object.keys(cats).length) {
      grid.innerHTML = `<p style="color:var(--text3);font-size:13px">No data available.</p>`;
    } else {
      grid.innerHTML = CATS.map(c => {
        const total = cats[c.name] || 0;
        const months = getAvailableMonths().length || 1;
        const monthly = total / months;
        const proj = Math.round(monthly * 1.05);
        return `
          <div class="pred-cat-item">
            <div class="pred-cat-name">${c.icon} ${c.name}</div>
            <div class="pred-cat-val" style="color:${c.color}">${fmt(proj)}</div>
            <div class="pred-cat-trend">Avg monthly: ${fmt(Math.round(monthly))}</div>
          </div>`;
      }).join('');
    }
  }

  updatePredChart();
}

/* =====================================================
   BUDGET
   ===================================================== */
function renderBudget() {
  document.getElementById('totalBudgetInp').value = totalBudget || '';

  const cmk     = currentMonthKey();
  const spent   = expenses.filter(e => monthKey(e.date) === cmk).reduce((s,e) => s + Number(e.amount), 0);
  const remain  = totalBudget - spent;
  const pct     = totalBudget > 0 ? Math.min(100, Math.round(spent/totalBudget*100)) : 0;
  const circ    = 2 * Math.PI * 50;

  document.getElementById('healthPct').textContent = pct + '%';
  document.getElementById('hmTotal').textContent   = fmt(totalBudget);
  document.getElementById('hmSpent').textContent   = fmt(spent);
  document.getElementById('hmRemain').textContent  = fmt(Math.max(0, remain));

  const ring = document.getElementById('healthRingFill');
  if (ring) {
    ring.style.strokeDasharray = `${circ * pct/100} ${circ}`;
    ring.style.stroke = pct > 90 ? '#EF4444' : pct > 75 ? '#F59E0B' : '#10B981';
  }

  // Category budget inputs
  const list = document.getElementById('catBudgetList');
  if (list) {
    list.innerHTML = CATS.map(c => `
      <div class="cat-budget-row">
        <label>${c.icon} ${c.name}</label>
        <input type="number" class="form-input" id="cb_${c.name.replace(/\s+/g,'_')}" value="${budgets[c.name] || ''}" placeholder="Budget amount" />
      </div>`).join('');
  }

  // Budget progress bars
  renderBudgetBars();
}

function renderBudgetBars() {
  const grid = document.getElementById('budgetBarsGrid');
  if (!grid) return;
  const cmk = currentMonthKey();
  const catTotals = getCatTotals(cmk);

  const rows = CATS.map(c => {
    const budget  = budgets[c.name] || 0;
    const spent   = catTotals[c.name] || 0;
    const pct     = budget > 0 ? Math.min(100, Math.round(spent/budget*100)) : 0;
    const color   = pct > 90 ? '#EF4444' : pct > 70 ? '#F59E0B' : c.color;
    return `
      <div class="bbar-row">
        <div class="bbar-top">
          <span class="bbar-name">${c.icon} ${c.name}</span>
          <span class="bbar-nums">${fmt(spent)} / ${budget > 0 ? fmt(budget) : 'No limit'}</span>
        </div>
        <div class="bbar-track">
          <div class="bbar-fill" style="width:${pct}%;background:${color}"></div>
        </div>
      </div>`;
  }).join('');

  grid.innerHTML = `
    <div class="bbar-card card">
      <div class="card-header"><h3 class="card-title"><i class="fas fa-chart-bar"></i> Category Budget Progress</h3></div>
      ${rows}
    </div>`;
}

function saveTotalBudget() {
  const val = parseFloat(document.getElementById('totalBudgetInp').value);
  if (!val || val <= 0) return showToast('Invalid', 'Enter a valid budget amount.', 'warning');
  totalBudget = val;
  save();
  renderBudget();
  showToast('Saved', `Monthly budget set to ${fmt(val)}`, 'success');
}

function saveCatBudgets() {
  CATS.forEach(c => {
    const id  = 'cb_' + c.name.replace(/\s+/g,'_');
    const inp = document.getElementById(id);
    if (inp && inp.value) budgets[c.name] = parseFloat(inp.value) || 0;
  });
  save();
  renderBudgetBars();
  showToast('Saved', 'Category budgets updated.', 'success');
}

/* =====================================================
   INSIGHTS
   ===================================================== */
function renderInsights() {
  const cmk   = currentMonthKey();
  const total = expenses.filter(e => monthKey(e.date) === cmk).reduce((s,e) => s + Number(e.amount), 0);
  const cats  = getCatTotals(cmk);

  const tips = [];

  // Score calculation
  let score = 70;

  if (totalBudget > 0) {
    const pct = total / totalBudget;
    if (pct < .5)  { score += 20; tips.push({ type:'success', icon:'fa-trophy', title:'Great Saving!', msg:`You've spent only ${Math.round(pct*100)}% of your budget. Keep it up!` }); }
    else if (pct < .8) { score += 10; tips.push({ type:'info', icon:'fa-info-circle', title:'On Track', msg:`${Math.round(pct*100)}% of budget used with time remaining.` }); }
    else if (pct < 1)  { score -= 10; tips.push({ type:'warning', icon:'fa-exclamation-triangle', title:'Budget Alert', msg:`You've used ${Math.round(pct*100)}% of your budget. Be cautious!` }); }
    else               { score -= 25; tips.push({ type:'danger', icon:'fa-times-circle', title:'Over Budget!', msg:`Spending exceeded by ${fmt(total - totalBudget)}. Review your expenses.` }); }
  }

  const topCat = Object.entries(cats).sort((a,b)=>b[1]-a[1])[0];
  if (topCat) {
    const catPct = (topCat[1]/total*100).toFixed(0);
    if (+catPct > 40) {
      score -= 10;
      tips.push({ type:'warning', icon:'fa-fire', title:'High Category Spend', msg:`${topCat[0]} makes up ${catPct}% of your spending. Consider diversifying.` });
    }
  }

  const food = cats['Food & Dining'] || 0;
  if (food > 5000) {
    score -= 5;
    tips.push({ type:'warning', icon:'fa-utensils', title:'Food Spending High', msg:`${fmt(food)} spent on food. Try meal prepping to reduce costs.` });
  }

  const ent = cats['Entertainment'] || 0;
  if (ent > 3000) {
    tips.push({ type:'info', icon:'fa-gamepad', title:'Entertainment Check', msg:`${fmt(ent)} on entertainment. Look for free alternatives.` });
  }

  if (expenses.length > 10) {
    tips.push({ type:'success', icon:'fa-check-circle', title:'Good Tracking Habit!', msg:`You've logged ${expenses.length} transactions. Consistent tracking leads to better control.` });
    score += 5;
  }

  const fc = forecast();
  if (fc > totalBudget && totalBudget > 0) {
    score -= 10;
    tips.push({ type:'danger', icon:'fa-chart-line', title:'Forecast Warning', msg:`AI predicts next month spend of ${fmt(fc)}, exceeding your budget of ${fmt(totalBudget)}.` });
  } else if (fc > 0) {
    tips.push({ type:'info', icon:'fa-brain', title:'AI Forecast', msg:`Next month spending estimated at ${fmt(fc)} based on your trends.` });
  }

  score = Math.max(0, Math.min(100, score));

  const scoreEl = document.getElementById('scoreNum');
  const circEl  = document.getElementById('scoreCircle');
  const labelEl = document.getElementById('scoreLabel');
  const descEl  = document.getElementById('scoreDesc');

  if (scoreEl) scoreEl.textContent = score;
  if (circEl) {
    circEl.style.background = score >= 80 ? 'linear-gradient(135deg,#10B981,#059669)' :
                               score >= 60 ? 'linear-gradient(135deg,#2563EB,#7C3AED)' :
                               score >= 40 ? 'linear-gradient(135deg,#F59E0B,#F97316)' :
                                             'linear-gradient(135deg,#EF4444,#DC2626)';
  }
  if (labelEl) labelEl.textContent = score >= 80 ? '🎉 Excellent!' : score >= 60 ? '👍 Good' : score >= 40 ? '⚠️ Needs Attention' : '🚨 Critical';
  if (descEl)  descEl.textContent  = score >= 80 ? 'You are managing your finances very well.' : score >= 60 ? 'Your finances are mostly on track.' : 'Consider reviewing your budget and spending habits.';

  const grid = document.getElementById('insightsGrid');
  if (grid) {
    if (!tips.length) {
      grid.innerHTML = `<div class="insight-card info" style="grid-column:1/-1"><div class="insight-ic"><i class="fas fa-lightbulb"></i></div><div class="insight-body"><h4>Add More Data</h4><p>Add expenses and set a budget to receive personalized financial insights.</p></div></div>`;
    } else {
      grid.innerHTML = tips.map(t => `
        <div class="insight-card ${t.type}">
          <div class="insight-ic"><i class="fas ${t.icon}"></i></div>
          <div class="insight-body"><h4>${t.title}</h4><p>${t.msg}</p></div>
        </div>`).join('');
    }
  }

  updateInsightsBadge(tips.filter(t => t.type === 'danger' || t.type === 'warning').length);
}

function updateInsightsBadge(count) {
  const badge = document.getElementById('insightsBadge');
  if (!badge) return;
  if (count === undefined) {
    // quick calc
    const cmk = currentMonthKey();
    const total = expenses.filter(e => monthKey(e.date) === cmk).reduce((s,e) => s + Number(e.amount), 0);
    count = (totalBudget > 0 && total > totalBudget * 0.8) ? 1 : 0;
  }
  if (count > 0) { badge.textContent = count; badge.style.display = ''; }
  else badge.style.display = 'none';
}

/* =====================================================
   URL SAFETY CHECKER
   ===================================================== */
const SAFE_DOMAINS = ['sbi.co.in','hdfcbank.com','icicibank.com','axisbank.com','paytm.com','phonepe.com','google.com','amazon.in','flipkart.com','razorpay.com','upi.npci.org.in'];
const WARN_PATTERNS = ['free-money','win-prize','lottery','claim-reward','lucky-draw','bit.ly','tinyurl','shorturl','payouts','urgent-payment'];
const DANGER_PATTERNS = ['phishing','scam','free-bitcoin','account-verify-now','bank-alert-urgent','hack','password-reset-email','click-to-win'];

function checkURL() {
  const raw = document.getElementById('urlInput').value.trim();
  if (!raw) return showToast('Empty URL', 'Please enter a URL to check.', 'warning');

  let url;
  try {
    url = new URL(raw.startsWith('http') ? raw : 'https://'+raw);
  } catch {
    showToast('Invalid URL', 'Please enter a valid URL.', 'error');
    return;
  }

  const host  = url.hostname.toLowerCase().replace('www.','');
  const full  = url.href.toLowerCase();
  const isHTTPS = url.protocol === 'https:';

  let level = 'safe', title = '', detail = '';

  if (DANGER_PATTERNS.some(p => full.includes(p))) {
    level = 'danger';
  } else if (!isHTTPS || WARN_PATTERNS.some(p => full.includes(p))) {
    level = 'warning';
  } else if (SAFE_DOMAINS.some(d => host.includes(d))) {
    level = 'safe';
  } else {
    level = 'warning'; // unknown domain
  }

  if (level === 'safe') {
    title  = '✅ Site Appears Safe';
    detail = `The URL uses HTTPS encryption and matches known safe domains. Still verify you're on the correct site before entering credentials.`;
  } else if (level === 'warning') {
    title  = '⚠️ Proceed with Caution';
    detail = `${!isHTTPS ? 'This site does not use HTTPS. ' : ''}This domain is not in our trusted list. Avoid entering sensitive financial information unless you are certain of its authenticity.`;
  } else {
    title  = '🚨 Potential Threat Detected';
    detail = `This URL contains suspicious patterns commonly found in phishing or scam sites. Do NOT enter any personal or financial information.`;
  }

  const box = document.getElementById('urlResultBox');
  box.className = `url-result ${level}`;
  box.classList.remove('hidden');
  box.innerHTML = `
    <div class="url-result-header">
      <span class="url-result-icon">${level === 'safe' ? '✅' : level === 'warning' ? '⚠️' : '🚨'}</span>
      <span class="url-result-title">${title}</span>
    </div>
    <p class="url-result-detail">${detail}</p>
    <p style="font-size:12px;color:var(--text3);margin-top:8px">Checked: <strong>${url.href}</strong></p>`;

  // Add to history
  urlHistory.unshift({ url: url.href, level, time: new Date().toLocaleString() });
  if (urlHistory.length > 10) urlHistory.pop();
  save();
  renderUrlHistory();
}

function renderUrlHistory() {
  const el = document.getElementById('urlHistory');
  if (!el) return;
  if (!urlHistory.length) {
    el.innerHTML = `<div class="empty-state"><i class="fas fa-shield-alt"></i><p>No URLs checked yet</p></div>`;
    return;
  }
  el.innerHTML = urlHistory.map(h => `
    <div class="url-hist-row">
      <span class="url-hist-url">${h.url}</span>
      <span class="url-hist-badge badge-${h.level}">${h.level}</span>
    </div>`).join('');
}

/* =====================================================
   SETTINGS
   ===================================================== */
function renderSettings() {
  const ni = document.getElementById('settingsName');
  const ci = document.getElementById('settingsCurrency');
  const di = document.getElementById('darkModeChk');
  if (ni) ni.value = settings.name;
  if (ci) ci.value = settings.currency;
  if (di) di.checked = settings.dark;
}

function saveSettings() {
  const name = document.getElementById('settingsName')?.value.trim() || 'User';
  const cur  = document.getElementById('settingsCurrency')?.value || '₹';
  settings.name     = name;
  settings.currency = cur;
  save();
  updateUserDisplay();
  showToast('Saved', 'Settings updated successfully!', 'success');
}

function updateUserDisplay() {
  ['sidebarName','topbarName'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = settings.name;
  });
}

/* =====================================================
   THEME
   ===================================================== */
function toggleTheme() {
  settings.dark = !settings.dark;
  applyTheme();
  save();
  const chk = document.getElementById('darkModeChk');
  if (chk) chk.checked = settings.dark;
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', settings.dark ? 'dark' : 'light');
  const icon = document.getElementById('themeIcon');
  if (icon) { icon.className = settings.dark ? 'fas fa-sun' : 'fas fa-moon'; }
  // Redraw charts if on relevant page
  setTimeout(() => {
    if (barChart)  updateBarChart();
    if (dChart)    updateDoughnutChart();
    if (lineChart) updateLineChart();
  }, 300);
}

/* =====================================================
   EXPORT DATA
   ===================================================== */
function exportData() {
  const data = { expenses, budgets, totalBudget, settings, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type:'application/json' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `fortuneflow_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  showToast('Exported', 'Data exported as JSON file.', 'success');
}

/* =====================================================
   CONFIRM MODAL
   ===================================================== */
let modalCallback = null;

function confirmReset() {
  openModal('Reset All Data', 'This will permanently delete all your expenses, budgets, and settings. This action cannot be undone.', () => {
    localStorage.clear();
    location.reload();
  });
}

function openModal(title, msg, cb) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalMsg').textContent   = msg;
  document.getElementById('modalOverlay').classList.remove('hidden');
  modalCallback = cb;
  document.getElementById('modalOkBtn').onclick = () => { closeModal(); if (modalCallback) modalCallback(); };
}

function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
  modalCallback = null;
}

/* =====================================================
   TOAST
   ===================================================== */
const TOAST_ICONS = { success:'fa-check', error:'fa-times', info:'fa-info', warning:'fa-exclamation' };

function showToast(title, msg, type = 'info') {
  const stack = document.getElementById('toastStack');
  const id    = uid();
  const el    = document.createElement('div');
  el.className = `toast ${type}`;
  el.id = id;
  el.innerHTML = `
    <div class="toast-icon"><i class="fas ${TOAST_ICONS[type] || 'fa-info'}"></i></div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-msg">${msg}</div>
    </div>
    <button class="toast-close" onclick="removeToast('${id}')"><i class="fas fa-times"></i></button>`;
  stack.appendChild(el);
  setTimeout(() => removeToast(id), 4000);
}

function removeToast(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('removing');
  setTimeout(() => el.remove(), 300);
}

/* =====================================================
   HELPERS
   ===================================================== */
function formatDate(ds) {
  if (!ds) return '—';
  const [y,m,d] = ds.split('-');
  return `${d}/${m}/${y}`;
}

function handleGlobalSearch(val) {
  if (activePage !== 'expenses') navigate('expenses');
  const inp = document.getElementById('expSearch');
  if (inp) { inp.value = val; filterExpenses(); }
}

function toggleForm() {
  const wrap = document.getElementById('expenseFormWrap');
  const btn  = document.getElementById('toggleFormBtn');
  wrap.classList.toggle('open');
  btn.innerHTML = wrap.classList.contains('open')
    ? '<i class="fas fa-chevron-up"></i> Collapse'
    : '<i class="fas fa-chevron-down"></i> Expand';
}

/* =====================================================
   SIDEBAR
   ===================================================== */
function initSidebar() {
  const sb     = document.getElementById('sidebar');
  const colBtn = document.getElementById('collapseBtn');
  const ham    = document.getElementById('hamburger');

  colBtn?.addEventListener('click', () => {
    sb.classList.toggle('collapsed');
  });

  ham?.addEventListener('click', () => {
    sb.classList.toggle('mobile-open');
  });

  // Nav click
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.addEventListener('click', () => navigate(el.dataset.page));
  });

  // "View All" buttons that navigate
  document.querySelectorAll('[data-page]').forEach(el => {
    if (!el.classList.contains('nav-item')) {
      el.addEventListener('click', () => navigate(el.dataset.page));
    }
  });
}

/* =====================================================
   INIT
   ===================================================== */
document.addEventListener('DOMContentLoaded', () => {
  load();
  applyTheme();
  updateUserDisplay();
  initSidebar();

  // Set today's date as default for expense form
  const dateInp = document.getElementById('expDate');
  if (dateInp) dateInp.value = new Date().toISOString().split('T')[0];

  // Render initial dashboard
  renderDashboard();
  updateInsightsBadge();
  renderSettings();

  // Open form expanded by default
  const expForm = document.getElementById('expenseFormWrap');
  if (expForm) expForm.classList.add('open');
  const toggleBtn = document.getElementById('toggleFormBtn');
  if (toggleBtn) toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i> Collapse';
});

/* =====================================================
   EXPENSE WIZARD — INTERACTIVE STEP-BY-STEP
   ===================================================== */

const TOTAL_STEPS = 5; // 0-4 (0=desc, 1=amount, 2=category, 3=date, 4=notes) + step 5=confirm

const WZ_STEPS = [
  {
    question: 'What did you spend on? 💭',
    bubble:   'Hi! I\'m your expense assistant 🤖 What did you buy or pay for?',
    id:       'desc',
  },
  {
    question: 'How much did it cost? 💰',
    bubble:   'Got it! Now tell me the amount you spent.',
    id:       'amount',
  },
  {
    question: 'Which category fits best? 📂',
    bubble:   'Great! Pick the category that matches your expense.',
    id:       'category',
  },
  {
    question: 'When did this happen? 📅',
    bubble:   'Almost done! When did you make this purchase?',
    id:       'date',
  },
  {
    question: 'Any extra details? (Optional) 📝',
    bubble:   'Want to add a note? Or just tap Skip to finish!',
    id:       'notes',
  },
  {
    question: 'All set — ready to save! ✅',
    bubble:   'Here\'s a summary of your expense. Tap "Add Expense" to save it.',
    id:       'confirm',
  },
];

// Wizard state
let wz = { step: 0, description: '', amount: '', category: '', date: '', notes: '' };

const DESC_SUGGESTIONS  = ['Grocery Shopping','Lunch','Coffee','Petrol','Electricity Bill','Netflix','Medicine','Auto Ride','Restaurant','Rent','Book','Online Shopping'];
const AMOUNT_CHIPS      = [50, 100, 200, 500, 1000, 2000, 5000];

/* ---------- open / close ---------- */
function openWizard() {
  wz = { step: 0, description: '', amount: '', category: '', date: todayISO(), notes: '' };
  document.getElementById('wizardOverlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  renderWizardStep();
}

function closeWizard() {
  document.getElementById('wizardOverlay').classList.add('hidden');
  document.body.style.overflow = '';
}

function todayISO() { return new Date().toISOString().split('T')[0]; }
function daysAgoISO(n) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

/* ---------- progress helpers ---------- */
function updateWzProgress() {
  const total  = WZ_STEPS.length;           // 6 steps (0-5)
  const pct    = Math.round((wz.step / (total - 1)) * 100);
  document.getElementById('wzProgressFill').style.width = pct + '%';
  document.getElementById('wzStepLabel').textContent =
    wz.step < total - 1 ? `Step ${wz.step + 1} of ${total - 1}` : 'Review';

  // dots (only for steps 0-4)
  const dots = document.getElementById('wzDots');
  dots.innerHTML = WZ_STEPS.slice(0, total - 1).map((_, i) =>
    `<span class="wz-dot ${i < wz.step ? 'done' : i === wz.step ? 'active' : ''}"></span>`
  ).join('');
}

function updateWzBubble() {
  const el = document.getElementById('wzBubble');
  if (!el) return;
  el.style.animation = 'none';
  void el.offsetWidth; // reflow
  el.style.animation = '';
  el.textContent = WZ_STEPS[wz.step].bubble;
}

function updateWzQuestion() {
  const el = document.getElementById('wzQuestion');
  if (!el) return;
  el.textContent = WZ_STEPS[wz.step].question;
}

function updateWzButtons() {
  const back = document.getElementById('wzBack');
  const next = document.getElementById('wzNext');
  if (!back || !next) return;

  back.style.display = wz.step === 0 ? 'none' : '';

  if (wz.step === WZ_STEPS.length - 1) {
    next.innerHTML = '<i class="fas fa-check"></i> Add Expense';
    next.style.background = 'linear-gradient(135deg,#10B981,#0891B2)';
  } else {
    next.innerHTML = 'Next <i class="fas fa-chevron-right"></i>';
    next.style.background = '';
  }
}

/* ---------- render each step ---------- */
function renderWizardStep() {
  updateWzProgress();
  updateWzBubble();
  updateWzQuestion();
  updateWzButtons();

  const body = document.getElementById('wzBody');
  body.innerHTML = '';

  // Animate body
  body.style.animation = 'none';
  void body.offsetWidth;
  body.style.animation = 'fadeInUp .3s cubic-bezier(.4,0,.2,1)';

  switch (wz.step) {
    case 0: renderWzDesc(body);     break;
    case 1: renderWzAmount(body);   break;
    case 2: renderWzCategory(body); break;
    case 3: renderWzDate(body);     break;
    case 4: renderWzNotes(body);    break;
    case 5: renderWzConfirm(body);  break;
  }
}

/* Step 0 — Description */
function renderWzDesc(body) {
  body.innerHTML = `
    <div class="wz-input-wrap">
      <input id="wzDescInp" class="wz-main-input" type="text"
             placeholder="e.g. Grocery shopping, Lunch…"
             value="${escHtml(wz.description)}" autocomplete="off" />
    </div>
    <div class="wz-chips" id="wzDescChips">
      ${DESC_SUGGESTIONS.map(s =>
        `<button class="wz-chip ${wz.description===s?'selected':''}" onclick="pickDescChip(this,'${s}')">${s}</button>`
      ).join('')}
    </div>`;

  const inp = document.getElementById('wzDescInp');
  inp.focus();
  inp.addEventListener('input', e => { wz.description = e.target.value; highlightDescChips(); });
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') wizardNext(); });
}

function pickDescChip(btn, val) {
  wz.description = val;
  document.getElementById('wzDescInp').value = val;
  document.querySelectorAll('#wzDescChips .wz-chip').forEach(c => c.classList.remove('selected'));
  btn.classList.add('selected');
}

function highlightDescChips() {
  const v = wz.description.toLowerCase();
  document.querySelectorAll('#wzDescChips .wz-chip').forEach(c => {
    c.classList.toggle('selected', c.textContent.toLowerCase() === v);
  });
}

/* Step 1 — Amount */
function renderWzAmount(body) {
  body.innerHTML = `
    <div class="wz-input-wrap">
      <span class="wz-prefix">${settings.currency}</span>
      <input id="wzAmtInp" class="wz-main-input has-prefix" type="number"
             placeholder="0" min="0" step="1"
             value="${wz.amount}" autocomplete="off" />
    </div>
    <div class="wz-chips">
      ${AMOUNT_CHIPS.map(a =>
        `<button class="wz-chip ${Number(wz.amount)===a?'selected':''}" onclick="pickAmtChip(this,${a})">${settings.currency}${a.toLocaleString('en-IN')}</button>`
      ).join('')}
    </div>`;

  const inp = document.getElementById('wzAmtInp');
  inp.focus();
  inp.addEventListener('input', e => {
    wz.amount = e.target.value;
    document.querySelectorAll('.wz-chip').forEach(c => c.classList.remove('selected'));
    const match = AMOUNT_CHIPS.find(a => a === Number(wz.amount));
    if (match !== undefined)
      document.querySelectorAll('.wz-chip').forEach(c => {
        if (c.textContent.includes(match.toLocaleString('en-IN'))) c.classList.add('selected');
      });
  });
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') wizardNext(); });
}

function pickAmtChip(btn, val) {
  wz.amount = val;
  document.getElementById('wzAmtInp').value = val;
  document.querySelectorAll('.wz-chip').forEach(c => c.classList.remove('selected'));
  btn.classList.add('selected');
}

/* Step 2 — Category */
function renderWzCategory(body) {
  body.innerHTML = `
    <div class="wz-cat-grid">
      ${CATS.map(c => `
        <button class="wz-cat-btn ${wz.category===c.name?'selected':''}"
                onclick="pickCat(this,'${c.name}')"
                style="${wz.category===c.name?`background:${c.color};border-color:${c.color}`:''}">
          <span class="wz-cat-emoji">${c.icon}</span>
          <span class="wz-cat-label">${c.name.replace(' & ','\n& ')}</span>
        </button>`
      ).join('')}
    </div>`;
}

function pickCat(btn, name) {
  wz.category = name;
  const cat = CATS.find(c => c.name === name);
  document.querySelectorAll('.wz-cat-btn').forEach(b => {
    b.classList.remove('selected');
    b.style.background = '';
    b.style.borderColor = '';
    b.querySelector('.wz-cat-label').style.color = '';
  });
  btn.classList.add('selected');
  if (cat) {
    btn.style.background    = cat.color;
    btn.style.borderColor   = cat.color;
    btn.querySelector('.wz-cat-label').style.color = '#fff';
  }
  // auto-advance after small delay
  setTimeout(() => wizardNext(), 320);
}

/* Step 3 — Date */
function renderWzDate(body) {
  const today = todayISO();
  const yest  = daysAgoISO(1);
  const two   = daysAgoISO(2);

  const fmtBtn = ds => {
    const d = new Date(ds + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { day:'numeric', month:'short' });
  };

  body.innerHTML = `
    <div class="wz-date-row">
      <div class="wz-date-quick">
        <button class="wz-date-btn ${wz.date===today?'selected':''}" onclick="pickDate(this,'${today}')">
          <i class="fas fa-calendar-day"></i> Today
        </button>
        <button class="wz-date-btn ${wz.date===yest?'selected':''}" onclick="pickDate(this,'${yest}')">
          <i class="fas fa-history"></i> Yesterday
        </button>
        <button class="wz-date-btn ${wz.date===two?'selected':''}" onclick="pickDate(this,'${two}')">
          <i class="fas fa-clock"></i> 2 days ago
        </button>
      </div>
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:12.5px;color:var(--text3);white-space:nowrap">Or pick a date:</span>
        <input id="wzDateInp" type="date" class="wz-main-input" style="padding:9px 13px;font-size:13px" value="${wz.date}" />
      </div>
    </div>`;

  document.getElementById('wzDateInp').addEventListener('change', e => {
    wz.date = e.target.value;
    document.querySelectorAll('.wz-date-btn').forEach(b => b.classList.remove('selected'));
  });
}

function pickDate(btn, ds) {
  wz.date = ds;
  document.querySelectorAll('.wz-date-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  document.getElementById('wzDateInp').value = ds;
}

/* Step 4 — Notes (optional) */
function renderWzNotes(body) {
  body.innerHTML = `
    <div class="wz-input-wrap">
      <input id="wzNotesInp" class="wz-main-input" type="text"
             placeholder="Add a note… (optional)"
             value="${escHtml(wz.notes)}" autocomplete="off" />
    </div>
    <div class="wz-skip-row">
      <button class="wz-skip-btn" onclick="skipNotes()">Skip this step →</button>
    </div>`;

  const inp = document.getElementById('wzNotesInp');
  inp.focus();
  inp.addEventListener('input', e => { wz.notes = e.target.value; });
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') wizardNext(); });
}

function skipNotes() {
  wz.notes = '';
  wz.step  = 5;
  renderWizardStep();
}

/* Step 5 — Confirm */
function renderWzConfirm(body) {
  const catMeta = CATS.find(c => c.name === wz.category) || {};
  const dateObj = new Date(wz.date + 'T00:00:00');
  const dateStr = dateObj.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'long', year:'numeric' });

  body.innerHTML = `
    <div class="wz-summary">
      <div class="wz-summary-header" style="${catMeta.color?`background:linear-gradient(135deg,${catMeta.color},${catMeta.color}cc)`:''}">
        <div class="wz-summary-title">${escHtml(wz.description)}</div>
        <div class="wz-summary-amount">${fmt(wz.amount)}</div>
      </div>
      <div class="wz-summary-body">
        <div class="wz-sum-row">
          <span class="wz-sum-key"><i class="fas fa-tag"></i> Category</span>
          <span class="wz-sum-val">${catMeta.icon || ''} ${wz.category}</span>
        </div>
        <div class="wz-sum-row">
          <span class="wz-sum-key"><i class="fas fa-calendar"></i> Date</span>
          <span class="wz-sum-val">${dateStr}</span>
        </div>
        ${wz.notes ? `
        <div class="wz-sum-row">
          <span class="wz-sum-key"><i class="fas fa-sticky-note"></i> Notes</span>
          <span class="wz-sum-val">${escHtml(wz.notes)}</span>
        </div>` : ''}
      </div>
    </div>`;
}

/* ---------- nav ---------- */
function wizardNext() {
  if (wz.step === 0) {
    if (!wz.description.trim()) {
      shakeFocus('wzDescInp'); return;
    }
  }
  if (wz.step === 1) {
    const v = parseFloat(wz.amount);
    if (!v || v <= 0) { shakeFocus('wzAmtInp'); return; }
    wz.amount = v;
  }
  if (wz.step === 2) {
    if (!wz.category) { showToast('Pick a category', 'Tap one of the category cards.', 'warning'); return; }
  }
  if (wz.step === 3) {
    if (!wz.date) { wz.date = todayISO(); }
  }
  if (wz.step === 4) {
    const notesEl = document.getElementById('wzNotesInp');
    if (notesEl) wz.notes = notesEl.value.trim();
  }

  if (wz.step === WZ_STEPS.length - 1) {
    // Submit
    commitWizardExpense();
    return;
  }

  wz.step++;
  renderWizardStep();
}

function wizardBack() {
  if (wz.step === 0) { closeWizard(); return; }
  wz.step--;
  renderWizardStep();
}

function commitWizardExpense() {
  expenses.push({
    id:          uid(),
    description: wz.description.trim(),
    amount:      Number(wz.amount),
    category:    wz.category,
    date:        wz.date,
    notes:       wz.notes,
  });
  save();
  closeWizard();
  showToast('Expense Added! 🎉', `${wz.description} · ${fmt(wz.amount)}`, 'success');
  // Refresh current page
  refreshPage(activePage);
  updateInsightsBadge();
}

/* ---------- helpers ---------- */
function shakeFocus(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.focus();
  el.style.borderColor = '#EF4444';
  el.style.boxShadow   = '0 0 0 4px rgba(239,68,68,.2)';
  setTimeout(() => { el.style.borderColor = ''; el.style.boxShadow = ''; }, 1200);
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Close wizard on overlay click
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('wizardOverlay')?.addEventListener('click', e => {
    if (e.target === document.getElementById('wizardOverlay')) closeWizard();
  });
  // Global keyboard shortcut: press 'N' to open wizard
  document.addEventListener('keydown', e => {
    if ((e.key === 'n' || e.key === 'N') && !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) {
      openWizard();
    }
    if (e.key === 'Escape') closeWizard();
  });
});

/* =====================================================
   AUTH & SESSION SYSTEM
   ===================================================== */
window.logoutSession = function() {
  if (!confirm("Are you sure you want to log out? This will completely clear your profile for a fresh start.")) return;
  
  // 1. Wipe local storage
  localStorage.removeItem('fortuneflow_expenses');
  localStorage.removeItem('fortuneflow_settings');
  localStorage.removeItem('fortuneflow_budgets');
  
  // 2. Reset memory state
  expenses = [];
  settings = { currency: '₹', theme: 'light', onboarded: false };
  budgets = {};
  totalBudget = 0;
  
  // 3. Clean up UI
  if (caOpen) toggleCAPanel();
  document.getElementById('sidebar').classList.add('collapsed');
  
  // 4. Restart Experience
  showOnboarding();
  showToast('Logged Out', 'Profile cleared. Ready for a fresh start!', 'info');
};

/* =====================================================
   EXCEL & CSV DATA IMPORT SYSTEM
   ===================================================== */
window.handleExcelUpload = function(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const data = new Uint8Array(evt.target.result);
      // Read Excel/CSV using SheetJS
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // Convert to JSON
      const rows = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: "" });
      
      if (rows.length === 0) {
        showToast('Empty File', 'We could not find any data in your sheet.', 'warning');
        return;
      }

      let importCount = 0;
      let totalAmount = 0;

      rows.forEach(row => {
        // Smart Column Matcher
        let rawDate = row['Date'] || row['date'] || row['Date/Time'] || row['Transaction Date'] || row['Time'] || '';
        let rawAmt = row['Amount'] || row['amount'] || row['Paid'] || row['Price'] || row['Value'] || row['Expense'] || '';
        let rawDesc = row['Description'] || row['description'] || row['Name'] || row['Details'] || row['Title'] || row['Merchant'] || 'Imported Expense';
        let rawCat = row['Category'] || row['category'] || row['Type'] || 'Others';

        if (!rawAmt) return; // Skip if no amount

        // Format Amount
        let numericAmt = parseFloat(String(rawAmt).replace(/[^\d.-]/g, ''));
        if (isNaN(numericAmt) || numericAmt <= 0) return;

        // Format Date
        let cleanDate = new Date(); // default to today if parsing fails
        if (rawDate) {
          const pd = new Date(rawDate);
          if (!isNaN(pd.getTime())) cleanDate = pd;
        }
        const yyyy = cleanDate.getFullYear();
        const mm = String(cleanDate.getMonth() + 1).padStart(2, '0');
        const dd = String(cleanDate.getDate()).padStart(2, '0');
        const isoDate = `${yyyy}-${mm}-${dd}`;

        // Format Category
        let matchedCat = 'Others';
        const searchCatStr = String(rawCat).toLowerCase();
        
        const coreCats = ['Food & Dining', 'Transportation', 'Shopping', 'Bills & Utilities', 'Entertainment', 'Healthcare', 'Education', 'Others'];
        const foundCore = coreCats.find(c => searchCatStr.includes(c.toLowerCase()) || c.toLowerCase().includes(searchCatStr));
        if (foundCore) {
          matchedCat = foundCore;
        } else {
          // Broad AI-like fallback matching
          if (searchCatStr.includes('eat') || searchCatStr.includes('rest') || searchCatStr.includes('food') || searchCatStr.includes('grocery') || searchCatStr.includes('swiggy') || searchCatStr.includes('zomato')) matchedCat = 'Food & Dining';
          else if (searchCatStr.includes('gas') || searchCatStr.includes('uber') || searchCatStr.includes('transit') || searchCatStr.includes('flight') || searchCatStr.includes('train')) matchedCat = 'Transportation';
          else if (searchCatStr.includes('movie') || searchCatStr.includes('game') || searchCatStr.includes('sub') || searchCatStr.includes('netflix')) matchedCat = 'Entertainment';
          else if (searchCatStr.includes('med') || searchCatStr.includes('doctor') || searchCatStr.includes('pharm')) matchedCat = 'Healthcare';
          else if (searchCatStr.includes('cloth') || searchCatStr.includes('amazon') || searchCatStr.includes('myntra')) matchedCat = 'Shopping';
          else if (searchCatStr.includes('elec') || searchCatStr.includes('water') || searchCatStr.includes('wifi') || searchCatStr.includes('bill')) matchedCat = 'Bills & Utilities';
          else matchedCat = 'Others';
        }

        // Add to expenses
        expenses.push({
          id: Date.now() + Math.random().toString(36).substr(2, 9),
          date: isoDate,
          amount: numericAmt,
          category: matchedCat,
          description: String(rawDesc).trim().substring(0, 50)
        });

        importCount++;
        totalAmount += numericAmt;
      });

      if (importCount > 0) {
        // Sort expenses chronologically (newest first)
        expenses.sort((a,b) => new Date(b.date) - new Date(a.date));
        
        save();
        updateUserDisplay();
        
        // Let Aria gracefully announce it via UI notification
        if (typeof showCaNotif === 'function') {
           showCaNotif(`✅ I analyzed your Excel file! Successfully imported ${importCount} transactions totaling ₹${Math.round(totalAmount).toLocaleString('en-IN')}. Charts are updated!`, 'success');
        } else {
           showToast('Import Successful', `Added ${importCount} expenses.`, 'success');
        }
        
        // Jump to dashboard automatically
        document.getElementById('nav-dashboard').click();
      } else {
        showToast('No Data Matched', 'Could not find readable Date and Amount columns in Excel file.', 'danger');
      }
      
      // Reset input so it can be used again
      document.getElementById('excelUpload').value = '';

    } catch (err) {
      console.error(err);
      showToast('Error', 'Failed to read the file. Ensure it is a valid .xlsx or .csv', 'danger');
      document.getElementById('excelUpload').value = '';
    }
  };
  reader.readAsArrayBuffer(file);
};

/* =====================================================
   app.js - FortuneFlow Core Logic
===================================================== */

const CATS = [
  { name: 'Food & Dining', color: '#10B981', icon: '🍽️' },
  { name: 'Transportation', color: '#3B82F6', icon: '🚗' },
  { name: 'Entertainment', color: '#8B5CF6', icon: '🎮' },
  { name: 'Shopping', color: '#EC4899', icon: '🛍️' },
  { name: 'Bills & Utilities', color: '#F59E0B', icon: '💡' },
  { name: 'Healthcare', color: '#EF4444', icon: '🏥' },
  { name: 'Education', color: '#06B6D4', icon: '📚' },
  { name: 'Others', color: '#9CA3AF', icon: '📦' }
];

let expenses = JSON.parse(localStorage.getItem('ff_expenses')) || [];
let totalBudget = Number(localStorage.getItem('ff_total_budget')) || 0;
let catBudgets = JSON.parse(localStorage.getItem('ff_cat_budgets')) || {};
let userProfile = JSON.parse(localStorage.getItem('ff_profile')) || { name: 'User', currency: '₹', salary: 0, saveGoal: 0, setupComplete: false };

function fmt(n) {
  const map = { '₹': 'INR', '$': 'USD', '€': 'EUR', '£': 'GBP' };
  const code = map[userProfile.currency] || 'INR';
  const locale = code === 'INR' ? 'en-IN' : 'en-US';
  return new Intl.NumberFormat(locale, { style: 'currency', currency: code }).format(n);
}
function monthKey(d) { return d.substring(0,7); }
function currentMonthKey() { return new Date().toISOString().substring(0,7); }

function saveLocal() {
  localStorage.setItem('ff_expenses', JSON.stringify(expenses));
}

// ==== APP INIT ====
function initApp() {
  document.getElementById('sidebarName').textContent = userProfile.name;
  document.getElementById('topbarName').textContent = userProfile.name;
  document.getElementById('settingsName').value = userProfile.name;
  document.getElementById('settingsCurrency').value = userProfile.currency || '₹';
  
  if (localStorage.getItem('ff_theme') === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.getElementById('darkModeChk').checked = true;
    document.getElementById('themeIcon').className = 'fas fa-sun';
  }

  // Setup navigation
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.addEventListener('click', (e) => navigate(e.currentTarget.getAttribute('data-page')));
  });

  document.getElementById('hamburger').addEventListener('click', () => {
    document.querySelector('.app-wrapper').classList.toggle('collapsed');
  });
  document.getElementById('collapseBtn').addEventListener('click', () => {
    document.querySelector('.app-wrapper').classList.toggle('collapsed');
  });
  
  // Close the profile dropdown if clicked outside
  window.addEventListener('click', () => {
    const pd = document.getElementById('profileDropdown');
    if (pd && !pd.classList.contains('hidden')) pd.classList.add('hidden');
  });

  renderDashboard();
  renderExpensesForm();
  updateInsightsBadge();
  initScore();
}

function toggleProfileDropdown() {
  const pd = document.getElementById('profileDropdown');
  if (pd) pd.classList.toggle('hidden');
}

// ==== NAVIGATION ====
function navigate(pageId) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const btn = document.querySelector(`.nav-item[data-page="${pageId}"]`);
  if (btn) btn.classList.add('active');

  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  document.getElementById(`page-${pageId}`).classList.add('active');

  const titles = {
    'dashboard': {t: 'Dashboard', s: 'Complete overview of your finances'},
    'expenses': {t: 'Expenses', s: 'Track and manage your spending'},
    'analysis': {t: 'Analysis', s: 'Visual breakdown of your habits'},
    'prediction': {t: 'Prediction', s: 'AI-driven spending forecast'},
    'budget': {t: 'Budget Planning', s: 'Set goals and monitor limits'},
    'insights': {t: 'Smart Insights', s: 'Personalized financial advice'},
    'settings': {t: 'Settings', s: 'Manage your profile and data'},
    'urlsafety': {t: 'URL Safety', s: 'Verify financial links before paying'}
  };
  
  document.getElementById('pageTitle').textContent = titles[pageId].t;
  document.getElementById('pageSub').textContent = titles[pageId].s;

  if (pageId === 'dashboard') renderDashboard();
  if (pageId === 'expenses') renderExpenses();
  if (pageId === 'analysis') renderAnalysis();
  if (pageId === 'prediction') renderPrediction();
  if (pageId === 'budget') renderBudget();
  if (pageId === 'insights') { renderInsights(); renderScore(); }
}

// ==== UTILS & TOASTS ====
function showToast(msg, type='info') {
  const stack = document.getElementById('toastStack');
  const d = document.createElement('div');
  d.className = `toast ${type}`;
  let ic = 'fa-info-circle';
  if (type === 'success') ic = 'fa-check-circle';
  if (type === 'error') ic = 'fa-times-circle';
  if (type === 'warning') ic = 'fa-exclamation-triangle';
  
  d.innerHTML = `<i class="fas ${ic}"></i> <span>${msg}</span>`;
  stack.appendChild(d);
  setTimeout(() => { d.style.animation = 'fadeOut 0.3s ease forwards'; setTimeout(() => d.remove(), 300); }, 3000);
}

// Theme
function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const chk = document.getElementById('darkModeChk');
  if (isDark) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('ff_theme', 'light');
    document.getElementById('themeIcon').className = 'fas fa-moon';
    if (chk) chk.checked = false;
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('ff_theme', 'dark');
    document.getElementById('themeIcon').className = 'fas fa-sun';
    if (chk) chk.checked = true;
  }
}

// ==== DASHBOARD ====
function renderDashboard() {
  const cmk = currentMonthKey();
  const currentExps = expenses.filter(e => monthKey(e.date) === cmk);
  const total = currentExps.reduce((s,e) => s + Number(e.amount), 0);
  
  document.getElementById('statTotal').textContent = fmt(total);
  
  if (totalBudget > 0) {
    const remain = totalBudget - total;
    const pct = Math.min(100, Math.round(total / totalBudget * 100));
    document.getElementById('statBudget').textContent = fmt(Math.max(0, remain));
    document.getElementById('statBudgetChange').innerHTML = `<i class="fas fa-chart-pie"></i> ${pct}% utilized`;
  }

  const cats = getCatTotals();
  const topCat = Object.entries(cats).sort((a,b) => b[1]-a[1])[0];
  if (topCat) {
    document.getElementById('statTopCat').textContent = topCat[0];
    document.getElementById('statTopCatAmt').innerHTML = `<i class="fas fa-tag"></i> ${fmt(topCat[1])} spent`;
  }

  const fc = forecast();
  document.getElementById('statForecast').textContent = fmt(fc);

  // Recent Table
  const tbody = document.getElementById('recentBody');
  const recent = [...expenses].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  if (recent.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fas fa-inbox"></i><p>No expenses yet.</p></div></td></tr>`;
  } else {
    tbody.innerHTML = recent.map(e => {
      const c = CATS.find(x => x.name === e.category) || CATS[7];
      return `<tr>
        <td><strong>${e.description}</strong></td>
        <td><span class="qp-chip" style="display:inline-flex; border-color:${c.color}; color:${c.color}"><i class="${c.icon} fa-fw"></i> ${e.category}</span></td>
        <td><span style="color:var(--text3);font-size:12px">${e.date}</span></td>
        <td style="font-weight:700">${fmt(e.amount)}</td>
        <td><span style="color:var(--success); font-weight:700; font-size:12px">Processed</span></td>
      </tr>`;
    }).join('');
  }

  updateBarChart();
  updateDoughnutChart();
}

// ==== EXPENSES MANAGEMENT ====
function renderExpensesForm() {
  document.getElementById('expDate').value = new Date().toISOString().split('T')[0];
  populateMonthFilter();
}

function toggleForm() {
  const wrap = document.getElementById('expenseFormWrap');
  if(wrap.style.display === 'none' || wrap.classList.contains('hidden')) {
    wrap.style.display = 'block'; wrap.classList.remove('hidden');
  } else {
    wrap.style.display = 'none'; wrap.classList.add('hidden');
  }
}

function addExpense() {
  const desc = document.getElementById('expDesc').value.trim();
  const amt = document.getElementById('expAmount').value.trim();
  const cat = document.getElementById('expCategory').value;
  const date = document.getElementById('expDate').value;
  const notes = document.getElementById('expNotes').value.trim();

  if(!desc || !amt || isNaN(amt) || !cat || !date) { showToast('Please fill all required fields correctly.', 'error'); return; }

  expenses.push({ id: Date.now().toString(), description: desc, amount: Number(amt), category: cat, date, notes });
  saveLocal();
  showToast('Expense added successfully!', 'success');
  
  clearExpenseForm();
  renderExpenses();
  checkBudgetWarning(cat, Number(amt));
}

function saveDynamicExpense(data) {
  expenses.push({ id: Date.now().toString(), description: data.desc, amount: Number(data.amount), category: data.cat, date: data.date, notes: data.notes });
  saveLocal();
  showToast('Expense added via Wizard!', 'success');
  renderDashboard();
  checkBudgetWarning(data.cat, Number(data.amount));
}

function checkBudgetWarning(catName, amt) {
  if (totalBudget > 0) {
    const total = expenses.filter(e => monthKey(e.date) === currentMonthKey()).reduce((s,e)=>s+Number(e.amount),0);
    if (total > totalBudget) {
      setTimeout(() => showToast(`⚠️ Budget exceeded! You are ${fmt(total - totalBudget)} over your ${fmt(totalBudget)} limit.`, 'warning'), 500);
    } else if (total > totalBudget * 0.85) {
      setTimeout(() => showToast(`Budget alert: You have used ${Math.round(total/totalBudget*100)}% of your monthly budget.`, 'warning'), 500);
    }
  }
}

function clearExpenseForm() {
  document.getElementById('expDesc').value = '';
  document.getElementById('expAmount').value = '';
  document.getElementById('expCategory').value = '';
  document.getElementById('expNotes').value = '';
}

function populateMonthFilter() {
  const sel = document.getElementById('monthFilter');
  const m = [...new Set(expenses.map(e => monthKey(e.date)))].sort().reverse();
  sel.innerHTML = `<option value="">All Months</option>` + m.map(x => `<option value="${x}">${x}</option>`).join('');
}

function filterExpenses() {
  const s = document.getElementById('expSearch').value.toLowerCase();
  const c = document.getElementById('catFilter').value;
  const m = document.getElementById('monthFilter').value;
  
  let f = expenses.filter(e => {
    return (!s || e.description.toLowerCase().includes(s)) &&
           (!c || e.category === c) &&
           (!m || monthKey(e.date) === m);
  });
  
  f.sort((a,b) => new Date(b.date) - new Date(a.date));
  renderExpenseTable(f);
}

function renderExpenseTable(list) {
  const tbody = document.getElementById('expTableBody');
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><p>No expenses found.</p></div></td></tr>`;
    document.getElementById('expCount').textContent = `0 expenses`;
    document.getElementById('expTotal').textContent = `Total: ₹0`;
    return;
  }
  
  tbody.innerHTML = list.map(e => `
    <tr>
      <td><strong>${e.description}</strong></td>
      <td>${e.category}</td>
      <td>${e.date}</td>
      <td style="font-weight:700">${fmt(e.amount)}</td>
      <td style="font-size:12px;color:var(--text3)">${e.notes ? e.notes : '-'}</td>
      <td><button class="btn btn-ghost btn-sm" onclick="delExpense('${e.id}')"><i class="fas fa-trash"></i></button></td>
    </tr>
  `).join('');
  
  document.getElementById('expCount').textContent = `${list.length} expenses`;
  document.getElementById('expTotal').textContent = `Total: ${fmt(list.reduce((s,e)=>s+e.amount,0))}`;
}

function renderExpenses() { populateMonthFilter(); filterExpenses(); }

function delExpense(id) {
  openModal('Delete Expense', 'Are you sure you want to delete this expense? This cannot be undone.', () => {
    expenses = expenses.filter(e => e.id !== id);
    saveLocal(); showToast('Expense deleted.', 'success'); filterExpenses(); renderDashboard();
  });
}

// ==== ANALYSIS ====
let chBar, chDoughnut, chLine, chPred;

function getCatTotals(filterMonth = currentMonthKey()) {
  const d = {};
  expenses.filter(e => (!filterMonth || monthKey(e.date) === filterMonth)).forEach(e => {
    d[e.category] = (d[e.category] || 0) + e.amount;
  });
  return d;
}

function updateBarChart() {
  const ctx = document.getElementById('barChart');
  if (!ctx) return;
  const limit = parseInt(document.getElementById('barMonthRange')?.value || 6);
  
  const m = [...new Set(expenses.map(e => monthKey(e.date)))].sort().slice(-limit);
  const data = m.map(mon => expenses.filter(e => monthKey(e.date)===mon).reduce((s,e)=>s+e.amount,0));
  
  if(chBar) chBar.destroy();
  chBar = new Chart(ctx, {
    type: 'bar',
    data: { labels: m, datasets: [{ label: 'Spent', data, backgroundColor: 'rgba(124,58,237,0.8)', borderRadius: 6 }] },
    options: { maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
  });
}

function updateDoughnutChart() {
  const ctx = document.getElementById('doughnutChart');
  if(!ctx) return;
  const cats = getCatTotals();
  if(chDoughnut) chDoughnut.destroy();
  
  document.getElementById('catMonthLabel').textContent = currentMonthKey();
  
  chDoughnut = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: Object.keys(cats),
      datasets: [{ data: Object.values(cats), backgroundColor: CATS.map(c => c.color), borderWidth: 2, borderColor: 'var(--surface)' }]
    },
    options: { maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'right', labels: { color: 'var(--text2)' } } } }
  });
}

function renderAnalysis() {
  const m = [...new Set(expenses.map(e => monthKey(e.date)))].sort().reverse();
  const sel = document.getElementById('trendMonthSel');
  sel.innerHTML = m.length ? m.map(x => `<option value="${x}">${x}</option>`).join('') : '<option>No data</option>';
  updateLineChart();

  const cats = getCatTotals(m[0] || null);
  const grid = document.getElementById('categoryGrid');
  grid.innerHTML = Object.keys(cats).map(catName => {
    const c = CATS.find(x => x.name === catName) || CATS[7];
    const val = cats[catName];
    const budg = catBudgets[catName] || 0;
    const pct = budg > 0 ? Math.min(100, (val/budg)*100) : 0;
    return `
      <div class="cat-card">
        <div class="cat-card-header">
          <div class="cat-icon-name"><div class="cb-icon" style="background:${c.color}">${c.icon}</div> ${catName}</div>
        </div>
        <div class="cat-card-amt">${fmt(val)}</div>
        ${budg > 0 ? `
          <div style="font-size:11px;color:var(--text3);display:flex;justify-content:space-between"><span>${pct.toFixed(0)}% used</span><span>Limit: ${fmt(budg)}</span></div>
          <div class="prog-track"><div class="prog-fill" style="width:${pct}%; background:${pct>90?'var(--danger)':c.color}"></div></div>
        ` : ''}
      </div>`;
  }).join('');
}

function updateLineChart() {
  const ctx = document.getElementById('lineChart');
  if(!ctx) return;
  const mon = document.getElementById('trendMonthSel').value;
  if (!mon) return;
  
  const days = {};
  expenses.filter(e => monthKey(e.date) === mon).forEach(e => {
    const d = e.date.split('-')[2];
    days[d] = (days[d] || 0) + e.amount;
  });
  
  const lbls = Object.keys(days).sort();
  const dts = lbls.map(k => days[k]);
  
  if(chLine) chLine.destroy();
  chLine = new Chart(ctx, {
    type: 'line',
    data: { labels: lbls, datasets: [{ label: 'Daily Exps', data: dts, borderColor: '#EC4899', backgroundColor: 'rgba(236,72,153,0.1)', fill: true, tension: 0.4 }] },
    options: { maintainAspectRatio: false }
  });
}

// ==== PREDICTION ====
function forecast() {
  if (expenses.length < 5) return 0;
  const totals = {};
  expenses.forEach(e => { const mk = monthKey(e.date); totals[mk] = (totals[mk]||0) + e.amount; });
  const vals = Object.values(totals);
  if (vals.length === 0) return 0;
  return vals.reduce((a,b)=>a+b,0) / vals.length;
}

function renderPrediction() {
  const fc = forecast();
  document.getElementById('predBigVal').textContent = fmt(fc);

  const exp = expenses.filter(e => monthKey(e.date) === currentMonthKey());
  document.getElementById('predNote').textContent = exp.length < 3
    ? 'Add more expenses to improve prediction accuracy.'
    : `Based on ${expenses.length} transactions across your history.`;

  // Category forecasts
  const cats = getCatTotals();
  const grid = document.getElementById('predCatGrid');
  if (grid) {
    if (!Object.keys(cats).length) {
      grid.innerHTML = `<p style="color:var(--text3);font-size:13px">No data available.</p>`;
    } else {
      grid.innerHTML = CATS.map(c => {
        const total = cats[c.name] || 0;
        const months = new Set(expenses.map(e => monthKey(e.date))).size || 1;
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

  // Future saving predictions
  const fsBox = document.getElementById('futureSavingsBox');
  if (fsBox) {
    if (fc > 0) {
      const topCatName = Object.entries(cats).sort((a,b) => b[1]-a[1])[0]?.[0] || 'Food & Dining';
      const tricks = [
         "Cook 4 meals at home instead of ordering out to save ₹2k–₹4k.",
         "Cancel one unused subscription (e.g. Netflix, Gym) to instantly save ₹500–₹1.5k.",
         "Use the cash envelope method for your 'Wants' category to strictly avoid overspending.",
         "Plan your next month's grocery list in advance and buy in bulk to save ~15%.",
         "If you are going out, eat a small meal at home first to easily cut your restaurant bill in half.",
         "Unsubscribe from promotional emails so you aren't tempted by flash sales next month.",
         "Hold off on any non-essential purchase above ₹3,000 for 30 days to avoid impulse buys."
      ];
      const sortedTricks = tricks.sort(() => 0.5 - Math.random()).slice(0, 2);

      fsBox.innerHTML = `
        <div class="insight-card success" style="margin-top:0;">
          <div class="insight-ic"><i class="fas fa-piggy-bank"></i></div>
          <div class="insight-body">
            <h4>Target: Save ₹${Math.round(fc * 0.2).toLocaleString('en-IN')} Next Month</h4>
            <p>Based on your forecast of ${fmt(fc)}, if you cut down your <strong>${topCatName}</strong> expenses by 20%, you can easily hit this savings goal!</p>
          </div>
        </div>
        <div class="insight-card info" style="margin-top:12px;">
          <div class="insight-ic"><i class="fas fa-magic"></i></div>
          <div class="insight-body">
            <h4>Upcoming Month Trick #1</h4>
            <p>${sortedTricks[0]}</p>
          </div>
        </div>
        <div class="insight-card info" style="margin-top:12px;">
          <div class="insight-ic"><i class="fas fa-magic"></i></div>
          <div class="insight-body">
            <h4>Upcoming Month Trick #2</h4>
            <p>${sortedTricks[1]}</p>
          </div>
        </div>`;
    } else {
      fsBox.innerHTML = `<p style="color:var(--text3);font-size:13px;padding:8px 0;">Not enough data to calculate future savings yet. Add more expenses!</p>`;
    }
  }

  updatePredChart();
}

function updatePredChart() {
  const ctx = document.getElementById('predChart');
  if(!ctx) return;
  const mk = currentMonthKey();
  let base = forecast() || 5000;
  
  if(chPred) chPred.destroy();
  chPred = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Next Month', 'In 2 Months', 'In 3 Months'],
      datasets: [{ label: 'Predicted Exps', data: [base*1.02, base*1.04, base*1.07], backgroundColor: 'rgba(16, 185, 129, 0.8)' }]
    },
    options: { maintainAspectRatio: false }
  });
}

// ==== BUDGET ====
function renderBudget() {
  document.getElementById('totalBudgetInp').value = totalBudget || '';
  const cmk     = currentMonthKey();
  const spent   = expenses.filter(e => monthKey(e.date) === cmk).reduce((s,e) => s + Number(e.amount), 0);
  const remain  = totalBudget - spent;
  const pct     = totalBudget > 0 ? Math.min(100, Math.round(spent/totalBudget*100)) : 0;
  const circ    = 2 * Math.PI * 50; // ~314.16

  document.getElementById('healthPct').textContent = pct + '%';
  document.getElementById('hmTotal').textContent   = fmt(totalBudget);
  document.getElementById('hmSpent').textContent   = fmt(spent);
  document.getElementById('hmRemain').textContent  = fmt(Math.max(0, remain));

  const ring = document.getElementById('healthRingFill');
  // Fix: set dasharray correctly so stroke is visible, then offset controls fill amount
  ring.setAttribute('stroke-dasharray', `${circ} ${circ}`);
  ring.style.strokeDashoffset = circ - (pct / 100) * circ;
  ring.style.stroke = pct > 90 ? 'var(--danger)' : pct > 75 ? 'var(--warning)' : 'var(--success)';
  ring.style.transition = 'stroke-dashoffset 0.6s ease, stroke 0.3s ease';

  const list = document.getElementById('catBudgetList');
  list.innerHTML = CATS.map(c => `
    <div class="form-group" style="flex-direction:row;align-items:center;justify-content:space-between;gap:12px">
      <label class="form-label" style="width:160px;flex-shrink:0">${c.icon} ${c.name}</label>
      <input type="number" class="form-input" style="flex:1" id="cb_${c.name}" value="${catBudgets[c.name]||""}" placeholder="Budget limit..." />
    </div>
  `).join('');
}

function saveTotalBudget() {
  const v = document.getElementById('totalBudgetInp').value;
  totalBudget = Number(v);
  localStorage.setItem('ff_total_budget', totalBudget);
  showToast('Total budget saved!', 'success');
  renderBudget();
}

function saveCatBudgets() {
  CATS.forEach(c => {
    const v = document.getElementById(`cb_${c.name}`).value;
    if(v) catBudgets[c.name] = Number(v);
    else delete catBudgets[c.name];
  });
  localStorage.setItem('ff_cat_budgets', JSON.stringify(catBudgets));
  showToast('Category budgets saved!', 'success');
  renderBudget();
}

// ==== INSIGHTS ====
function renderScore() {
  let score = 50;
  if (expenses.length > 5) score += 10;
  if (totalBudget > 0) {
    const spent = expenses.filter(e => monthKey(e.date) === currentMonthKey()).reduce((s,e) => s + Number(e.amount), 0);
    if (spent < totalBudget) score += 20;
    else score -= 20;
  }
  const fc = forecast();
  if (fc > 0 && totalBudget > fc) score += 20;
  if (expenses.length > 20) score += 5;
  const finalScore = Math.min(100, Math.max(0, score));

  const circle = document.getElementById('scoreCircle');
  const num = document.getElementById('scoreNum');
  const label = document.getElementById('scoreLabel');
  const desc = document.getElementById('scoreDesc');
  if (!num) return;
  num.textContent = finalScore;
  if (finalScore >= 80) {
    label.textContent = 'Excellent 🎉'; circle.style.background = 'linear-gradient(135deg, #10B981, #059669)';
    desc.textContent = 'Great job! You are managing your finances exceptionally well.';
  } else if (finalScore >= 60) {
    label.textContent = 'Good 👍'; circle.style.background = 'linear-gradient(135deg, #3B82F6, #2563EB)';
    desc.textContent = 'Your finances are in decent shape. Keep tracking to improve!';
  } else if (finalScore >= 40) {
    label.textContent = 'Fair ⚠️'; circle.style.background = 'linear-gradient(135deg, #F59E0B, #D97706)';
    desc.textContent = 'There is room for improvement. Set a budget and track expenses regularly.';
  } else {
    label.textContent = 'Needs Work 🔴'; circle.style.background = 'linear-gradient(135deg, #EF4444, #DC2626)';
    desc.textContent = 'Your spending needs attention. Try setting a budget and checking insights.';
  }
}
function initScore() { renderScore(); }

function renderInsights() {
  const grid = document.getElementById('insightsGrid');
  const cmk = currentMonthKey();
  const spent = expenses.filter(e => monthKey(e.date) === cmk).reduce((s,e) => s+e.amount, 0);
  let html = '';

  if (totalBudget > 0 && spent > totalBudget) {
    html += `<div class="insight-card danger"><div class="insight-ic"><i class="fas fa-exclamation-circle"></i></div><div class="insight-body"><h4>Budget Exceeded</h4><p>You have exceeded your total budget by ${fmt(spent - totalBudget)}. Try reducing non-essential expenses for the rest of the month.</p></div></div>`;
  }
  const topCat = Object.entries(getCatTotals(cmk)).sort((a,b)=>b[1]-a[1])[0];
  if(topCat && topCat[1] > (totalBudget * 0.4)) {
    html += `<div class="insight-card warning"><div class="insight-ic"><i class="fas fa-fire"></i></div><div class="insight-body"><h4>High Spending in ${topCat[0]}</h4><p>Over 40% of your budget is going to this category. Review your subscriptions and impulse buys.</p></div></div>`;
  }
  
  if (!html) html = `<div class="insight-card success"><div class="insight-ic"><i class="fas fa-check"></i></div><div class="insight-body"><h4>Looking Good!</h4><p>Your finances are perfectly balanced this month.</p></div></div>`;
  grid.innerHTML = html;
}

// ==== EXCEL IMPORT (Fuzzy Matching) ====
function handleExcelUpload(e) {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, {type: 'array'});
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet);
      
      let imported = 0;
      rows.forEach(row => {
        let rawDate = row['Date'] || row['date'] || row['Date/Time'] || row['Transaction Date'] || row['Time'] || '';
        let rawAmt = row['Amount'] || row['amount'] || row['Paid'] || row['Price'] || row['Value'] || row['Expense'] || '';
        let rawDesc = row['Description'] || row['description'] || row['Name'] || row['Details'] || row['Title'] || row['Merchant'] || 'Imported Expense';
        let rawCat = row['Category'] || row['category'] || row['Type'] || 'Others';

        if (!rawAmt) {
          for (let key in row) {
            let k = key.toLowerCase();
            if(!rawAmt && (k.includes('amount') || k.includes('cost') || k.includes('debit') || k.includes('withdrawal') || k.includes('paid') || k.includes('value'))) rawAmt = row[key];
            if(!rawDate && (k.includes('date') || k.includes('time') || k.includes('day'))) rawDate = row[key];
            if((!rawDesc || rawDesc === 'Imported Expense') && (k.includes('desc') || k.includes('particulars') || k.includes('narration') || k.includes('detail') || k.includes('name'))) rawDesc = row[key];
            if(rawCat === 'Others' && (k.includes('cat') || k.includes('type'))) rawCat = row[key];
          }
        }

        if (!rawAmt) return;

        let numericAmt = parseFloat(String(rawAmt).replace(/[^\d.-]/g, ''));
        if(isNaN(numericAmt) || numericAmt <= 0) return;
        
        // Date parse fallback
        let isoDate = new Date().toISOString().split('T')[0];
        if (rawDate) {
           let parsed = new Date(rawDate);
           if (!isNaN(parsed.valueOf())) isoDate = parsed.toISOString().split('T')[0];
        }

        expenses.push({ id: Date.now().toString() + Math.random().toString().slice(2,5), description: rawDesc, amount: numericAmt, category: rawCat, date: isoDate, notes: 'Imported via Excel' });
        imported++;
      });

      if (imported > 0) {
        saveLocal(); renderDashboard(); showToast(`Imported ${imported} expenses successfully!`, 'success');
      } else { showToast('No matching expense data found in the file.', 'warning'); }
    } catch (err) {
      console.error(err);
      showToast('Error parsing file.', 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

function exportData() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(expenses));
  const el = document.createElement('a'); 
  el.setAttribute("href", dataStr); el.setAttribute("download", "fortuneflow_backup.json");
  document.body.appendChild(el); el.click(); el.remove();
}

function confirmReset() {
  openModal(
    '⚠️ Reset All Data',
    'This will permanently delete ALL expenses, budgets, and settings. This cannot be undone!',
    () => {
      expenses = []; totalBudget = 0; catBudgets = {};
      localStorage.removeItem('ff_expenses');
      localStorage.removeItem('ff_total_budget');
      localStorage.removeItem('ff_cat_budgets');
      localStorage.removeItem('ff_profile');
      showToast('All data has been reset.', 'success');
      setTimeout(() => window.location.reload(), 1500);
    }
  );
}

function openModal(title, msg, onConfirm) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalMsg').textContent = msg;
  const okBtn = document.getElementById('modalOkBtn');
  okBtn.onclick = () => { closeModal(); onConfirm(); };
  document.getElementById('modalOverlay').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
}

// ==== SETTINGS ====
function saveSettings() {
  const n = document.getElementById('settingsName').value.trim();
  const c = document.getElementById('settingsCurrency').value;
  if(n) userProfile.name = n;
  userProfile.currency = c;
  localStorage.setItem('ff_profile', JSON.stringify(userProfile));
  
  document.getElementById('sidebarName').textContent = userProfile.name;
  document.getElementById('topbarName').textContent = userProfile.name;
  showToast('Profile saved!', 'success');
  renderDashboard();
}

// URL Safety
function checkURL() {
  const btn = document.querySelector('#page-urlsafety button');
  const box = document.getElementById('urlResultBox');
  const inp = document.getElementById('urlInput').value.trim();
  
  if(!inp) { showToast('Please enter a URL.', 'error'); return; }
  
  btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Checking...`;
  box.classList.add('hidden');
  
  setTimeout(() => {
    btn.innerHTML = `<i class="fas fa-search"></i> Check`;
    box.classList.remove('hidden');
    
    if (inp.includes('bank') || inp.includes('paypal') || inp.includes('hdfc')) {
      box.className = 'url-result url-safe';
      box.innerHTML = `<h4><i class="fas fa-shield-alt"></i> Safe Connection</h4><p>This appears to be a verified financial URL.</p>`;
    } else {
      box.className = 'url-result url-warn';
      box.innerHTML = `<h4><i class="fas fa-exclamation-triangle"></i> Caution Advised</h4><p>This is an unknown URL. Please verify the sender carefully.</p>`;
    }
  }, 1000);
}

function updateInsightsBadge() {
  const badge = document.getElementById('insightsBadge');
  if (!badge) return;
  let count = 0;
  const cmk = currentMonthKey();
  const spent = expenses.filter(e => monthKey(e.date) === cmk).reduce((s, e) => s + Number(e.amount), 0);
  if (totalBudget > 0 && spent > totalBudget) count++;
  if (Object.entries(getCatTotals(cmk)).some(([, v]) => totalBudget > 0 && v > totalBudget * 0.4)) count++;
  if (count > 0) { badge.textContent = count; badge.style.display = 'inline-flex'; }
  else { badge.textContent = ''; badge.style.display = 'none'; }
}

// ==== SORT ====
let sortField = '', sortAsc = true;
function sortBy(field) {
  if (sortField === field) sortAsc = !sortAsc;
  else { sortField = field; sortAsc = true; }
  const s = document.getElementById('expSearch').value.toLowerCase();
  const c = document.getElementById('catFilter').value;
  const m = document.getElementById('monthFilter').value;
  let f = expenses.filter(e =>
    (!s || e.description.toLowerCase().includes(s)) &&
    (!c || e.category === c) &&
    (!m || monthKey(e.date) === m)
  );
  f.sort((a, b) => {
    let av = a[field], bv = b[field];
    if (field === 'amount') { av = Number(av); bv = Number(bv); }
    if (sortAsc) return av > bv ? 1 : -1;
    return av < bv ? 1 : -1;
  });
  renderExpenseTable(f);
}

function handleGlobalSearch(q) {
  if (q.length > 2) {
    navigate('expenses');
    document.getElementById('expSearch').value = q;
    filterExpenses();
  }
}

function logoutSession() {
  // If user wants to log out, we'll reset intro state
  userProfile.setupComplete = false;
  localStorage.setItem('ff_profile', JSON.stringify(userProfile));
  window.location.reload();
}

// ==== ONBOARDING WIZARD ====
let obData = { name: '', currency: '₹', salary: 0, saveGoal: 0 };

function setObCurrency(curr, el) {
  obData.currency = curr;
  document.querySelectorAll('#obCurrencyPicks .qp-chip').forEach(c => c.classList.remove('selected'));
  if (el) el.classList.add('selected');
}

function updateObDots(step) {
  const dots = document.querySelectorAll('#obDots .wz-dot');
  dots.forEach((d, i) => {
    d.classList.toggle('active', i === step - 1);
  });
}

function nextObStep(current) {
  if (current === 1) {
    const n = document.getElementById('obInpName').value.trim();
    if (!n) { showToast('Please enter your name.', 'error'); return; }
    obData.name = n;
    document.getElementById('obStep1').classList.add('hidden');
    document.getElementById('obStep2').classList.remove('hidden');
    updateObDots(2);
    setTimeout(() => document.getElementById('obInpSalary').focus(), 100);
  } else if (current === 2) {
    const s = document.getElementById('obInpSalary').value.trim();
    if (!s || isNaN(s) || Number(s) <= 0) { showToast('Enter a valid monthly income.', 'error'); return; }
    obData.salary = Number(s);
    document.getElementById('obStep2').classList.add('hidden');
    document.getElementById('obStep3').classList.remove('hidden');
    updateObDots(3);
    document.getElementById('obInpSaveGoal').placeholder = `e.g. ${Math.round(obData.salary * 0.2)}`;
    setTimeout(() => document.getElementById('obInpSaveGoal').focus(), 100);
  }
}

function prevObStep(current) {
  document.getElementById(`obStep${current}`).classList.add('hidden');
  document.getElementById(`obStep${current-1}`).classList.remove('hidden');
  updateObDots(current-1);
}

function fillSaveGoal(multiplier) {
  const sal = Number(document.getElementById('obInpSalary').value) || obData.salary || 0;
  if(sal > 0) {
    document.getElementById('obInpSaveGoal').value = Math.round(sal * multiplier);
  } else {
    showToast('Please enter your salary first to calculate percentages.', 'info');
  }
}

function finishOnboarding() {
  const sg = document.getElementById('obInpSaveGoal').value.trim();
  if (!sg || isNaN(sg) || Number(sg) < 0) { showToast('Enter a valid savings goal.', 'error'); return; }
  obData.saveGoal = Number(sg);
  
  // Save to profile
  userProfile.name = obData.name;
  userProfile.currency = obData.currency;
  userProfile.salary = obData.salary;
  userProfile.saveGoal = obData.saveGoal;
  userProfile.setupComplete = true;
  localStorage.setItem('ff_profile', JSON.stringify(userProfile));

  // Auto-set total budget if it doesn't exist
  if (totalBudget === 0) {
    totalBudget = Math.round(userProfile.salary * 0.8);
    localStorage.setItem('ff_total_budget', totalBudget);
  }

  document.getElementById('initialOnboardingOverlay').classList.add('hidden');
  showToast(`Welcome, ${userProfile.name}! Setup complete.`, 'success');
  initApp();
  renderDashboard();
}

window.addEventListener('DOMContentLoaded', () => {
  if (!userProfile.setupComplete) {
     document.getElementById('initialOnboardingOverlay').classList.remove('hidden');
     // Pre-fill if exists
     if(userProfile.name !== 'User') document.getElementById('obInpName').value = userProfile.name;
  }
  initApp();
});

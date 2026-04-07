/* =====================================================
   FORTUNE FLOW — onboarding.js
   Onboarding wizard, CA Advisor "Aria", Smart Alerts
   ===================================================== */
'use strict';

/* =====================================================
   ONBOARDING STATE
   ===================================================== */
let obState = {
  step: 0,
  name: '',
  income: 0,
  savingsPct: 20,
  method: '',       // '5030' | 'custom'
  knowsExp: null,
  catBudgets: {},
  catIdx: 0,
};

/* =====================================================
   CA PANEL STATE
   ===================================================== */
let caOpen = false;
let caNotifQueue = [];
let caNotifShowing = false;

/* =====================================================
   CA TIPS BANK
   ===================================================== */
const CA_TIPS = [
  "Track every expense — even ₹20 chai adds up to ₹600/month!",
  "The 50/30/20 rule: 50% for needs, 30% for wants, 20% for savings.",
  "Review your subscriptions monthly — unused ones drain ₹500–2000/month.",
  "Before any purchase above ₹2000, wait 24 hours. Impulse buys drop by 60%.",
  "Set up an auto-sweep to savings on salary day — save before you spend.",
  "Emergency fund goal: 6 months of expenses. Start with ₹1000 this month.",
  "Use the cash envelope method for discretionary categories to avoid overspending.",
  "Cooking 4 meals at home per week can save ₹2000–4000/month on food.",
  "Compare prices before big purchases — even 10% savings on ₹10000 = ₹1000.",
  "Review insurance yearly — overpaying on premiums is very common.",
  "SIP in mutual funds as low as ₹500/month can grow significantly over 10 years.",
  "Avoid EMIs for depreciating assets like electronics — save and buy instead.",
  "Use UPI cashbacks strategically — they add up to ₹200–500/month.",
  "A spending diary for 30 days reveals surprising patterns in your expenses.",
  "Negotiate bills! ISP, mobile, and insurance often have better deals if asked.",
  "Small leaks sink big ships — a ₹50/day habit costs ₹18,250/year.",
];

function getDailyTip() {
  const idx = new Date().getDate() % CA_TIPS.length;
  return CA_TIPS[idx];
}

/* =====================================================
   NOTIFICATION SYSTEM (CA Smart Alerts)
   ===================================================== */
function showCaNotif(msg, type = 'info') {
  caNotifQueue.push({ msg, type });
  if (!caNotifShowing) processNotifQueue();
}

function processNotifQueue() {
  if (!caNotifQueue.length) { caNotifShowing = false; return; }
  caNotifShowing = true;
  const { msg, type } = caNotifQueue.shift();

  const el  = document.getElementById('caNotif');
  const msgEl = document.getElementById('caNotifMsg');
  if (!el || !msgEl) return;

  msgEl.textContent = msg;
  el.className = 'ca-notif';
  el.style.borderLeftColor = type === 'danger' ? 'var(--danger)'
    : type === 'warning' ? 'var(--warning)'
    : type === 'success' ? 'var(--success)' : 'var(--primary)';

  el.classList.remove('hidden');

  // Show badge on CA fab
  const badge = document.getElementById('caFabBadge');
  if (badge) badge.classList.remove('hidden');

  setTimeout(() => {
    dismissCaNotif();
    setTimeout(processNotifQueue, 600);
  }, 6000);
}

function dismissCaNotif() {
  const el = document.getElementById('caNotif');
  if (el) el.classList.add('hidden');
  caNotifShowing = false;
}

/* =====================================================
   SMART BUDGET ALERTS — called after every expense
   ===================================================== */
function checkBudgetAlerts(category) {
  const cmk   = currentMonthKey();
  const cats  = getCatTotals(cmk);
  const total = Object.values(cats).reduce((s,v) => s+v, 0);

  // --- Category level ---
  if (category && budgets[category]) {
    const spent  = cats[category] || 0;
    const budget = budgets[category];
    const pct    = (spent / budget) * 100;

    if (pct >= 100) {
      showCaNotif(`🚨 You've EXCEEDED your ${category} budget by ${fmt(spent - budget)}! Time to pause spending here.`, 'danger');
    } else if (pct >= 90) {
      showCaNotif(`⚠️ Only ${fmt(budget - spent)} left in ${category}. You've used ${Math.round(pct)}% of the limit!`, 'warning');
    } else if (pct >= 70) {
      showCaNotif(`💡 ${category} is at ${Math.round(pct)}% of budget. ${fmt(budget - spent)} remaining — stay mindful.`, 'info');
    }
  }

  // --- Total budget level ---
  if (totalBudget > 0) {
    const pct = (total / totalBudget) * 100;
    if (pct >= 100) {
      showCaNotif(`🚨 Monthly budget EXCEEDED by ${fmt(total - totalBudget)}! Consider cutting non-essential spending.`, 'danger');
    } else if (pct >= 90) {
      const d = new Date();
      const daysLeft = new Date(d.getFullYear(), d.getMonth()+1, 0).getDate() - d.getDate();
      showCaNotif(`⚠️ 90% of monthly budget used with ${daysLeft} days left. Daily limit: ${fmt(Math.round((totalBudget-total)/Math.max(daysLeft,1)))}.`, 'warning');
    }
  }

  // --- Large single expense alert ---
  const lastExp = expenses[expenses.length - 1];
  if (lastExp && totalBudget > 0) {
    const pctOfBudget = (Number(lastExp.amount) / totalBudget) * 100;
    if (pctOfBudget > 15) {
      showCaNotif(`💰 Large expense alert: ${lastExp.description} is ${pctOfBudget.toFixed(0)}% of your monthly budget. Planned?`, 'warning');
    }
  }

  // --- Savings check (if income is set) ---
  if (settings.income > 0 && total > 0) {
    const saveGoal = Math.round(settings.income * ((settings.savingsPct || 20) / 100));
    const projected = total * (30 / new Date().getDate());
    if (projected > settings.income - saveGoal) {
      // only warn once — when first crossed
      if (!window._savingsWarnShown) {
        window._savingsWarnShown = true;
        showCaNotif(`📉 At current pace, you may not meet your ₹${saveGoal.toLocaleString('en-IN')}/mo savings goal. Try reducing discretionary spends.`, 'warning');
      }
    } else {
      window._savingsWarnShown = false;
    }
  }
}

/* =====================================================
   CA ADVISOR PANEL
   ===================================================== */
function toggleCAPanel() {
  caOpen = !caOpen;
  const panel = document.getElementById('caAdvisorPanel');
  if (!panel) return;

  if (caOpen) {
    panel.classList.remove('hidden');
    setTimeout(() => panel.classList.add('open'), 10);
    renderCAPanel();
    const badge = document.getElementById('caFabBadge');
    if (badge) badge.classList.add('hidden');
  } else {
    panel.classList.remove('open');
    setTimeout(() => panel.classList.add('hidden'), 310);
  }
}

let ariaChatHistory = []; // State to store chat session

function renderCAPanel() {
  const body = document.getElementById('caInnerContent');
  if (!body) return;

  const cmk     = currentMonthKey();
  const monthExp = expenses.filter(e => monthKey(e.date) === cmk);
  const total   = monthExp.reduce((s,e) => s + Number(e.amount), 0);
  const cats    = getCatTotals(cmk);
  const remain  = totalBudget - total;
  const pct     = totalBudget > 0 ? Math.round(total / totalBudget * 100) : 0;
  const income  = settings.income || 0;
  const saveGoal = income ? Math.round(income * ((settings.savingsPct||20) / 100)) : 0;
  const d       = new Date();
  const daysLeft = new Date(d.getFullYear(), d.getMonth()+1, 0).getDate() - d.getDate();
  const dailyLeft = daysLeft > 0 && remain > 0 ? Math.round(remain / daysLeft) : 0;

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const advice = generateCAAdvice(cats, total, pct, income, saveGoal);

  // Budget bars for top 4 categories
  const topCats = Object.entries(cats).sort((a,b) => b[1]-a[1]).slice(0,4);

  body.innerHTML = `
    <p class="ca-greeting">${greet}, <strong>${settings.name}</strong>! 👋</p>

    <div class="ca-stat-row">
      <div class="ca-stat-item">
        <span class="ca-stat-val" style="color:var(--danger)">₹${Math.round(total).toLocaleString('en-IN')}</span>
        <span class="ca-stat-lbl">Spent</span>
      </div>
      <div class="ca-stat-divider"></div>
      <div class="ca-stat-item">
        <span class="ca-stat-val" style="color:${remain>=0?'var(--success)':'var(--danger)'}">₹${Math.abs(remain).toLocaleString('en-IN')}</span>
        <span class="ca-stat-lbl">${remain>=0?'Left':'Over'}</span>
      </div>
      <div class="ca-stat-divider"></div>
      <div class="ca-stat-item">
        <span class="ca-stat-val" style="color:var(--primary)">₹${dailyLeft.toLocaleString('en-IN')}</span>
        <span class="ca-stat-lbl">Per Day</span>
      </div>
    </div>

    ${income ? `
    <div style="font-size:12.5px;color:var(--text2);background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);padding:10px 14px;display:flex;justify-content:space-between;">
      <span>💰 Savings goal this month</span>
      <strong style="color:var(--success)">₹${saveGoal.toLocaleString('en-IN')}</strong>
    </div>` : ''}

    <p class="ca-section-title"><i class="fas fa-lightbulb"></i> &nbsp;Aria's Advice</p>
    ${advice.map(a => `
      <div class="ca-advice-card ${a.type}">
        <i class="fas ${a.icon} ca-advice-icon"></i>
        <span>${a.msg}</span>
      </div>`).join('')}

    ${topCats.length ? `
    <p class="ca-section-title"><i class="fas fa-chart-bar"></i> &nbsp;Top Spending</p>
    ${topCats.map(([cat, amt]) => {
      const b   = budgets[cat] || 0;
      const p   = b > 0 ? Math.min(100, Math.round(amt/b*100)) : 0;
      const col = p > 90 ? '#EF4444' : p > 70 ? '#F59E0B' : catColor(cat);
      return `<div class="ca-bbar-row">
        <div class="ca-bbar-top"><span>${catIcon(cat)} ${cat}</span><span style="color:${col}">${b?Math.round(p)+'%':'—'}</span></div>
        <div class="ca-bbar-track"><div class="ca-bbar-fill" style="width:${p}%;background:${col}"></div></div>
      </div>`;
    }).join('')}` : ''}

    <p class="ca-section-title"><i class="fas fa-star"></i> &nbsp;CA Tip of the Day</p>
    <div class="ca-tip-box">
      <i class="fas fa-lightbulb"></i>
      <span>${getDailyTip()}</span>
    </div>

    <button class="btn btn-ghost btn-sm" style="width:100%;justify-content:center;margin-top:4px" onclick="navigate('insights');toggleCAPanel()">
      <i class="fas fa-chart-pie"></i> View Full Insights
    </button>
    
    ${ariaChatHistory.map(ch => `
      <div style="display:flex; justify-content: ${ch.user ? 'flex-end' : 'flex-start'}; margin-top:8px">
        <div style="background: ${ch.user ? 'var(--primary)' : 'var(--surface2)'}; color: ${ch.user ? '#fff' : 'var(--text1)'}; padding:10px 14px; border-radius:14px; max-width:85%; font-size:12.5px; border: 1px solid ${ch.user ? 'transparent' : 'var(--border)'}; line-height: 1.5; font-family:'Inter', sans-serif;">${ch.msg}</div>
      </div>
    `).join('')}
    <div id="caChatAnchor"></div>
    `;

  setTimeout(() => {
    const anchor = document.getElementById('caChatAnchor');
    if (anchor) anchor.scrollIntoView({ behavior: 'smooth' });
  }, 10);
}

/* =====================================================
   ARIA CHAT ENGINE
   ===================================================== */
window.sendAriaMsg = function() {
  const inp = document.getElementById('caChatInput');
  const msg = inp.value.trim();
  if (!msg) return;
  inp.value = '';

  // Add user message
  ariaChatHistory.push({ user: true, msg });
  renderCAPanel();

  // Show Aria typing indicator (hack by adding a temp message)
  const tempIdx = ariaChatHistory.push({ user: false, msg: '<i class="fas fa-ellipsis-h fa-fade" style="color:var(--primary)"></i>' }) - 1;
  renderCAPanel();

  // Simulate LLM delay
  setTimeout(() => {
    const lower = msg.toLowerCase();
    let reply = "I'm still learning complicated financial jargon! But I can help you check your budget or log expenses.";
    
    if (lower.includes('hello') || lower.includes('hi ') || lower === 'hi') {
      reply = `Hello ${settings.name}! 🌸 How can I help you map your fortune today?`;
    } else if (lower.includes('budget') || lower.includes('left') || lower.includes('status')) {
      const cmk = currentMonthKey();
      const total = Object.values(getCatTotals(cmk)).reduce((a,b)=>a+b,0);
      const remain = totalBudget - total;
      reply = `You've spent **₹${total.toLocaleString('en-IN')}** so far this month. You have **₹${Math.max(0, remain).toLocaleString('en-IN')}** left in your budget bucket!`;
    } else if (lower.includes('expense') || lower.includes('add') || lower.includes('spent')) {
      reply = `To track that, hit the magic **+ Add Expense** button at the bottom right, or just press **'N'** on your keyboard. 🪄`;
    } else if (lower.includes('tip') || lower.includes('advice') || lower.includes('help')) {
      reply = `Here's a tip: ${getDailyTip()}`;
    } else if (lower.includes('magic') || lower.includes('compass') || lower.includes('fortune')) {
      reply = `Your Fortune Money Magic Compass points towards financial freedom! Keep tracking those expenses. 🧭✨`;
    }

    ariaChatHistory[tempIdx] = { user: false, msg: reply.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') };
    renderCAPanel();
  }, 1000 + Math.random()*800);
}

function generateCAAdvice(cats, total, pct, income, saveGoal) {
  const advice = [];
  const topCat = Object.entries(cats).sort((a,b) => b[1]-a[1])[0];

  if (total === 0) {
    advice.push({ type:'info', icon:'fa-info-circle', msg: "No expenses logged yet this month. Tap '+ Add Expense' or the wizard button to start tracking." });
    return advice;
  }

  // Budget health
  if (pct > 100) {
    advice.push({ type:'danger', icon:'fa-exclamation-circle', msg: `Budget exceeded by ${fmt(total - totalBudget)}. Pause non-essential spending for the rest of the month.` });
  } else if (pct > 85) {
    advice.push({ type:'warning', icon:'fa-exclamation-triangle', msg: `${pct}% of budget used. Limit yourself to essentials until month-end.` });
  } else if (pct < 50) {
    advice.push({ type:'success', icon:'fa-trophy', msg: `Great control! Only ${pct}% of budget used. You're on track to save well this month.` });
  } else {
    advice.push({ type:'info', icon:'fa-check-circle', msg: `${pct}% of budget utilized — you're managing well. Keep it up!` });
  }

  // Top category
  if (topCat) {
    const topPct = Math.round(topCat[1] / total * 100);
    if (topPct > 40) {
      advice.push({ type:'warning', icon:'fa-fire', msg: `${topCat[0]} is ${topPct}% of your total spending. Is this within your plan?` });
    }
  }

  // Food spending check
  const food = cats['Food & Dining'] || 0;
  if (food > 0 && income > 0 && food/income > 0.3) {
    advice.push({ type:'warning', icon:'fa-utensils', msg: `Food spending is ${Math.round(food/income*100)}% of income. Meal prepping can save ₹2k–4k/month.` });
  }

  // Entertainment
  const ent = cats['Entertainment'] || 0;
  if (ent > 0 && total > 0 && ent/total > 0.2) {
    advice.push({ type:'info', icon:'fa-gamepad', msg: `Entertainment is ${Math.round(ent/total*100)}% of spending. Review subscriptions for unused ones.` });
  }

  // Savings projection
  if (income > 0 && saveGoal > 0) {
    const projected = total * (30 / Math.max(1, new Date().getDate()));
    const willSave  = income - projected;
    if (willSave >= saveGoal) {
      advice.push({ type:'success', icon:'fa-piggy-bank', msg: `On track to save ≈ ${fmt(Math.round(willSave))} this month — exceeding your ${fmt(saveGoal)} goal! 🎉` });
    } else {
      advice.push({ type:'warning', icon:'fa-piggy-bank', msg: `Projected savings: ${fmt(Math.round(willSave))} vs goal of ${fmt(saveGoal)}. Reduce spending by ${fmt(Math.round(saveGoal - willSave))}.` });
    }
  }

  return advice.slice(0, 4);
}

/* =====================================================
   ONBOARDING — CHECK & SHOW
   ===================================================== */
function checkOnboarding() {
  if (!settings.onboarded) {
    setTimeout(showOnboarding, 600);
  } else {
    // Show a daily CA greeting after 2 seconds
    setTimeout(() => {
      const h = new Date().getHours();
      const g = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
      showCaNotif(`Good ${g}, ${settings.name}! 👋 Tip of the day: ${getDailyTip()}`, 'info');
    }, 2500);
  }
}

function showOnboarding() {
  obState = { step:0, name:'', income:0, savingsPct:20, method:'', knowsExp:null, catBudgets:{}, catIdx:0 };
  document.getElementById('obOverlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  renderObStep();
}

function closeOnboarding() {
  document.getElementById('obOverlay').classList.add('hidden');
  document.body.style.overflow = '';
}

function renderObStep() {
  const card = document.getElementById('obCard');
  if (!card) return;
  card.style.animation = 'none';
  void card.offsetWidth;
  card.style.animation = 'wzSlideUp .4s cubic-bezier(.4,0,.2,1)';
  switch (obState.step) {
    case 0: renderObWelcome(card); break;
    case 1: renderObName(card);    break;
    case 2: renderObIncome(card);  break;
    case 3: renderObSavings(card); break;
    case 4: renderObMethod(card);  break;
    case 5: renderObKnowsExp(card);break;
    case 6: renderObCatBudget(card); break;
    case 7: renderObDone(card);    break;
  }
}

function obNext() { obState.step++; renderObStep(); }
function obBack() { if (obState.step>0){ obState.step--; renderObStep(); } }

/* ---- Step 0: Welcome ---- */
function renderObWelcome(card) {
  card.innerHTML = `
    <div class="ob-welcome">
      <div class="ob-ca-av-lg"><i class="fas fa-robot"></i></div>
      <div class="ob-wave">👋</div>
      <h1 class="ob-title">Hello! I'm Aria</h1>
      <p class="ob-sub">Your personal <strong>Chartered Accountant</strong> — here to help you master your money with real-time insights and smart budgeting.</p>
      <div class="ob-features">
        <span class="ob-feat"><i class="fas fa-chart-pie"></i> Smart Budgets</span>
        <span class="ob-feat"><i class="fas fa-bell"></i> Real-time Alerts</span>
        <span class="ob-feat"><i class="fas fa-lightbulb"></i> CA Advice</span>
      </div>
      <button class="btn btn-primary ob-btn" onclick="obNext()"><i class="fas fa-rocket"></i> Let's Get Started!</button>
      <p class="ob-skip" onclick="skipOnboarding()">Already set up? Skip →</p>
    </div>`;
}

/* ---- Step 1: Name ---- */
function renderObName(card) {
  card.innerHTML = `
    <div class="ob-step-wrap">
      <div class="ob-step-ca">
        <div class="ob-ca-avatar"><i class="fas fa-robot"></i></div>
        <div class="ob-ca-bubble">First, what should I call you? 😊</div>
      </div>
      <div class="ob-progress">
        <div class="ob-prog-track"><div class="ob-prog-fill" style="width:16%"></div></div>
        <span>Step 1 of 6</span>
      </div>
      <p class="ob-q">What's your name?</p>
      <div class="wz-input-wrap">
        <input id="obNameInp" class="wz-main-input" type="text" placeholder="e.g. Ravi, Priya…" value="${escHtml(obState.name)}" autocomplete="off"/>
      </div>
      <div class="ob-nav">
        <button class="btn btn-secondary" onclick="obBack()"><i class="fas fa-chevron-left"></i> Back</button>
        <button class="btn btn-primary" onclick="obStepName()">Next <i class="fas fa-chevron-right"></i></button>
      </div>
    </div>`;
  const inp = document.getElementById('obNameInp');
  inp.focus();
  inp.addEventListener('keydown', e => { if(e.key==='Enter') obStepName(); });
}
function obStepName() {
  const v = document.getElementById('obNameInp').value.trim();
  if (!v) { shakeFocus('obNameInp'); return; }
  obState.name = v; obNext();
}

/* ---- Step 2: Income ---- */
function renderObIncome(card) {
  const quickAmts = [15000, 25000, 50000, 75000, 100000, 150000];
  card.innerHTML = `
    <div class="ob-step-wrap">
      <div class="ob-step-ca">
        <div class="ob-ca-avatar"><i class="fas fa-robot"></i></div>
        <div class="ob-ca-bubble">Nice to meet you, <strong>${obState.name}</strong>! 🎉 What's your monthly take-home income?</div>
      </div>
      <div class="ob-progress">
        <div class="ob-prog-track"><div class="ob-prog-fill" style="width:33%"></div></div>
        <span>Step 2 of 6</span>
      </div>
      <p class="ob-q">Monthly Income (₹)</p>
      <div class="wz-input-wrap">
        <span class="wz-prefix">₹</span>
        <input id="obIncInp" class="wz-main-input has-prefix" type="number" placeholder="e.g. 50000" min="1000" step="500" value="${obState.income||''}"/>
      </div>
      <div class="wz-chips">
        ${quickAmts.map(a => `<button class="wz-chip ${obState.income===a?'selected':''}" onclick="pickObInc(this,${a})">₹${a>=100000?(a/100000).toFixed(1)+'L':(a/1000)+'K'}</button>`).join('')}
      </div>
      <p class="ob-note"><i class="fas fa-lock"></i> Your data stays only on this device — never shared.</p>
      <div class="ob-nav">
        <button class="btn btn-secondary" onclick="obBack()"><i class="fas fa-chevron-left"></i> Back</button>
        <button class="btn btn-primary" onclick="obStepInc()">Next <i class="fas fa-chevron-right"></i></button>
      </div>
    </div>`;
  const inp = document.getElementById('obIncInp');
  inp.focus();
  inp.addEventListener('input', e => { obState.income = parseFloat(e.target.value)||0; });
  inp.addEventListener('keydown', e => { if(e.key==='Enter') obStepInc(); });
}
function pickObInc(btn, val) {
  obState.income = val;
  document.getElementById('obIncInp').value = val;
  document.querySelectorAll('.ob-step-wrap .wz-chip').forEach(c => c.classList.remove('selected'));
  btn.classList.add('selected');
}
function obStepInc() {
  const v = parseFloat(document.getElementById('obIncInp')?.value || obState.income);
  if (!v || v < 1000) { shakeFocus('obIncInp'); showToast('Enter income','Please enter a valid monthly income.','warning'); return; }
  obState.income = v; obNext();
}

/* ---- Step 3: Savings ---- */
function renderObSavings(card) {
  const opts = [10,15,20,25,30];
  const calcSave  = p => Math.round(obState.income * p / 100);
  const calcSpend = p => obState.income - calcSave(p);
  card.innerHTML = `
    <div class="ob-step-wrap">
      <div class="ob-step-ca">
        <div class="ob-ca-avatar"><i class="fas fa-robot"></i></div>
        <div class="ob-ca-bubble">How much of ₹${obState.income.toLocaleString('en-IN')} do you want to save every month? 💰</div>
      </div>
      <div class="ob-progress">
        <div class="ob-prog-track"><div class="ob-prog-fill" style="width:50%"></div></div>
        <span>Step 3 of 6</span>
      </div>
      <p class="ob-q">Savings Goal</p>
      <div class="ob-save-opts">
        ${opts.map(p => `
          <button class="ob-save-btn ${obState.savingsPct===p?'active':''}" onclick="pickSavings(this,${p})">
            <span class="ob-save-pct">${p}%</span>
            <span class="ob-save-amt">₹${calcSave(p).toLocaleString('en-IN')}</span>
            ${p===20?'<span class="ob-save-tag">Best</span>':''}
          </button>`).join('')}
      </div>
      <div class="ob-save-summary">
        <div class="ob-ss-row"><span>💰 You'll save</span><strong id="obSavAmt" style="color:var(--success)">₹${calcSave(obState.savingsPct).toLocaleString('en-IN')}/mo</strong></div>
        <div class="ob-ss-row"><span>💳 Available to spend</span><strong id="obSpndAmt" style="color:var(--primary)">₹${calcSpend(obState.savingsPct).toLocaleString('en-IN')}/mo</strong></div>
      </div>
      <div class="ob-nav">
        <button class="btn btn-secondary" onclick="obBack()"><i class="fas fa-chevron-left"></i> Back</button>
        <button class="btn btn-primary" onclick="obNext()">Next <i class="fas fa-chevron-right"></i></button>
      </div>
    </div>`;
}
function pickSavings(btn, pct) {
  obState.savingsPct = pct;
  document.querySelectorAll('.ob-save-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const save  = Math.round(obState.income * pct / 100);
  const spend = obState.income - save;
  const sa = document.getElementById('obSavAmt');
  const sp = document.getElementById('obSpndAmt');
  if (sa) sa.textContent  = `₹${save.toLocaleString('en-IN')}/mo`;
  if (sp) sp.textContent  = `₹${spend.toLocaleString('en-IN')}/mo`;
}

/* ---- Step 4: Budget Method ---- */
function renderObMethod(card) {
  const spendable = obState.income - Math.round(obState.income * obState.savingsPct / 100);
  card.innerHTML = `
    <div class="ob-step-wrap">
      <div class="ob-step-ca">
        <div class="ob-ca-avatar"><i class="fas fa-robot"></i></div>
        <div class="ob-ca-bubble">You have <strong>₹${spendable.toLocaleString('en-IN')}</strong>/month to spend. How should we divide it across categories?</div>
      </div>
      <div class="ob-progress">
        <div class="ob-prog-track"><div class="ob-prog-fill" style="width:66%"></div></div>
        <span>Step 4 of 6</span>
      </div>
      <p class="ob-q">Choose Your Budget Style</p>
      <div class="ob-method-cards">
        <button class="ob-method-card ${obState.method==='5030'?'active':''}" onclick="pickMethod(this,'5030')">
          <div class="ob-mc-icon"><i class="fas fa-magic"></i></div>
          <h4>50/30/20 Rule</h4>
          <p>Auto-distribute based on the proven 50% needs, 30% wants, 20% savings rule.</p>
          <span class="ob-mc-tag">Recommended ⭐</span>
        </button>
        <button class="ob-method-card ${obState.method==='custom'?'active':''}" onclick="pickMethod(this,'custom')">
          <div class="ob-mc-icon"><i class="fas fa-sliders-h"></i></div>
          <h4>Custom</h4>
          <p>Set your own budget for each category based on your lifestyle.</p>
        </button>
      </div>
      <div class="ob-nav">
        <button class="btn btn-secondary" onclick="obBack()"><i class="fas fa-chevron-left"></i> Back</button>
        <button class="btn btn-primary" onclick="obStepMethod()">Next <i class="fas fa-chevron-right"></i></button>
      </div>
    </div>`;
}
function pickMethod(btn, m) {
  obState.method = m;
  document.querySelectorAll('.ob-method-card').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
}
function obStepMethod() {
  if (!obState.method) { showToast('Select method','Please choose a budget style.','warning'); return; }
  if (obState.method === '5030') {
    apply5030Rule();
    obState.step = 7; renderObStep();
  } else {
    obNext();
  }
}
function apply5030Rule() {
  const sp = obState.income - Math.round(obState.income * obState.savingsPct / 100);
  const needs = sp * 0.50, wants = sp * 0.30, flex = sp * 0.20;
  budgets = {
    'Food & Dining':    Math.round(needs * 0.42),
    'Transportation':   Math.round(needs * 0.24),
    'Bills & Utilities':Math.round(needs * 0.24),
    'Healthcare':       Math.round(needs * 0.10),
    'Shopping':         Math.round(wants * 0.52),
    'Entertainment':    Math.round(wants * 0.32),
    'Others':           Math.round(wants * 0.16),
    'Education':        Math.round(flex),
  };
  totalBudget = sp;
  settings.income = obState.income; settings.savingsPct = obState.savingsPct;
  settings.name = obState.name; settings.onboarded = true;
  save(); updateUserDisplay();
}

/* ---- Step 5: Know Regular Expenses? ---- */
function renderObKnowsExp(card) {
  card.innerHTML = `
    <div class="ob-step-wrap">
      <div class="ob-step-ca">
        <div class="ob-ca-avatar"><i class="fas fa-robot"></i></div>
        <div class="ob-ca-bubble">Do you already know roughly how much you spend each month on things like food, transport, bills, etc.?</div>
      </div>
      <div class="ob-progress">
        <div class="ob-prog-track"><div class="ob-prog-fill" style="width:75%"></div></div>
        <span>Step 5 of 6</span>
      </div>
      <p class="ob-q">Know your regular expenses?</p>
      <div class="ob-yn-cards">
        <button class="ob-yn-card ${obState.knowsExp===true?'active':''}" onclick="pickKnown(this,true)">
          <span style="font-size:32px">✅</span>
          <h4>Yes, I do!</h4>
          <p>I'll set budgets category by category.</p>
        </button>
        <button class="ob-yn-card ${obState.knowsExp===false?'active':''}" onclick="pickKnown(this,false)">
          <span style="font-size:32px">🤷</span>
          <h4>Not really</h4>
          <p>Set smart defaults based on my income — I'll adjust later.</p>
        </button>
      </div>
      <div class="ob-nav">
        <button class="btn btn-secondary" onclick="obBack()"><i class="fas fa-chevron-left"></i> Back</button>
        <button class="btn btn-primary" onclick="obStepKnown()">Next <i class="fas fa-chevron-right"></i></button>
      </div>
    </div>`;
}
function pickKnown(btn, val) {
  obState.knowsExp = val;
  document.querySelectorAll('.ob-yn-card').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
}
function obStepKnown() {
  if (obState.knowsExp === null) { showToast('Choose one','Select Yes or No.','warning'); return; }
  if (!obState.knowsExp) {
    applySmartDefaults(); obState.step = 7; renderObStep();
  } else {
    obState.catIdx = 0; obNext();
  }
}
function applySmartDefaults() {
  const sp = obState.income - Math.round(obState.income * obState.savingsPct / 100);
  budgets = { 'Food & Dining':Math.round(sp*.25),'Transportation':Math.round(sp*.12),'Bills & Utilities':Math.round(sp*.15),'Healthcare':Math.round(sp*.08),'Shopping':Math.round(sp*.15),'Entertainment':Math.round(sp*.08),'Education':Math.round(sp*.10),'Others':Math.round(sp*.07) };
  totalBudget = sp;
  settings.income = obState.income; settings.savingsPct = obState.savingsPct;
  settings.name = obState.name; settings.onboarded = true;
  save(); updateUserDisplay();
}

/* ---- Step 6: Category Budgets ---- */
function renderObCatBudget(card) {
  if (obState.catIdx >= CATS.length) {
    finalizeCatBudgets(); obState.step = 7; renderObStep(); return;
  }
  const cat = CATS[obState.catIdx];
  const sp  = obState.income - Math.round(obState.income * obState.savingsPct / 100);
  const allocated = Object.values(obState.catBudgets).reduce((s,v)=>s+v,0);
  const left = Math.max(0, sp - allocated);
  card.innerHTML = `
    <div class="ob-step-wrap">
      <div class="ob-step-ca">
        <div class="ob-ca-avatar"><i class="fas fa-robot"></i></div>
        <div class="ob-ca-bubble">Category ${obState.catIdx+1} of ${CATS.length} — How much do you spend monthly on <strong>${cat.name}</strong>?</div>
      </div>
      <div class="ob-progress">
        <div class="ob-prog-track"><div class="ob-prog-fill" style="width:${75+(obState.catIdx/CATS.length*20)}%"></div></div>
        <span>${cat.icon} ${obState.catIdx+1} / ${CATS.length}</span>
      </div>
      <p class="ob-q" style="font-size:22px">${cat.icon} ${cat.name}</p>
      <div class="wz-input-wrap">
        <span class="wz-prefix">₹</span>
        <input id="obCatInp" class="wz-main-input has-prefix" type="number" placeholder="Monthly budget" value="${obState.catBudgets[cat.name]||''}" min="0" step="100"/>
      </div>
      <p class="ob-note"><i class="fas fa-wallet"></i> Unallocated budget: <strong>₹${left.toLocaleString('en-IN')}</strong></p>
      <div class="ob-nav">
        <button class="btn btn-secondary" onclick="skipCat()">Skip <i class="fas fa-forward"></i></button>
        <button class="btn btn-primary" onclick="saveCatOb()">Next <i class="fas fa-chevron-right"></i></button>
      </div>
    </div>`;
  const inp = document.getElementById('obCatInp');
  inp.focus();
  inp.addEventListener('keydown', e => { if(e.key==='Enter') saveCatOb(); });
}
function saveCatOb() {
  const cat = CATS[obState.catIdx];
  const v = parseFloat(document.getElementById('obCatInp')?.value)||0;
  if (v > 0) obState.catBudgets[cat.name] = v;
  obState.catIdx++; renderObCatBudget(document.getElementById('obCard'));
}
function skipCat() { obState.catIdx++; renderObCatBudget(document.getElementById('obCard')); }
function finalizeCatBudgets() {
  const sp = obState.income - Math.round(obState.income * obState.savingsPct / 100);
  const allocated = Object.values(obState.catBudgets).reduce((s,v)=>s+v,0);
  const unset = CATS.filter(c => !obState.catBudgets[c.name]);
  const perUnset = unset.length > 0 ? Math.max(0, Math.round((sp - allocated) / unset.length)) : 0;
  CATS.forEach(c => { budgets[c.name] = obState.catBudgets[c.name] || perUnset; });
  totalBudget = sp;
  settings.income = obState.income; settings.savingsPct = obState.savingsPct;
  settings.name = obState.name; settings.onboarded = true;
  save(); updateUserDisplay();
}

/* ---- Step 7: Done ---- */
function renderObDone(card) {
  const saveAmt   = Math.round(obState.income * obState.savingsPct / 100);
  const spendAmt  = obState.income - saveAmt;
  card.innerHTML = `
    <div class="ob-done-wrap">
      <div class="ob-done-emoji">🎉</div>
      <h1 class="ob-done-title">You're all set, ${obState.name}!</h1>
      <p class="ob-done-sub">Your personalized financial profile is ready. Aria is now your 24/7 CA!</p>
      <div class="ob-done-summary">
        <div class="ob-ds-row"><span><i class="fas fa-rupee-sign"></i> Monthly Income</span><strong>₹${obState.income.toLocaleString('en-IN')}</strong></div>
        <div class="ob-ds-row"><span><i class="fas fa-piggy-bank"></i> Monthly Savings</span><strong style="color:var(--success)">₹${saveAmt.toLocaleString('en-IN')} (${obState.savingsPct}%)</strong></div>
        <div class="ob-ds-row"><span><i class="fas fa-wallet"></i> Spending Budget</span><strong style="color:var(--primary)">₹${spendAmt.toLocaleString('en-IN')}</strong></div>
      </div>
      <div class="ob-ca-tip">
        <i class="fas fa-lightbulb"></i>
        <span><strong>Aria's first tip:</strong> ${getDailyTip()}</span>
      </div>
      <button class="btn btn-primary ob-btn" onclick="completeOnboarding()">
        <i class="fas fa-rocket"></i> Start Tracking My Finances!
      </button>
    </div>`;
}
function completeOnboarding() {
  closeOnboarding();
  renderDashboard();
  setTimeout(() => showCaNotif(`Welcome aboard, ${settings.name}! 🎉 Your CA "Aria" is online. Tap the robot button anytime for advice!`, 'success'), 800);
}
function skipOnboarding() {
  settings.onboarded = true; save(); closeOnboarding();
}

/* =====================================================
   HOOK INTO EXISTING FUNCTIONS
   ===================================================== */
// Patch addExpense to trigger alerts
window._origAddExpense = window.addExpense;
window.addExpense = function() {
  const cat = document.getElementById('expCategory')?.value;
  window._origAddExpense();
  if (expenses.length > 0) checkBudgetAlerts(cat);
}

// Patch commitWizardExpense to trigger alerts
window._origCommit = window.commitWizardExpense;
window.commitWizardExpense = function() {
  const cat = wz.category;
  window._origCommit();
  checkBudgetAlerts(cat);
}

/* =====================================================
   INIT — run after DOM loaded
   ===================================================== */
document.addEventListener('DOMContentLoaded', () => {
  // Ensure new settings fields
  if (settings.income === undefined)     settings.income = 0;
  if (settings.savingsPct === undefined) settings.savingsPct = 20;
  if (settings.onboarded === undefined)  settings.onboarded = false;

  checkOnboarding();
});

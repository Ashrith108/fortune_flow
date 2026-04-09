/* =====================================================
   onboarding.js - FortuneFlow CA Advisor & Wizard
===================================================== */

const CA_TIPS = [
  "Track every expense — even ₹20 chai adds up to ₹600/month!",
  "The 50/30/20 rule: 50% needs, 30% wants, 20% savings.",
  "Review your subscriptions monthly — unused ones drain cash.",
  "Automate your savings: transfer 20% to savings on payday.",
  "Use the 24-hour rule for non-essential purchases over ₹1,000.",
  "Meal prepping on weekends saves ₹2,000 - ₹4,000 monthly.",
  "Check for 'hidden' bank fees and switch if necessary.",
  "Invest your savings — inflation eats idle cash.",
  "Use cash envelopes for categories where you overspend.",
  "Always negotiate your internet and phone bills annually."
];

let ariaActive = false;
let ariaMessages = [];

function toggleCAPanel() {
  const panel = document.getElementById('caAdvisorPanel');
  const badge = document.getElementById('caFabBadge');
  if (panel.classList.contains('hidden')) {
    panel.classList.remove('hidden');
    badge.classList.add('hidden');
    if (!ariaActive) {
      ariaActive = true;
      initAria();
    }
  } else {
    panel.classList.add('hidden');
  }
}

function initAria() {
  const body = document.getElementById('caInnerContent');
  body.innerHTML = '';
  addAriaMsg("Hi there! I'm Aria, your personal AI Chartered Accountant. How can I help you optimize your finances today?");
  
  if (typeof expenses !== 'undefined' && expenses.length > 0) {
    setTimeout(() => {
      const advice = generateCAAdvice(getCatTotals(), expenses.reduce((s,e)=>s+Number(e.amount),0), 0, 0, 0); // basic dummy params
      if (advice.length > 0) {
        addAriaMsg("Here's my quick analysis of your current spending:");
        advice.forEach(a => {
          setTimeout(() => addAriaMsg(`<i class="fas ${a.icon}" style="color:var(--${a.type})"></i> ${a.msg}`), 500);
        });
      }
    }, 1000);
  }
}

function addAriaMsg(html) {
  const body = document.getElementById('caInnerContent');
  const div = document.createElement('div');
  div.style.background = 'var(--surface-hover)';
  div.style.padding = '12px 16px';
  div.style.borderRadius = '0 12px 12px 12px';
  div.style.fontSize = '13px';
  div.style.lineHeight = '1.5';
  div.style.border = '1px solid var(--border)';
  div.style.alignSelf = 'flex-start';
  div.style.maxWidth = '85%';
  div.innerHTML = html;
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
  ariaMessages.push({role: 'aria', content: html});
}

function addUserMsg(text) {
  const body = document.getElementById('caInnerContent');
  const div = document.createElement('div');
  div.style.background = 'var(--primary)';
  div.style.color = '#fff';
  div.style.padding = '10px 14px';
  div.style.borderRadius = '12px 0 12px 12px';
  div.style.fontSize = '13px';
  div.style.alignSelf = 'flex-end';
  div.style.maxWidth = '85%';
  div.textContent = text;
  body.appendChild(div);
  body.scrollTop = body.scrollHeight;
  ariaMessages.push({role: 'user', content: text});
}

function sendAriaMsg() {
  const inp = document.getElementById('caChatInput');
  const text = inp.value.trim();
  if (!text) return;
  addUserMsg(text);
  inp.value = '';
  
  setTimeout(() => {
    let lower = text.toLowerCase();
    if (lower.includes('save') || lower.includes('advice') || lower.includes('tip')) {
      const tip = CA_TIPS[Math.floor(Math.random() * CA_TIPS.length)];
      addAriaMsg("💡 <strong>Tip from Aria:</strong> " + tip);
    } else if (lower.includes('hi') || lower.includes('hello')) {
      addAriaMsg("Hello! Need help analyzing your expenses or setting a budget?");
    } else {
      addAriaMsg("I'm analyzing your data... You can check the <strong>Analysis</strong> or <strong>Prediction</strong> tabs for a visual breakdown of your finances.");
    }
  }, 600);
}

function generateCAAdvice(cats, total, pct, income, saveGoal) {
  const advice = [];
  const topCat = Object.entries(cats).sort((a,b) => b[1]-a[1])[0];

  if (total === 0) {
    advice.push({ type:'info', icon:'fa-info-circle', msg: "No expenses logged yet this month. Tap '+ Add Expense' to start tracking." });
    return advice;
  }

  if (topCat) {
    const topPct = Math.round(topCat[1] / total * 100);
    if (topPct > 40) {
      advice.push({ type:'warning', icon:'fa-fire', msg: `${topCat[0]} is ${topPct}% of your total spending. Is this within your plan?` });
    }
  }

  // Future Savings Recommendation (From our latest features!)
  if (typeof forecast === 'function') {
    const fc = forecast();
    if (fc > 0) {
      const futureGoal = income > 0 ? fmt(Math.round(income * 0.2)) : fmt(Math.round(fc * 0.15));
      advice.push({ type:'success', icon:'fa-seedling', msg: `🔮 Future Plan: Cap next month's spending below ${fmt(fc)} to easily save ${futureGoal}! Try the 30-day wait rule for big purchases.` });
    }
  }

  return advice.slice(0, 5);
}

// Global functions for patching (if required by app.js)
window.generateCAAdvice = generateCAAdvice;
window.toggleCAPanel = toggleCAPanel;

// Interactive Wizard
let wzStep = 1;
let wzData = { desc: '', amount: '', cat: '', date: '', notes: '' };

function openWizard() {
  document.getElementById('wizardOverlay').classList.remove('hidden');
  wzStep = 1;
  wzData = { desc: '', amount: '', cat: '', date: new Date().toISOString().split('T')[0], notes: '' };
  renderWizardStep();
}

function closeWizard() {
  document.getElementById('wizardOverlay').classList.add('hidden');
}

function wizardBack() { if (wzStep > 1) { wzStep--; renderWizardStep(); } }
function wizardNext() {
  if (!validateWizardStep()) return;
  if (wzStep < 4) { wzStep++; renderWizardStep(); }
  else { commitWizardExpense(); closeWizard(); }
}

function validateWizardStep() {
  if (wzStep === 1) {
    const v = document.getElementById('wzInpDesc').value.trim();
    if (!v) { showToast('Please enter a description.', 'error'); return false; }
    wzData.desc = v;
  } else if (wzStep === 2) {
    const v = document.getElementById('wzInpAmt').value.trim();
    if (!v || isNaN(v) || Number(v) <= 0) { showToast('Please enter a valid amount.', 'error'); return false; }
    wzData.amount = v;
  } else if (wzStep === 3) {
    if (!wzData.cat) { showToast('Please select a category.', 'error'); return false; }
  }
  return true;
}

function setWzCat(cat, el) {
  wzData.cat = cat;
  document.querySelectorAll('.qp-chip').forEach(c => c.classList.remove('selected'));
  if (el) el.classList.add('selected');
}

function renderWizardStep() {
  const q = document.getElementById('wzQuestion');
  const b = document.getElementById('wzBody');
  const btnN = document.getElementById('wzNext');
  
  if (wzStep === 1) {
    q.textContent = "What did you spend on?";
    b.innerHTML = `<input type="text" id="wzInpDesc" class="wz-main-input" placeholder="e.g. Weekly Groceries" value="${wzData.desc}">`;
    btnN.innerHTML = `Next <i class="fas fa-chevron-right"></i>`;
    setTimeout(()=>document.getElementById('wzInpDesc').focus(), 100);
  } else if (wzStep === 2) {
    q.textContent = "How much did it cost?";
    b.innerHTML = `<input type="number" id="wzInpAmt" class="wz-main-input" placeholder="0.00" value="${wzData.amount}">`;
    btnN.innerHTML = `Next <i class="fas fa-chevron-right"></i>`;
    setTimeout(()=>document.getElementById('wzInpAmt').focus(), 100);
  } else if (wzStep === 3) {
    q.textContent = "Which category?";
    const cats = ['Food & Dining', 'Transportation', 'Shopping', 'Entertainment', 'Bills & Utilities', 'Healthcare', 'Others'];
    b.innerHTML = `<div class="quick-picks">
      ${cats.map(c => `<div class="qp-chip ${wzData.cat === c ? 'selected':''}" onclick="setWzCat('${c}', this)">${c}</div>`).join('')}
    </div>`;
    btnN.innerHTML = `Next <i class="fas fa-chevron-right"></i>`;
  } else if (wzStep === 4) {
    q.textContent = "Almost done. Confirm details:";
    b.innerHTML = `
      <div style="background:var(--surface-hover); padding:16px; border-radius:12px; border:1px solid var(--border);">
        <p style="margin-bottom:8px"><strong>Description:</strong> ${wzData.desc}</p>
        <p style="margin-bottom:8px"><strong>Amount:</strong> ₹${wzData.amount}</p>
        <p style="margin-bottom:8px"><strong>Category:</strong> ${wzData.cat}</p>
        <p><strong>Date:</strong> ${wzData.date}</p>
      </div>`;
    btnN.innerHTML = `<i class="fas fa-check"></i> Save`;
  }

  document.getElementById('wzStepLabel').textContent = `Step ${wzStep} of 4`;
  document.getElementById('wzProgressFill').style.width = `${(wzStep/4)*100}%`;
  
  const dts = document.getElementById('wzDots');
  dts.innerHTML = '';
  for(let i=1; i<=4; i++){
    dts.innerHTML += `<div class="wz-dot ${i<=wzStep ? 'active':''}"><\/div>`;
  }
}

function commitWizardExpense() {
  if (typeof saveDynamicExpense === 'function') {
    saveDynamicExpense(wzData);
  }
}

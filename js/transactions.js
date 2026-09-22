function inMonth(t, year, month) {
  return t.date.startsWith(monthKey(year, month));
}

function filterTransactions(transactions, { year, month, type, category, query, from, to } = {}) {
  return transactions.filter((t) => {
    if (year != null && month != null && !inMonth(t, year, month)) return false;
    if (type && type !== 'all' && t.type !== type) return false;
    if (category && category !== 'all' && t.category !== category) return false;
    if (from && t.date < from) return false;
    if (to && t.date > to) return false;
    if (query) {
      const q = query.toLowerCase();
      const hay = `${t.description} ${t.category} ${t.note || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function summarize(transactions) {
  let income = 0;
  let expense = 0;
  for (const t of transactions) {
    if (t.type === 'income') income += t.amount;
    else expense += t.amount;
  }
  const balance = income - expense;
  const savingsRate = income > 0 ? (balance / income) * 100 : 0;
  return { income, expense, balance, savingsRate };
}

function expensesByCategory(transactions) {
  const map = {};
  let total = 0;
  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    map[t.category] = (map[t.category] || 0) + t.amount;
    total += t.amount;
  }
  return Object.entries(map)
    .map(([name, value]) => ({
      name,
      value,
      percent: total > 0 ? (value / total) * 100 : 0
    }))
    .sort((a, b) => b.value - a.value);
}

/** Saldo acumulado dia a dia no mês (considerando saldo anterior). */
function balanceEvolution(allTransactions, year, month, previousBalance) {
  const days = daysInMonth(year, month);
  const byDay = {};
  for (const t of allTransactions) {
    if (!inMonth(t, year, month)) continue;
    const day = Number(t.date.slice(8, 10));
    const delta = t.type === 'income' ? t.amount : -t.amount;
    byDay[day] = (byDay[day] || 0) + delta;
  }
  let running = previousBalance;
  const points = [];
  for (let d = 1; d <= days; d++) {
    running += byDay[d] || 0;
    points.push({ day: d, balance: running });
  }
  return points;
}

function monthSummaries(allTransactions, year) {
  return MONTHS.map((_, month) => {
    const list = filterTransactions(allTransactions, { year, month });
    const s = summarize(list);
    return { month, label: MONTHS[month], ...s };
  });
}

/** Saldo acumulado até o fim do mês anterior ao (year, month). */
function cumulativeBefore(allTransactions, year, month) {
  let bal = 0;
  for (const t of allTransactions) {
    const [y, m] = t.date.split('-').map(Number);
    const ty = y;
    const tm = m - 1;
    if (ty < year || (ty === year && tm < month)) {
      bal += t.type === 'income' ? t.amount : -t.amount;
    }
  }
  return bal;
}

function cumulativeThrough(allTransactions, year, month) {
  let bal = 0;
  for (const t of allTransactions) {
    const [y, m] = t.date.split('-').map(Number);
    const ty = y;
    const tm = m - 1;
    if (ty < year || (ty === year && tm <= month)) {
      bal += t.type === 'income' ? t.amount : -t.amount;
    }
  }
  return bal;
}

function ensureRecurringForMonth(state, year, month) {
  let changed = false;
  for (const r of state.recurring) {
    if (!r.active) continue;
    const exists = state.transactions.some(
      (t) => t.recurringId === r.id && inMonth(t, year, month)
    );
    if (exists) continue;
    const day = clampDay(year, month, r.dayOfMonth);
    state.transactions.push({
      id: uid(),
      type: r.type,
      description: r.description,
      amount: r.amount,
      category: r.category,
      date: `${year}-${pad2(month + 1)}-${pad2(day)}`,
      note: r.note || '',
      recurringId: r.id
    });
    changed = true;
  }
  return changed;
}

function addCategory(state, type, name) {
  const key = type === 'income' ? 'income' : 'expense';
  const trimmed = name.trim();
  if (!trimmed) return false;
  if (state.categories[key].some((c) => c.toLowerCase() === trimmed.toLowerCase())) return false;
  state.categories[key].push(trimmed);
  return true;
}

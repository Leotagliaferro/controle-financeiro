function renderDashboard(state) {
  const { selectedYear: y, selectedMonth: m, savingsGoal } = state.settings;
  const monthTx = filterTransactions(state.transactions, { year: y, month: m });
  const { income, expense, balance, savingsRate } = summarize(monthTx);
  const prev = cumulativeBefore(state.transactions, y, m);
  const accumulated = prev + balance;
  const cats = expensesByCategory(monthTx);
  const isDark = state.settings.theme === 'dark';

  qs('#metric-balance').textContent = formatMoney(balance);
  qs('#metric-balance').className = `metric-value ${balance >= 0 ? 'positive' : 'negative'}`;
  qs('#metric-income').textContent = formatMoney(income);
  qs('#metric-expense').textContent = formatMoney(expense);
  qs('#metric-savings').textContent = formatMoney(balance);
  qs('#metric-savings-rate').textContent =
    income > 0
      ? `Você economizou ${savingsRate.toFixed(1).replace('.', ',')}% da sua renda`
      : 'Sem entradas neste mês';

  qs('#metric-accumulated').textContent = formatMoney(accumulated);
  qs('#metric-accumulated').className = `metric-value ${accumulated >= 0 ? 'positive' : 'negative'}`;

  const goal = Number(savingsGoal) || 0;
  const progress = goal > 0 ? Math.min(100, Math.max(0, (balance / goal) * 100)) : 0;
  qs('#goal-target').textContent = formatMoney(goal);
  qs('#goal-saved').textContent = formatMoney(Math.max(0, balance));
  qs('#goal-percent').textContent = `${progress.toFixed(0)}%`;
  qs('#goal-bar').style.width = `${progress}%`;
  qs('#goal-bar').classList.toggle('over', balance >= goal && goal > 0);

  const list = qs('#category-breakdown');
  if (!cats.length) {
    list.innerHTML = `<li class="empty-hint">Nenhuma despesa neste mês.</li>`;
  } else {
    list.innerHTML = cats
      .map(
        (c) => `<li>
          <div class="cat-row">
            <span class="cat-name">${escapeHtml(c.name)}</span>
            <span class="cat-meta">${formatMoney(c.value)} · ${c.percent.toFixed(0)}%</span>
          </div>
          <div class="cat-bar"><span style="width:${c.percent}%"></span></div>
        </li>`
      )
      .join('');
  }

  renderIncomeExpenseChart('chart-income-expense', income, expense, isDark);
  renderCategoryChart('chart-categories', cats, isDark);
  renderBalanceChart(
    'chart-balance',
    balanceEvolution(state.transactions, y, m, prev),
    isDark
  );
}

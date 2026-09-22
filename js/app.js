let state = loadState();

function persist() {
  saveState(state);
}

function toast(msg) {
  const el = qs('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.hidden = true; }, 2400);
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.settings.theme);
  qs('#btn-theme').textContent = state.settings.theme === 'dark' ? '☀' : '◐';
}

function shiftMonth(delta) {
  let y = state.settings.selectedYear;
  let m = state.settings.selectedMonth + delta;
  if (m < 0) { m = 11; y -= 1; }
  if (m > 11) { m = 0; y += 1; }
  state.settings.selectedYear = y;
  state.settings.selectedMonth = m;
  persist();
  refreshAll();
}

function fillMonthSelect() {
  const sel = qs('#month-select');
  const y = state.settings.selectedYear;
  const m = state.settings.selectedMonth;
  const options = [];
  for (let i = -18; i <= 6; i++) {
    let mm = m + i;
    let yy = y;
    while (mm < 0) { mm += 12; yy -= 1; }
    while (mm > 11) { mm -= 12; yy += 1; }
    options.push({ y: yy, m: mm, label: monthLabel(yy, mm) });
  }
  const seen = new Set();
  sel.innerHTML = options
    .filter((o) => {
      const k = `${o.y}-${o.m}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .map((o) => `<option value="${o.y}-${o.m}" ${o.y === y && o.m === m ? 'selected' : ''}>${o.label}</option>`)
    .join('');
  qs('#dashboard-subtitle').textContent = `Visão de ${monthLabel(y, m)}.`;
}

function ensureCurrentMonthRecurring() {
  if (ensureRecurringForMonth(state, state.settings.selectedYear, state.settings.selectedMonth)) {
    persist();
  }
}

function setView(name) {
  qsa('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
  qsa('.view').forEach((v) => {
    const on = v.id === `view-${name}`;
    v.hidden = !on;
    v.classList.toggle('active', on);
  });
  closeSidebar();
  if (name === 'transactions') renderTransactions();
  if (name === 'recurring') renderRecurring();
  if (name === 'annual') renderAnnual();
  if (name === 'settings') qs('#settings-goal').value = state.settings.savingsGoal;
}

function closeSidebar() {
  qs('#sidebar').classList.remove('open');
  qs('#sidebar-overlay').hidden = true;
}

function openModal(id) {
  qs(`#${id}`).showModal();
}

function closeModal(id) {
  const el = qs(`#${id}`);
  if (el.open) el.close();
}

function categoriesFor(type) {
  return state.categories[type === 'income' ? 'income' : 'expense'];
}

function fillCategorySelect(selectEl, type, selected) {
  const cats = categoriesFor(type);
  selectEl.innerHTML = cats.map((c) =>
    `<option value="${escapeHtml(c)}" ${c === selected ? 'selected' : ''}>${escapeHtml(c)}</option>`
  ).join('');
}

function currentTxType() {
  return qs('input[name="tx-type"]:checked')?.value || 'income';
}

function currentRecType() {
  return qs('input[name="rec-type"]:checked')?.value || 'expense';
}

function openTxModal(existing) {
  qs('#modal-tx-title').textContent = existing ? 'Editar lançamento' : 'Novo lançamento';
  qs('#tx-id').value = existing?.id || '';
  qs('#tx-description').value = existing?.description || '';
  qs('#tx-amount').value = existing ? existing.amount : '';
  qs('#tx-date').value = existing?.date || toISODate();
  qs('#tx-note').value = existing?.note || '';
  qs('#tx-new-category').value = '';
  qs('#tx-error').hidden = true;
  const type = existing?.type || 'expense';
  qsa('input[name="tx-type"]').forEach((r) => { r.checked = r.value === type; });
  fillCategorySelect(qs('#tx-category'), type, existing?.category);
  openModal('modal-tx');
  qs('#tx-description').focus();
}

function openRecurringModal(existing, opts = {}) {
  const type = existing?.type || opts.type || 'expense';
  const isIncome = type === 'income';
  const editing = Boolean(existing);
  qs('#modal-recurring-title').textContent = editing
    ? (isIncome ? 'Editar entrada fixa' : 'Editar despesa fixa')
    : (isIncome ? 'Nova entrada fixa' : 'Nova despesa fixa');
  qs('#rec-id').value = existing?.id || '';
  qs('#rec-description').value = existing?.description || opts.description || '';
  qs('#rec-amount').value = existing ? existing.amount : (opts.amount ?? '');
  qs('#rec-day').value = existing?.dayOfMonth || opts.dayOfMonth || 5;
  qs('#rec-note').value = existing?.note || '';
  qs('#rec-error').hidden = true;
  qsa('input[name="rec-type"]').forEach((r) => { r.checked = r.value === type; });
  // Se veio de um botão específico, esconde a troca de tipo para não confundir
  qs('#rec-type-toggle').hidden = Boolean(opts.lockType) && !editing;
  fillCategorySelect(qs('#rec-category'), type, existing?.category || opts.category);
  openModal('modal-recurring');
  qs('#rec-description').focus();
}

function recurringRowHtml(r) {
  return `
    <tr>
      <td>${escapeHtml(r.description)}</td>
      <td>${escapeHtml(r.category)}</td>
      <td>Dia ${r.dayOfMonth}</td>
      <td class="num">${formatMoney(r.amount)}</td>
      <td><span class="badge ${r.active ? 'income' : 'off'}">${r.active ? 'Ativa' : 'Inativa'}</span></td>
      <td>
        <div class="row-actions">
          <button type="button" data-toggle-rec="${r.id}">${r.active ? 'Desativar' : 'Ativar'}</button>
          <button type="button" data-edit-rec="${r.id}">Editar</button>
          <button type="button" class="danger" data-del-rec="${r.id}">Excluir</button>
        </div>
      </td>
    </tr>
  `;
}

function recurringCardHtml(r) {
  return `
    <article class="rec-card">
      <div class="rec-card-top">
        <div>
          <strong>${escapeHtml(r.description)}</strong>
          <div class="muted tiny">${escapeHtml(r.category)} · Todo dia ${r.dayOfMonth}</div>
        </div>
        <div class="${r.type === 'income' ? 'amount-income' : 'amount-expense'}">${formatMoney(r.amount)}</div>
      </div>
      <div class="row-actions">
        <span class="badge ${r.active ? 'income' : 'off'}">${r.active ? 'Ativa' : 'Inativa'}</span>
        <button type="button" data-toggle-rec="${r.id}">${r.active ? 'Desativar' : 'Ativar'}</button>
        <button type="button" data-edit-rec="${r.id}">Editar</button>
        <button type="button" class="danger" data-del-rec="${r.id}">Excluir</button>
      </div>
    </article>
  `;
}

function renderFixedList(type, tbodyId, cardsId, emptyId) {
  const list = state.recurring
    .filter((r) => r.type === type)
    .sort((a, b) => a.dayOfMonth - b.dayOfMonth || a.description.localeCompare(b.description, 'pt-BR'));
  qs(`#${tbodyId}`).innerHTML = list.map(recurringRowHtml).join('');
  qs(`#${cardsId}`).innerHTML = list.map(recurringCardHtml).join('');
  qs(`#${emptyId}`).hidden = list.length > 0;
}

function renderRecurring() {
  renderFixedList('income', 'fixed-income-tbody', 'fixed-income-cards', 'fixed-income-empty');
  renderFixedList('expense', 'fixed-expense-tbody', 'fixed-expense-cards', 'fixed-expense-empty');
}

function updateSetupPanel() {
  const panel = qs('#setup-fixed');
  if (!panel) return;
  const hasFixedIncome = state.recurring.some((r) => r.type === 'income' && r.active);
  const showingDemo = isDemoData();
  panel.hidden = hasFixedIncome || showingDemo;
}

function isDemoData() {
  if (state.settings.demoLoaded) return true;
  const noteHit = (n) => /demonstra|demo/i.test(n || '');
  return (
    state.transactions.some((t) => noteHit(t.note)) ||
    state.recurring.some((r) => noteHit(r.note))
  );
}

function updateDemoBanner() {
  const banner = qs('#demo-banner');
  if (!banner) return;
  banner.hidden = !isDemoData();
}

function resetToEmpty() {
  const theme = state.settings.theme || 'light';
  clearState();
  state = defaultState();
  state.settings.theme = theme;
  state.settings.onboarded = true;
  state.settings.demoLoaded = false;
  persist();
  closeModal('modal-onboard');
  refreshAll();
  toast('Pronto — comece do zero');
}

function parseAmount(raw) {
  return Number(String(raw).replace(',', '.'));
}

function validateTx() {
  const description = qs('#tx-description').value.trim();
  const amount = parseAmount(qs('#tx-amount').value);
  const date = qs('#tx-date').value;
  const err = qs('#tx-error');
  if (!description) {
    err.textContent = 'Informe uma descrição.';
    err.hidden = false;
    return null;
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    err.textContent = 'Informe um valor maior que zero.';
    err.hidden = false;
    return null;
  }
  if (!isValidISODate(date)) {
    err.textContent = 'Informe uma data válida.';
    err.hidden = false;
    return null;
  }
  err.hidden = true;
  return {
    type: currentTxType(),
    description,
    amount: Math.round(amount * 100) / 100,
    category: qs('#tx-category').value,
    date,
    note: qs('#tx-note').value.trim()
  };
}

function validateRec() {
  const description = qs('#rec-description').value.trim();
  const amount = parseAmount(qs('#rec-amount').value);
  const day = Number(qs('#rec-day').value);
  const err = qs('#rec-error');
  if (!description) {
    err.textContent = 'Informe uma descrição.';
    err.hidden = false;
    return null;
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    err.textContent = 'Informe um valor maior que zero.';
    err.hidden = false;
    return null;
  }
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    err.textContent = 'O dia deve ser entre 1 e 31.';
    err.hidden = false;
    return null;
  }
  err.hidden = true;
  return {
    type: currentRecType(),
    description,
    amount: Math.round(amount * 100) / 100,
    category: qs('#rec-category').value,
    dayOfMonth: day,
    note: qs('#rec-note').value.trim(),
    active: true
  };
}

function saveTx(e) {
  e.preventDefault();
  const data = validateTx();
  if (!data) return;
  const id = qs('#tx-id').value;
  if (id) {
    const idx = state.transactions.findIndex((t) => t.id === id);
    if (idx >= 0) {
      state.transactions[idx] = { ...state.transactions[idx], ...data };
    }
  } else {
    state.transactions.push({ id: uid(), ...data });
  }
  persist();
  closeModal('modal-tx');
  toast(id ? 'Lançamento atualizado' : 'Lançamento adicionado');
  refreshAll();
}

function saveRecurring(e) {
  e.preventDefault();
  const data = validateRec();
  if (!data) return;
  const id = qs('#rec-id').value;
  if (id) {
    const idx = state.recurring.findIndex((r) => r.id === id);
    if (idx >= 0) {
      const wasActive = state.recurring[idx].active;
      state.recurring[idx] = { ...state.recurring[idx], ...data, active: wasActive };
    }
  } else {
    state.recurring.push({ id: uid(), ...data });
  }
  ensureCurrentMonthRecurring();
  persist();
  closeModal('modal-recurring');
  toast(id
    ? (data.type === 'income' ? 'Entrada fixa atualizada' : 'Despesa fixa atualizada')
    : (data.type === 'income' ? 'Entrada fixa cadastrada' : 'Despesa fixa cadastrada'));
  refreshAll();
}

function deleteTx(id) {
  if (!confirm('Excluir este lançamento?')) return;
  state.transactions = state.transactions.filter((t) => t.id !== id);
  persist();
  toast('Lançamento excluído');
  refreshAll();
}

function fillFilterCategories() {
  const sel = qs('#filter-category');
  const all = [...new Set([...state.categories.income, ...state.categories.expense])].sort((a, b) =>
    a.localeCompare(b, 'pt-BR')
  );
  const current = sel.value || 'all';
  sel.innerHTML = `<option value="all">Todas</option>` +
    all.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  sel.value = all.includes(current) || current === 'all' ? current : 'all';
}

function getFilteredMonthTx() {
  const { selectedYear: year, selectedMonth: month } = state.settings;
  return filterTransactions(state.transactions, {
    year,
    month,
    type: qs('#filter-type').value,
    category: qs('#filter-category').value,
    query: qs('#filter-query').value.trim(),
    from: qs('#filter-from').value || undefined,
    to: qs('#filter-to').value || undefined
  }).sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
}

function renderTransactions() {
  fillFilterCategories();
  const list = getFilteredMonthTx();
  const tbody = qs('#tx-tbody');
  const cards = qs('#tx-cards');
  const empty = qs('#tx-empty');
  empty.hidden = list.length > 0;

  tbody.innerHTML = list.map((t) => `
    <tr>
      <td>${formatDateBR(t.date)}</td>
      <td>${escapeHtml(t.description)}</td>
      <td>${escapeHtml(t.category)}</td>
      <td><span class="badge ${t.type}">${t.type === 'income' ? 'Entrada' : 'Saída'}</span></td>
      <td class="num ${t.type === 'income' ? 'amount-income' : 'amount-expense'}">${formatSigned(t.type === 'income' ? t.amount : -t.amount)}</td>
      <td>
        <div class="row-actions">
          <button type="button" data-edit-tx="${t.id}">Editar</button>
          <button type="button" class="danger" data-del-tx="${t.id}">Excluir</button>
        </div>
      </td>
    </tr>
  `).join('');

  cards.innerHTML = list.map((t) => `
    <article class="tx-card">
      <div class="tx-card-top">
        <div>
          <strong>${escapeHtml(t.description)}</strong>
          <div class="muted tiny">${formatDateBR(t.date)} · ${escapeHtml(t.category)}</div>
        </div>
        <div class="${t.type === 'income' ? 'amount-income' : 'amount-expense'}">${formatSigned(t.type === 'income' ? t.amount : -t.amount)}</div>
      </div>
      <div class="row-actions">
        <span class="badge ${t.type}">${t.type === 'income' ? 'Entrada' : 'Saída'}</span>
        <button type="button" data-edit-tx="${t.id}">Editar</button>
        <button type="button" class="danger" data-del-tx="${t.id}">Excluir</button>
      </div>
    </article>
  `).join('');
}

function renderAnnual() {
  const yearSel = qs('#annual-year');
  const years = new Set([state.settings.selectedYear, new Date().getFullYear()]);
  state.transactions.forEach((t) => years.add(Number(t.date.slice(0, 4))));
  const sorted = [...years].sort((a, b) => b - a);
  const current = Number(yearSel.value) || state.settings.selectedYear;
  yearSel.innerHTML = sorted.map((y) =>
    `<option value="${y}" ${y === current ? 'selected' : ''}>${y}</option>`
  ).join('');
  const year = Number(yearSel.value);
  const summaries = monthSummaries(state.transactions, year);
  qs('#annual-tbody').innerHTML = summaries.map((s) => `
    <tr>
      <td>${s.label}</td>
      <td class="num amount-income">${formatMoney(s.income)}</td>
      <td class="num amount-expense">${formatMoney(s.expense)}</td>
      <td class="num ${s.balance >= 0 ? 'amount-income' : 'amount-expense'}">${formatMoney(s.balance)}</td>
    </tr>
  `).join('');
  renderAnnualChart('chart-annual', summaries, state.settings.theme === 'dark');
}

function loadDemo() {
  const { selectedYear: y, selectedMonth: m } = state.settings;
  const mk = (day) => `${y}-${pad2(m + 1)}-${pad2(clampDay(y, m, day))}`;
  // Recorrentes geram salário/aluguel/internet/netflix; extras variáveis entram à mão.
  state.recurring = [
    { id: uid(), type: 'income', description: 'Salário', amount: 3000, category: 'Salário', dayOfMonth: 5, active: true, note: 'Demo' },
    { id: uid(), type: 'expense', description: 'Aluguel', amount: 1200, category: 'Moradia', dayOfMonth: 5, active: true, note: 'Demo' },
    { id: uid(), type: 'expense', description: 'Internet', amount: 100, category: 'Contas', dayOfMonth: 10, active: true, note: 'Demo' },
    { id: uid(), type: 'expense', description: 'Netflix', amount: 59.9, category: 'Assinaturas', dayOfMonth: 15, active: true, note: 'Demo' }
  ];
  state.transactions = [
    { id: uid(), type: 'income', description: 'Freelance site', amount: 800, category: 'Freelance', date: mk(10), note: 'Dados de demonstração' },
    { id: uid(), type: 'income', description: 'Freelance manutenção', amount: 350, category: 'Freelance', date: mk(18), note: 'Dados de demonstração' },
    { id: uid(), type: 'income', description: 'Venda usada', amount: 200, category: 'Venda', date: mk(22), note: 'Dados de demonstração' },
    { id: uid(), type: 'expense', description: 'Mercado', amount: 500, category: 'Alimentação', date: mk(8), note: 'Dados de demonstração' },
    { id: uid(), type: 'expense', description: 'Energia', amount: 180, category: 'Contas', date: mk(12), note: 'Dados de demonstração' },
    { id: uid(), type: 'expense', description: 'Combustível', amount: 300, category: 'Transporte', date: mk(15), note: 'Dados de demonstração' },
    { id: uid(), type: 'expense', description: 'Cinema e jantar', amount: 200, category: 'Lazer', date: mk(20), note: 'Dados de demonstração' }
  ];
  state.settings.demoLoaded = true;
  state.settings.savingsGoal = 1000;
  ensureCurrentMonthRecurring();
  persist();
}

function refreshAll() {
  ensureCurrentMonthRecurring();
  fillMonthSelect();
  applyTheme();
  renderDashboard(state);
  updateDemoBanner();
  updateSetupPanel();
  const active = qs('.nav-btn.active')?.dataset.view || 'dashboard';
  if (active === 'transactions') renderTransactions();
  if (active === 'recurring') renderRecurring();
  if (active === 'annual') renderAnnual();
  if (active === 'settings') qs('#settings-goal').value = state.settings.savingsGoal;
}

function bindEvents() {
  qsa('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!btn.dataset.view) return;
      setView(btn.dataset.view);
    });
  });

  qs('#btn-menu').addEventListener('click', () => {
    qs('#sidebar').classList.add('open');
    qs('#sidebar-overlay').hidden = false;
  });
  qs('#sidebar-overlay').addEventListener('click', closeSidebar);

  qs('#btn-prev-month').addEventListener('click', () => shiftMonth(-1));
  qs('#btn-next-month').addEventListener('click', () => shiftMonth(1));
  qs('#month-select').addEventListener('change', (e) => {
    const [y, m] = e.target.value.split('-').map(Number);
    state.settings.selectedYear = y;
    state.settings.selectedMonth = m;
    persist();
    refreshAll();
  });

  qs('#btn-theme').addEventListener('click', () => {
    state.settings.theme = state.settings.theme === 'dark' ? 'light' : 'dark';
    persist();
    applyTheme();
    refreshAll();
  });

  ['btn-new-tx', 'btn-new-tx-top', 'btn-new-tx-list'].forEach((id) => {
    qs(`#${id}`).addEventListener('click', () => openTxModal());
  });
  qs('#btn-new-fixed-income').addEventListener('click', () =>
    openRecurringModal(null, { type: 'income', lockType: true })
  );
  qs('#btn-new-fixed-expense').addEventListener('click', () =>
    openRecurringModal(null, { type: 'expense', lockType: true })
  );
  qs('#btn-setup-salary').addEventListener('click', () =>
    openRecurringModal(null, {
      type: 'income',
      lockType: true,
      description: 'Salário',
      category: 'Salário',
      dayOfMonth: 5
    })
  );
  qs('#btn-setup-income').addEventListener('click', () =>
    openRecurringModal(null, { type: 'income', lockType: true })
  );
  qs('#btn-setup-expense').addEventListener('click', () =>
    openRecurringModal(null, { type: 'expense', lockType: true })
  );
  qs('#btn-goto-fixos').addEventListener('click', () => setView('recurring'));

  qsa('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });

  qsa('input[name="tx-type"]').forEach((r) => {
    r.addEventListener('change', () => fillCategorySelect(qs('#tx-category'), currentTxType()));
  });
  qsa('input[name="rec-type"]').forEach((r) => {
    r.addEventListener('change', () => fillCategorySelect(qs('#rec-category'), currentRecType()));
  });

  qs('#btn-add-category').addEventListener('click', () => {
    const name = qs('#tx-new-category').value;
    const type = currentTxType();
    if (addCategory(state, type, name)) {
      persist();
      fillCategorySelect(qs('#tx-category'), type, name.trim());
      qs('#tx-new-category').value = '';
      toast('Categoria adicionada');
    } else {
      toast('Categoria inválida ou já existe');
    }
  });

  qs('#form-tx').addEventListener('submit', saveTx);
  qs('#form-recurring').addEventListener('submit', saveRecurring);

  qs('#form-goal').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = parseAmount(qs('#goal-input').value);
    if (!Number.isFinite(v) || v < 0) return;
    state.settings.savingsGoal = Math.round(v * 100) / 100;
    persist();
    closeModal('modal-goal');
    refreshAll();
    toast('Meta atualizada');
  });

  qs('#btn-edit-goal').addEventListener('click', () => {
    qs('#goal-input').value = state.settings.savingsGoal;
    openModal('modal-goal');
  });

  qs('#btn-save-goal').addEventListener('click', () => {
    const v = parseAmount(qs('#settings-goal').value);
    if (!Number.isFinite(v) || v < 0) {
      toast('Informe uma meta válida');
      return;
    }
    state.settings.savingsGoal = Math.round(v * 100) / 100;
    persist();
    refreshAll();
    toast('Meta salva');
  });

  ['filter-query', 'filter-type', 'filter-category', 'filter-from', 'filter-to'].forEach((id) => {
    qs(`#${id}`).addEventListener('input', renderTransactions);
    qs(`#${id}`).addEventListener('change', renderTransactions);
  });

  document.addEventListener('click', (e) => {
    const editTx = e.target.closest('[data-edit-tx]');
    const delTx = e.target.closest('[data-del-tx]');
    const editRec = e.target.closest('[data-edit-rec]');
    const delRec = e.target.closest('[data-del-rec]');
    const toggleRec = e.target.closest('[data-toggle-rec]');

    if (editTx) {
      const t = state.transactions.find((x) => x.id === editTx.dataset.editTx);
      if (t) openTxModal(t);
    }
    if (delTx) deleteTx(delTx.dataset.delTx);
    if (editRec) {
      const r = state.recurring.find((x) => x.id === editRec.dataset.editRec);
      if (r) openRecurringModal(r);
    }
    if (delRec) {
      if (!confirm('Excluir este item fixo? Lançamentos já gerados não serão apagados.')) return;
      state.recurring = state.recurring.filter((r) => r.id !== delRec.dataset.delRec);
      persist();
      toast('Item fixo excluído');
      renderRecurring();
      updateSetupPanel();
    }
    if (toggleRec) {
      const r = state.recurring.find((x) => x.id === toggleRec.dataset.toggleRec);
      if (!r) return;
      r.active = !r.active;
      if (r.active) ensureCurrentMonthRecurring();
      persist();
      toast(r.active ? 'Item ativado' : 'Item desativado');
      refreshAll();
    }
  });

  qs('#annual-year').addEventListener('change', renderAnnual);

  qs('#btn-export-json').addEventListener('click', () => {
    exportJSON(state);
    toast('Backup exportado');
  });

  qs('#btn-export-csv').addEventListener('click', () => {
    exportCSV(state.transactions);
    toast('CSV exportado');
  });

  qs('#input-import').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!confirm('Importar este backup? Os dados atuais serão substituídos.')) return;
    try {
      const text = await file.text();
      state = importJSON(text);
      persist();
      refreshAll();
      toast('Backup restaurado');
    } catch (err) {
      alert('Não foi possível importar o arquivo. Verifique se é um backup válido.');
      console.error(err);
    }
  });

  qs('#btn-load-demo').addEventListener('click', () => {
    if (state.transactions.length && !confirm('Isso substitui os lançamentos e recorrências atuais por dados de demonstração. Continuar?')) {
      return;
    }
    loadDemo();
    refreshAll();
    toast('Dados de demonstração carregados');
  });

  qs('#btn-clear-all').addEventListener('click', () => {
    if (!confirm('Tem certeza? Todos os dados serão apagados deste navegador.')) return;
    if (!confirm('Última confirmação: limpar tudo?')) return;
    resetToEmpty();
  });

  qs('#btn-clear-demo').addEventListener('click', () => {
    if (!confirm('Apagar os dados de demonstração e começar limpo?')) return;
    resetToEmpty();
  });

  qs('#btn-start-empty').addEventListener('click', () => {
    state.settings.onboarded = true;
    state.settings.demoLoaded = false;
    persist();
    closeModal('modal-onboard');
    refreshAll();
  });

  qs('#btn-start-demo').addEventListener('click', () => {
    loadDemo();
    state.settings.onboarded = true;
    persist();
    closeModal('modal-onboard');
    refreshAll();
    toast('Demonstração carregada');
  });
}

function init() {
  applyTheme();
  bindEvents();
  ensureCurrentMonthRecurring();
  refreshAll();
  if (!state.settings.onboarded) {
    qs('#modal-onboard').showModal();
  } else {
    closeModal('modal-onboard');
  }
}

function revealApp() {
  const root = qs('#app-root');
  if (root) root.hidden = false;
  init();
}

if (document.body.classList.contains('authed')) {
  revealApp();
} else {
  window.addEventListener('finance-authed', revealApp, { once: true });
}
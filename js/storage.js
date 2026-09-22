const STORAGE_KEY = 'controle-financeiro-v1';

const DEFAULT_CATEGORIES = {
  income: ['Salário', 'Freelance', 'Venda', 'Investimentos', 'Outros'],
  expense: [
    'Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Educação',
    'Lazer', 'Assinaturas', 'Contas', 'Compras', 'Investimentos', 'Outros'
  ]
};

function defaultState() {
  return {
    transactions: [],
    recurring: [],
    categories: {
      income: [...DEFAULT_CATEGORIES.income],
      expense: [...DEFAULT_CATEGORIES.expense]
    },
    settings: {
      theme: 'light',
      savingsGoal: 1000,
      selectedYear: new Date().getFullYear(),
      selectedMonth: new Date().getMonth(),
      demoLoaded: false,
      onboarded: false
    }
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const data = JSON.parse(raw);
    const base = defaultState();
    return {
      ...base,
      ...data,
      categories: {
        income: data.categories?.income?.length ? data.categories.income : base.categories.income,
        expense: data.categories?.expense?.length ? data.categories.expense : base.categories.expense
      },
      settings: { ...base.settings, ...data.settings }
    };
  } catch {
    return defaultState();
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}

function exportJSON(state) {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    ...state
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  downloadBlob(`controle-financeiro-backup-${toISODate()}.json`, blob);
}

function importJSON(text) {
  const data = JSON.parse(text);
  if (!data || typeof data !== 'object') throw new Error('Arquivo inválido');
  if (!Array.isArray(data.transactions)) throw new Error('Backup sem lançamentos válidos');
  const base = defaultState();
  return {
    transactions: data.transactions,
    recurring: Array.isArray(data.recurring) ? data.recurring : [],
    categories: {
      income: data.categories?.income?.length ? data.categories.income : base.categories.income,
      expense: data.categories?.expense?.length ? data.categories.expense : base.categories.expense
    },
    settings: { ...base.settings, ...data.settings, onboarded: true }
  };
}

function exportCSV(transactions) {
  const header = 'Data;Descrição;Categoria;Tipo;Valor;Observação';
  const rows = transactions
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((t) => {
      const tipo = t.type === 'income' ? 'Entrada' : 'Saída';
      const valor = String(t.amount).replace('.', ',');
      const note = (t.note || '').replaceAll(';', ',');
      const desc = (t.description || '').replaceAll(';', ',');
      return `${formatDateBR(t.date)};${desc};${t.category};${tipo};${valor};${note}`;
    });
  const bom = '\uFEFF';
  const blob = new Blob([bom + [header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
  downloadBlob(`lancamentos-${toISODate()}.csv`, blob);
}

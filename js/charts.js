const chartInstances = {};

const CHART_COLORS = {
  income: '#1a9f6e',
  expense: '#e05757',
  muted: '#94a3b8',
  palette: [
    '#1a9f6e', '#3b82f6', '#f59e0b', '#e05757', '#8b5cf6',
    '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#64748b', '#14b8a6'
  ]
};

function chartDefaults(isDark) {
  const tick = isDark ? '#94a3b8' : '#64748b';
  const grid = isDark ? 'rgba(148,163,184,0.12)' : 'rgba(100,116,139,0.12)';
  Chart.defaults.color = tick;
  Chart.defaults.borderColor = grid;
  Chart.defaults.font.family = "'Manrope', system-ui, sans-serif";
}

function destroyChart(key) {
  if (chartInstances[key]) {
    chartInstances[key].destroy();
    delete chartInstances[key];
  }
}

function renderIncomeExpenseChart(canvasId, income, expense, isDark) {
  destroyChart(canvasId);
  const el = document.getElementById(canvasId);
  if (!el) return;
  chartDefaults(isDark);
  chartInstances[canvasId] = new Chart(el, {
    type: 'bar',
    data: {
      labels: ['Entradas', 'Saídas'],
      datasets: [{
        data: [income, expense],
        backgroundColor: [CHART_COLORS.income, CHART_COLORS.expense],
        borderRadius: 10,
        maxBarThickness: 72
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => formatMoney(ctx.raw)
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: (v) => formatMoney(v) }
        }
      }
    }
  });
}

function renderCategoryChart(canvasId, items, isDark) {
  destroyChart(canvasId);
  const el = document.getElementById(canvasId);
  if (!el) return;
  chartDefaults(isDark);
  if (!items.length) {
    chartInstances[canvasId] = new Chart(el, {
      type: 'doughnut',
      data: {
        labels: ['Sem despesas'],
        datasets: [{ data: [1], backgroundColor: [CHART_COLORS.muted] }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' }, tooltip: { enabled: false } }
      }
    });
    return;
  }
  chartInstances[canvasId] = new Chart(el, {
    type: 'doughnut',
    data: {
      labels: items.map((i) => i.name),
      datasets: [{
        data: items.map((i) => i.value),
        backgroundColor: items.map((_, i) => CHART_COLORS.palette[i % CHART_COLORS.palette.length]),
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '62%',
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, padding: 14 } },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const item = items[ctx.dataIndex];
              return ` ${formatMoney(item.value)} (${item.percent.toFixed(1)}%)`;
            }
          }
        }
      }
    }
  });
}

function renderBalanceChart(canvasId, points, isDark) {
  destroyChart(canvasId);
  const el = document.getElementById(canvasId);
  if (!el) return;
  chartDefaults(isDark);
  chartInstances[canvasId] = new Chart(el, {
    type: 'line',
    data: {
      labels: points.map((p) => String(p.day)),
      datasets: [{
        label: 'Saldo acumulado',
        data: points.map((p) => p.balance),
        borderColor: '#1a9f6e',
        backgroundColor: 'rgba(26,159,110,0.12)',
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        pointHoverRadius: 5,
        borderWidth: 2.5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (ctx) => formatMoney(ctx.raw) }
        }
      },
      scales: {
        x: { title: { display: true, text: 'Dia' }, grid: { display: false } },
        y: { ticks: { callback: (v) => formatMoney(v) } }
      }
    }
  });
}

function renderAnnualChart(canvasId, summaries, isDark) {
  destroyChart(canvasId);
  const el = document.getElementById(canvasId);
  if (!el) return;
  chartDefaults(isDark);
  chartInstances[canvasId] = new Chart(el, {
    type: 'bar',
    data: {
      labels: summaries.map((s) => s.label.slice(0, 3)),
      datasets: [
        {
          label: 'Entradas',
          data: summaries.map((s) => s.income),
          backgroundColor: CHART_COLORS.income,
          borderRadius: 6,
          maxBarThickness: 28
        },
        {
          label: 'Saídas',
          data: summaries.map((s) => s.expense),
          backgroundColor: CHART_COLORS.expense,
          borderRadius: 6,
          maxBarThickness: 28
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatMoney(ctx.raw)}` } }
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: (v) => formatMoney(v) } }
      }
    }
  });
}

/**
 * Self-check das regras de cálculo (rode no console do navegador ou via Node com adaptadores).
 * No browser: abra o app e cole este arquivo após os scripts, ou rode os asserts abaixo no DevTools.
 */
(function selfCheck() {
  const tx = [
    { type: 'income', amount: 3000, date: '2026-01-05', category: 'Salário' },
    { type: 'expense', amount: 1200, date: '2026-01-05', category: 'Moradia' },
    { type: 'income', amount: 800, date: '2026-02-10', category: 'Freelance' },
    { type: 'expense', amount: 200, date: '2026-02-12', category: 'Lazer' }
  ];

  const jan = filterTransactions(tx, { year: 2026, month: 0 });
  const sJan = summarize(jan);
  console.assert(sJan.income === 3000, 'jan income');
  console.assert(sJan.expense === 1200, 'jan expense');
  console.assert(sJan.balance === 1800, 'jan balance');

  const beforeFeb = cumulativeBefore(tx, 2026, 1);
  console.assert(beforeFeb === 1800, 'cumulative before feb');

  const throughFeb = cumulativeThrough(tx, 2026, 1);
  console.assert(throughFeb === 2400, 'cumulative through feb');

  const cats = expensesByCategory(jan);
  console.assert(cats[0].name === 'Moradia' && cats[0].percent === 100, 'category breakdown');

  console.log('self-check ok');
})();

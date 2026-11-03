import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import { loadBdbData } from '../src/data/dataProvider.js';

const filters = { start: '2026-11-01', end: '2026-11-03', compareStart: '2025-11-01', compareEnd: '2025-11-03' };
const generatedAt = '2026-11-03T08:02:00-03:00';
const rows = {
  status: [{ period_type: 'current', order_date_brt: '2026-11-01', paid_orders: 2, paid_revenue: 100 }],
  heatmap: [{ order_date_brt: '2026-11-01', order_hour_brt: 8, paid_orders: 2, paid_revenue: 100 }]
};
const jsonResponse = (body) => ({ ok: true, json: async () => body });

test('atualizacao completa ignora cache, atualiza cada visao e isola erro de estoque', async () => {
  const calls = [];
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const params = new URL(url).searchParams;
    calls.push(params);
    const view = params.get('view');
    if (view === 'stock') return jsonResponse({ ok: false, error: 'Query exceeded limit for bytes billed' });
    const window = Object.fromEntries(Object.keys(filters).map((key) => [key, params.get(key)]));
    return jsonResponse({ ok: true, generatedAt, meta: { window, generatedAt }, data: rows[view] || [] });
  };
  try {
    const result = await loadBdbData({ refresh: true, force: true, includeDetails: true, filters });
    assert.equal(result.mode, 'apps_script_refresh');
    assert.deepEqual(calls.map((params) => params.get('view')), ['status', 'heatmap', 'targets', 'channels', 'products', 'quality', 'stock', 'growth', 'crm']);
    assert.ok(calls.every((params) => params.get('force') === '1' && params.get('refresh') === '1'));
    assert.equal(calls[1].get('end'), '2026-11-30');
    assert.equal(calls[0].get('end'), filters.end);
    assert.equal(calls[8].get('end'), filters.end);
    assert.match(result.data.viewErrors.join(' '), /stock.*Query exceeded/);
    assert.ok(result.data.stock.every((item) => item.pending));
    assert.notEqual(result.data.kpis[0].value, 'Pendente');
  } finally { globalThis.fetch = previousFetch; }
});

test('falha da fonte principal e propagada sem retornar dados demonstrativos', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => jsonResponse({ ok: false, error: 'Fonte indisponivel' });
  try {
    await assert.rejects(loadBdbData({ refresh: true, force: true, includeDetails: true, filters }), /Fonte indisponivel/);
  } finally { globalThis.fetch = previousFetch; }
});

test('snapshot nao apresenta estoque de outro periodo como atualizado', async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async () => jsonResponse({
    ok: true, generatedAt, data: { ...rows, stock: [{ sku: 'old-sku', available_total: 20 }] },
    viewMeta: {
      status: { window: filters, generatedAt },
      stock: { window: { ...filters, start: '2026-10-01' }, generatedAt: '2026-10-21T08:00:00-03:00' }
    }
  });
  try {
    const result = await loadBdbData();
    assert.ok(result.data.stock.every((item) => item.pending));
    assert.match(result.data.viewErrors.join(' '), /stock.*outro periodo/);
  } finally { globalThis.fetch = previousFetch; }
});

async function buttonContext(loader) {
  const elements = new Map();
  for (const id of ['dateFilter', 'refreshData', 'refreshNow', 'filterHint', 'startDate', 'endDate', 'compareStartDate', 'compareEndDate']) {
    elements.set(`#${id}`, { disabled: false, textContent: '', handlers: {}, addEventListener(event, handler) { this.handlers[event] = handler; } });
  }
  const context = vm.createContext({
    console: { error() {}, warn() {} }, Intl, Date, Set, Map,
    document: { body: { dataset: {} }, querySelector: (selector) => elements.get(selector), querySelectorAll: () => [] },
    loadBdbData: loader, filters, oldData: { updatedAt: 'antigo', sentinel: true }
  });
  const app = (await readFile(new URL('../src/app.js', import.meta.url), 'utf8')).replace(/^import .*\r?\n/gm, '').replace(/\binit\(\);\s*$/, '');
  vm.runInContext(app, context);
  vm.runInContext('bdbData = oldData; readFilters = () => filters; setFilterInputs = () => {}; renderDashboard = () => {}; bindRefreshButton();', context);
  return { context, elements };
}

test('botao bloqueia cliques repetidos e pede carga completa sem cache', async () => {
  let calls = 0;
  let finish;
  const { context, elements } = await buttonContext((options) => {
    calls += 1;
    assert.equal(options.force, true);
    assert.equal(options.includeDetails, true);
    return new Promise((resolve) => { finish = resolve; });
  });
  const button = elements.get('#refreshNow');
  const pending = button.handlers.click();
  assert.equal(button.disabled, true);
  await button.handlers.click();
  assert.equal(calls, 1);
  finish({ mode: 'apps_script_refresh', data: { updatedAt: 'novo', period: { window: filters }, viewErrors: [] } });
  await pending;
  assert.equal(button.disabled, false);
  assert.equal(button.textContent, 'Atualizar agora');
  assert.equal(vm.runInContext('bdbData.updatedAt', context), 'novo');
  assert.match(elements.get('#filterHint').textContent, /Dados atualizados/);
});

test('botao informa falha e preserva os dados que estavam na tela', async () => {
  const { context, elements } = await buttonContext(async () => { throw new Error('Sem conexao'); });
  await elements.get('#refreshNow').handlers.click();
  assert.equal(vm.runInContext('bdbData === oldData', context), true);
  assert.match(elements.get('#filterHint').textContent, /preservados.*Sem conexao/);
  assert.equal(elements.get('#refreshNow').disabled, false);
});

test('tela acompanha snapshot mais novo sem disparar refresh no BigQuery', async () => {
  const { context, elements } = await buttonContext(async (options) => {
    assert.equal(options, undefined);
    return { mode: 'apps_script_snapshot', data: { generatedAt, updatedAt: 'novo', period: { window: filters } } };
  });
  await vm.runInContext('syncDailySnapshot()', context);
  assert.equal(vm.runInContext('bdbData.generatedAt', context), generatedAt);
  assert.match(elements.get('#filterHint').textContent, /Carga diaria recebida/);
});

test('acompanhamento diario preserva a janela escolhida pelo usuario', async () => {
  let calls = 0;
  const { context, elements } = await buttonContext(async () => { calls += 1; });
  vm.runInContext('syncCompareWithCurrent = () => {}; updateFilterLabels = () => {};', context);
  elements.get('#startDate').handlers.change();
  await vm.runInContext('syncDailySnapshot()', context);
  assert.equal(calls, 0);
  assert.equal(vm.runInContext('bdbData === oldData', context), true);
});

test('abrir o painel com produtos pendentes le somente snapshot e nao busca detalhes', async () => {
  let reads = 0;
  let detailQueries = 0;
  const { context } = await buttonContext(async (options) => {
    reads += 1;
    assert.equal(options, undefined);
    return { mode: 'apps_script_snapshot', data: { products: [{ pending: true }], period: { fromSnapshotMeta: true, window: filters } } };
  });
  context.setInterval = () => 0;
  context.document.addEventListener = () => {};
  context.loadBdbDetails = async () => { detailQueries += 1; };
  vm.runInContext('initSidebarToggle = () => {}; initNavigation = () => {}; initWeekPickerBehavior = () => {}; bindRefreshButton = () => {};', context);
  await vm.runInContext('init()', context);
  assert.equal(reads, 1);
  assert.equal(detailQueries, 0);
});

test('limite de 2 GiB e aplicado somente ao estoque no Apps Script preparado', async () => {
  const requests = [];
  const context = vm.createContext({
    BDB_PROJECT_ID: 'test', BDB_LOCATION: 'southamerica-east1',
    BDB_QUERY_BUILDERS: { stock: () => 'SELECT stock', status: () => 'SELECT status' },
    Utilities: { formatDate: () => generatedAt },
    BigQuery: { Jobs: { query: (request) => {
      requests.push(request);
      return { jobComplete: true, jobReference: { jobId: 'test' }, schema: { fields: [] }, rows: [] };
    } } }
  });
  vm.runInContext(await readFile(new URL('../../05_APPS_SCRIPT_BRIDGE/Code.gs', import.meta.url), 'utf8'), context);
  context.filters = filters;
  vm.runInContext("buildPayloadFromBigQuery_('stock', filters); buildPayloadFromBigQuery_('status', filters);", context);
  assert.equal(requests[0].maximumBytesBilled, '2147483648');
  assert.equal(requests[1].maximumBytesBilled, '1073741824');
});

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import { views, resolveView, isFutureHeatmapCell } from '../src/ui/workspace.js';
import { loadBdbData } from '../src/data/dataProvider.js';

test('todas as nove areas de analise tem destino unico na navegacao', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.equal(views.length, 9);
  assert.equal(new Set(views.map((view) => view.id)).size, 9);
  for (const view of views) assert.match(html, new RegExp(`class="view" id="${view.id}"`));
  assert.equal(resolveView('#crm').id, 'crm');
  assert.equal(resolveView('#evolucao').id, 'status');
  assert.equal(resolveView('#inexistente').id, 'status');
});

test('horarios futuros sao identificados pelo fuso de Sao Paulo', () => {
  const now = new Date('2026-11-03T17:00:00Z');
  assert.equal(isFutureHeatmapCell('2026-11-03', 13, now), false);
  assert.equal(isFutureHeatmapCell('2026-11-03', 14, now), false);
  assert.equal(isFutureHeatmapCell('2026-11-03', 15, now), true);
  assert.equal(isFutureHeatmapCell('2026-11-04', 0, now), true);
  assert.equal(isFutureHeatmapCell('2026-11-02', 23, now), false);
});

test('grafico de um unico dia nao gera coordenadas invalidas', async () => {
  const svg = { innerHTML: '', setAttribute() {} };
  const mode = {};
  const context = vm.createContext({ Intl, Date, document: { querySelector: (selector) => selector === '#paceChart' ? svg : mode } });
  const app = (await readFile(new URL('../src/app.js', import.meta.url), 'utf8')).replace(/^import .*\r?\n/gm, '').replace(/\binit\(\);\s*$/, '');
  vm.runInContext(app, context);
  vm.runInContext("bdbData = { pace: [{day:'03/11',receita:100,meta:120}], paceSecondaryLabel:'Meta acumulada' }; renderPaceChart();", context);
  assert.doesNotMatch(svg.innerHTML, /NaN|Infinity/);
  assert.match(svg.innerHTML, /03\/11/);
});

test('receita de produtos preserva valor de itens SSOT sem ratear total de pedidos', async () => {
  const previousFetch = globalThis.fetch;
  const window = {start:'2026-11-01',end:'2026-11-03',compareStart:'2025-11-01',compareEnd:'2025-11-03'};
  globalThis.fetch = async () => ({ok:true,json:async()=>({ok:true,generatedAt:'2026-11-03T15:00:00-03:00',viewMeta:{status:{window},products:{window}},data:{
    status:[{period_type:'current',order_date_brt:'2026-11-03',paid_orders:1,paid_revenue:100}],
    products:[{sku:'RS8-41',product_title_raw:'Tenis RS8',units_paid:1,item_revenue:80}]
  }})});
  try {
    const result = await loadBdbData();
    assert.equal(result.mode, 'apps_script_snapshot');
    assert.equal(result.data.products.reduce((sum,item)=>sum+item.revenue,0),80);
    assert.equal(result.data.raw.status[0].paid_revenue,100);
  } finally { globalThis.fetch = previousFetch; }
});

import { loadBdbData, loadBdbDetails } from './data/dataProvider.js?v=20261103-ui1';
import { setupSidebar, setupNavigation, setupHeatmapKeyboard, isFutureHeatmapCell } from './ui/workspace.js?v=20261103-ui1';

let bdbData;
let dataMode = 'mock';
let activeFilters;
let compareWasEdited = false;
let selectedHeatmapWeek;
let detailsLoading = false;
let followingDailySnapshot = true;
let snapshotSyncLoading = false;

const money = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const formatInt = (value) => Math.round(Number(value) || 0).toLocaleString('pt-BR');

const qs = (selector, root = document) => root.querySelector(selector);
const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));

function initSidebarToggle() {
  setupSidebar();
}

function initNavigation() {
  setupNavigation();
  setupHeatmapKeyboard();
  document.addEventListener('bdb:viewchange', renderViewStamp);
}

function renderViewStamp() {
  qs('#updatedAt').textContent = bdbData.updatedAt;
  const view = qs('.view:not([hidden])')?.id;
  const sourceViews = { status: 'status', heatmap: 'heatmap', produto: 'products', canais: 'channels', growth: 'growth', crm: 'crm', estoque: 'stock', decisoes: 'status' };
  const generatedAt = bdbData.viewMeta?.[sourceViews[view]]?.generatedAt;
  if (!generatedAt) return;
  const date = new Date(generatedAt);
  if (!Number.isNaN(date.getTime())) qs('#updatedAt').textContent = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function initWeekPickerBehavior() {
  document.addEventListener('click', (event) => {
    const picker = qs('#heatmapWeekPicker');
    const trigger = qs('#heatmapWeekTrigger');
    if (!picker || picker.contains(event.target)) return;
    picker.classList.remove('open');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const picker = qs('#heatmapWeekPicker');
    const trigger = qs('#heatmapWeekTrigger');
    if (!picker) return;
    picker.classList.remove('open');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  });
}

function renderKpis() {
  qs('#updatedAt').textContent = bdbData.updatedAt;
  qs('#periodWindow').textContent = bdbData.period?.label || '--';
  qs('#compareWindow').textContent = bdbData.period?.compareLabel || '--';
  qs('#dataMode').textContent = dataModeLabel(dataMode, bdbData);
  const badge = qs('#connectionBadge');
  if (badge) badge.dataset.state = dataMode.includes('mock') ? 'demo' : (bdbData.viewErrors || []).length ? 'partial' : 'loaded';
  renderAnalysisHealth();
  qs('#kpiGrid').innerHTML = bdbData.kpis.map((kpi) => `
    <article class="kpi-card">
      <div class="kpi-value">
        <span>${kpi.label}</span>
        <strong>${kpi.value}</strong>
      </div>
      <div>
        <p class="delta ${kpi.tone}">${kpi.delta}</p>
        <p class="delta">${kpi.context}</p>
      </div>
    </article>
  `).join('');
}

function renderAnalysisHealth() {
  const loaded = new Set(bdbData.loadedViews || []);
  const statusLoaded = loaded.has('status') && bdbData.kpis[0]?.value !== 'Pendente';
  const productsLoaded = loaded.has('products') && !bdbData.products.every((product) => product.pending);
  const qualityLoaded = loaded.has('quality') && !bdbData.quality.every((item) => item.value === 'Pendente');
  const stockLoaded = loaded.has('stock') && !bdbData.stock.every((item) => item.pending);
  const growthLoaded = loaded.has('growth') && !isPendingGrowth(bdbData.growth);
  const crmLoaded = loaded.has('crm') && !isPendingCrm(bdbData.crm);
  const targetLoaded = loaded.has('targets') && Boolean(bdbData.target?.hasTarget);
  const channelsLoaded = loaded.has('channels') && !(bdbData.channels.length === 1 && bdbData.channels[0].canal === 'Pendente');
  const missingDetails = !productsLoaded || !qualityLoaded || !stockLoaded || !growthLoaded || !crmLoaded;
  const detailButtonLabel = missingDetails ? 'Carregar detalhes pendentes' : 'Atualizar detalhes';
  const detailLabel = bdbData.detailWarning
    ? bdbData.detailWarning
    : bdbData.detailPeriod?.label
      ? `Detalhes: ${bdbData.detailPeriod.label}`
      : 'Detalhes ainda sem janela validada.';
  const items = [
    { label: 'Vendas', loaded: statusLoaded },
    { label: 'Heatmap', loaded: loaded.has('heatmap') },
    { label: 'Produtos', loaded: productsLoaded },
    { label: 'Qualidade', loaded: qualityLoaded },
    { label: 'Estoque', loaded: stockLoaded },
    { label: 'Growth', loaded: growthLoaded },
    { label: 'CRM', loaded: crmLoaded },
    { label: 'Meta', loaded: targetLoaded },
    { label: 'Canais', loaded: channelsLoaded }
  ];
  const pendingUpdates = refreshPendingLabels(bdbData);
  const count = items.filter((item) => item.loaded).length;
  const demo = dataMode.includes('mock');

  qs('#analysisHealth').innerHTML = `
    <div class="health-summary">
      <span class="health-state ${count < items.length || demo ? 'partial' : ''}"><span class="status-dot"></span>${demo ? 'Dados demonstrativos · fonte indisponível' : `${count} de ${items.length} visões carregadas`}</span>
      <span class="muted">${demo ? 'Reconecte a fonte antes de usar os números.' : 'Fonte oficial · SSOT'}</span>
      ${pendingUpdates.length ? `<span class="health-warning" role="status">Pendente: ${escapeHtml(pendingUpdates.join(', '))}</span>` : ''}
      <details class="health-details"><summary>Disponibilidade dos dados</summary><div class="health-popover"><strong>Estado da carga</strong><p>${escapeHtml(detailLabel)}</p><div class="health-pills">${items.map((item) => `<span class="health-pill ${item.loaded ? 'loaded' : 'pending'}">${item.label}: ${item.loaded ? 'carregado' : 'pendente'}</span>`).join('')}</div><button class="inline-load-btn" id="loadDetailViews" type="button">${detailButtonLabel}</button><p>Carregado indica que a fonte respondeu. Campos sem informação permanecem pendentes.</p></div></details>
    </div>
  `;

  const detailButton = qs('#loadDetailViews');
  if (detailButton) {
    detailButton.addEventListener('click', loadDetails);
  }
}

function refreshPendingLabels(data) {
  const labels = { status: 'Vendas', heatmap: 'Heatmap', targets: 'Metas', channels: 'Canais', products: 'Produtos', quality: 'Qualidade', stock: 'Estoque', growth: 'Growth', crm: 'CRM' };
  return [...new Set((data.viewErrors || []).map((error) => error.split(':')[0]).map((view) => labels[view] || view))];
}

async function loadDetails(options = {}) {
  if (detailsLoading || (document.body.dataset.loading === 'true' && !options.background)) return;

  const button = qs('#loadDetailViews');
  detailsLoading = true;
  if (button) {
    button.disabled = true;
    button.textContent = 'Carregando...';
  }
  if (!options.background) {
    document.body.dataset.loading = 'true';
  }

  try {
    activeFilters = readFilters();
    const loaded = await loadBdbDetails({
      filters: activeFilters,
      includeStock: isPendingStock(bdbData.stock)
    });
    bdbData = mergeDashboardData(bdbData, loaded.data);
    dataMode = loaded.mode;
    activeFilters = bdbData.period?.window || activeFilters;
    setFilterInputs(activeFilters);
    renderDashboard();
    if (options.background) {
      const hint = qs('#filterHint');
      if (hint) hint.textContent = bdbData.detailWarning || `Detalhes atualizados: ${bdbData.updatedAt}`;
    }
  } finally {
    detailsLoading = false;
    if (!options.background) {
      document.body.dataset.loading = 'false';
    }
    if (button && button.isConnected) {
      button.disabled = false;
      button.textContent = isPendingProducts(bdbData.products) || isPendingQuality(bdbData.quality) || isPendingStock(bdbData.stock) || isPendingGrowth(bdbData.growth) || isPendingCrm(bdbData.crm)
        ? 'Carregar detalhes'
        : 'Atualizar detalhes';
    }
  }
}

function dataModeLabel(mode, data) {
  if (data && data.refreshSkipped) return 'Carga recente';
  if (mode === 'apps_script_refresh') return 'Atualizado agora';
  if (mode === 'apps_script_details') return 'Detalhes atualizados';
  if (mode === 'apps_script_snapshot') return 'Carga salva';
  if (mode === 'mock_fallback') return 'Modo demonstração';
  return 'Demonstração';
}

function mergeDashboardData(previous, next) {
  if (!previous) return next;

  const nextHasStatus = hasLoadedStatus(next);
  const samePeriod = snapshotKey(previous.period?.window) === snapshotKey(next.period?.window);
  const mergedViews = new Set([...(previous.loadedViews || []), ...(next.loadedViews || [])]);
  const merged = {
    ...next,
    viewMeta: { ...(previous.viewMeta || {}), ...(next.viewMeta || {}) },
    loadedViews: [...mergedViews],
    raw: {
      ...(previous.raw || {}),
      ...(next.raw || {})
    }
  };

  if (!nextHasStatus) {
    merged.period = previous.period;
    merged.kpis = previous.kpis;
    merged.pace = previous.pace;
    merged.paceSecondaryLabel = previous.paceSecondaryLabel;
    merged.signals = previous.signals;
    merged.slack = previous.slack;
  }

  const nextHasDetails = hasLoadedDetails(next);
  if (!nextHasStatus && nextHasDetails && !detailsMatchStatusWindow(previous, next)) {
    return {
      ...previous,
      updatedAt: next.updatedAt || previous.updatedAt,
      detailWarning: `Detalhes ignorados: janela ${next.detailPeriod?.label || 'desconhecida'} diferente do filtro.`
    };
  }

  if (!hasLoadedHeatmap(next)) {
    merged.heatmap = previous.heatmap;
  }

  // A carga de detalhes nao traz channels nem targets. Preserve essas views
  // para que a segunda resposta nao apague o resultado da busca principal.
  if (!(next.loadedViews || []).includes('channels')) {
    merged.channels = previous.channels;
  }

  if (!(next.loadedViews || []).includes('targets')) {
    merged.target = previous.target;
  }

  if (next.detailPeriod) {
    merged.detailPeriod = next.detailPeriod;
    merged.detailWarning = null;
  }

  if (!nextHasStatus || samePeriod) {
    preserveDetailsIfPending(previous, next, merged);
  }

  return merged;
}

function hasLoadedDetails(data) {
  const views = data.loadedViews || [];
  return views.includes('products') || views.includes('quality') || views.includes('stock') || views.includes('growth') || views.includes('crm');
}

function detailsMatchStatusWindow(previous, next) {
  if (!next.detailPeriod?.window || !previous.period?.window) return true;
  return snapshotKey(next.detailPeriod.window) === snapshotKey(previous.period.window);
}

function detailsMatchFilters(filters) {
  if (!bdbData?.detailPeriod?.window) return false;
  return snapshotKey(bdbData.detailPeriod.window) === snapshotKey(filters);
}

function hasCompleteDetails() {
  return !isPendingProducts(bdbData.products) && !isPendingQuality(bdbData.quality) && !isPendingStock(bdbData.stock) && !isPendingGrowth(bdbData.growth) && !isPendingCrm(bdbData.crm);
}

function preserveDetailsIfPending(previous, next, merged) {
  if (isPendingProducts(next.products) && !isPendingProducts(previous.products)) {
    merged.products = previous.products;
  }

  if (isPendingQuality(next.quality) && !isPendingQuality(previous.quality)) {
    merged.quality = previous.quality;
  }

  if (isPendingStock(next.stock) && !isPendingStock(previous.stock)) {
    merged.stock = previous.stock;
  }

  if (isPendingGrowth(next.growth) && !isPendingGrowth(previous.growth)) {
    merged.growth = previous.growth;
  }

  if (isPendingCrm(next.crm) && !isPendingCrm(previous.crm)) {
    merged.crm = previous.crm;
  }

}

function snapshotKey(window) {
  if (!window) return '';
  return [window.start, window.end, window.compareStart, window.compareEnd].join('|');
}

function hasLoadedStatus(data) {
  return (data.loadedViews || []).includes('status') && data.kpis?.[0]?.value !== 'Pendente';
}

function hasLoadedHeatmap(data) {
  return (data.loadedViews || []).includes('heatmap') && data.heatmap?.days?.length;
}

function isPendingProducts(products = []) {
  return !products.length || products.every((product) => product.pending);
}

function isPendingQuality(quality = []) {
  return !quality.length || quality.every((item) => item.value === 'Pendente');
}

function isPendingStock(stock = []) {
  return !stock.length || stock.every((item) => item.pending);
}

function isPendingGrowth(growth) {
  return !growth || growth.pending || !growth.totals;
}

function isPendingCrm(crm) {
  return !crm || crm.pending || !Array.isArray(crm.segments);
}

function bindRefreshButton() {
  const form = qs('#dateFilter');
  const button = qs('#refreshData');
  const refreshNowButton = qs('#refreshNow');
  const hint = qs('#filterHint');
  let searchLoading = false;
  const currentInputs = [qs('#startDate'), qs('#endDate')];
  const compareInputs = [qs('#compareStartDate'), qs('#compareEndDate')];

  qsa('.preset-btn').forEach((preset) => {
    preset.addEventListener('click', async () => {
      compareWasEdited = false;
      applyPreset(preset.dataset.preset);
      qsa('.preset-btn').forEach((item) => item.classList.toggle('active', item === preset));
      await runSearch();
    });
  });

  currentInputs.forEach((input) => {
    input.addEventListener('change', () => {
      followingDailySnapshot = false;
      if (!compareWasEdited) syncCompareWithCurrent();
      updateFilterLabels();
      clearPresetState();
    });
  });

  compareInputs.forEach((input) => {
    input.addEventListener('change', () => {
      followingDailySnapshot = false;
      compareWasEdited = true;
      updateFilterLabels();
    });
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    await runSearch();
  });

  refreshNowButton.addEventListener('click', () => runSearch({ force: true }));

  async function runSearch(options = {}) {
    if (searchLoading || detailsLoading) return;
    followingDailySnapshot = false;
    searchLoading = true;
    button.disabled = true;
    refreshNowButton.disabled = true;
    button.textContent = 'Buscando...';
    if (options.force) refreshNowButton.textContent = 'Atualizando...';
    hint.textContent = options.force ? 'Atualizando todas as visoes. Aguarde...' : 'Consultando BigQuery...';
    document.body.dataset.loading = 'true';
    qsa('.preset-btn').forEach((item) => {
      item.disabled = true;
    });

    try {
      activeFilters = readFilters();
      const loaded = await loadBdbData({
        refresh: true,
        force: Boolean(options.force),
        includeDetails: Boolean(options.force),
        filters: activeFilters
      });
      bdbData = options.force ? loaded.data : mergeDashboardData(bdbData, loaded.data);
      dataMode = loaded.mode;
      document.body.dataset.dataMode = dataMode;
      activeFilters = bdbData.period?.window || activeFilters;
      setFilterInputs(activeFilters);
      renderDashboard();
      button.textContent = bdbData.refreshSkipped ? 'Snapshot recente' : 'Buscar';
      hint.textContent = bdbData.refreshSkipped ? 'Snapshot recente reaproveitado.' : `Atualizado: ${bdbData.updatedAt}`;
      if (options.force) {
        const warnings = refreshPendingLabels(bdbData);
        hint.textContent = warnings.length
          ? `Atualizacao parcial. Ainda pendente: ${warnings.join(', ')}.`
          : `Dados atualizados: ${bdbData.updatedAt}`;
      } else if (dataMode === 'mock_fallback') {
        hint.textContent = 'Falha na busca. Mantive o ultimo mock.';
      } else if (detailsMatchFilters(activeFilters) && hasCompleteDetails()) {
        hint.textContent = 'Status atualizado. Detalhes ja estao nesta janela.';
      } else {
        hint.textContent = 'Status carregado. Completando detalhes...';
        loadDetails({ background: true }).catch(() => {
          hint.textContent = 'Status carregado. Detalhes nao atualizaram nesta tentativa.';
        });
      }
    } catch (error) {
      console.error('Falha ao atualizar dados do BDB.', error);
      hint.textContent = `Falha na atualizacao. Os dados exibidos foram preservados. ${error.message}`;
    } finally {
      searchLoading = false;
      button.disabled = false;
      refreshNowButton.disabled = false;
      refreshNowButton.textContent = 'Atualizar agora';
      document.body.dataset.loading = 'false';
      qsa('.preset-btn').forEach((item) => {
        item.disabled = false;
      });
      button.textContent = 'Aplicar período';
    }
  }
}

async function syncDailySnapshot() {
  if (!followingDailySnapshot || snapshotSyncLoading || detailsLoading || document.hidden || document.body.dataset.loading === 'true') return;
  snapshotSyncLoading = true;
  try {
    // Le apenas o snapshot; acompanhar a carga diaria nao dispara BigQuery.
    const loaded = await loadBdbData();
    if (loaded.mode !== 'apps_script_snapshot' || !loaded.data.generatedAt) return;
    if (new Date(loaded.data.generatedAt).getTime() <= new Date(bdbData.generatedAt || 0).getTime()) return;
    bdbData = loaded.data;
    dataMode = loaded.mode;
    activeFilters = bdbData.period?.window || activeFilters;
    setFilterInputs(activeFilters);
    clearPresetState();
    renderDashboard();
    qs('#filterHint').textContent = `Carga diaria recebida: ${bdbData.updatedAt}`;
  } finally {
    snapshotSyncLoading = false;
  }
}

function defaultFilters() {
  const today = new Date();
  const start = toInputDate(today);
  const end = toInputDate(today);

  return {
    start,
    end,
    compareStart: shiftInputYear(start, -1),
    compareEnd: shiftInputYear(end, -1)
  };
}

function applyPreset(preset) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  let start = new Date(today);
  let end = new Date(today);

  if (preset === 'yesterday') {
    start = new Date(yesterday);
    end = new Date(yesterday);
  }

  if (preset === 'last7') {
    start = new Date(today);
    start.setDate(today.getDate() - 6);
  }

  if (preset === 'last30') {
    start = new Date(today);
    start.setDate(today.getDate() - 29);
  }

  setFilterInputs({
    start: toInputDate(start),
    end: toInputDate(end),
    compareStart: shiftInputYear(toInputDate(start), -1),
    compareEnd: shiftInputYear(toInputDate(end), -1)
  });
  updateFilterLabels();
}

function toInputDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

function shiftInputYear(value, amount) {
  const [year, month, day] = value.split('-');
  return `${Number(year) + amount}-${month}-${day}`;
}

function readFilters() {
  return {
    start: qs('#startDate').value,
    end: qs('#endDate').value,
    compareStart: qs('#compareStartDate').value,
    compareEnd: qs('#compareEndDate').value
  };
}

function setFilterInputs(filters) {
  qs('#startDate').value = filters.start || '';
  qs('#endDate').value = filters.end || '';
  qs('#compareStartDate').value = filters.compareStart || '';
  qs('#compareEndDate').value = filters.compareEnd || '';
  updateFilterLabels();
}

function syncCompareWithCurrent() {
  qs('#compareStartDate').value = shiftInputYear(qs('#startDate').value, -1);
  qs('#compareEndDate').value = shiftInputYear(qs('#endDate').value, -1);
}

function updateFilterLabels() {
  const filters = readFilters();
  qs('#filterCurrentLabel').textContent = compactRange(filters.start, filters.end);
  qs('#filterCompareLabel').textContent = compactRange(filters.compareStart, filters.compareEnd);
}

function compactRange(start, end) {
  if (!start || !end) return '--';
  return `${formatInputDate(start)} - ${formatInputDate(end)}`;
}

function formatInputDate(value) {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year.slice(2)}`;
}

function clearPresetState() {
  qsa('.preset-btn.active').forEach((button) => button.classList.remove('active'));
}

function pointsFor(data, key, width, height, pad) {
  const max = Math.max(...data.flatMap((row) => [row.receita, row.meta]), 1);
  return data.map((row, index) => {
    const ratio = data.length <= 1 ? 0 : index / (data.length - 1);
    const x = pad.left + ratio * (width - pad.left - pad.right);
    const y = height - pad.bottom - (row[key] / max) * (height - pad.top - pad.bottom);
    return { x, y, row };
  });
}

function pathFrom(points) {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
}

function renderPaceChart() {
  const svg = qs('#paceChart');
  const secondaryLabel = bdbData.paceSecondaryLabel || 'Meta planejada';
  const modeLabel = qs('#paceModeLabel');
  if (modeLabel) modeLabel.textContent = secondaryLabel;
  svg.setAttribute('aria-label', `Grafico de evolucao de receita e ${secondaryLabel.toLowerCase()}`);
  if (!bdbData.pace.length) {
    svg.innerHTML = '<text class="chart-label" x="48" y="48">Sem dados para o periodo selecionado.</text>';
    return;
  }

  const width = 920;
  const height = 320;
  const pad = { top: 24, right: 22, bottom: 42, left: 48 };
  const revenue = pointsFor(bdbData.pace, 'receita', width, height, pad);
  const target = pointsFor(bdbData.pace, 'meta', width, height, pad);
  const last = revenue[revenue.length - 1];

  const grid = [0, .25, .5, .75, 1].map((ratio) => {
    const y = pad.top + ratio * (height - pad.top - pad.bottom);
    return `<line class="axis" x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" />`;
  }).join('');

  const labels = bdbData.pace
    .filter((_, index) => index % 3 === 0 || index === bdbData.pace.length - 1)
    .map((row, index, filtered) => {
      const originalIndex = bdbData.pace.indexOf(row);
      const x = pad.left + (bdbData.pace.length <= 1 ? 0 : originalIndex / (bdbData.pace.length - 1)) * (width - pad.left - pad.right);
      return `<text class="chart-label" x="${x}" y="${height - 12}" text-anchor="${index === filtered.length - 1 ? 'end' : 'middle'}">${row.day}</text>`;
    }).join('');

  svg.innerHTML = `
    <defs><linearGradient id="revenueFade" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stop-color="#fb5d06" stop-opacity=".12"/><stop offset="100%" stop-color="#fb5d06" stop-opacity="0"/></linearGradient></defs>
    ${grid}
    <path class="chart-area" d="${pathFrom(revenue)} L ${last.x} ${height - pad.bottom} L ${revenue[0].x} ${height - pad.bottom} Z" />
    <path class="line-target" d="${pathFrom(target)}" />
    <path class="line-revenue" d="${pathFrom(revenue)}" />
    ${revenue.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="3.5" fill="var(--orange)" />`).join('')}
    <circle cx="${last.x}" cy="${last.y}" r="7" fill="var(--orange)" />
    <text class="chart-label chart-value" x="${Math.max(last.x - 10, pad.left + 80)}" y="${Math.max(last.y - 16, 14)}" text-anchor="end">R$ ${last.row.receita} mil</text>
    ${labels}
  `;
}

function renderSignals() {
  qs('#signalList').innerHTML = bdbData.signals.map((signal) => `
    <article class="signal">
      <strong class="delta ${signal.tone}">${signal.label}</strong>
      <span>${signal.value}</span>
    </article>
  `).join('');
}

function cellTone(value, max = 330) {
  const ratio = max ? value / max : 0;
  const alpha = value === 0 ? .05 : Math.min(.86, .14 + ratio * .72);
  return `rgba(251, 93, 6, ${alpha.toFixed(2)})`;
}

function renderHeatmap() {
  const grid = qs('#heatmapGrid');
  const select = qs('#heatmapWeekFilter');
  const picker = qs('#heatmapWeekPicker');
  const trigger = qs('#heatmapWeekTrigger');
  const label = qs('#heatmapWeekLabel');
  const menu = qs('#heatmapWeekMenu');
  const summary = qs('#heatmapSummary');
  const weekHead = qs('#heatmapWeekHead');
  const weeks = bdbData.heatmap.weeks || [];

  grid.style.setProperty('--heatmap-hour-count', bdbData.heatmap.hours.length);

  if (!weeks.length) {
    select.innerHTML = '';
    if (label) label.textContent = 'Semana';
    if (menu) menu.innerHTML = '';
    summary.innerHTML = '';
    weekHead.innerHTML = '';
    grid.innerHTML = '<div class="empty-state">Sem calendario mensal disponivel.</div>';
    qs('#dayDetail').innerHTML = '<p class="eyebrow">Dia aberto</p><p class="delta">Selecione outro periodo ou atualize os dados.</p>';
    return;
  }

  const preferredWeek = selectedHeatmapWeek || weekIdForDate(activeFilters?.start) || weeks[0].id;
  const selectedWeek = weeks.find((week) => week.id === preferredWeek) || weeks[0];
  selectedHeatmapWeek = selectedWeek.id;

  select.innerHTML = weeks.map((week) => `
    <option value="${week.id}" ${week.id === selectedWeek.id ? 'selected' : ''}>${week.label}</option>
  `).join('');
  label.textContent = selectedWeek.label;
  trigger.setAttribute('aria-expanded', 'false');
  picker.classList.remove('open');
  menu.innerHTML = weeks.map((week) => `
    <button class="week-option ${week.id === selectedWeek.id ? 'active' : ''}" type="button" role="option" aria-selected="${week.id === selectedWeek.id}" data-week="${week.id}">
      ${week.label}
    </button>
  `).join('');
  trigger.onclick = () => {
    const isOpen = picker.classList.toggle('open');
    trigger.setAttribute('aria-expanded', String(isOpen));
  };
  trigger.onkeydown = (event) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    picker.classList.add('open');
    trigger.setAttribute('aria-expanded', 'true');
    qs('.week-option.active', menu)?.focus();
  };
  menu.onkeydown = (event) => {
    const options = qsa('.week-option', menu);
    const index = options.indexOf(document.activeElement);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      options[(index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length]?.focus();
    }
    if (event.key === 'Escape') { event.preventDefault(); picker.classList.remove('open'); trigger.setAttribute('aria-expanded', 'false'); trigger.focus(); }
  };
  qsa('.week-option', menu).forEach((option) => {
    option.addEventListener('click', () => {
      selectedHeatmapWeek = option.dataset.week;
      select.value = selectedHeatmapWeek;
      picker.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
      renderHeatmap();
      trigger.focus();
    });
  });

  const monthOrders = bdbData.heatmap.days.reduce((total, day) => total + sumArray(day.values), 0);
  const monthRevenue = bdbData.heatmap.days.reduce((total, day) => total + sumArray(day.revenueValues || []), 0);
  const selectedShare = monthOrders ? Math.round((selectedWeek.orders / monthOrders) * 100) : 0;
  const weekPeak = selectedWeek.peak || { value: 0, date: '--', hour: '--' };
  const monthPeak = peakFromWeeks(weeks);

  summary.innerHTML = [
    { label: 'Mes do heatmap', value: titleCase(bdbData.heatmap.monthLabel || 'Mes selecionado'), note: `${monthOrders.toLocaleString('pt-BR')} pedidos | ${money.format(monthRevenue)}` },
    { label: 'Semana selecionada', value: selectedWeek.label, note: `${selectedWeek.orders.toLocaleString('pt-BR')} pedidos | ${selectedShare}% do mes` },
    { label: 'Horario lider na semana', value: weekPeak.hour || '--', note: `${weekPeak.value.toLocaleString('pt-BR')} pedidos nos dias selecionados` },
    { label: 'Pico dia/hora', value: monthPeak.date ? `${monthPeak.date} | ${monthPeak.hour}` : '--', note: `${monthPeak.value.toLocaleString('pt-BR')} pedidos no mes` }
  ].map((item) => `
    <article class="heatmap-stat">
      <span>${item.label}</span>
      <strong>${item.value}</strong>
      <small>${item.note}</small>
    </article>
  `).join('');

  weekHead.innerHTML = `
    <div>
      <strong>${selectedWeek.label}</strong>
      <span>${selectedWeek.rangeLabel}</span>
    </div>
    <span>${selectedWeek.orders.toLocaleString('pt-BR')} pedidos</span>
  `;

  const header = [
    '<div class="heat-label">Dia</div>',
    ...bdbData.heatmap.hours.map((hour) => `<div class="heat-label">${hour}</div>`),
    '<div class="heat-label total-label">Total</div>'
  ];
  const maxValue = Math.max(...selectedWeek.days.flatMap((day) => day.values), 1);
  const rows = selectedWeek.days.flatMap((day, dayIndex) => {
    const label = `<div class="heat-label">${day.date}</div>`;
    const dayOrders = sumArray(day.values);
    const dayRevenue = sumArray(day.revenueValues || []);
    const cells = day.values.map((value, hourIndex) => {
      const hour = bdbData.heatmap.hours[hourIndex];
      const hasAction = day.actions.some((action) => action.hour === hour);
      const future = isFutureHeatmapCell(day.isoDate, hourIndex);
      return `
        <button class="heat-cell" style="background:${cellTone(value, maxValue)}" type="button" data-day="${dayIndex}" data-hour="${hourIndex}" tabindex="-1" aria-pressed="false" ${future ? 'disabled' : ''} aria-label="${day.date} ${hour}, ${future ? 'horário ainda não ocorrido' : `${value} pedidos`}">
          ${future ? '—' : value}
          ${hasAction ? '<span class="action-pin"></span>' : ''}
        </button>
      `;
    }).join('');
    const total = `
      <div class="heat-total" aria-label="${day.date}, ${dayOrders} pedidos, ${money.format(dayRevenue)}">
        <strong>${isFutureHeatmapCell(day.isoDate, 0) ? '—' : dayOrders.toLocaleString('pt-BR')}</strong>
        <span>${isFutureHeatmapCell(day.isoDate, 0) ? 'Aguardando' : money.format(dayRevenue)}</span>
      </div>
    `;
    return [label, cells, total].join('');
  });

  grid.innerHTML = [...header, ...rows].join('');
  qsa('.heat-cell', grid).forEach((cell) => {
    cell.addEventListener('click', () => {
      qsa('.heat-cell.selected', grid).forEach((selected) => { selected.classList.remove('selected'); selected.tabIndex = -1; selected.setAttribute('aria-pressed', 'false'); });
      cell.classList.add('selected');
      cell.tabIndex = 0;
      cell.setAttribute('aria-pressed', 'true');
      renderDayDetail(selectedWeek.days[Number(cell.dataset.day)], Number(cell.dataset.hour));
    });
  });

  const lastObserved = selectedWeek.days.findLastIndex((day) => !isFutureHeatmapCell(day.isoDate, 0));
  if (lastObserved < 0) {
    qs('#dayDetail').innerHTML = '<p class="eyebrow">SEMANA FUTURA</p><h3>Os dados aparecerão após as vendas.</h3><p class="delta">Escolha uma semana já iniciada para analisar os horários.</p>';
    return;
  }
  const defaultDay = lastObserved;
  const peakHour = selectedWeek.days[defaultDay].values.indexOf(Math.max(...selectedWeek.days[defaultDay].values));
  const defaultHour = Math.min(peakHour, bdbData.heatmap.hours.length - 1);
  renderDayDetail(selectedWeek.days[defaultDay], defaultHour);
  const selected = qs(`[data-day="${defaultDay}"][data-hour="${defaultHour}"]`, grid);
  if (selected) { selected.classList.add('selected'); selected.tabIndex = 0; selected.setAttribute('aria-pressed', 'true'); }
}

function renderDayDetail(day, hourIndex) {
  if (!day) return;
  const hour = bdbData.heatmap.hours[hourIndex];
  const orders = day.values[hourIndex];
  const revenue = day.revenueValues ? day.revenueValues[hourIndex] : null;
  const avgTicket = day.ticketValues ? day.ticketValues[hourIndex] : null;
  const actionsAtHour = day.actions.filter((action) => action.hour === hour);
  const actionsDay = day.actions;

  qs('#dayDetail').innerHTML = `
    <p class="eyebrow">Dia aberto</p>
    <h3 class="detail-title">${day.date} | ${hour}</h3>
    <div class="detail-metric">
      <div>
        <span>Pedidos</span>
        <strong>${orders}</strong>
      </div>
      <div>
        <span>Receita paga</span>
        <strong>${revenue === null ? 'Pendente' : money.format(revenue)}</strong>
      </div>
    </div>
    ${avgTicket ? `<p class="delta">Ticket medio no horario: ${money.format(avgTicket)}</p>` : ''}
    <p class="delta">${actionsAtHour.length ? 'Existe acao comercial neste horario.' : 'Sem acao comercial registrada neste horario.'}</p>
    <div class="action-list">
      ${(actionsAtHour.length ? actionsAtHour : actionsDay).map((action) => `
        <article class="action-card">
          <strong>${action.hour} | ${action.title}</strong>
          <span>${action.result}</span>
          <span>${action.note}</span>
        </article>
      `).join('') || '<p class="delta">Nenhuma acao registrada para este dia.</p>'}
    </div>
  `;
}

function sumArray(values) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

function weekIdForDate(value) {
  if (!value) return null;
  const day = Number(value.slice(8, 10));
  if (!day) return null;
  if (day <= 7) return '1';
  if (day <= 14) return '2';
  if (day <= 21) return '3';
  return '4';
}

function peakFromWeeks(weeks) {
  return weeks.reduce((peak, week) => {
    const current = week.peak || { value: 0 };
    return current.value > peak.value ? current : peak;
  }, { value: 0, date: null, hour: null });
}

function titleCase(value) {
  return String(value || '').replace(/^./, (char) => char.toUpperCase());
}

function renderProducts() {
  if (bdbData.products.every((product) => product.pending)) {
    qs('#productBars').innerHTML = `
      <article class="empty-card">
        <strong>Top vendas por categoria pendente</strong>
        <span>Os produtos ainda não foram carregados para este período. Use “Atualizar agora” ou consulte a disponibilidade dos dados.</span>
      </article>
    `;
    return;
  }

  const max = Math.max(...bdbData.products.map((product) => product.revenue), 1);
  qs('#productBars').innerHTML = bdbData.products.map((product) => `
    <article class="bar-row">
      <div class="bar-label">
        <strong>${product.name}</strong>
        <span>${product.family}</span>
      </div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${Math.round((product.revenue / max) * 100)}%"></div>
      </div>
      <div class="bar-value">${money.format(product.revenue)}${product.share === null ? '' : ` · ${product.share.toLocaleString('pt-BR')}%`}</div>
      <div class="category-top-products">
        <span class="category-top-products-title">Top produtos</span>
        ${(product.topProducts || []).map((topProduct) => `
          <div class="category-product-row">
            <span>${escapeHtml(topProduct.name)}</span>
            <span>${topProduct.units} un.</span>
            <strong>${topProduct.revenue}</strong>
          </div>
        `).join('') || '<span class="category-product-empty">Sem produtos vendidos</span>'}
      </div>
    </article>
  `).join('');
}

function renderQuality() {
  qs('#qualityGrid').innerHTML = bdbData.quality.map((item) => `
    <article class="quality-card">
      <strong>${item.value}</strong>
      <span>${item.label}</span>
      <span>${item.note}</span>
    </article>
  `).join('');
}

function renderChannels() {
  const channelLabel = qs('#channelSourceLabel');
  const hasSessionData = bdbData.channels.some((row) => row.sessoes !== 'Pendente');
  const channelRows = bdbData.channels.map((row) => ({ ...row, origins: row.origins || [] }));
  if (channelLabel) channelLabel.textContent = hasSessionData ? 'SSOT | Canais + origens' : 'Sessoes pendentes';

  if (bdbData.channels.length === 1 && bdbData.channels[0].canal === 'Pendente') {
    qs('#channelTable').innerHTML = `
      <article class="empty-card">
        <strong>Canais pendentes</strong>
        <span>Os canais ainda não estão disponíveis para este período. Consulte o estado da carga ou atualize os dados.</span>
      </article>
    `;
    return;
  }

  qs('#channelTable').innerHTML = `
    <table>
      <thead>
        <tr>
          <th scope="col">Canal</th>
          <th scope="col">Sessões</th>
          <th scope="col">Pedidos atribuídos</th>
          <th scope="col">Receita atribuída</th>
          <th scope="col">Conversão</th>
        </tr>
      </thead>
      <tbody>
        ${channelRows.map((row) => `
          <tr>
            <td>
              <details class="channel-dropdown">
                <summary class="channel-summary">
                  <span>${escapeHtml(row.canal)}</span>
                  <span class="channel-origin-count">${row.origins.length} ${row.origins.length === 1 ? 'origem' : 'origens'}</span>
                </summary>
                ${row.origins.length ? `
                  <div class="channel-origins" role="region" aria-label="Origens de ${escapeHtml(row.canal)}">
                    <div class="channel-origin-head">
                      <span>Origem</span>
                      <span>Pedidos</span>
                      <span>Receita</span>
                    </div>
                    ${row.origins.map((origin) => `
                      <div class="channel-origin-row">
                        <span>${escapeHtml(origin.origem)}</span>
                        <span>${origin.pedidos}</span>
                        <span>${origin.receita}</span>
                      </div>
                    `).join('')}
                  </div>
                ` : '<div class="channel-no-origin">Sem origem detalhada para este período.</div>'}
              </details>
            </td>
            <td>${formatCell(row.sessoes)}</td>
            <td>${formatCell(row.pedidos)}</td>
            <td>${row.receita}</td>
            <td>${row.conv}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderStock() {
  const labels = {
    ok: 'ok',
    risco: 'risco',
    risco_critico: 'critico',
    ruptura: 'ruptura',
    pendente: 'pendente'
  };

  if (bdbData.stock.every((item) => item.pending)) {
    qs('#stockRisk').innerHTML = `
      <article class="empty-card">
        <strong>Estoque pendente</strong>
        <span>O estoque ainda não está disponível nesta carga. Use “Atualizar agora” ou consulte a disponibilidade dos dados.</span>
      </article>
    `;
    return;
  }

  qs('#stockRisk').innerHTML = bdbData.stock.slice(0, 4).map((item) => `
    <article class="risk-item">
      <strong>${escapeHtml(item.label)}</strong>
      <span>${escapeHtml(item.sku)}</span>
      <span class="risk-badge ${item.status}">${labels[item.status]}</span>
      <span>${item.coverageLabel || (item.days ? `${item.days} dias de cobertura` : 'sem cobertura')}</span>
    </article>
  `).join('') + (bdbData.stock.length > 4 ? `<details class="additional-rows"><summary>Ver outros ${bdbData.stock.length - 4} SKUs da carga</summary><div class="table-wrap" tabindex="0" role="region" aria-label="Demais SKUs do estoque"><table><thead><tr><th scope="col">SKU / Produto</th><th scope="col">Disponível</th><th scope="col">Cobertura</th><th scope="col">Situação</th></tr></thead><tbody>${bdbData.stock.slice(4).map((item) => `<tr><td><strong>${escapeHtml(item.sku)}</strong><small class="stock-product-name">${escapeHtml(item.label)}</small></td><td>${formatInt(item.available)}</td><td>${item.days === null ? 'Pendente' : `${item.days.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} dias`}</td><td>${labels[item.status]}</td></tr>`).join('')}</tbody></table></div></details>` : '');
}

function renderGrowth() {
  const target = qs('#growthPerformance');
  if (!target) return;
  if (isPendingGrowth(bdbData.growth)) {
    target.innerHTML = '<article class="empty-card"><strong>Growth pendente</strong><span>A performance de investimento ainda nao retornou do BigQuery.</span></article>';
    return;
  }

  const totals = bdbData.growth.totals;
  target.innerHTML = `
    <div class="metric-strip">
      <article><span>Investimento</span><strong>${money.format(totals.investimento_total_mkt)}</strong></article>
      <article><span>Receita SSOT</span><strong>${money.format(totals.receita_total)}</strong></article>
      <article><span>ROAS marketing</span><strong>${totals.roasMkt === null ? 'Pendente' : `${totals.roasMkt.toFixed(2).replace('.', ',')}x`}</strong></article>
      <article><span>CAC novos</span><strong>${totals.cacMkt === null ? 'Pendente' : money.format(totals.cacMkt)}</strong></article>
    </div>
    <div class="campaign-list">
      <div class="subhead"><span>Campanhas por investimento</span><span>Cliques | Impressoes</span></div>
      ${bdbData.growth.campaigns.length ? bdbData.growth.campaigns.map((campaign) => `
        <div class="campaign-row">
          <span><strong>${escapeHtml(campaign.name)}</strong><small>${escapeHtml(campaign.source)}</small></span>
          <span><strong>${money.format(campaign.spend)}</strong><small>${formatInt(campaign.clicks)} cliques | ${formatInt(campaign.impressions)} imp.</small></span>
        </div>
      `).join('') : '<div class="empty-line">Sem campanhas no periodo.</div>'}
    </div>
  `;
}

function renderCrm() {
  const target = qs('#crmCampaigns');
  if (!target) return;
  if (isPendingCrm(bdbData.crm)) {
    target.innerHTML = '<article class="empty-card"><strong>CRM pendente</strong><span>A planilha protegida de CRM ainda nao retornou campanhas para este periodo.</span></article>';
    return;
  }

  const totals = bdbData.crm.totals;
  const metricInt = (value) => value === null ? 'Pendente' : formatInt(value);
  const metricMoney = (value) => value === null ? 'Pendente' : money.format(value);
  const campaignRows = (campaigns) => campaigns.map((campaign) => `
    <div class="campaign-row"><span><strong>${escapeHtml(campaign.name)}</strong><small>${escapeHtml(campaign.date || '--')} · ${escapeHtml(campaign.channel)} · ${escapeHtml(campaign.status || 'Status pendente')}</small></span><span><strong>${campaign.orders === null ? 'Pedidos pendentes' : `${formatInt(campaign.orders)} pedidos`}</strong><small>${campaign.revenue === null ? 'Receita pendente' : money.format(campaign.revenue)}</small></span></div>
  `).join('');

  target.innerHTML = `
    <div class="metric-strip crm-metrics">
      <article><span>Campanhas lidas</span><strong>${formatInt(totals.campaigns)}</strong></article>
      <article><span>Mensagens entregues</span><strong>${metricInt(totals.delivered)}</strong></article>
      <article><span>Pedidos CRM</span><strong>${metricInt(totals.orders)}</strong></article>
      <article><span>Receita CRM</span><strong>${metricMoney(totals.revenue)}</strong></article>
    </div>
    <div class="crm-layout">
    <div class="campaign-list crm-campaigns">
      <div class="subhead"><span>Campanhas recentes</span><span>Pedidos · Receita</span></div>
      ${campaignRows(bdbData.crm.campaigns.slice(0, 8)) || '<div class="empty-line">Sem campanhas no período.</div>'}
      ${bdbData.crm.campaigns.length > 8 ? `<details class="additional-rows"><summary>Ver outras ${bdbData.crm.campaigns.length - 8} campanhas</summary>${campaignRows(bdbData.crm.campaigns.slice(8))}</details>` : ''}
    </div>
    <div class="segment-list">
      <div class="subhead"><span>Segmentos acionados</span><span>Campanhas · Entregues</span></div>
      ${bdbData.crm.segments.map((segment) => `<div class="segment-row"><span>${escapeHtml(segment.name)}</span><strong>${formatInt(segment.campaigns)} · ${formatInt(segment.delivered)}</strong></div>`).join('')}
    </div>
    </div>
    <p class="data-note">Fonte protegida: leitura somente da planilha operacional de CRM. Campos inexistentes na planilha permanecem pendentes.</p>
  `;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatCell(value) {
  return typeof value === 'number' ? value.toLocaleString('pt-BR') : value;
}

function renderDecisions() {
  qs('#decisionList').innerHTML = bdbData.decisions.map((decision) => `
    <article class="decision ${decision.pending ? 'pending-item' : ''}">
      <strong>${decision.derived ? 'Sugestao automatica' : `${decision.time} | ${decision.owner}`}</strong>
      <span>${decision.text}</span>
      <span class="delta ${decision.pending ? 'warning' : 'positive'}">${decision.impact}</span>
      ${decision.derived ? '<small class="decision-note">Derivada do snapshot; validar antes de executar.</small>' : ''}
    </article>
  `).join('');
}

function renderSlack() {
  qs('#slackText').textContent = bdbData.slack;
  qs('#copySlack').onclick = async () => {
    try {
      await navigator.clipboard.writeText(bdbData.slack);
      qs('#copySlack').textContent = 'Copiado ✓';
      qs('#copyFeedback').textContent = 'Resumo copiado. Revise antes de compartilhar com o time.';
    } catch {
      qs('#copyFeedback').textContent = 'Não foi possível copiar automaticamente. Selecione o texto do resumo e copie.';
    }
    setTimeout(() => { qs('#copySlack').textContent = 'Copiar resumo'; }, 1800);
  };
}

function renderMethodology() {
  const definitions = [
    { title: 'Pedidos e receita', text: 'Pedidos pagos e válidos da fonte SSOT. A receita da visão geral usa a base de pedidos.' },
    { title: 'Meta do período', text: 'Meta diária publicada, somada para o período selecionado. Sem meta disponível, o atingimento permanece pendente.' },
    { title: 'Vendas por horário', text: 'Pedidos pagos agrupados por dia e hora de Brasília. Picos de vendas não demonstram a causa do resultado.' },
    { title: 'Canais e conversão', text: 'Pedidos atribuídos divididos por sessões SSOT. A ausência de sessões impede o cálculo da conversão do canal.' },
    { title: 'Produtos e brindes', text: 'Receita líquida da base de itens, sem rateio para coincidir com pedidos. Item de valor líquido igual a zero é brinde. Categorias usam descrições e SKUs; o de-para oficial segue pendente.' },
    { title: 'Dados indisponíveis', text: 'Pendente significa ausência de informação ou de carga. Zero é um valor observado. Dados demonstrativos são identificados explicitamente.' }
  ];
  qs('#methodGrid').innerHTML = definitions.map((item) => `
    <article class="method-card">
      <h3>${item.title}</h3>
      <p>${item.text}</p>
    </article>
  `).join('');
}

function renderDashboard() {
  renderKpis();
  renderPaceChart();
  renderSignals();
  renderHeatmap();
  renderProducts();
  renderQuality();
  renderChannels();
  renderStock();
  renderGrowth();
  renderCrm();
  renderDecisions();
  renderSlack();
  renderMethodology();
  renderViewStamp();
}

async function init() {
  const loaded = await loadBdbData();
  bdbData = loaded.data;
  dataMode = loaded.mode;
  activeFilters = bdbData.period?.fromSnapshotMeta ? bdbData.period.window : defaultFilters();
  setFilterInputs(activeFilters);
  document.body.dataset.dataMode = dataMode;

  initSidebarToggle();
  initNavigation();
  initWeekPickerBehavior();
  bindRefreshButton();
  renderDashboard();
  qs('#filterHint').textContent = loaded.mode.includes('mock') ? 'Fonte indisponível. Os valores exibidos são demonstrativos.' : 'Carga disponível para análise.';
  setInterval(syncDailySnapshot, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) syncDailySnapshot();
  });

  // A abertura permanece restrita ao snapshot, inclusive com detalhes pendentes.
  // Consultas de detalhes exigem busca ou acao explicita do usuario.
}

init();

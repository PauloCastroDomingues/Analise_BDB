import { APPS_SCRIPT_URL } from '../config.js';
import { bdbData as mockData } from './bdbMockData.js';

export async function loadBdbData(options = {}) {
  if (!APPS_SCRIPT_URL) {
    if (options.refresh) throw new Error('URL do Apps Script nao configurada.');
    return {
      mode: 'mock',
      data: mockData
    };
  }

  try {
    const payload = options.refresh
      ? await (options.includeDetails ? loadFullRefresh(options) : loadCoreRefresh(options))
      : await fetchPayload('all', options);

    return {
      mode: options.refresh ? 'apps_script_refresh' : 'apps_script_snapshot',
      data: adaptAppsScriptPayload(payload)
    };
  } catch (error) {
    // Uma falha ao atualizar nunca deve substituir a analise por dados de exemplo.
    if (options.refresh) throw error;
    console.warn('Falha ao carregar Apps Script. Usando mock.', error);
    return {
      mode: 'mock_fallback',
      data: mockData
    };
  }
}

async function loadFullRefresh(options) {
  const payload = { ok: true, source: 'bigquery_manual_refresh', data: {}, viewMeta: {} };
  // Sequencial: evita disputar o lock do Apps Script e isola falhas por visao.
  for (const view of ['status', 'heatmap', 'targets', 'channels', 'products', 'quality', 'stock', 'growth', 'crm']) {
    const filters = view === 'heatmap' ? monthFiltersFrom(options.filters) : options.filters;
    try {
      const response = await fetchPayload(view, { ...options, filters });
      if (response.refreshSkipped) throw new Error('O servidor reaproveitou o snapshot em vez de atualizar.');
      payload.data[view] = response.data || [];
      payload.viewMeta[view] = response.meta || { window: filters };
      payload.generatedAt = response.generatedAt || payload.generatedAt;
      if (view === 'status') payload.meta = response.meta;
    } catch (error) {
      if (view === 'status') throw error;
      payload.data[view] = [];
      payload.viewMeta[view] = { window: filters, error: error.message };
    }
  }
  return payload;
}

export async function loadBdbDetails(options = {}) {
  if (!APPS_SCRIPT_URL) {
    return {
      mode: 'mock',
      data: mockData
    };
  }

  try {
    const details = await loadDetailViews({ ...options, refresh: true, force: true });
    const payload = {
      ok: true,
      generatedAt: details.generatedAt || new Date().toISOString(),
      source: 'bigquery_manual_refresh_details',
      meta: details.viewMeta.products || details.viewMeta.growth || details.viewMeta.quality || null,
      viewMeta: details.viewMeta,
      data: details.data
    };

    return {
      mode: 'apps_script_details',
      data: adaptAppsScriptPayload(payload)
    };
  } catch (error) {
    console.warn('Falha ao carregar detalhes do Apps Script.', error);
    throw error;
  }
}

async function loadCoreRefresh(options) {
  const targetRequest = fetchPayload('targets', options).catch((error) => ({
    data: [],
    meta: null,
    costControl: null,
    refreshSkipped: false,
    refreshReason: error.message
  }));
  const channelRequest = fetchPayload('channels', options).catch((error) => ({
    data: [],
    meta: null,
    costControl: null,
    refreshSkipped: false,
    refreshReason: error.message
  }));
  const [status, heatmap, targets, channels] = await Promise.all([
    fetchPayload('status', options),
    fetchPayload('heatmap', {
      ...options,
      filters: monthFiltersFrom(options.filters)
    }),
    targetRequest,
    channelRequest
  ]);
  const details = options.includeDetails ? await loadDetailViews(options) : { data: {}, viewMeta: {} };

  return {
    ok: true,
    generatedAt: heatmap.generatedAt || status.generatedAt,
    source: 'bigquery_manual_refresh',
    meta: status.meta || null,
    heatmapMeta: heatmap.meta || null,
    viewMeta: {
      status: status.meta || null,
      heatmap: heatmap.meta || null,
      targets: targets.meta || null,
      channels: channels.meta || null,
      ...details.viewMeta
    },
    costControl: heatmap.costControl || status.costControl || targets.costControl || channels.costControl || null,
    refreshSkipped: Boolean(status.refreshSkipped && heatmap.refreshSkipped),
    refreshReason: status.refreshReason || heatmap.refreshReason || targets.refreshReason || channels.refreshReason || null,
    data: {
      status: status.data || [],
      heatmap: heatmap.data || [],
      targets: targets.data || [],
      channels: channels.data || [],
      ...details.data
    }
  };
}

async function loadDetailViews(options) {
  const shouldLoadStock = options.includeStock !== false;
  const [products, quality, stock, growth, crm] = await Promise.all([
    fetchPayload('products', options),
    fetchPayload('quality', options),
    shouldLoadStock ? fetchPayload('stock', options) : Promise.resolve({ data: [], meta: null, generatedAt: null }),
    fetchOptionalPayload('growth', options),
    fetchOptionalPayload('crm', options)
  ]);

  return {
    generatedAt: products.generatedAt || growth.generatedAt || crm.generatedAt || quality.generatedAt || stock.generatedAt,
    viewMeta: {
      products: products.meta || null,
      quality: quality.meta || null,
      stock: stock.meta || null,
      growth: growth.meta || null,
      crm: crm.meta || null
    },
    data: {
      products: products.data || [],
      quality: quality.data || [],
      stock: stock.data || [],
      growth: growth.data || [],
      crm: crm.data || []
    }
  };
}

function monthFiltersFrom(filters = {}) {
  const base = filters.end || filters.start || toIsoDate(new Date());
  const monthStart = base.slice(0, 7) + '-01';
  const monthEnd = endOfMonth(base);

  return {
    start: monthStart,
    end: monthEnd,
    compareStart: shiftYear(monthStart, -1),
    compareEnd: shiftYear(monthEnd, -1)
  };
}

async function fetchPayload(view, options) {
  const response = await fetch(buildAppsScriptUrl(view, options), {
    cache: 'no-store'
  });
  if (!response.ok) {
    throw new Error(`Apps Script retornou HTTP ${response.status}`);
  }

  const payload = await response.json();
  if (!payload.ok) {
    throw new Error(payload.error || 'Payload invalido do Apps Script');
  }

  return payload;
}

async function fetchOptionalPayload(view, options) {
  try {
    return await fetchPayload(view, options);
  } catch (error) {
    console.warn(`View opcional ${view} indisponivel.`, error);
    return { data: [], meta: null, generatedAt: null, error: error.message };
  }
}

function buildAppsScriptUrl(view, options) {
  const params = new URLSearchParams({ view });
  if (options.refresh) params.set('refresh', '1');
  if (options.force) params.set('force', '1');
  if (options.refresh) params.set('_ts', String(Date.now()));

  const filters = options.filters || {};
  ['start', 'end', 'compareStart', 'compareEnd'].forEach((key) => {
    if (filters[key]) params.set(key, filters[key]);
  });

  return `${APPS_SCRIPT_URL}?${params.toString()}`;
}

function adaptAppsScriptPayload(payload) {
  const data = { ...(payload.data || {}) };
  const viewMeta = { ...(payload.viewMeta || {}) };
  // Cargas individuais podem deixar uma visao antiga no snapshot do servidor.
  // Nao apresentar detalhes de outra janela como se tivessem sido atualizados.
  const statusWindow = viewMeta.status?.window;
  if (statusWindow) {
    for (const view of ['targets', 'channels', 'products', 'quality', 'stock', 'growth', 'crm', 'slack']) {
      const window = viewMeta[view]?.window;
      if (data[view]?.length && (!window || ['start', 'end', 'compareStart', 'compareEnd'].some((key) => window[key] !== statusWindow[key]))) {
        data[view] = [];
        if (view === 'slack') { delete viewMeta.slack; continue; }
        viewMeta[view] = { ...viewMeta[view], error: 'Dados de outro periodo; atualizacao pendente.' };
      }
    }
  }
  const status = asRows(data.status);
  const currentStatus = status.filter((row) => !row.period_type || row.period_type === 'current');
  const compareStatus = status.filter((row) => row.period_type === 'compare');
  const heatmap = asRows(data.heatmap);
  const targets = asRows(data.targets);
  const channels = asRows(data.channels);
  const products = asRows(data.products);
  const quality = asRows(data.quality);
  const stock = asRows(data.stock);
  const growth = asRows(data.growth);
  const crm = asRows(data.crm);
  const slack = asRows(data.slack);

  const totalRevenue = sum(currentStatus, 'paid_revenue');
  const totalOrders = sum(currentStatus, 'paid_orders');
  const avgTicket = totalOrders ? totalRevenue / totalOrders : 0;
  const comparison = buildComparison(currentStatus, compareStatus);
  const period = buildPeriodMeta(viewMeta.status || payload.meta, currentStatus, compareStatus);
  const target = buildTargetMeta(targets, period.window);
  const targetRevenue = target.revenue;
  const hasTarget = target.hasTarget;
  const detailPeriod = buildDetailPeriodMeta(viewMeta);
  const hasStatus = currentStatus.length > 0;

  return {
    ...mockData,
    generatedAt: payload.generatedAt || null,
    updatedAt: formatGeneratedAt(payload.generatedAt) || mockData.updatedAt,
    period,
    detailPeriod,
    loadedViews: Object.keys(data),
    viewMeta,
    source: payload.source || 'apps_script',
    refreshSkipped: Boolean(payload.refreshSkipped),
    refreshReason: payload.refreshReason || null,
    refreshWarning: payload.refreshWarning || null,
    viewErrors: Object.entries(viewMeta)
      .filter(([, meta]) => meta?.error)
      .map(([view, meta]) => `${view}: ${meta.error}`),
    kpis: hasStatus ? buildKpis(totalRevenue, totalOrders, avgTicket, targetRevenue, hasTarget, comparison) : buildPendingKpis(),
    pace: hasStatus ? buildPace(currentStatus, target, compareStatus) : [],
    paceSecondaryLabel: hasTarget ? 'Meta acumulada' : compareStatus.length ? 'Periodo comparativo' : 'Meta planejada',
    target,
    signals: hasStatus ? buildSignals(currentStatus, heatmap, comparison) : buildPendingSignals(),
    heatmap: buildHeatmap(heatmap, payload.heatmapMeta || viewMeta.heatmap || payload.meta),
    products: products.length ? buildProducts(products) : buildPendingProducts(),
    quality: quality.length ? buildQuality(quality) : buildPendingQuality(),
    channels: channels.length ? buildChannels(channels) : buildPendingChannels(),
    stock: stock.length ? buildStock(stock) : buildPendingStock(),
    growth: growth.length ? buildGrowth(growth) : buildPendingGrowth(),
    crm: crm.length ? buildCrm(crm) : buildPendingCrm(),
    decisions: buildDecisions(heatmap, stock, comparison, growth, crm),
    slack: buildSlack(slack, status, heatmap),
    raw: data
  };
}

function asRows(value) {
  return Array.isArray(value) ? value : [];
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function sum(rows, key) {
  return rows.reduce((total, row) => total + number(row[key]), 0);
}

function formatMoney(value, digits = 2) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(number(value));
}

function formatCompactMoney(value) {
  const amount = number(value);
  if (amount >= 1000000) return `R$ ${(amount / 1000000).toFixed(2).replace('.', ',')} mi`;
  if (amount >= 1000) return `R$ ${(amount / 1000).toFixed(0)} mil`;
  return formatMoney(amount);
}

function formatInt(value) {
  return Math.round(number(value)).toLocaleString('pt-BR');
}

function formatGeneratedAt(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function shortDate(value) {
  const [year, month, day] = String(value || '').split('-');
  if (!year || !month || !day) return String(value || '');
  return `${day}/${month}`;
}

function fullDate(value) {
  const [year, month, day] = String(value || '').split('-');
  if (!year || !month || !day) return String(value || '');
  return `${day}/${month}/${year}`;
}

function buildPeriodMeta(meta, currentRows, compareRows) {
  const window = meta && meta.window ? meta.window : inferWindow(currentRows, compareRows);
  return {
    window,
    fromSnapshotMeta: Boolean(meta && meta.window),
    label: window ? `${fullDate(window.start)} a ${fullDate(window.end)}` : 'Periodo pendente',
    compareLabel: window ? `${fullDate(window.compareStart)} a ${fullDate(window.compareEnd)}` : 'Comparativo pendente'
  };
}

function buildDetailPeriodMeta(viewMeta) {
  const meta = viewMeta.products || viewMeta.growth || viewMeta.crm || viewMeta.quality || viewMeta.stock;
  if (!meta || !meta.window) return null;

  return {
    window: meta.window,
    label: `${fullDate(meta.window.start)} a ${fullDate(meta.window.end)}`
  };
}

function inferWindow(currentRows, compareRows) {
  const currentDates = currentRows.map((row) => row.order_date_brt).sort();
  if (!currentDates.length) return null;

  const compareDates = compareRows.map((row) => row.order_date_brt).sort();
  const start = currentDates[0];
  const end = currentDates[currentDates.length - 1];

  return {
    start,
    end,
    compareStart: compareDates[0] || shiftYear(start, -1),
    compareEnd: compareDates[compareDates.length - 1] || shiftYear(end, -1)
  };
}

function shiftYear(value, amount) {
  const [year, month, day] = String(value || '').split('-');
  if (!year || !month || !day) return value;
  return `${Number(year) + amount}-${month}-${day}`;
}

function pctDelta(current, compare) {
  if (!compare) return null;
  return ((current - compare) / compare) * 100;
}

function formatDelta(value, label = 'vs comparativo') {
  if (value === null || !Number.isFinite(value)) return 'Comparativo pendente';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1).replace('.', ',')}% ${label}`;
}

function deltaTone(value) {
  if (value === null || !Number.isFinite(value)) return 'warning';
  if (value > 0) return 'positive';
  if (value < 0) return 'risk';
  return 'neutral';
}

function buildComparison(currentRows, compareRows) {
  const currentRevenue = sum(currentRows, 'paid_revenue');
  const currentOrders = sum(currentRows, 'paid_orders');
  const compareRevenue = sum(compareRows, 'paid_revenue');
  const compareOrders = sum(compareRows, 'paid_orders');
  const currentTicket = currentOrders ? currentRevenue / currentOrders : 0;
  const compareTicket = compareOrders ? compareRevenue / compareOrders : 0;

  return {
    hasCompare: compareRows.length > 0,
    revenueDelta: pctDelta(currentRevenue, compareRevenue),
    ordersDelta: pctDelta(currentOrders, compareOrders),
    ticketDelta: pctDelta(currentTicket, compareTicket)
  };
}

function buildTargetMeta(rows, window) {
  const filtered = rows
    .filter((row) => !window || (row.target_date >= window.start && row.target_date <= window.end))
    .sort((a, b) => String(a.target_date).localeCompare(String(b.target_date)));
  const dates = [...new Set(filtered.map((row) => row.target_date).filter(Boolean))];
  const expectedDates = window ? datesBetween(window.start, window.end) : [];
  const revenue = sum(filtered, 'revenue_target');

  return {
    rows: filtered,
    revenue,
    orders: sum(filtered, 'orders_target'),
    hasTarget: filtered.length > 0 && revenue > 0,
    coverage: expectedDates.length ? dates.length / expectedDates.length : 0,
    complete: expectedDates.length > 0 && dates.length >= expectedDates.length,
    scope: filtered[0]?.goal_scope || null,
    months: [...new Set(filtered.map((row) => row.target_month).filter(Boolean))]
  };
}

function buildKpis(totalRevenue, totalOrders, avgTicket, targetRevenue, hasTarget, comparison) {
  const pace = hasTarget ? totalRevenue / targetRevenue : null;

  return [
    {
      label: 'Receita paga',
      value: formatMoney(totalRevenue),
      delta: comparison.hasCompare ? formatDelta(comparison.revenueDelta) : hasTarget ? `${Math.round(pace * 100)}% da meta` : 'Meta pendente',
      tone: comparison.hasCompare ? deltaTone(comparison.revenueDelta) : hasTarget && pace >= 1 ? 'positive' : 'neutral',
      context: 'Acumulado real da janela consultada.'
    },
    {
      label: 'Pedidos pagos',
      value: formatInt(totalOrders),
      delta: comparison.hasCompare ? formatDelta(comparison.ordersDelta) : 'Base BigQuery',
      tone: comparison.hasCompare ? deltaTone(comparison.ordersDelta) : 'neutral',
      context: 'Pedidos pagos e válidos no período.'
    },
    {
      label: 'Ticket médio',
      value: formatMoney(avgTicket),
      delta: comparison.hasCompare ? formatDelta(comparison.ticketDelta) : 'Calculado no front',
      tone: comparison.hasCompare ? deltaTone(comparison.ticketDelta) : 'neutral',
      context: 'Receita paga dividida por pedidos.'
    },
    {
      label: 'Atingimento da meta',
      value: hasTarget ? `${Math.round(pace * 100)}%` : 'Pendente',
      delta: hasTarget ? `${formatMoney(targetRevenue)} alvo` : 'Definir meta oficial',
      tone: hasTarget && pace >= 1 ? 'positive' : 'warning',
      context: hasTarget ? 'Meta publicada para o período selecionado.' : 'Aguardando meta oficial para este período.'
    }
  ];
}

function buildPendingKpis() {
  return [
    {
      label: 'Receita paga',
      value: 'Pendente',
      delta: 'Busque um periodo',
      tone: 'warning',
      context: 'A view de status ainda nao foi carregada para a janela atual.'
    },
    {
      label: 'Pedidos pagos',
      value: 'Pendente',
      delta: 'Sem status no snapshot',
      tone: 'warning',
      context: 'Clique em Hoje, Ontem, 7 dias, 30 dias ou Buscar.'
    },
    {
      label: 'Ticket medio',
      value: 'Pendente',
      delta: 'Aguardando pedidos',
      tone: 'warning',
      context: 'O ticket so aparece quando houver status carregado.'
    },
    {
      label: 'Pace de meta',
      value: 'Pendente',
      delta: 'Definir meta oficial',
      tone: 'warning',
      context: 'Sem meta preenchida, nao ha comparativo oficial.'
    }
  ];
}

function buildPace(statusRows, target, compareRows = []) {
  const ordered = [...statusRows].sort((a, b) => String(a.order_date_brt).localeCompare(String(b.order_date_brt)));
  const targetRows = target && target.hasTarget ? target.rows : [];
  if (targetRows.length) {
    const actualByDate = new Map(ordered.map((row) => [row.order_date_brt, row]));
    const targetByDate = new Map();
    targetRows.forEach((row) => {
      const existing = targetByDate.get(row.target_date) || { revenue_target: 0 };
      existing.revenue_target += number(row.revenue_target);
      targetByDate.set(row.target_date, existing);
    });
    const dates = [...new Set([...actualByDate.keys(), ...targetByDate.keys()])].sort();
    let cumulative = 0;
    let targetCumulative = 0;

    return dates.map((date) => {
      cumulative += number(actualByDate.get(date)?.paid_revenue);
      targetCumulative += number(targetByDate.get(date)?.revenue_target);
      return {
        day: shortDate(date),
        receita: Math.round(cumulative / 1000),
        meta: Math.round(targetCumulative / 1000)
      };
    });
  }

  const finalRevenue = Math.max(sum(ordered, 'paid_revenue'), 1);
  const compareByIndex = new Map(compareRows.map((row) => [number(row.period_day_index), row]));
  let cumulative = 0;
  let compareCumulative = 0;

  return ordered.map((row, index) => {
    cumulative += number(row.paid_revenue);
    const compareRow = compareByIndex.get(number(row.period_day_index));
    compareCumulative += number(compareRow && compareRow.paid_revenue);
    const secondary = compareRows.length
      ? compareCumulative
      : finalRevenue * ((index + 1) / ordered.length);

    return {
      day: shortDate(row.order_date_brt),
      receita: Math.round(cumulative / 1000),
      meta: Math.round(secondary / 1000)
    };
  });
}

function buildSignals(statusRows, heatmapRows, comparison) {
  const orderedDays = [...statusRows].sort((a, b) => number(b.paid_revenue) - number(a.paid_revenue));
  const topDay = orderedDays[0];
  const topHour = [...heatmapRows].sort((a, b) => number(b.paid_orders) - number(a.paid_orders))[0];
  const bestTicket = [...statusRows].sort((a, b) => number(b.avg_ticket) - number(a.avg_ticket))[0];

  return [
    {
      label: 'Pico diário',
      value: topDay ? `${shortDate(topDay.order_date_brt)} concentrou ${formatInt(topDay.paid_orders)} pedidos` : 'Pendente',
      tone: 'positive'
    },
    {
      label: 'Pico de pedidos por hora',
      value: topHour ? `${shortDate(topHour.order_date_brt)} as ${String(topHour.order_hour_brt).padStart(2, '0')}h teve ${formatInt(topHour.paid_orders)} pedidos` : 'Pendente',
      tone: 'info'
    },
    {
      label: 'Ticket',
      value: bestTicket ? `Melhor dia em ticket: ${shortDate(bestTicket.order_date_brt)} com ${formatMoney(bestTicket.avg_ticket)}` : 'Pendente',
      tone: 'neutral'
    },
    {
      label: 'Comparativo de receita',
      value: comparison.hasCompare ? formatDelta(comparison.revenueDelta, 'em receita vs periodo comparativo') : 'Comparativo aguardando dados',
      tone: 'warning'
    }
  ];
}

function buildPendingSignals() {
  return [
    { label: 'Status', value: 'Nenhum periodo de status carregado nesta sessao.', tone: 'warning' },
    { label: 'Heatmap', value: 'O heatmap pode estar carregado mesmo quando o status estiver pendente.', tone: 'info' },
    { label: 'Proximo passo', value: 'Use os atalhos de periodo para carregar KPIs e comparativo.', tone: 'neutral' },
    { label: 'Calendario comercial', value: 'Acoes comerciais ainda precisam de fonte conectada.', tone: 'warning' }
  ];
}

function buildHeatmap(rows, meta) {
  const monthWindow = heatmapMonthWindow(rows, meta);
  if (!monthWindow) return buildEmptyHeatmap();

  const hours = Array.from({ length: 24 }, (_, index) => `${String(index).padStart(2, '0')}h`);
  const byKey = new Map(rows.map((row) => [`${row.order_date_brt}|${row.order_hour_brt}`, row]));
  const dates = datesBetween(monthWindow.start, monthWindow.end);
  const days = dates.map((date) => {
    const values = hours.map((_, hour) => number(byKey.get(`${date}|${hour}`)?.paid_orders));
    const revenueValues = hours.map((_, hour) => number(byKey.get(`${date}|${hour}`)?.paid_revenue));
    const ticketValues = hours.map((_, hour) => number(byKey.get(`${date}|${hour}`)?.avg_ticket));

    return {
      isoDate: date,
      date: shortDate(date),
      values,
      revenueValues,
      ticketValues,
      actions: []
    };
  });

  return {
    monthLabel: monthLabel(monthWindow.start),
    monthWindow,
    hours,
    days,
    weeks: buildHeatmapWeeks(days)
  };
}

function buildEmptyHeatmap() {
  const today = toIsoDate(new Date());
  const monthWindow = {
    start: today.slice(0, 7) + '-01',
    end: endOfMonth(today)
  };
  const hours = Array.from({ length: 24 }, (_, index) => `${String(index).padStart(2, '0')}h`);
  const days = datesBetween(monthWindow.start, monthWindow.end).map((date) => ({
    isoDate: date,
    date: shortDate(date),
    values: hours.map(() => 0),
    revenueValues: hours.map(() => 0),
    ticketValues: hours.map(() => 0),
    actions: []
  }));

  return {
    monthLabel: monthLabel(monthWindow.start),
    monthWindow,
    hours,
    days,
    weeks: buildHeatmapWeeks(days)
  };
}

function heatmapMonthWindow(rows, meta) {
  if (meta && meta.window && meta.window.start) {
    return {
      start: meta.window.start.slice(0, 7) + '-01',
      end: endOfMonth(meta.window.start)
    };
  }

  const dates = rows.map((row) => row.order_date_brt).filter(Boolean).sort();
  if (!dates.length) return null;

  return {
    start: dates[0].slice(0, 7) + '-01',
    end: endOfMonth(dates[0])
  };
}

function buildHeatmapWeeks(days) {
  const ranges = [
    [1, 7],
    [8, 14],
    [15, 21],
    [22, 31]
  ];

  return ranges.map(([startDay, endDay], index) => {
    const weekDays = days.filter((day) => {
      const dayNumber = Number(day.isoDate.slice(8, 10));
      return dayNumber >= startDay && dayNumber <= endDay;
    });
    const orders = weekDays.reduce((total, day) => total + day.values.reduce((sumValue, value) => sumValue + value, 0), 0);
    const revenue = weekDays.reduce((total, day) => total + day.revenueValues.reduce((sumValue, value) => sumValue + value, 0), 0);
    const peak = peakCell(weekDays);

    return {
      id: String(index + 1),
      label: `Semana ${index + 1}`,
      rangeLabel: weekDays.length ? `${weekDays[0].date} a ${weekDays[weekDays.length - 1].date}` : '',
      days: weekDays,
      orders,
      revenue,
      peak
    };
  }).filter((week) => week.days.length);
}

function peakCell(days) {
  let peak = { value: 0, date: null, hour: null };

  days.forEach((day) => {
    day.values.forEach((value, index) => {
      if (value > peak.value) {
        peak = {
          value,
          date: day.date,
          hour: `${String(index).padStart(2, '0')}h`
        };
      }
    });
  });

  return peak;
}

function datesBetween(start, end) {
  var current = parseIsoDate(start);
  var last = parseIsoDate(end);
  var dates = [];

  while (current.getTime() <= last.getTime()) {
    dates.push(toIsoDate(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function parseIsoDate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function toIsoDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

function endOfMonth(value) {
  const [year, month] = value.split('-').map(Number);
  return toIsoDate(new Date(year, month, 0));
}

function monthLabel(value) {
  const date = parseIsoDate(value);
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric'
  }).format(date);
}

function buildProducts(rows) {
  const groups = [
    { key: 'calcados', name: 'Calçados', family: 'Tênis, botas e sapatos' },
    { key: 'mochilas', name: 'Mochilas', family: 'Mochilas, malas e bolsas' },
    { key: 'acessorios', name: 'Acessórios', family: 'Cintos, meias, camisetas, cuidado e office' },
    { key: 'brindes', name: 'Brindes', family: 'Itens com preço zerado no carrinho' }
  ];
  const grouped = new Map(groups.map((group) => [group.key, {
    ...group,
    revenue: 0,
    units: 0,
    products: new Map()
  }]));

  rows.forEach((row) => {
    const key = productMixGroup(row);
    const current = grouped.get(key);
    current.revenue += number(row.item_revenue);
    current.units += number(row.units_paid);

    const productKey = row.sku || row.product_title_raw || 'produto-sem-identificacao';
    const existingProduct = current.products.get(productKey) || {
      name: row.product_title_raw || row.sku || 'Produto sem identificacao',
      revenue: 0,
      units: 0
    };
    existingProduct.revenue += number(row.item_revenue);
    existingProduct.units += number(row.units_paid);
    current.products.set(productKey, existingProduct);
  });

  const itemDenominator = [...grouped.values()].reduce((total, item) => total + item.revenue, 0);

  return [...grouped.values()]
    .map((item) => {
      const mixShare = itemDenominator ? item.revenue / itemDenominator : 0;

      return {
        name: item.name,
        family: `${item.family} | ${formatInt(item.units)} un.`,
        revenue: item.revenue,
        itemRevenue: item.revenue,
        share: itemDenominator ? Math.round(mixShare * 1000) / 10 : null,
        topProducts: [...item.products.values()]
          .sort((a, b) => b.revenue - a.revenue || b.units - a.units)
          .slice(0, 3)
          .map((product) => ({
            name: product.name,
            revenue: formatMoney(product.revenue),
            units: formatInt(product.units)
          }))
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

function productMixGroup(row) {
  const title = normalizeText(row.product_title_raw);
  const sku = normalizeText(row.sku);
  const text = `${title} ${sku}`;
  const revenue = number(row.item_revenue);

  if (revenue <= 0) return 'brindes';

  if (/(mochila|mala|bolsa|bag|backpack|stuttgart|munich|manhattan|zurich|nyc)/.test(text)) {
    return 'mochilas';
  }

  if (/(tenis|tenis|sapato|bota|calcado|sneaker|rs[0-9]|911|macan|urus|phantom|knit|carrera|krahen|avant|gt)/.test(text)) {
    return 'calcados';
  }

  return 'acessorios';
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function buildPendingProducts() {
  return [
    { pending: true, name: 'Produto e mix pendentes', family: 'Calçados, mochilas, acessórios e brindes', revenue: null, share: null }
  ];
}

function buildQuality(rows) {
  const itemRows = sum(rows, 'item_rows');
  const unitsTotal = sum(rows, 'units_total');
  const paidUnits = sum(rows, 'paid_units');
  const itemRevenue = sum(rows, 'item_revenue');

  return [
    { label: 'Linhas de item', value: formatInt(itemRows), note: 'Linhas validas na camada de itens' },
    { label: 'Itens totais', value: formatInt(unitsTotal), note: 'Quantidade total em pedidos validos' },
    { label: 'Itens pagos', value: formatInt(paidUnits), note: 'Itens com valor liquido maior que zero' },
    { label: 'Brindes', value: formatInt(sum(rows, 'gift_units')), note: 'Itens com valor liquido igual a zero' },
    { label: 'Receita de itens pagos', value: formatMoney(itemRevenue), note: 'Base item-level para produto e mix' }
  ];
}

function buildPendingQuality() {
  return [
    { label: 'Qualidade da venda', value: 'Pendente', note: 'Rodar view=quality ou view=all com refresh manual' },
    { label: 'Itens pagos', value: 'Pendente', note: 'Aguardando dados item-level' },
    { label: 'Receita de itens', value: 'Pendente', note: 'Aguardando ssot_order_items' },
    { label: 'Brindes', value: 'Pendente', note: 'Regra ainda nao validada' }
  ];
}

function buildPendingChannels() {
  return [
    { canal: 'Pendente', sessoes: 'Validar origem', pedidos: 'Pendente', receita: 'Pendente', conv: 'Pendente', origins: [] }
  ];
}

function buildChannels(rows) {
  const channelRows = rows.filter((row) => row.row_type !== 'origin');
  const originRows = rows.filter((row) => row.row_type === 'origin');
  const originsByChannel = originRows.reduce((groups, row) => {
    const key = row.canal || 'Outros';
    if (!groups[key]) groups[key] = [];
    groups[key].push({
      origem: row.origem || '(sem origem)',
      detalhe: row.canal_detalhe || '',
      pedidos: formatInt(row.pedidos),
      receita: formatMoney(row.receita_atribuida),
      sortValue: number(row.receita_atribuida)
    });
    return groups;
  }, {});

  Object.values(originsByChannel).forEach((origins) => {
    origins.sort((a, b) => b.sortValue - a.sortValue);
    origins.forEach((origin) => delete origin.sortValue);
  });

  return channelRows.map((row) => ({
    canal: row.canal || 'Nao mapeado',
    sessoes: number(row.sessoes) > 0 ? formatInt(row.sessoes) : 'Pendente',
    pedidos: formatInt(row.pedidos),
    receita: formatMoney(row.receita_atribuida),
    conv: number(row.sessoes) > 0
      ? `${(number(row.taxa_conversao) * 100).toFixed(1).replace('.', ',')}%`
      : 'Pendente',
    origins: originsByChannel[row.canal] || []
  }));
}

function buildStock(rows) {
  return rows.map((item) => {
    const available = number(item.available_total);
    const coverage = item.dias_cobertura_aprox === null || item.dias_cobertura_aprox === undefined
      ? null
      : number(item.dias_cobertura_aprox);
    const status = item.alert_level === 'STOCKOUT_COM_DEMANDA' || item.alert_level === 'ERRO_SEM_REGISTRO_DE_ESTOQUE'
      ? 'risco_critico'
      : item.alert_level === 'STOCKOUT' || available <= 0
        ? 'ruptura'
        : coverage !== null && coverage < 7
          ? 'risco_critico'
          : coverage !== null && coverage < 30
            ? 'risco'
            : 'ok';

    return {
      sku: item.sku || 'SKU pendente',
      label: item.product_title || item.variant_title || item.sku || 'Produto',
      status,
      days: coverage,
      available,
      total6m: number(item.total_6m),
      coverageLabel: coverage === null
        ? `${formatInt(available)} un. disponiveis | cobertura pendente`
        : `${formatInt(available)} un. | ${coverage.toFixed(1).replace('.', ',')} dias de cobertura`,
      alertLevel: item.alert_level || null,
      stockoutDate: item.estimated_stockout_date || null
    };
  });
}

function buildPendingStock() {
  return [
    {
      pending: true,
      sku: 'Pendente',
      label: 'Estoque pendente',
      status: 'pendente',
      days: null,
      coverageLabel: 'Rodar view=stock'
    }
  ];
}

function buildGrowth(rows) {
  const daily = rows.filter((row) => row.row_type === 'daily');
  const campaignMap = new Map();
  rows.filter((row) => row.row_type === 'campaign').forEach((row) => {
    const key = `${row.origem || 'Midia'}|${row.campanha_nome || 'Campanha sem nome'}`;
    const current = campaignMap.get(key) || {
      source: row.origem || 'Midia',
      name: row.campanha_nome || 'Campanha sem nome',
      spend: 0,
      clicks: 0,
      impressions: 0
    };
    current.spend += number(row.investimento);
    current.clicks += number(row.cliques);
    current.impressions += number(row.impressoes);
    campaignMap.set(key, current);
  });

  const campaigns = [...campaignMap.values()]
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 8);

  const totals = daily.reduce((acc, row) => {
    ['investimento_total_mkt', 'investimento_total_ads', 'custo_whatsapp', 'receita_total', 'pedidos_aprovados', 'sessoes', 'clientes_novos', 'clientes_recorrentes', 'cliques', 'impressoes'].forEach((key) => {
      acc[key] += number(row[key]);
    });
    return acc;
  }, {
    investimento_total_mkt: 0,
    investimento_total_ads: 0,
    custo_whatsapp: 0,
    receita_total: 0,
    pedidos_aprovados: 0,
    sessoes: 0,
    clientes_novos: 0,
    clientes_recorrentes: 0,
    cliques: 0,
    impressoes: 0
  });

  return {
    totals: {
      ...totals,
      roasMkt: totals.investimento_total_mkt ? totals.receita_total / totals.investimento_total_mkt : null,
      cacMkt: totals.clientes_novos ? totals.investimento_total_mkt / totals.clientes_novos : null,
      conversion: totals.sessoes ? totals.pedidos_aprovados / totals.sessoes : null
    },
    campaigns,
    daily
  };
}

function buildPendingGrowth() {
  return { pending: true, totals: null, campaigns: [], daily: [] };
}

function buildCrm(rows) {
  const campaigns = rows
    .filter((row) => row.row_type === 'campaign' || row.campanha_nome)
    .map((row) => ({
      date: row.data || null,
      channel: row.canal || 'CRM',
      name: row.campanha_nome || 'Campanha sem nome',
      status: row.status || null,
      segment: row.segmento || 'Segmentacao nao informada',
      audience: nullableNumber(row.publico),
      delivered: nullableNumber(row.entregues),
      opens: nullableNumber(row.aberturas),
      clicks: nullableNumber(row.cliques),
      sessions: nullableNumber(row.sessoes),
      orders: nullableNumber(row.pedidos),
      revenue: nullableNumber(row.receita),
      investment: nullableNumber(row.investimento),
      cac: nullableNumber(row.cac),
      roi: nullableNumber(row.roi),
      sourceTab: row.source_tab || null
    }))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(a.name).localeCompare(String(b.name)));

  const metricTotal = (key) => {
    const seen = campaigns.some((campaign) => campaign[key] !== null);
    return seen ? campaigns.reduce((total, campaign) => total + number(campaign[key]), 0) : null;
  };

  const segmentMap = new Map();
  campaigns.forEach((campaign) => {
    const current = segmentMap.get(campaign.segment) || { name: campaign.segment, campaigns: 0, delivered: 0 };
    current.campaigns += 1;
    current.delivered += number(campaign.delivered);
    segmentMap.set(campaign.segment, current);
  });

  const revenue = metricTotal('revenue');
  const investment = metricTotal('investment');
  return {
    pending: false,
    campaigns,
    segments: [...segmentMap.values()].sort((a, b) => b.delivered - a.delivered),
    sourceTabs: [...new Set(campaigns.map((campaign) => campaign.sourceTab).filter(Boolean))],
    totals: {
      campaigns: campaigns.length,
      delivered: metricTotal('delivered'),
      opens: metricTotal('opens'),
      clicks: metricTotal('clicks'),
      sessions: metricTotal('sessions'),
      orders: metricTotal('orders'),
      revenue,
      investment,
      roi: revenue !== null && investment ? revenue / investment : null
    }
  };
}

function buildPendingCrm() {
  return { pending: true, totals: null, campaigns: [], segments: [], sourceTabs: [] };
}

function buildDecisions(heatmapRows, stockRows, comparison, growthRows = [], crmRows = []) {
  const decisions = [];
  const topHour = [...heatmapRows].sort((a, b) => number(b.paid_orders) - number(a.paid_orders))[0];
  const scarceStock = [...stockRows]
    .sort((a, b) => number(a.available_total) - number(b.available_total))
    .find((item) => number(item.available_total) <= 5);

  if (topHour) {
    decisions.push({
      derived: true,
      time: `${String(topHour.order_hour_brt).padStart(2, '0')}h`,
      owner: 'Operacao',
      text: `Priorizar monitoramento da janela de maior volume em ${shortDate(topHour.order_date_brt)}.`,
      impact: `${formatInt(topHour.paid_orders)} pedidos no pico`
    });
  }

  if (scarceStock) {
    decisions.push({
      derived: true,
      time: '--',
      owner: 'Estoque',
      text: `Validar disponibilidade de ${scarceStock.product_title || scarceStock.variant_title || scarceStock.sku || 'SKU critico'} antes de ampliar a exposicao.`,
      impact: `${formatInt(scarceStock.available_total)} un. disponiveis`
    });
  }

  if (comparison.hasCompare) {
    decisions.push({
      derived: true,
      time: '--',
      owner: 'Comercial',
      text: 'Usar o comparativo como referencia de acompanhamento, sem trata-lo como meta oficial.',
      impact: formatDelta(comparison.revenueDelta, 'vs comparativo')
    });
  }

  const growth = buildGrowth(growthRows);
  if (growth.totals?.roasMkt !== null && growth.totals.roasMkt < 2) {
    decisions.push({
      derived: true,
      time: '--',
      owner: 'Growth',
      text: 'Revisar a distribuição de investimento antes de escalar campanhas.',
      impact: `ROAS de marketing ${growth.totals.roasMkt.toFixed(2).replace('.', ',')}x`
    });
  }

  const crm = buildCrm(crmRows);
  if (crm.totals?.campaigns) {
    const crmImpact = crm.totals.revenue !== null
      ? `${formatMoney(crm.totals.revenue)} receita CRM`
      : `${formatInt(crm.totals.campaigns)} campanhas lidas`;
    decisions.push({
      derived: true,
      time: '--',
      owner: 'CRM',
      text: 'Priorizar a base de maior propensão e medir retorno da campanha por segmento.',
      impact: crmImpact
    });
  }

  return decisions.length ? decisions : buildPendingDecisions();
}

function buildPendingDecisions() {
  return [
    {
      pending: true,
      time: '--',
      owner: 'Calendario comercial',
      text: 'Aguardando fonte de acoes para conectar decisao, dia/hora e impacto observado.',
      impact: 'Pendente'
    }
  ];
}

function buildSlack(slackRows, statusRows, heatmapRows) {
  const latest = slackRows[0] || [...statusRows].sort((a, b) => String(b.order_date_brt).localeCompare(String(a.order_date_brt)))[0];
  const topHour = [...heatmapRows].sort((a, b) => number(b.paid_orders) - number(a.paid_orders))[0];

  if (!latest) return mockData.slack;

  return [
    `Black | ${shortDate(latest.report_date || latest.order_date_brt)}`,
    `Receita paga: ${formatMoney(latest.paid_revenue)} | Pedidos: ${formatInt(latest.paid_orders)} | Ticket: ${formatMoney(latest.avg_ticket)}`,
    topHour ? `Maior janela observada: ${shortDate(topHour.order_date_brt)} as ${String(topHour.order_hour_brt).padStart(2, '0')}h, com ${formatInt(topHour.paid_orders)} pedidos.` : 'Maior janela observada: pendente.',
    'Calendario comercial: pendente de carga das acoes para explicar impacto por dia/hora.',
    'Proxima decisao sugerida: validar meta oficial, acoes comerciais e estoque critico antes de publicar leitura executiva.'
  ].join('\n');
}

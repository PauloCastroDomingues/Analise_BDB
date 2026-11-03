var BDB_SNAPSHOT_FILE_NAME = 'bdb_2026_snapshot.json';
var BDB_SNAPSHOT_FILE_ID_PROPERTY = 'BDB_SNAPSHOT_FILE_ID';
var BDB_MIN_REFRESH_INTERVAL_SECONDS = 900;
var BDB_MAX_BYTES_BILLED = '1073741824';
// A consulta de cobertura de estoque le seis meses (1,9 GB no teste de 03/11).
// Apenas essa visao recebe 2 GiB; as demais permanecem limitadas a 1 GiB.
var BDB_MAX_BYTES_BILLED_BY_VIEW = { stock: '2147483648' };
var BDB_QUERY_LOCATIONS = { targets: 'US', channels: 'US', growth: 'US' };
var BDB_OPTIONAL_QUERY_BUILDERS = { targets: true, channels: true, growth: true, crm: true };
var BDB_CRM_SPREADSHEET_ID = '1vlkkrA52FBGk79k0ou3vch1XqM-AdHVDj42IXO7hIZo';
var BDB_CRM_WHATSAPP_SHEET = 'Controle Disparos de Whatsapp';
var BDB_CRM_EMAIL_SHEET = 'Controle de disparos';

function doGet(e) {
  var view = (e && e.parameter && e.parameter.view) || 'all';
  var shouldRefresh = Boolean(e && e.parameter && e.parameter.refresh === '1');
  var forceRefresh = Boolean(e && e.parameter && e.parameter.force === '1');

  try {
    var window = requestWindow_(e);

    if (view === 'growth_views') {
      return json_(shouldRefresh ? SSOT_refreshGrowthViews() : SSOT_readGrowthViews_());
    }

    if (view === 'health') {
      return json_(health_());
    }

    if (shouldRefresh) {
      return json_(refreshAndReturn_(view, forceRefresh, window));
    }

    return json_(readSnapshotResponse_(view));
  } catch (error) {
    return json_({
      ok: false,
      error: String(error && error.message ? error.message : error),
      view: view,
      generatedAt: now_()
    });
  }
}

function refreshAndReturn_(view, forceRefresh, window) {
  var current = readSnapshot_();
  if (!forceRefresh && current && hasFreshSnapshotView_(current, view, window)) {
    current.refreshSkipped = true;
    current.refreshReason = 'Intervalo minimo entre atualizacoes ainda nao foi atingido.';
    return filterPayload_(current, view);
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    current = readSnapshot_();
    if (!forceRefresh && current && hasFreshSnapshotView_(current, view, window)) {
      current.refreshSkipped = true;
      current.refreshReason = 'Intervalo minimo entre atualizacoes ainda nao foi atingido.';
      return filterPayload_(current, view);
    }

    var payload = buildPayloadFromBigQuery_(view, window);
    var merged = mergeSnapshot_(current, payload);
    saveSnapshot_(merged);
    return filterPayload_(merged, view);
  } finally {
    lock.releaseLock();
  }
}

function hasSnapshotView_(snapshot, view) {
  if (!snapshot || !snapshot.data) return false;

  if (view === 'all') {
    return Object.keys(BDB_QUERY_BUILDERS).every(function(key) {
      return Object.prototype.hasOwnProperty.call(snapshot.data, key);
    });
  }

  return Object.prototype.hasOwnProperty.call(snapshot.data, view);
}

function mergeSnapshot_(current, incoming) {
  if (!current || !current.data) {
    return incoming;
  }

  var data = {};
  Object.keys(current.data || {}).forEach(function(key) {
    data[key] = current.data[key];
  });

  var merged = {
    ok: true,
    generatedAt: incoming.generatedAt,
    source: incoming.source,
    costControl: incoming.costControl,
    meta: incoming.meta,
    viewMeta: current.viewMeta || {},
    data: data
  };

  Object.keys(incoming.data || {}).forEach(function(key) {
    merged.data[key] = incoming.data[key];
    merged.viewMeta[key] = incoming.viewMeta && incoming.viewMeta[key] ? incoming.viewMeta[key] : incoming.meta;
  });

  return merged;
}

function hasFreshSnapshotView_(snapshot, view, window) {
  if (!hasSnapshotView_(snapshot, view)) return false;

  if (view === 'all') {
    return Object.keys(BDB_QUERY_BUILDERS).every(function(key) {
      return hasFreshSnapshotView_(snapshot, key, window);
    });
  }

  var meta = snapshot.viewMeta && snapshot.viewMeta[view] ? snapshot.viewMeta[view] : snapshot.meta;
  return sameSnapshotWindow_(meta, window) && !canRefresh_(meta && meta.generatedAt);
}

function readSnapshotResponse_(view) {
  var snapshot = readSnapshot_();

  if (!snapshot) {
    return {
      ok: false,
      source: 'snapshot_missing',
      error: 'Snapshot ainda nao existe. Clique em Atualizar dados para gerar a primeira carga.',
      generatedAt: now_()
    };
  }

  snapshot.source = 'drive_snapshot';
  return filterPayload_(snapshot, view);
}

function buildPayloadFromBigQuery_(view, window) {
  var data = {};
  var viewMeta = {};

  if (view === 'all') {
    Object.keys(BDB_QUERY_BUILDERS).forEach(function(key) {
      viewMeta[key] = {
        window: window,
        snapshotKey: snapshotKey_(window),
        generatedAt: now_()
      };

      try {
        data[key] = key === 'crm'
          ? readCrmSpreadsheet_(window)
          : runQuery_(BDB_QUERY_BUILDERS[key](window), queryLocation_(key), BDB_MAX_BYTES_BILLED_BY_VIEW[key]);
        if (key === 'crm') viewMeta[key].source = 'google_sheet_read_only';
      } catch (error) {
        if (!BDB_OPTIONAL_QUERY_BUILDERS[key]) throw error;
        data[key] = [];
        viewMeta[key].error = String(error && error.message ? error.message : error);
      }
    });
  } else {
    if (!BDB_QUERY_BUILDERS[view]) {
      throw new Error('View nao suportada: ' + view);
    }

    data[view] = view === 'crm'
      ? readCrmSpreadsheet_(window)
      : runQuery_(BDB_QUERY_BUILDERS[view](window), queryLocation_(view), BDB_MAX_BYTES_BILLED_BY_VIEW[view]);
    viewMeta[view] = {
      window: window,
      snapshotKey: snapshotKey_(window),
      generatedAt: now_(),
      source: view === 'crm' ? 'google_sheet_read_only' : 'bigquery'
    };
  }

  return {
    ok: true,
    generatedAt: now_(),
    source: 'manual_refresh_bq_and_crm_sheet',
    meta: {
      window: window,
      snapshotKey: snapshotKey_(window)
    },
    viewMeta: viewMeta,
    costControl: {
      refreshMode: 'manual_button',
      forceRefreshEnabled: true,
      maxBytesBilledPerQuery: BDB_MAX_BYTES_BILLED,
      maxBytesBilledByView: BDB_MAX_BYTES_BILLED_BY_VIEW,
      minRefreshIntervalSeconds: BDB_MIN_REFRESH_INTERVAL_SECONDS
    },
    data: data
  };
}

// CRM is a protected operational spreadsheet: read values only, never mutate it.
function readCrmSpreadsheet_(window) {
  var spreadsheet = SpreadsheetApp.openById(BDB_CRM_SPREADSHEET_ID);
  var rows = [];
  rows = rows.concat(readCrmWhatsappSheet_(spreadsheet.getSheetByName(BDB_CRM_WHATSAPP_SHEET), window));
  rows = rows.concat(readCrmEmailSheet_(spreadsheet.getSheetByName(BDB_CRM_EMAIL_SHEET), window));
  return rows;
}

function readCrmWhatsappSheet_(sheet, window) {
  if (!sheet) throw new Error('Aba CRM ausente: ' + BDB_CRM_WHATSAPP_SHEET);
  var values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return [];
  var headers = crmHeaderMap_(values[0]);
  var rows = [];

  values.slice(1).forEach(function(row) {
    var campaignName = crmCell_(row, headers, ['tema', 'assunto']);
    var date = crmDateInWindow_(crmCell_(row, headers, ['data']), window);
    if (!campaignName || !date) return;

    rows.push({
      row_type: 'campaign',
      source_tab: BDB_CRM_WHATSAPP_SHEET,
      canal: 'WhatsApp',
      data: date,
      campanha_nome: campaignName,
      status: crmCell_(row, headers, ['status']),
      segmento: crmCell_(row, headers, ['segmentacao']),
      publico: crmNumber_(crmCell_(row, headers, ['publico'])),
      entregues: crmNumber_(crmCell_(row, headers, ['total entregue'])),
      aberturas: crmNumber_(crmCell_(row, headers, ['aberturas'])),
      cliques: crmNumber_(crmCell_(row, headers, ['total de cliques'])),
      sessoes: crmNumber_(crmCell_(row, headers, ['sessoes'])),
      pedidos: crmNumber_(crmCell_(row, headers, ['pedidos'])),
      receita: crmNumber_(crmCell_(row, headers, ['receita'])),
      investimento: crmNumber_(crmCell_(row, headers, ['investimento'])),
      cac: crmNumber_(crmCell_(row, headers, ['cac'])),
      roi: crmNumber_(crmCell_(row, headers, ['roi']))
    });
  });

  return rows;
}

function readCrmEmailSheet_(sheet, window) {
  if (!sheet) throw new Error('Aba CRM ausente: ' + BDB_CRM_EMAIL_SHEET);
  var values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return [];
  var headers = crmHeaderMap_(values[0]);
  var rows = [];

  values.slice(1).forEach(function(row) {
    var campaignName = crmCell_(row, headers, ['tema', 'assunto']);
    var date = crmDateInWindow_(crmCell_(row, headers, ['data']), window);
    if (!campaignName || !date) return;

    rows.push({
      row_type: 'campaign',
      source_tab: BDB_CRM_EMAIL_SHEET,
      canal: 'E-mail',
      data: date,
      campanha_nome: campaignName,
      status: crmCell_(row, headers, ['status']),
      segmento: crmCell_(row, headers, ['segmentacao']),
      publico: crmNumber_(crmCell_(row, headers, ['publico'])),
      entregues: crmNumber_(crmCell_(row, headers, ['total entregue'])),
      aberturas: crmNumber_(crmCell_(row, headers, ['aberturas'])),
      cliques: crmNumber_(crmCell_(row, headers, ['total de cliques'])),
      sessoes: null,
      pedidos: null,
      receita: null,
      investimento: null,
      cac: null,
      roi: null
    });
  });

  return rows;
}

function crmHeaderMap_(headers) {
  var map = {};
  headers.forEach(function(header, index) {
    map[crmNormalize_(header)] = index;
  });
  return map;
}

function crmCell_(row, headers, candidates) {
  for (var i = 0; i < candidates.length; i += 1) {
    var index = headers[crmNormalize_(candidates[i])];
    if (index !== undefined) return String(row[index] || '').trim();
  }
  return '';
}

function crmNormalize_(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[.:]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function crmNumber_(value) {
  var text = String(value || '').trim();
  if (!text) return null;
  var normalized = text.replace(/[^0-9,.-]/g, '');
  if (!normalized) return null;
  if (normalized.indexOf(',') >= 0) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(normalized)) {
    normalized = normalized.replace(/\./g, '');
  }
  var parsed = Number(normalized);
  return isNaN(parsed) ? null : parsed;
}

function crmDateInWindow_(value, window) {
  var match = String(value || '').trim().match(/^(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?$/);
  if (!match) return null;
  var day = Number(match[1]);
  var month = Number(match[2]);
  var baseYear = Number(String(window.start).slice(0, 4));
  var years = match[3] ? [Number(match[3].length === 2 ? '20' + match[3] : match[3])] : [baseYear, baseYear - 1, baseYear + 1];

  for (var i = 0; i < years.length; i += 1) {
    var candidate = new Date(years[i], month - 1, day);
    if (candidate.getFullYear() !== years[i] || candidate.getMonth() !== month - 1 || candidate.getDate() !== day) continue;
    var iso = Utilities.formatDate(candidate, 'America/Sao_Paulo', 'yyyy-MM-dd');
    if (iso >= window.start && iso <= window.end) return iso;
  }
  return null;
}

function filterPayload_(payload, view) {
  if (view === 'all') {
    return payload;
  }

  if (!payload.data || !payload.data[view]) {
    throw new Error('View nao suportada ou ausente no snapshot: ' + view);
  }

  return {
    ok: true,
    generatedAt: payload.generatedAt,
    source: payload.source,
    view: view,
    meta: payload.viewMeta && payload.viewMeta[view] ? payload.viewMeta[view] : payload.meta || null,
    data: payload.data[view],
    costControl: payload.costControl || null,
    refreshSkipped: payload.refreshSkipped || false,
    refreshReason: payload.refreshReason || null
  };
}

function canRefresh_(generatedAt) {
  if (!generatedAt) return true;

  var last = new Date(generatedAt).getTime();
  if (isNaN(last)) return true;

  var elapsedSeconds = Math.floor((Date.now() - last) / 1000);
  return elapsedSeconds >= BDB_MIN_REFRESH_INTERVAL_SECONDS;
}

function requestWindow_(e) {
  var params = e && e.parameter ? e.parameter : {};
  var end = normalizeDateParam_(params.end, today_());
  var start = normalizeDateParam_(params.start, yesterday_());

  if (new Date(start).getTime() > new Date(end).getTime()) {
    throw new Error('Periodo invalido: start nao pode ser maior que end.');
  }

  var compareStartDefault = shiftYear_(start, -1);
  var compareEndDefault = shiftYear_(end, -1);
  var compareStart = normalizeDateParam_(params.compareStart, compareStartDefault);
  var compareEnd = normalizeDateParam_(params.compareEnd, compareEndDefault);

  if (new Date(compareStart).getTime() > new Date(compareEnd).getTime()) {
    throw new Error('Periodo comparativo invalido: compareStart nao pode ser maior que compareEnd.');
  }

  return {
    start: start,
    end: end,
    compareStart: compareStart,
    compareEnd: compareEnd
  };
}

function normalizeDateParam_(value, fallback) {
  var candidate = value || fallback;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
    throw new Error('Data invalida: ' + candidate + '. Use AAAA-MM-DD.');
  }
  return candidate;
}

function today_() {
  return Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'yyyy-MM-dd');
}

function yesterday_() {
  var date = new Date();
  date.setDate(date.getDate() - 1);
  return Utilities.formatDate(date, 'America/Sao_Paulo', 'yyyy-MM-dd');
}

function shiftYear_(dateText, amount) {
  var parts = dateText.split('-');
  var year = Number(parts[0]) + amount;
  return [year, parts[1], parts[2]].join('-');
}

function snapshotKey_(window) {
  if (!window) return '';
  return [window.start, window.end, window.compareStart, window.compareEnd].join('|');
}

function sameSnapshotWindow_(payload, window) {
  if (!payload || !payload.snapshotKey || !window) return false;
  return payload.snapshotKey === snapshotKey_(window);
}

function readSnapshot_() {
  var file = findSnapshotFile_();
  if (!file) return null;

  var content = file.getBlob().getDataAsString('UTF-8');
  if (!content) return null;

  return JSON.parse(content);
}

function saveSnapshot_(payload) {
  var content = JSON.stringify(payload);
  var file = findSnapshotFile_();

  if (file) {
    file.setContent(content);
    return;
  }

  createSnapshotFile_(content);
}

function findSnapshotFile_() {
  var fileId = PropertiesService.getScriptProperties().getProperty(BDB_SNAPSHOT_FILE_ID_PROPERTY);
  if (!fileId) return null;

  try {
    return DriveApp.getFileById(fileId);
  } catch (error) {
    PropertiesService.getScriptProperties().deleteProperty(BDB_SNAPSHOT_FILE_ID_PROPERTY);
    return null;
  }
}

function createSnapshotFile_(content) {
  var file = DriveApp.createFile(BDB_SNAPSHOT_FILE_NAME, content, MimeType.PLAIN_TEXT);
  PropertiesService.getScriptProperties().setProperty(BDB_SNAPSHOT_FILE_ID_PROPERTY, file.getId());
  return file;
}

function health_() {
  var snapshot = readSnapshot_();
  return {
    ok: true,
    generatedAt: now_(),
    source: 'apps_script_health',
    projectId: BDB_PROJECT_ID,
    location: BDB_LOCATION,
    hasSnapshot: Boolean(snapshot),
    snapshotGeneratedAt: snapshot ? snapshot.generatedAt : null,
    costControl: {
      refreshMode: 'manual_button',
      forceRefreshEnabled: true,
      maxBytesBilledPerQuery: BDB_MAX_BYTES_BILLED,
      maxBytesBilledByView: BDB_MAX_BYTES_BILLED_BY_VIEW,
      minRefreshIntervalSeconds: BDB_MIN_REFRESH_INTERVAL_SECONDS
    }
  };
}

function queryLocation_(view) {
  return BDB_QUERY_LOCATIONS[view] || BDB_LOCATION;
}

function runQuery_(sql, location, maxBytesBilled) {
  var request = {
    query: sql,
    useLegacySql: false,
    location: location || BDB_LOCATION,
    maximumBytesBilled: maxBytesBilled || BDB_MAX_BYTES_BILLED
  };

  var result = BigQuery.Jobs.query(request, BDB_PROJECT_ID);
  var jobId = result.jobReference.jobId;
  var rows = result.rows || [];

  while (!result.jobComplete) {
    Utilities.sleep(500);
    result = BigQuery.Jobs.getQueryResults(BDB_PROJECT_ID, jobId, {
      location: location || BDB_LOCATION
    });
    rows = result.rows || rows;
  }

  var pageToken = result.pageToken;
  while (pageToken) {
    var page = BigQuery.Jobs.getQueryResults(BDB_PROJECT_ID, jobId, {
      location: location || BDB_LOCATION,
      pageToken: pageToken
    });
    rows = rows.concat(page.rows || []);
    pageToken = page.pageToken;
  }

  return normalizeRows_(result.schema.fields, rows);
}

function normalizeRows_(fields, rows) {
  return rows.map(function(row) {
    var item = {};
    fields.forEach(function(field, index) {
      item[field.name] = normalizeValue_(row.f[index] ? row.f[index].v : null, field);
    });
    return item;
  });
}

function normalizeValue_(value, field) {
  if (value === null || value === undefined) return null;

  if (field.mode === 'REPEATED') {
    return (value || []).map(function(entry) {
      return entry.v;
    });
  }

  if (field.type === 'INTEGER' || field.type === 'FLOAT' || field.type === 'NUMERIC') {
    var numberValue = Number(value);
    return isNaN(numberValue) ? value : numberValue;
  }

  if (field.type === 'BOOLEAN') {
    return value === true || value === 'true';
  }

  return value;
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function now_() {
  return Utilities.formatDate(new Date(), 'America/Sao_Paulo', "yyyy-MM-dd'T'HH:mm:ssXXX");
}

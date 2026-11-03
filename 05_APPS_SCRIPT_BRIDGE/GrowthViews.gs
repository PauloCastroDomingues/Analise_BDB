// Growth Performance: oito visoes SSOT, somente leitura.
// Este arquivo nao cria nem altera tabelas, views, schemas ou dados.

var BDB_GROWTH_VIEWS_FILE_ID_PROPERTY = 'BDB_GROWTH_VIEWS_FILE_ID';
var BDB_GROWTH_VIEWS_FILE_NAME = 'ssot_growth_views.json';
var BDB_GROWTH_CHANNEL_CLOSED_TABLE = 'shopify_sessions_channels_daily_human_closed_v + shopify_orders_last_click_daily_v';

var BDB_GROWTH_VIEW_SPECS = [
  { key: 'channel', label: 'Taxa geral do canal', candidates: ['aquisicao_por_canal_origem_daily_v'], dimensions: ['canal'] },
  { key: 'campaign', label: 'Taxa das campanhas', candidates: ['aquisicao_por_campanha_daily', 'aquisicao_por_campanha_daily_v', 'aquisicao_por_campanha', 'aquisicao_por_campanha_v'], dimensions: ['campaign'] },
  { key: 'ad_group', label: 'Taxa dos grupos de anuncios', candidates: ['aquisicao_criativos_daily', 'aquisicao_criativos_daily_v', 'aquisicao_criativos', 'aquisicao_criativos_v'], dimensions: ['ad_group'] },
  { key: 'ad', label: 'Taxa dos anuncios', candidates: ['aquisicao_criativos_daily', 'aquisicao_criativos_daily_v', 'aquisicao_criativos', 'aquisicao_criativos_v'], dimensions: ['ad'] },
  { key: 'channel_product', label: 'Canal + produto', candidates: ['aquisicao_por_produto_canal_daily', 'aquisicao_por_produto_canal_daily_v', 'aquisicao_por_produto_canal', 'aquisicao_por_produto_canal_v'], dimensions: ['canal', 'product'] },
  { key: 'campaign_product', label: 'Campanha + produto', candidates: ['aquisicao_por_campanha_daily', 'aquisicao_por_campanha_daily_v', 'aquisicao_por_campanha', 'aquisicao_por_campanha_v', 'aquisicao_criativos_daily', 'aquisicao_criativos_daily_v'], dimensions: ['campaign', 'product'] },
  { key: 'ad_group_product', label: 'Grupo de anuncio + produto', candidates: ['aquisicao_criativos_daily', 'aquisicao_criativos_daily_v', 'aquisicao_criativos', 'aquisicao_criativos_v'], dimensions: ['ad_group', 'product'] },
  { key: 'ad_product', label: 'Anuncio + produto', candidates: ['aquisicao_criativos_daily', 'aquisicao_criativos_daily_v', 'aquisicao_criativos', 'aquisicao_criativos_v'], dimensions: ['ad', 'product'] }
];

var BDB_GROWTH_COLUMN_ALIASES = {
  date: ['data', 'date', 'event_date', 'order_date_brt', 'mes'],
  canal: ['canal', 'channel', 'canal_detalhe'],
  origem: ['origem', 'utm_source', 'source'],
  campaign_id: ['campaign_id', 'campanha_id', 'id_campanha', 'id_campaign', 'session_campaign_id', 'session_manual_campaign_id'],
  campaign: ['campaign', 'campaign_name', 'campanha', 'campanha_nome', 'nome_campanha', 'utm_campaign', 'campaign_title', 'session_campaign_name', 'session_manual_campaign_name'],
  ad_group_id: ['ad_group_id', 'grupo_anuncio_id', 'adgroup_id', 'group_id', 'grupo_id', 'adset_id', 'ad_set_id', 'conjunto_id', 'id_grupo', 'session_google_ads_ad_group_id'],
  ad_group: ['ad_group', 'ad_group_name', 'grupo_anuncio', 'grupo_anuncio_nome', 'grupo', 'grupo_nome', 'conjunto', 'conjunto_anuncios', 'adset', 'ad_set', 'group_name', 'nome_grupo', 'nome_conjunto', 'session_google_ads_ad_group_name'],
  ad_id: ['ad_id', 'anuncio_id', 'creative_id', 'criativo_id', 'id_anuncio', 'id_criativo', 'session_google_ads_creative_id'],
  ad: ['ad', 'ad_name', 'anuncio', 'anuncio_nome', 'creative_name', 'criativo', 'criativo_nome', 'nome_anuncio', 'session_google_ads_creative_name', 'session_manual_ad_content'],
  product_id: ['product_id', 'produto_id', 'sku', 'item_id', 'id_produto', 'variant_id'],
  product: ['product', 'product_name', 'produto', 'produto_nome', 'product_title', 'item_name', 'nome_produto'],
  sessions: ['sessoes', 'sessions', 'sessoes_ssot', 'sessions_ssot', 'sessoes_ga4', 'sessoes_total', 'sessions_total', 'session_count'],
  orders: ['pedidos', 'pedidos_total', 'orders', 'valid_orders', 'paid_orders', 'pedidos_atribuidos', 'orders_total', 'order_count', 'compras', 'conversoes'],
  revenue: ['receita', 'receita_total', 'revenue', 'vendas', 'total_sales', 'item_revenue', 'total_amount', 'receita_atribuida', 'revenue_total', 'valor_receita', 'gmv']
};

function SSOT_refreshGrowthViews() {
  var window = SSOT_growthWindow_();
  var columns = SSOT_growthColumns_();
  var views = [];
  var readiness = [];

  BDB_GROWTH_VIEW_SPECS.forEach(function(spec) {
    var source = SSOT_pickGrowthSource_(spec, columns);
    if (!source) {
      var provisionalKeys = ['ad_group', 'ad'];
      if (provisionalKeys.indexOf(spec.key) !== -1) {
        try {
          var provisionalRows = SSOT_growthPeriodRows_(spec, window, true);
          views.push({ view: spec.key, label: spec.label, source: 'shopify_order_utm_resolved_v (UTM provisorio)', rows: provisionalRows });
          readiness.push({
            view: spec.key,
            label: spec.label,
            status: provisionalRows.length ? 'Provisorio por UTM' : 'Sem linhas no recorte',
            source: 'shopify_order_utm_resolved_v (UTM provisorio)',
            reason: 'Pedidos e receita foram identificados por UTM. Sessoes SSOT nao existem neste mesmo grao; conversao permanece pendente.'
          });
          return;
        } catch (provisionalError) {
          views.push({ view: spec.key, label: spec.label, rows: [] });
          readiness.push({
            view: spec.key,
            label: spec.label,
            status: 'Erro na ponte provisoria',
            reason: String(provisionalError && provisionalError.message ? provisionalError.message : provisionalError)
          });
          return;
        }
      }
      views.push({ view: spec.key, label: spec.label, rows: [] });
      readiness.push({
        view: spec.key,
        label: spec.label,
        status: 'Pendente',
        reason: 'Nenhuma tabela SSOT candidata possui data, dimensoes e metricas necessarias.'
      });
      return;
    }

    try {
      var rows = SSOT_growthPeriodRows_(spec, window, false, source);
      var effectiveSource = spec.key === 'channel' ? BDB_GROWTH_CHANNEL_CLOSED_TABLE : source.table;
      views.push({ view: spec.key, label: spec.label, source: effectiveSource, rows: rows });
      readiness.push({
        view: spec.key,
        label: spec.label,
        status: rows.length ? 'Disponivel' : 'Sem linhas no recorte',
        source: effectiveSource,
        fields: spec.key === 'channel' ? {
          date: 'data',
          canal: 'canal',
          sessions: 'sessoes',
          orders: 'pedidos',
          revenue: 'vendas'
        } : source.fields
      });
    } catch (error) {
      var failedSource = spec.key === 'channel' ? BDB_GROWTH_CHANNEL_CLOSED_TABLE : source.table;
      views.push({ view: spec.key, label: spec.label, source: failedSource, rows: [] });
      readiness.push({
        view: spec.key,
        label: spec.label,
        status: 'Erro de consulta',
        source: failedSource,
        reason: String(error && error.message ? error.message : error)
      });
    }
  });

  var payload = {
    ok: true,
    generatedAt: now_(),
    source: 'bigquery_ssot_growth_views_read_only',
    window: window,
    data: views,
    readiness: readiness,
    rules: {
      conversion: 'SUM(pedidos) / SUM(sessoes)',
      missingSessions: 'null permanece null; nunca convertido em zero',
      sourcePolicy: 'somente tabelas e views SSOT existentes',
      bigqueryMutation: 'none'
    }
  };
  SSOT_saveGrowthViews_(payload);
  Logger.log(JSON.stringify({ ok: true, generatedAt: payload.generatedAt, window: payload.window, readiness: payload.readiness }));
  return payload;
}

function SSOT_readGrowthViews_() {
  var fileId = PropertiesService.getScriptProperties().getProperty(BDB_GROWTH_VIEWS_FILE_ID_PROPERTY);
  if (!fileId) {
    return { ok: false, error: 'Snapshot growth_views ainda nao existe. Execute SSOT_refreshGrowthViews().' };
  }
  var file = DriveApp.getFileById(fileId);
  return JSON.parse(file.getBlob().getDataAsString('UTF-8'));
}

function SSOT_saveGrowthViews_(payload) {
  var content = JSON.stringify(payload);
  var fileId = PropertiesService.getScriptProperties().getProperty(BDB_GROWTH_VIEWS_FILE_ID_PROPERTY);
  if (fileId) {
    try {
      DriveApp.getFileById(fileId).setContent(content);
      return;
    } catch (error) {
      PropertiesService.getScriptProperties().deleteProperty(BDB_GROWTH_VIEWS_FILE_ID_PROPERTY);
    }
  }
  var file = DriveApp.createFile(BDB_GROWTH_VIEWS_FILE_NAME, content, MimeType.PLAIN_TEXT);
  PropertiesService.getScriptProperties().setProperty(BDB_GROWTH_VIEWS_FILE_ID_PROPERTY, file.getId());
}

function SSOT_growthWindow_() {
  var timezone = 'America/Sao_Paulo';
  var today = new Date(Utilities.formatDate(new Date(), timezone, 'yyyy-MM-dd') + 'T12:00:00Z');
  today.setUTCDate(today.getUTCDate() - 1);
  var end = Utilities.formatDate(today, timezone, 'yyyy-MM-dd');
  today.setUTCDate(1);
  today.setUTCMonth(today.getUTCMonth() - 11);
  var start = Utilities.formatDate(today, timezone, 'yyyy-MM-dd');
  var compareEndDate = new Date(start + 'T12:00:00Z');
  compareEndDate.setUTCDate(compareEndDate.getUTCDate() - 1);
  var compareStartDate = new Date(start + 'T12:00:00Z');
  compareStartDate.setUTCFullYear(compareStartDate.getUTCFullYear() - 1);
  return {
    start: start,
    end: end,
    compareStart: Utilities.formatDate(compareStartDate, timezone, 'yyyy-MM-dd'),
    compareEnd: Utilities.formatDate(compareEndDate, timezone, 'yyyy-MM-dd')
  };
}

function SSOT_growthPeriodRows_(spec, window, provisional, source) {
  var currentWindow = { start: window.start, end: window.end };
  var compareWindow = { start: window.compareStart, end: window.compareEnd };
  var currentRows = provisional
    ? runQuery_(SSOT_growthProvisionalUtmQuery_(spec, currentWindow), 'US')
    : runQuery_(spec.key === 'channel' ? SSOT_growthClosedChannelQuery_(currentWindow) : SSOT_growthQuery_(spec, source, currentWindow), 'US');
  var compareRows = provisional
    ? runQuery_(SSOT_growthProvisionalUtmQuery_(spec, compareWindow), 'US')
    : runQuery_(spec.key === 'channel' ? SSOT_growthClosedChannelQuery_(compareWindow) : SSOT_growthQuery_(spec, source, compareWindow), 'US');
  return SSOT_tagGrowthRows_(currentRows, 'current').concat(SSOT_tagGrowthRows_(compareRows, 'compare'));
}

function SSOT_growthClosedChannelQuery_(window) {
  return `
    WITH sessions AS (
      SELECT
        SAFE_CAST(data AS DATE) AS data,
        CASE
          WHEN LOWER(TRIM(CAST(canal AS STRING))) = 'google ads' THEN 'Google ADS'
          WHEN LOWER(TRIM(CAST(canal AS STRING))) IN ('whatsapp nao oficial', CONCAT('whatsapp n', CHR(227), 'o oficial'), 'whatsapp organico') THEN 'WhatsApp Organico'
          WHEN LOWER(TRIM(CAST(canal AS STRING))) = 'organico' THEN 'Organico'
          ELSE TRIM(CAST(canal AS STRING))
        END AS canal,
        SUM(SAFE_CAST(sessoes AS INT64)) AS sessoes
      FROM \`reise-ssot.mart_growth_us.shopify_sessions_channels_daily_human_closed_v\`
      WHERE SAFE_CAST(data AS DATE) BETWEEN DATE('${window.start}') AND DATE('${window.end}')
      GROUP BY 1, 2
    ),
    orders AS (
      SELECT
        SAFE_CAST(data AS DATE) AS data,
        CASE
          WHEN LOWER(TRIM(CAST(canal AS STRING))) = 'google ads' THEN 'Google ADS'
          WHEN LOWER(TRIM(CAST(canal AS STRING))) IN ('whatsapp nao oficial', CONCAT('whatsapp n', CHR(227), 'o oficial'), 'whatsapp organico') THEN 'WhatsApp Organico'
          WHEN LOWER(TRIM(CAST(canal AS STRING))) = 'organico' THEN 'Organico'
          ELSE TRIM(CAST(canal AS STRING))
        END AS canal,
        SUM(SAFE_CAST(pedidos AS INT64)) AS pedidos,
        SUM(SAFE_CAST(vendas AS NUMERIC)) AS receita
      FROM \`reise-ssot.mart_growth_us.shopify_orders_last_click_daily_v\`
      WHERE SAFE_CAST(data AS DATE) BETWEEN DATE('${window.start}') AND DATE('${window.end}')
      GROUP BY 1, 2
    )
    SELECT
      COALESCE(s.data, o.data) AS data,
      'channel' AS view_key,
      COALESCE(s.canal, o.canal) AS canal,
      CAST(NULL AS STRING) AS origem,
      CAST(NULL AS STRING) AS campaign_id,
      CAST(NULL AS STRING) AS campanha,
      CAST(NULL AS STRING) AS ad_group_id,
      CAST(NULL AS STRING) AS grupo_anuncio,
      CAST(NULL AS STRING) AS ad_id,
      CAST(NULL AS STRING) AS anuncio,
      CAST(NULL AS STRING) AS product_id,
      CAST(NULL AS STRING) AS produto,
      s.sessoes AS sessoes,
      o.pedidos AS pedidos,
      o.receita AS receita
    FROM sessions s
    FULL OUTER JOIN orders o USING (data, canal)
  `;
}

function SSOT_tagGrowthRows_(rows, period) {
  return (rows || []).map(function(row) {
    var tagged = {};
    Object.keys(row).forEach(function(key) { tagged[key] = row[key]; });
    tagged.period = period;
    return tagged;
  });
}

function SSOT_growthColumns_() {
  var query = `
    SELECT table_name, LOWER(column_name) AS column_name, ordinal_position
    FROM \`reise-ssot.mart_growth_us.INFORMATION_SCHEMA.COLUMNS\`
    ORDER BY table_name, ordinal_position
  `;
  var rows = runQuery_(query, 'US');
  var result = {};
  rows.forEach(function(row) {
    if (!result[row.table_name]) result[row.table_name] = [];
    result[row.table_name].push(String(row.column_name).toLowerCase());
  });
  return result;
}

function SSOT_inspectGrowthSchemas() {
  var columns = SSOT_growthColumns_();
  var fieldsToCheck = ['date', 'canal', 'campaign_id', 'campaign', 'ad_group_id', 'ad_group', 'ad_id', 'ad', 'product_id', 'product', 'sessions', 'orders', 'revenue'];
  var tables = Object.keys(columns).map(function(table) {
    var available = columns[table];
    var fields = {};
    fieldsToCheck.forEach(function(field) {
      fields[field] = SSOT_findColumn_(available, BDB_GROWTH_COLUMN_ALIASES[field]);
    });
    return { table: table, fields: fields };
  }).filter(function(item) {
    var f = item.fields;
    var hasDimension = f.canal || f.campaign_id || f.campaign || f.ad_group_id || f.ad_group || f.ad_id || f.ad || f.product_id || f.product;
    return hasDimension && f.sessions && f.orders;
  }).sort(function(a, b) {
    return a.table.localeCompare(b.table);
  });
  var payload = {
    ok: true,
    generatedAt: now_(),
    dataset: 'reise-ssot.mart_growth_us',
    tables: tables,
    instruction: 'Use these existing column names to validate the eight read-only growth views.'
  };
  Logger.log(JSON.stringify(payload));
  return payload;
}

function SSOT_inspectMissingGrowthCandidates() {
  var columns = SSOT_growthColumns_();
  var fieldsToCheck = ['date', 'canal', 'campaign_id', 'campaign', 'ad_group_id', 'ad_group', 'ad_id', 'ad', 'product_id', 'product', 'sessions', 'orders', 'revenue'];
  var tables = Object.keys(columns).map(function(table) {
    var available = columns[table];
    var fields = {};
    fieldsToCheck.forEach(function(field) {
      fields[field] = SSOT_findColumn_(available, BDB_GROWTH_COLUMN_ALIASES[field]);
    });
    return { table: table, fields: fields };
  }).filter(function(item) {
    var f = item.fields;
    var hasAdDimension = f.ad_group_id || f.ad_group || f.ad_id || f.ad;
    var hasCampaignProduct = (f.campaign_id || f.campaign) && (f.product_id || f.product);
    return hasAdDimension || hasCampaignProduct;
  }).sort(function(a, b) {
    return a.table.localeCompare(b.table);
  });
  var payload = {
    ok: true,
    generatedAt: now_(),
    dataset: 'reise-ssot.mart_growth_us',
    tables: tables,
    instruction: 'These are the only tables with ad/group or campaign/product columns detected by the SSOT catalog.'
  };
  Logger.log(JSON.stringify(payload));
  return payload;
}

function SSOT_inspectGrowthBridges() {
  var columns = SSOT_growthColumns_();
  var targets = [
    'ga4_user_sessions_daily',
    'ga4_user_sessions_daily_v',
    'ga4_campaign_sessions_daily',
    'shopify_order_utm_resolved_v',
    'shopify_orders_attribution_last_click_v',
    'shopify_orders_channels_daily_last_click_v',
    'shopify_marketing_attribution_report_semantic_rows_v',
    'sales_attributed_to_marketing_dashboard_v',
    'ga4_view_item_by_product_daily_v',
    'shopify_sales_by_product_daily_v',
    'shopify_product_view_item_conversion_daily_v'
  ];
  var tables = targets.filter(function(table) { return columns[table]; }).map(function(table) {
    return { table: table, columns: columns[table] };
  });
  var payload = {
    ok: true,
    generatedAt: now_(),
    dataset: 'reise-ssot.mart_growth_us',
    tables: tables,
    instruction: 'Use these bridge columns to validate read-only joins for campaign, ad group, ad and product views.'
  };
  Logger.log(JSON.stringify(payload));
  return payload;
}

function SSOT_growthCandidateTables_(spec, columns) {
  var preferred = spec.candidates.slice();
  if (['channel', 'campaign', 'channel_product'].indexOf(spec.key) !== -1) return preferred;
  Object.keys(columns).sort().forEach(function(table) {
    if (preferred.indexOf(table) === -1 && /^(aquisicao_|dashboard_|ga4_|sales_attributed_|shopify_)/.test(table)) preferred.push(table);
  });
  return preferred;
}

function SSOT_pickGrowthSource_(spec, columns) {
  var best = null;
  var candidates = SSOT_growthCandidateTables_(spec, columns);
  for (var i = 0; i < candidates.length; i += 1) {
    var table = candidates[i];
    var available = columns[table] || [];
    var date = SSOT_findColumn_(available, BDB_GROWTH_COLUMN_ALIASES.date);
    if (!date) continue;
    var fields = { date: date };
    var valid = true;
    spec.dimensions.forEach(function(dimension) {
      var field = SSOT_findColumn_(available, BDB_GROWTH_COLUMN_ALIASES[dimension]);
      if (!field) valid = false;
      fields[dimension] = field;
    });
    if (!valid) continue;
    fields.canal = SSOT_findColumn_(available, BDB_GROWTH_COLUMN_ALIASES.canal);
    fields.origem = SSOT_findColumn_(available, BDB_GROWTH_COLUMN_ALIASES.origem);
    fields.campaign_id = SSOT_findColumn_(available, BDB_GROWTH_COLUMN_ALIASES.campaign_id);
    fields.ad_group_id = SSOT_findColumn_(available, BDB_GROWTH_COLUMN_ALIASES.ad_group_id);
    fields.ad_id = SSOT_findColumn_(available, BDB_GROWTH_COLUMN_ALIASES.ad_id);
    fields.product_id = SSOT_findColumn_(available, BDB_GROWTH_COLUMN_ALIASES.product_id);
    fields.sessions = SSOT_findColumn_(available, BDB_GROWTH_COLUMN_ALIASES.sessions);
    fields.orders = SSOT_findColumn_(available, BDB_GROWTH_COLUMN_ALIASES.orders);
    fields.revenue = SSOT_findColumn_(available, BDB_GROWTH_COLUMN_ALIASES.revenue);
    if (!fields.sessions || !fields.orders) continue;
    var score = 0;
    if (fields.sessions) score += 8;
    if (fields.orders) score += 8;
    if (fields.revenue) score += 2;
    if (fields.campaign_id) score += 1;
    if (fields.ad_group_id) score += 1;
    if (fields.ad_id) score += 1;
    if (fields.product_id) score += 1;
    if (!best || score > best.score) best = { table: table, fields: fields, score: score };
  }
  return best ? { table: best.table, fields: best.fields } : null;
}

function SSOT_findColumn_(available, aliases) {
  for (var i = 0; i < aliases.length; i += 1) {
    if (available.indexOf(aliases[i]) !== -1) return aliases[i];
  }
  return null;
}

function SSOT_identifier_(name) {
  return '`' + String(name).replace(/`/g, '') + '`';
}

function SSOT_textExpr_(field, alias) {
  return field ? 'CAST(' + SSOT_identifier_(field) + ' AS STRING) AS ' + alias : 'CAST(NULL AS STRING) AS ' + alias;
}

function SSOT_numberExpr_(field, type, alias) {
  return field ? 'SAFE_CAST(' + SSOT_identifier_(field) + ' AS ' + type + ') AS ' + alias : 'CAST(NULL AS ' + type + ') AS ' + alias;
}

function SSOT_growthQuery_(spec, source, window) {
  var f = source.fields;
  var select = [
    'SAFE_CAST(' + SSOT_identifier_(f.date) + ' AS DATE) AS data',
    "'" + spec.key + "' AS view_key",
    SSOT_textExpr_(f.canal, 'canal'),
    SSOT_textExpr_(f.origem, 'origem'),
    SSOT_textExpr_(f.campaign_id, 'campaign_id'),
    SSOT_textExpr_(f.campaign, 'campanha'),
    SSOT_textExpr_(f.ad_group_id, 'ad_group_id'),
    SSOT_textExpr_(f.ad_group, 'grupo_anuncio'),
    SSOT_textExpr_(f.ad_id, 'ad_id'),
    SSOT_textExpr_(f.ad, 'anuncio'),
    SSOT_textExpr_(f.product_id, 'product_id'),
    SSOT_textExpr_(f.product, 'produto'),
    SSOT_numberExpr_(f.sessions, 'INT64', 'sessoes'),
    SSOT_numberExpr_(f.orders, 'INT64', 'pedidos'),
    SSOT_numberExpr_(f.revenue, 'NUMERIC', 'receita')
  ];
  return `
    SELECT ${select.join(',\n      ')}
    FROM \`reise-ssot.mart_growth_us.${source.table}\`
    WHERE SAFE_CAST(${SSOT_identifier_(f.date)} AS DATE) BETWEEN DATE('${window.start}') AND DATE('${window.end}')
  `;
}

function SSOT_growthProvisionalUtmQuery_(spec, window) {
  var viewKey = spec.key;
  var dimension;
  var orderJoin = '';
  var productJoin = '';
  var revenueExpression = 'SAFE_CAST(u.total_amount AS NUMERIC)';
  var productSelect = 'CAST(NULL AS STRING) AS product_id, CAST(NULL AS STRING) AS produto';
  var groupBy = '';
  if (viewKey === 'ad_group' || viewKey === 'ad_group_product') {
    dimension = "NULLIF(TRIM(CAST(u.utm_term AS STRING)), '')";
  } else if (viewKey === 'ad' || viewKey === 'ad_product') {
    dimension = "NULLIF(TRIM(CAST(u.utm_content AS STRING)), '')";
  } else {
    dimension = "NULLIF(TRIM(CAST(u.utm_campaign AS STRING)), '')";
  }
  if (viewKey.indexOf('_product') !== -1) {
    orderJoin = `
      JOIN \`reise-ssot.mart_shared.fct_order\` o
        ON CAST(o.source_order_id AS STRING) = CAST(u.source_order_id AS STRING)
       AND o.is_valid_order
    `;
    productJoin = `
      JOIN \`reise-ssot.mart_shared.fct_order_item\` i
        ON i.order_sk = o.order_sk
       AND i.is_valid_order
    `;
    productSelect = "CAST(i.sku AS STRING) AS product_id, CAST(i.item_name AS STRING) AS produto";
    revenueExpression = 'SAFE_CAST(i.line_net_amount AS NUMERIC)';
  }
  var dimensionSelect = viewKey === 'ad_group' || viewKey === 'ad_group_product'
    ? 'CAST(NULL AS STRING) AS ad_group_id, ' + dimension + ' AS grupo_anuncio, CAST(NULL AS STRING) AS ad_id, CAST(NULL AS STRING) AS anuncio'
    : viewKey === 'ad' || viewKey === 'ad_product'
      ? 'CAST(NULL AS STRING) AS ad_group_id, CAST(NULL AS STRING) AS grupo_anuncio, CAST(NULL AS STRING) AS ad_id, ' + dimension + ' AS anuncio'
      : 'CAST(NULL AS STRING) AS ad_group_id, CAST(NULL AS STRING) AS grupo_anuncio, CAST(NULL AS STRING) AS ad_id, CAST(NULL AS STRING) AS anuncio';
  var campaignSelect = viewKey === 'campaign_product'
    ? "NULLIF(TRIM(CAST(u.utm_campaign AS STRING)), '') AS campanha"
    : 'CAST(NULL AS STRING) AS campanha';
  return `
    SELECT
      SAFE_CAST(u.data AS DATE) AS data,
      '${viewKey}' AS view_key,
      CAST(NULL AS STRING) AS canal,
      NULLIF(TRIM(CAST(u.utm_source AS STRING)), '') AS origem,
      CAST(NULL AS STRING) AS campaign_id,
      ${campaignSelect},
      ${dimensionSelect},
      ${productSelect},
      CAST(NULL AS INT64) AS sessoes,
      COUNT(DISTINCT u.order_name) AS pedidos,
      SUM(${revenueExpression}) AS receita
    FROM \`reise-ssot.mart_growth_us.shopify_order_utm_resolved_v\` u
    ${orderJoin}
    ${productJoin}
    WHERE SAFE_CAST(u.data AS DATE) BETWEEN DATE('${window.start}') AND DATE('${window.end}')
      AND ${dimension} IS NOT NULL
    GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13
  `;
}

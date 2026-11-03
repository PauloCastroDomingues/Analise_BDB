// Visao de campanha do Panorama: somente SELECT em fontes SSOT existentes.
// Nao cria, altera ou exclui tabelas, views, schemas ou dados.

BDB_QUERY_LOCATIONS.campaigns = 'southamerica-east1';
BDB_OPTIONAL_QUERY_BUILDERS.campaigns = true;

BDB_QUERY_BUILDERS.campaigns = function(window) {
  return `
    WITH sessions AS (
      SELECT
        data,
        NULLIF(TRIM(canal), '') AS canal,
        NULLIF(TRIM(utm_campaign), '') AS campanha,
        COUNT(*) AS sessoes
      FROM \`reise-ssot.mart_growth_us.ga4_user_sessions_daily_v\`
      WHERE data BETWEEN DATE('${window.start}') AND DATE('${window.end}')
        AND NULLIF(TRIM(utm_campaign), '') IS NOT NULL
      GROUP BY 1, 2, 3
    ),
    orders AS (
      SELECT
        paid_date_brt AS data,
        \`reise-ssot.mart_growth_us.fn_canal_pedido\`(
          LOWER(TRIM(COALESCE(last_source_description, utm_source, last_source, ''))),
          LOWER(TRIM(COALESCE(utm_source, ''))),
          LOWER(TRIM(COALESCE(utm_medium, '')))
        ) AS canal,
        NULLIF(TRIM(CAST(utm_campaign AS STRING)), '') AS campanha,
        COUNT(DISTINCT order_name) AS pedidos,
        SUM(CAST(total_amount AS NUMERIC)) AS receita
      FROM \`reise-ssot.mart_growth_us.shopify_order_utm_resolved_v\`
      WHERE paid_date_brt BETWEEN DATE('${window.start}') AND DATE('${window.end}')
        AND NULLIF(TRIM(CAST(utm_campaign AS STRING)), '') IS NOT NULL
      GROUP BY 1, 2, 3
    )
    SELECT
      COALESCE(s.data, o.data) AS data,
      COALESCE(s.canal, o.canal) AS canal,
      COALESCE(s.campanha, o.campanha) AS campanha,
      s.sessoes,
      COALESCE(o.pedidos, 0) AS pedidos,
      COALESCE(o.receita, CAST(0 AS NUMERIC)) AS receita
    FROM sessions s
    FULL OUTER JOIN orders o
      ON s.data = o.data
     AND s.canal = o.canal
     AND s.campanha = o.campanha
    ORDER BY data, canal, campanha
  `;
};

function SSOT_setupCampaignsDaily8() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'SSOT_refreshCampaignsYesterday') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger('SSOT_refreshCampaignsYesterday')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .nearMinute(0)
    .create();
}

function SSOT_refreshCampaignsYesterday() {
  var window = SSOT_campaignWindow_();
  return refreshAndReturn_('campaigns', true, window);
}

function SSOT_campaignWindow_() {
  var timezone = 'America/Sao_Paulo';
  var today = new Date(Utilities.formatDate(new Date(), timezone, 'yyyy-MM-dd') + 'T12:00:00Z');
  today.setUTCDate(today.getUTCDate() - 1);

  var end = Utilities.formatDate(today, timezone, 'yyyy-MM-dd');
  today.setUTCDate(1);
  today.setUTCMonth(today.getUTCMonth() - 11);

  return {
    start: Utilities.formatDate(today, timezone, 'yyyy-MM-dd'),
    end: end,
    compareStart: Utilities.formatDate(today, timezone, 'yyyy-MM-dd'),
    compareEnd: end
  };
}

var BDB_PROJECT_ID = 'reise-ssot';
var BDB_LOCATION = 'southamerica-east1';

var BDB_QUERY_BUILDERS = {
  status: function(window) {
    return `
      WITH orders AS (
        SELECT
          DATE(paid_at, 'America/Sao_Paulo') AS order_date_brt,
          order_sk,
          source_system,
          total_amount
        FROM \`reise-ssot.mart_shared.orders_all_valid\`
        WHERE
          DATE(paid_at, 'America/Sao_Paulo') BETWEEN DATE('${window.start}') AND DATE('${window.end}')
          OR DATE(paid_at, 'America/Sao_Paulo') BETWEEN DATE('${window.compareStart}') AND DATE('${window.compareEnd}')
      ),
      labeled AS (
        SELECT
          CASE
            WHEN order_date_brt BETWEEN DATE('${window.start}') AND DATE('${window.end}') THEN 'current'
            WHEN order_date_brt BETWEEN DATE('${window.compareStart}') AND DATE('${window.compareEnd}') THEN 'compare'
          END AS period_type,
          CASE
            WHEN order_date_brt BETWEEN DATE('${window.start}') AND DATE('${window.end}')
              THEN DATE_DIFF(order_date_brt, DATE('${window.start}'), DAY)
            WHEN order_date_brt BETWEEN DATE('${window.compareStart}') AND DATE('${window.compareEnd}')
              THEN DATE_DIFF(order_date_brt, DATE('${window.compareStart}'), DAY)
          END AS period_day_index,
          order_date_brt,
          order_sk,
          source_system,
          total_amount
        FROM orders
      )
      SELECT
        period_type,
        period_day_index,
        order_date_brt,
        COUNT(DISTINCT order_sk) AS paid_orders,
        SUM(total_amount) AS paid_revenue,
        SAFE_DIVIDE(SUM(total_amount), COUNT(DISTINCT order_sk)) AS avg_ticket,
        COUNT(DISTINCT IF(source_system = 'SHOPIFY', order_sk, NULL)) AS shopify_orders,
        COUNT(DISTINCT IF(source_system = 'SHOPPUB', order_sk, NULL)) AS shoppub_orders
      FROM labeled
      WHERE period_type IS NOT NULL
      GROUP BY 1, 2, 3
      ORDER BY period_type, period_day_index, order_date_brt
    `;
  },

  targets: function(window) {
    return `
      SELECT
        target_month,
        goal_scope,
        target_date,
        version_id,
        status,
        revenue_target,
        orders_target,
        marketing_investment_target,
        marketing_cost_pct_target,
        roas_target,
        aov_target
      FROM \`reise-ssot.mart_growth_us.dashboard_targets_daily_published_v\`
      WHERE target_date BETWEEN DATE('${window.start}') AND DATE('${window.end}')
      ORDER BY target_date
    `;
  },

  channels: function(window) {
    return `
      WITH base AS (
        SELECT
          CASE
            WHEN NULLIF(TRIM(canal_detalhe), '') IS NOT NULL THEN
              CASE
                WHEN LOWER(TRIM(canal_detalhe)) IN (
                  CONCAT('whatsapp n', CHR(227), 'o oficial'),
                  'whatsapp nao oficial'
                )
                  THEN CONCAT('WhatsApp Org', CHR(226), 'nico')
                ELSE TRIM(canal_detalhe)
              END
            ELSE COALESCE(NULLIF(TRIM(canal), ''), 'Outros')
          END AS canal,
          canal_detalhe,
          COALESCE(NULLIF(TRIM(origem), ''), '(sem origem)') AS origem,
          SAFE_CAST(sessoes AS INT64) AS sessoes_base,
          SAFE_CAST(pedidos_total AS INT64) AS pedidos_base,
          SAFE_CAST(receita_total AS NUMERIC) AS receita_base
        FROM \`reise-ssot.mart_growth_us.aquisicao_por_canal_origem_daily_v\`
        WHERE DATE(data) BETWEEN DATE('${window.start}') AND DATE('${window.end}')
      ),
      channel_rows AS (
        SELECT
          'channel' AS row_type,
          canal,
          CAST(NULL AS STRING) AS canal_detalhe,
          CAST(NULL AS STRING) AS origem,
          SUM(sessoes_base) AS sessoes,
          SUM(pedidos_base) AS pedidos,
          SUM(receita_base) AS receita_atribuida,
          SAFE_DIVIDE(SUM(pedidos_base), NULLIF(SUM(sessoes_base), 0)) AS taxa_conversao,
          SAFE_DIVIDE(SUM(receita_base), NULLIF(SUM(pedidos_base), 0)) AS ticket_atribuido
        FROM base
        GROUP BY canal
      ),
      origin_rows AS (
        SELECT
          'origin' AS row_type,
          canal,
          ANY_VALUE(canal_detalhe) AS canal_detalhe,
          origem,
          CAST(NULL AS INT64) AS sessoes,
          SUM(pedidos_base) AS pedidos,
          SUM(receita_base) AS receita_atribuida,
          CAST(NULL AS FLOAT64) AS taxa_conversao,
          SAFE_DIVIDE(SUM(receita_base), NULLIF(SUM(pedidos_base), 0)) AS ticket_atribuido
        FROM base
        GROUP BY canal, origem
        HAVING SUM(pedidos_base) > 0
      )
      SELECT * FROM channel_rows
      UNION ALL
      SELECT * FROM origin_rows
      ORDER BY row_type, receita_atribuida DESC, pedidos DESC, canal, canal_detalhe, origem
    `;
  },

  heatmap: function(window) {
    return `
      SELECT
        DATE(paid_at, 'America/Sao_Paulo') AS order_date_brt,
        EXTRACT(HOUR FROM DATETIME(paid_at, 'America/Sao_Paulo')) AS order_hour_brt,
        COUNT(DISTINCT order_sk) AS paid_orders,
        SUM(total_amount) AS paid_revenue,
        SAFE_DIVIDE(SUM(total_amount), COUNT(DISTINCT order_sk)) AS avg_ticket
      FROM \`reise-ssot.mart_shared.orders_all_valid\`
      WHERE DATE(paid_at, 'America/Sao_Paulo') BETWEEN DATE('${window.start}') AND DATE('${window.end}')
      GROUP BY 1, 2
      ORDER BY 1, 2
    `;
  },

  products: function(window) {
    return `
      SELECT
        order_partition_date_brt AS order_date_brt,
        sku,
        product_title_raw,
        SUM(quantity) AS units_paid,
        SUM(line_net_amount) AS item_revenue,
        SAFE_DIVIDE(SUM(line_net_amount), SUM(quantity)) AS avg_item_price
      FROM \`reise-ssot.mart_shared.ssot_order_items\`
      WHERE order_partition_date_brt BETWEEN DATE('${window.start}') AND DATE('${window.end}')
        AND is_valid_order
      GROUP BY 1, 2, 3
      ORDER BY order_date_brt, item_revenue DESC
    `;
  },

  quality: function(window) {
    return `
      SELECT
        order_partition_date_brt AS order_date_brt,
        COUNT(*) AS item_rows,
        SUM(quantity) AS units_total,
        SUM(IF(line_net_amount > 0, quantity, 0)) AS paid_units,
        SUM(IF(line_net_amount = 0, quantity, 0)) AS gift_units,
        SUM(IF(line_net_amount > 0, line_net_amount, 0)) AS item_revenue
      FROM \`reise-ssot.mart_shared.ssot_order_items\`
      WHERE order_partition_date_brt BETWEEN DATE('${window.start}') AND DATE('${window.end}')
        AND is_valid_order
      GROUP BY 1
      ORDER BY 1
    `;
  },

  stock: function(window) {
    return `
      WITH params AS (
        SELECT
          DATE_SUB(DATE_TRUNC(CURRENT_DATE('America/Sao_Paulo'), MONTH), INTERVAL 6 MONTH) AS start_date,
          DATE_TRUNC(CURRENT_DATE('America/Sao_Paulo'), MONTH) AS end_date,
          DATE_DIFF(
            DATE_TRUNC(CURRENT_DATE('America/Sao_Paulo'), MONTH),
            DATE_SUB(DATE_TRUNC(CURRENT_DATE('America/Sao_Paulo'), MONTH), INTERVAL 6 MONTH),
            DAY
          ) AS days_period
      ),
      sales AS (
        SELECT
          UPPER(TRIM(sku)) AS sku,
          SUM(quantity) AS total_6m,
          COUNT(DISTINCT DATE_TRUNC(order_partition_date_brt, MONTH)) AS months_with_sales
        FROM \`reise-ssot.mart_shared.ssot_order_items\`
        WHERE order_partition_date_brt >= (SELECT start_date FROM params)
          AND order_partition_date_brt < (SELECT end_date FROM params)
          AND is_valid_order
        GROUP BY 1
      ),
      base AS (
        SELECT
          i.sku,
          i.product_title,
          i.variant_title,
          i.available_total,
          i.last_updated_at,
          COALESCE(s.total_6m, 0) AS total_6m,
          COALESCE(s.months_with_sales, 0) AS months_with_sales,
          SAFE_DIVIDE(CAST(COALESCE(s.total_6m, 0) AS NUMERIC), CAST((SELECT days_period FROM params) AS NUMERIC)) AS media_diaria_6m
        FROM \`reise-ssot.mart_shared.inventory_sku_current\` i
        LEFT JOIN sales s
          ON UPPER(TRIM(i.sku)) = s.sku
      )
      SELECT
        sku,
        product_title,
        variant_title,
        available_total,
        CAST(NULL AS NUMERIC) AS media_mensal_6m,
        total_6m,
        CAST(months_with_sales AS INT64) AS meses_com_venda,
        media_diaria_6m,
        SAFE_DIVIDE(CAST(available_total AS NUMERIC), media_diaria_6m) AS dias_cobertura_aprox,
        CASE
          WHEN available_total = 0 AND media_diaria_6m > 0 THEN 'STOCKOUT_COM_DEMANDA'
          WHEN available_total = 0 THEN 'STOCKOUT'
          WHEN media_diaria_6m = 0 THEN 'SEM_VENDA_6M'
          WHEN SAFE_DIVIDE(CAST(available_total AS NUMERIC), media_diaria_6m) < 7 THEN 'COBERTURA_<7D'
          WHEN SAFE_DIVIDE(CAST(available_total AS NUMERIC), media_diaria_6m) < 14 THEN 'COBERTURA_<14D'
          WHEN SAFE_DIVIDE(CAST(available_total AS NUMERIC), media_diaria_6m) < 30 THEN 'COBERTURA_<30D'
          ELSE 'OK'
        END AS alert_level,
        CASE
          WHEN available_total = 0 AND media_diaria_6m > 0 THEN 1
          WHEN available_total = 0 THEN 2
          WHEN media_diaria_6m = 0 THEN 9
          WHEN SAFE_DIVIDE(CAST(available_total AS NUMERIC), media_diaria_6m) < 7 THEN 3
          WHEN SAFE_DIVIDE(CAST(available_total AS NUMERIC), media_diaria_6m) < 14 THEN 4
          WHEN SAFE_DIVIDE(CAST(available_total AS NUMERIC), media_diaria_6m) < 30 THEN 5
          ELSE 99
        END AS alert_priority,
        GREATEST(0, CAST(CEIL(media_diaria_6m * 14 - available_total) AS INT64)) AS units_needed_for_14d,
        GREATEST(0, CAST(CEIL(media_diaria_6m * 30 - available_total) AS INT64)) AS units_needed_for_30d,
        CASE
          WHEN media_diaria_6m IS NULL OR media_diaria_6m = 0 THEN NULL
          ELSE DATE_ADD(CURRENT_DATE('America/Sao_Paulo'), INTERVAL CAST(GREATEST(0, ROUND(SAFE_DIVIDE(CAST(available_total AS NUMERIC), media_diaria_6m))) AS INT64) DAY)
        END AS estimated_stockout_date,
        last_updated_at
      FROM base
      ORDER BY alert_priority ASC, dias_cobertura_aprox ASC, available_total ASC
      LIMIT 80
    `;
  },

  growth: function(window) {
    return `
      SELECT
        'daily' AS row_type,
        data,
        CAST(NULL AS STRING) AS origem,
        CAST(NULL AS STRING) AS campanha_nome,
        investimento_total_ads AS investimento,
        investimento_total_mkt,
        custo_whatsapp,
        receita_total,
        pedidos_aprovados,
        sessoes,
        clientes_novos,
        clientes_recorrentes,
        cac_clientes_novos_ads,
        cac_clientes_novos_mkt,
        roas_ads,
        roas_mkt,
        taxa_conversao,
        invest_meta,
        invest_google,
        cliques,
        impressoes
      FROM \`reise-ssot.mart_growth_us.api_marketing_daily\`
      WHERE data BETWEEN DATE('${window.start}') AND DATE('${window.end}')

      UNION ALL

      SELECT
        'campaign' AS row_type,
        data,
        origem,
        campanha_nome,
        investimento,
        CAST(NULL AS NUMERIC) AS investimento_total_mkt,
        CAST(NULL AS NUMERIC) AS custo_whatsapp,
        CAST(NULL AS NUMERIC) AS receita_total,
        CAST(NULL AS INT64) AS pedidos_aprovados,
        CAST(NULL AS INT64) AS sessoes,
        CAST(NULL AS INT64) AS clientes_novos,
        CAST(NULL AS INT64) AS clientes_recorrentes,
        CAST(NULL AS NUMERIC) AS cac_clientes_novos_ads,
        CAST(NULL AS NUMERIC) AS cac_clientes_novos_mkt,
        CAST(NULL AS FLOAT64) AS roas_ads,
        CAST(NULL AS FLOAT64) AS roas_mkt,
        CAST(NULL AS FLOAT64) AS taxa_conversao,
        CAST(NULL AS NUMERIC) AS invest_meta,
        CAST(NULL AS NUMERIC) AS invest_google,
        cliques,
        impressoes
      FROM \`reise-ssot.mart_growth_us.marketing_spend_campaign_daily_dedup\`
      WHERE data BETWEEN DATE('${window.start}') AND DATE('${window.end}')
      ORDER BY row_type, data, investimento DESC
    `;
  },

  crm: function(window) {
    return `
      WITH segments AS (
        SELECT
          '1x nos ultimos 6 meses' AS segmento,
          COUNT(*) AS contatos
        FROM \`reise-ssot.mart_mkt_crm.seg_01_1x_ult_6m_sem_nov_dez_2025\`

        UNION ALL

        SELECT
          'Recorrentes inativos ha 6 meses' AS segmento,
          COUNT(*) AS contatos
        FROM \`reise-ssot.mart_mkt_crm.seg_02_2x_ou_mais_sem_compra_6m\`

        UNION ALL

        SELECT
          'Cadastrados sem compra' AS segmento,
          COUNT(*) AS contatos
        FROM \`reise-ssot.mart_mkt_crm.seg_03_cadastrou_6m_nunca_comprou\`
      )
      SELECT
        segmento,
        contatos,
        DATE('${window.start}') AS window_start,
        DATE('${window.end}') AS window_end,
        'segmentacao_ssot' AS source_type
      FROM segments
      ORDER BY contatos DESC
    `;
  },

  slack: function(window) {
    return `
      SELECT
        DATE(paid_at, 'America/Sao_Paulo') AS report_date,
        COUNT(DISTINCT order_sk) AS paid_orders,
        SUM(total_amount) AS paid_revenue,
        SAFE_DIVIDE(SUM(total_amount), COUNT(DISTINCT order_sk)) AS avg_ticket
      FROM \`reise-ssot.mart_shared.orders_all_valid\`
      WHERE DATE(paid_at, 'America/Sao_Paulo') BETWEEN DATE('${window.start}') AND DATE('${window.end}')
      GROUP BY 1
      ORDER BY report_date DESC
      LIMIT 1
    `;
  }
};

-- BDB | 07_slack_daily_payload.sql
-- Visao: Resumo Slack.
-- Objetivo: gerar uma linha por dia com indicadores e texto-base.
-- Dependencia: usar resultados das consultas de status e heatmap, ou materializar
-- views com nomes equivalentes no dataset do BDB.

DECLARE black_start DATE DEFAULT DATE '2026-11-01';
DECLARE black_end DATE DEFAULT DATE '2026-11-30';
DECLARE report_date DATE DEFAULT CURRENT_DATE('America/Sao_Paulo');

WITH orders AS (
  SELECT
    DATE(paid_at, 'America/Sao_Paulo') AS order_date_brt,
    EXTRACT(HOUR FROM DATETIME(paid_at, 'America/Sao_Paulo')) AS order_hour_brt,
    order_sk,
    total_amount
  FROM `reise-ssot.mart_shared.orders_all_valid`
  WHERE DATE(paid_at, 'America/Sao_Paulo') BETWEEN black_start AND black_end
),
daily AS (
  SELECT
    order_date_brt,
    COUNT(DISTINCT order_sk) AS paid_orders,
    SUM(total_amount) AS paid_revenue,
    SAFE_DIVIDE(SUM(total_amount), COUNT(DISTINCT order_sk)) AS avg_ticket
  FROM orders
  GROUP BY 1
),
best_hour AS (
  SELECT
    order_date_brt,
    ARRAY_AGG(STRUCT(order_hour_brt, paid_orders, paid_revenue) ORDER BY paid_revenue DESC LIMIT 1)[OFFSET(0)] AS top_hour
  FROM (
    SELECT
      order_date_brt,
      order_hour_brt,
      COUNT(DISTINCT order_sk) AS paid_orders,
      SUM(total_amount) AS paid_revenue
    FROM orders
    GROUP BY 1, 2
  )
  GROUP BY 1
),
commercial_actions AS (
  SELECT
    event_date,
    COUNT(*) AS actions_count,
    STRING_AGG(action_name, ' | ' ORDER BY event_time_brt, action_name) AS action_names
  FROM `reise-ssot.bdb_manual.black_commercial_calendar`
  WHERE event_date BETWEEN black_start AND black_end
  GROUP BY 1
)
SELECT
  d.order_date_brt AS report_date,
  d.paid_revenue,
  d.paid_orders,
  d.avg_ticket,
  h.top_hour.order_hour_brt AS best_hour_brt,
  h.top_hour.paid_revenue AS best_hour_revenue,
  IFNULL(a.actions_count, 0) AS actions_count,
  a.action_names,
  CONCAT(
    'Black | ',
    FORMAT_DATE('%d/%m', d.order_date_brt),
    ': R$ ',
    FORMAT('%.0f', d.paid_revenue),
    ' em ',
    CAST(d.paid_orders AS STRING),
    ' pedidos. Melhor hora: ',
    LPAD(CAST(h.top_hour.order_hour_brt AS STRING), 2, '0'),
    'h. ',
    IF(IFNULL(a.actions_count, 0) > 0, CONCAT('Acoes: ', a.action_names), 'Sem acao comercial registrada.')
  ) AS slack_text_draft
FROM daily d
LEFT JOIN best_hour h USING (order_date_brt)
LEFT JOIN commercial_actions a
  ON d.order_date_brt = a.event_date
WHERE d.order_date_brt = report_date
ORDER BY d.order_date_brt;

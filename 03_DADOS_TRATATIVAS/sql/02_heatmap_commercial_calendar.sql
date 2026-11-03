-- BDB | 02_heatmap_commercial_calendar.sql
-- Visao: Heatmap comercial.
-- Objetivo: unir venda por dia/hora com acoes comerciais do calendario.
--
-- Premissa manual:
-- carregar templates/black_commercial_calendar.csv em uma tabela, por exemplo:
-- `reise-ssot.bdb_manual.black_commercial_calendar`

DECLARE black_start DATE DEFAULT DATE '2026-11-01';
DECLARE black_end DATE DEFAULT DATE '2026-11-30';

WITH orders AS (
  SELECT
    DATE(paid_at, 'America/Sao_Paulo') AS order_date_brt,
    EXTRACT(HOUR FROM DATETIME(paid_at, 'America/Sao_Paulo')) AS order_hour_brt,
    order_sk,
    total_amount
  FROM `reise-ssot.mart_shared.orders_all_valid`
  WHERE DATE(paid_at, 'America/Sao_Paulo') BETWEEN black_start AND black_end
),
heatmap AS (
  SELECT
    order_date_brt,
    order_hour_brt,
    COUNT(DISTINCT order_sk) AS paid_orders,
    SUM(total_amount) AS paid_revenue,
    SAFE_DIVIDE(SUM(total_amount), COUNT(DISTINCT order_sk)) AS avg_ticket
  FROM orders
  GROUP BY 1, 2
),
commercial_actions AS (
  SELECT
    event_date,
    SAFE_CAST(SUBSTR(event_time_brt, 1, 2) AS INT64) AS event_hour_brt,
    COUNT(*) AS actions_count,
    ARRAY_AGG(STRUCT(
      event_id,
      event_type,
      action_name,
      channel,
      owner,
      product_scope,
      expected_effect,
      primary_metric,
      notes
    ) ORDER BY event_time_brt, action_name) AS actions
  FROM `reise-ssot.bdb_manual.black_commercial_calendar`
  WHERE event_date BETWEEN black_start AND black_end
  GROUP BY 1, 2
),
grid AS (
  SELECT
    day AS order_date_brt,
    hour AS order_hour_brt
  FROM UNNEST(GENERATE_DATE_ARRAY(black_start, black_end)) AS day
  CROSS JOIN UNNEST(GENERATE_ARRAY(0, 23)) AS hour
)
SELECT
  g.order_date_brt,
  FORMAT_DATE('%a', g.order_date_brt) AS weekday_label,
  g.order_hour_brt,
  IFNULL(h.paid_orders, 0) AS paid_orders,
  IFNULL(h.paid_revenue, 0) AS paid_revenue,
  h.avg_ticket,
  IFNULL(a.actions_count, 0) AS actions_count,
  a.actions,
  CASE
    WHEN IFNULL(a.actions_count, 0) > 0 THEN TRUE
    ELSE FALSE
  END AS has_commercial_action
FROM grid g
LEFT JOIN heatmap h
  ON g.order_date_brt = h.order_date_brt
 AND g.order_hour_brt = h.order_hour_brt
LEFT JOIN commercial_actions a
  ON g.order_date_brt = a.event_date
 AND g.order_hour_brt = a.event_hour_brt
ORDER BY g.order_date_brt, g.order_hour_brt;

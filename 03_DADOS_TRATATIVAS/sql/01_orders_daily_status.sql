-- BDB | 01_orders_daily_status.sql
-- Visao: Status da Black + Evolucao e ritmo.
-- Base: pedidos validos pagos.

DECLARE black_start DATE DEFAULT DATE '2026-11-01';
DECLARE black_end DATE DEFAULT DATE '2026-11-30';

WITH orders AS (
  SELECT
    DATE(paid_at, 'America/Sao_Paulo') AS order_date_brt,
    order_sk,
    source_system,
    total_amount
  FROM `reise-ssot.mart_shared.orders_all_valid`
  WHERE DATE(paid_at, 'America/Sao_Paulo') BETWEEN black_start AND black_end
),
daily AS (
  SELECT
    order_date_brt,
    COUNT(DISTINCT order_sk) AS paid_orders,
    SUM(total_amount) AS paid_revenue,
    SAFE_DIVIDE(SUM(total_amount), COUNT(DISTINCT order_sk)) AS avg_ticket,
    COUNT(DISTINCT IF(source_system = 'SHOPIFY', order_sk, NULL)) AS shopify_orders,
    COUNT(DISTINCT IF(source_system = 'SHOPPUB', order_sk, NULL)) AS shoppub_orders
  FROM orders
  GROUP BY 1
),
calendar AS (
  SELECT day AS order_date_brt
  FROM UNNEST(GENERATE_DATE_ARRAY(black_start, black_end)) AS day
),
with_zero_days AS (
  SELECT
    c.order_date_brt,
    IFNULL(d.paid_orders, 0) AS paid_orders,
    IFNULL(d.paid_revenue, 0) AS paid_revenue,
    d.avg_ticket,
    IFNULL(d.shopify_orders, 0) AS shopify_orders,
    IFNULL(d.shoppub_orders, 0) AS shoppub_orders
  FROM calendar c
  LEFT JOIN daily d USING (order_date_brt)
)
SELECT
  order_date_brt,
  paid_orders,
  paid_revenue,
  avg_ticket,
  shopify_orders,
  shoppub_orders,
  SUM(paid_orders) OVER (ORDER BY order_date_brt) AS paid_orders_accumulated,
  SUM(paid_revenue) OVER (ORDER BY order_date_brt) AS paid_revenue_accumulated,
  SAFE_DIVIDE(
    SUM(paid_revenue) OVER (ORDER BY order_date_brt),
    NULLIF(SUM(paid_orders) OVER (ORDER BY order_date_brt), 0)
  ) AS avg_ticket_accumulated
FROM with_zero_days
ORDER BY order_date_brt;

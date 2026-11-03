-- BDB | 05_stock_risk.sql
-- Visao: Estoque e risco operacional.
-- Objetivo: cruzar estoque atual com velocidade recente de venda.

DECLARE black_start DATE DEFAULT DATE '2026-11-01';
DECLARE black_end DATE DEFAULT DATE '2026-11-30';
DECLARE velocity_days INT64 DEFAULT 7;

WITH stock AS (
  SELECT
    sku,
    product_title,
    variant_title,
    available_total
  FROM `reise-ssot.mart_shared.inventory_sku_current`
),
sales_velocity AS (
  SELECT
    sku,
    SUM(quantity) AS units_sold_window,
    SAFE_DIVIDE(SUM(quantity), velocity_days) AS avg_units_sold_per_day
  FROM `reise-ssot.mart_shared.ssot_order_items`
  WHERE order_partition_date_brt BETWEEN DATE_SUB(black_end, INTERVAL (velocity_days - 1) DAY) AND black_end
    AND is_valid_order
    AND IFNULL(line_net_amount, 0) > 0
  GROUP BY 1
)
SELECT
  s.sku,
  s.product_title,
  s.variant_title,
  IFNULL(s.available_total, 0) AS available_total,
  IFNULL(v.units_sold_window, 0) AS units_sold_window,
  IFNULL(v.avg_units_sold_per_day, 0) AS avg_units_sold_per_day,
  SAFE_DIVIDE(IFNULL(s.available_total, 0), NULLIF(v.avg_units_sold_per_day, 0)) AS stock_days_remaining,
  CASE
    WHEN IFNULL(s.available_total, 0) <= 0 THEN 'ruptura'
    WHEN SAFE_DIVIDE(IFNULL(s.available_total, 0), NULLIF(v.avg_units_sold_per_day, 0)) <= 2 THEN 'risco_critico'
    WHEN SAFE_DIVIDE(IFNULL(s.available_total, 0), NULLIF(v.avg_units_sold_per_day, 0)) <= 5 THEN 'risco'
    WHEN IFNULL(v.avg_units_sold_per_day, 0) = 0 THEN 'sem_venda_recente'
    ELSE 'ok'
  END AS stock_status
FROM stock s
LEFT JOIN sales_velocity v USING (sku)
ORDER BY
  CASE stock_status
    WHEN 'ruptura' THEN 1
    WHEN 'risco_critico' THEN 2
    WHEN 'risco' THEN 3
    WHEN 'sem_venda_recente' THEN 4
    ELSE 5
  END,
  units_sold_window DESC;

-- BDB | 03_product_mix_daily.sql
-- Visao: Produto e mix.
-- Base candidata: ssot_order_items.
-- Validar substituicao de `Vendas_pedidos_Linha` antes de assumir como fonte oficial.

DECLARE black_start DATE DEFAULT DATE '2026-11-01';
DECLARE black_end DATE DEFAULT DATE '2026-11-30';

WITH items AS (
  SELECT
    order_partition_date_brt AS order_date_brt,
    sku,
    product_title_raw,
    quantity,
    line_net_amount,
    payment_method
  FROM `reise-ssot.mart_shared.ssot_order_items`
  WHERE order_partition_date_brt BETWEEN black_start AND black_end
    AND is_valid_order
    AND IFNULL(line_net_amount, 0) > 0
),
classified AS (
  SELECT
    *,
    CASE
      WHEN REGEXP_CONTAINS(LOWER(product_title_raw), r'\b(rs6|rs8|911|macan|avant)\b') THEN REGEXP_EXTRACT(LOWER(product_title_raw), r'\b(rs6|rs8|911|macan|avant)\b')
      ELSE 'classificar'
    END AS product_family_inferred,
    CASE
      WHEN REGEXP_CONTAINS(LOWER(product_title_raw), r'(tenis|sneaker|sapatenis)') THEN 'tenis'
      WHEN REGEXP_CONTAINS(LOWER(product_title_raw), r'(cinto|carteira|bolsa|case|necessaire|relogio|oculos|deskpad)') THEN 'acessorio'
      ELSE 'classificar'
    END AS product_category_inferred
  FROM items
)
SELECT
  order_date_brt,
  sku,
  product_title_raw,
  product_family_inferred,
  product_category_inferred,
  SUM(quantity) AS units_paid,
  SUM(line_net_amount) AS item_revenue,
  SAFE_DIVIDE(SUM(line_net_amount), SUM(quantity)) AS avg_item_price,
  COUNT(*) AS item_rows
FROM classified
GROUP BY 1, 2, 3, 4, 5
ORDER BY order_date_brt, item_revenue DESC;

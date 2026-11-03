-- BDB | 04_quality_sale_validation.sql
-- Visao: Qualidade da venda.
-- Objetivo: separar venda paga, brinde e cesta.
--
-- Regra de negocio:
-- qualquer item com `line_net_amount = 0` e brinde. Valor nulo nao e brinde.
-- A lista oficial de brindes serve para conferencia nominal, mas nao classifica
-- o item no BDB.
--
-- Atencao:
-- A view `mart_shared.ssot_order_items` documentada no pacote nao expoe claramente
-- `order_sk` ou `source_order_id` no SELECT final. Sem chave de pedido, nao da para
-- medir cesta 2+ com seguranca.
--
-- Este arquivo traz:
-- 1) validacao de schema;
-- 2) tratamento de brindes no nivel de item/data;
-- 3) bloco pendente para cesta quando a chave de pedido estiver validada.

DECLARE black_start DATE DEFAULT DATE '2026-11-01';
DECLARE black_end DATE DEFAULT DATE '2026-11-30';

-- 1) Conferir se existe chave de pedido na fonte de itens.
SELECT
  column_name,
  data_type
FROM `reise-ssot.region-us.INFORMATION_SCHEMA.COLUMNS`
WHERE table_schema = 'mart_shared'
  AND table_name = 'ssot_order_items'
  AND LOWER(column_name) IN ('order_sk', 'source_order_id', 'order_id', 'checkout_id')
ORDER BY column_name;

-- 2) Qualidade no nivel item/data: valor zero x item pago.
WITH items AS (
  SELECT
    order_partition_date_brt AS order_date_brt,
    sku,
    product_title_raw,
    quantity,
    line_net_amount,
    line_net_amount = 0 AS is_zero_value_gift
  FROM `reise-ssot.mart_shared.ssot_order_items`
  WHERE order_partition_date_brt BETWEEN black_start AND black_end
    AND is_valid_order
)
SELECT
  order_date_brt,
  COUNT(*) AS item_rows,
  SUM(quantity) AS units_total,
  SUM(IF(is_zero_value_gift, quantity, 0)) AS gift_units,
  SUM(IF(NOT is_zero_value_gift AND line_net_amount > 0, quantity, 0)) AS paid_units,
  SUM(IF(NOT is_zero_value_gift AND line_net_amount > 0, line_net_amount, 0)) AS item_revenue_without_gifts,
  SAFE_DIVIDE(
    SUM(IF(is_zero_value_gift, quantity, 0)),
    NULLIF(SUM(quantity), 0)
  ) AS gift_unit_share
FROM items
GROUP BY 1
ORDER BY 1;

-- 3) Pendente: cesta 2+.
-- Criar depois que a mart de itens expuser `order_sk` ou `source_order_id`.
-- Saida esperada:
-- order_date_brt, paid_orders, orders_2plus_items, share_orders_2plus_items,
-- avg_paid_items_per_order, revenue_orders_2plus_items.

-- BDB | 00_source_validation.sql
-- Objetivo: validar existencia, schema minimo e volume das fontes candidatas.
-- Rodar antes de qualquer materializacao do BDB.

DECLARE black_start DATE DEFAULT DATE '2026-11-01';
DECLARE black_end DATE DEFAULT DATE '2026-11-30';

-- 1) Campos criticos das fontes candidatas.
SELECT
  table_schema,
  table_name,
  column_name,
  data_type
FROM `reise-ssot.region-us.INFORMATION_SCHEMA.COLUMNS`
WHERE table_schema IN ('mart_shared', 'mart_growth_us')
  AND table_name IN (
    'orders_all_valid',
    'orders_all',
    'ssot_order_items',
    'inventory_sku_current',
    'shopify_channels_daily_complete_v'
  )
ORDER BY table_schema, table_name, ordinal_position;

-- 2) Pedidos validos no periodo.
SELECT
  DATE(paid_at, 'America/Sao_Paulo') AS order_date_brt,
  COUNT(DISTINCT order_sk) AS paid_orders,
  SUM(total_amount) AS paid_revenue
FROM `reise-ssot.mart_shared.orders_all_valid`
WHERE DATE(paid_at, 'America/Sao_Paulo') BETWEEN black_start AND black_end
GROUP BY 1
ORDER BY 1;

-- 3) Itens candidatos no periodo.
-- Observacao: validar se esta view possui chave de pedido suficiente para analises de cesta.
SELECT
  order_partition_date_brt,
  COUNT(*) AS item_rows,
  COUNTIF(is_valid_order) AS valid_item_rows,
  COUNT(DISTINCT sku) AS skus,
  SUM(CASE WHEN is_valid_order THEN line_net_amount ELSE 0 END) AS valid_item_revenue
FROM `reise-ssot.mart_shared.ssot_order_items`
WHERE order_partition_date_brt BETWEEN black_start AND black_end
GROUP BY 1
ORDER BY 1;

-- 4) Estoque atual.
SELECT
  COUNT(*) AS sku_rows,
  COUNTIF(IFNULL(available_total, 0) <= 0) AS skus_sem_estoque,
  SUM(IFNULL(available_total, 0)) AS estoque_total_disponivel
FROM `reise-ssot.mart_shared.inventory_sku_current`;

-- 5) Canais.
-- Usar como referencia separada ate validar localizacao e compatibilidade com vendas.
SELECT
  MIN(date) AS first_date,
  MAX(date) AS last_date,
  COUNT(*) AS rows
FROM `reise-ssot.mart_growth_us.shopify_channels_daily_complete_v`;

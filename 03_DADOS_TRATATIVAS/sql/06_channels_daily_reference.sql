-- BDB | 06_channels_daily_reference.sql
-- Visao: Canais.
-- Fonte candidata: mart_growth_us.shopify_channels_daily_complete_v.
--
-- Cuidado:
-- Esta mart esta em `mart_growth_us`. Usar como leitura separada ate confirmar
-- localizacao, moeda e compatibilidade com os pedidos do BDB.

DECLARE black_start DATE DEFAULT DATE '2026-11-01';
DECLARE black_end DATE DEFAULT DATE '2026-11-30';

SELECT
  data AS channel_date,
  canal AS channel,
  tipo AS channel_type,
  sessoes AS sessions,
  pedidos AS orders,
  vendas AS revenue,
  taxa_conversao AS conversion_rate_observed,
  aov,
  pedidos_novos_clientes AS new_customer_orders,
  pedidos_clientes_recorrentes AS returning_customer_orders
FROM `reise-ssot.mart_growth_us.shopify_channels_daily_complete_v`
WHERE data BETWEEN black_start AND black_end
ORDER BY channel_date, channel;

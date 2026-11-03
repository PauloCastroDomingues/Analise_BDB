# SQLs BDB

Consultas-base para captar e tratar os dados do BDB.

Estas consultas ainda nao executam automacao. Elas servem como contrato inicial entre SSOT, front e futuro back.

## Ordem sugerida

1. `00_source_validation.sql`
2. `01_orders_daily_status.sql`
3. `02_heatmap_commercial_calendar.sql`
4. `03_product_mix_daily.sql`
5. `04_quality_sale_validation.sql`
6. `05_stock_risk.sql`
7. `06_channels_daily_reference.sql`
8. `07_slack_daily_payload.sql`

## Regras

- Usar pedidos validos como denominador de venda.
- Separar item pago, brinde e pedido.
- Tratar fonte pendente como pendente, nunca como zero.
- Nao misturar dados SP e US em uma mesma query final sem validacao de localizacao.
- Validar `ssot_order_items` antes de substituir qualquer fonte historica chamada `Vendas_pedidos_Linha`.

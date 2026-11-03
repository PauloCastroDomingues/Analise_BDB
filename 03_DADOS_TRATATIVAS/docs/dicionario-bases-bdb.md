# BDB - dicionario de bases

Este dicionario descreve as bases que o BDB deve consumir depois que os SQLs forem validados no BigQuery.

## Bases de entrada

| Base | Papel | Status |
| --- | --- | --- |
| `mart_shared.orders_all_valid` | Pedido pago valido. Denominador principal de status, evolucao e heatmap. | validar live |
| `mart_shared.ssot_order_items` | Item de pedido. Candidata para produto, mix e brindes. | validar substituicao |
| `mart_shared.inventory_sku_current` | Estoque atual por SKU. | validar live |
| `mart_growth_us.shopify_channels_daily_complete_v` | Canais, midia e performance de aquisicao. | usar separado ate validar localizacao |
| `bdb_manual.black_commercial_calendar` | Calendario comercial manual. | criar a partir do template |
| `bdb_manual.black_targets_daily` | Meta diaria de receita e pedidos. | preencher |
| `bdb_manual.official_gifts` | Lista nominal para conferencia dos itens de valor zero. | validar com operacao |
| `bdb_manual.black_decisions_log` | Registro de decisoes tomadas durante a Black. | criar rotina |

## Bases tratadas esperadas

| Saida | Grain | Uso no front |
| --- | --- | --- |
| `bdb_orders_daily_status` | 1 linha por dia | Status da Black, ritmo, acumulado, comparativo com meta |
| `bdb_heatmap_commercial` | 1 linha por dia/hora | Heatmap com ponto clicavel de acao comercial |
| `bdb_product_mix_daily` | 1 linha por dia/SKU | Produto, mix, curva ABC, familias e acessorios |
| `bdb_quality_sale_daily` | 1 linha por dia | Brindes, item pago, cesta 2+ quando houver chave de pedido |
| `bdb_stock_risk` | 1 linha por SKU | Ruptura, risco e cobertura estimada |
| `bdb_channels_daily` | 1 linha por dia/canal | Leitura de canais sem misturar com venda ate validacao |
| `bdb_slack_daily_payload` | 1 linha por dia | Texto-base e indicadores para newsletter no Slack |

## Campos minimos para o front

### Status e pace

- `order_date_brt`
- `paid_revenue`
- `paid_orders`
- `avg_ticket`
- `paid_revenue_accumulated`
- `paid_orders_accumulated`
- `daily_revenue_target`
- `revenue_target_accumulated`
- `pace_vs_target_pct`

### Heatmap comercial

- `order_date_brt`
- `weekday_label`
- `order_hour_brt`
- `paid_orders`
- `paid_revenue`
- `avg_ticket`
- `has_commercial_action`
- `actions`

### Produto e mix

- `order_date_brt`
- `sku`
- `product_title_raw`
- `product_family`
- `product_category`
- `units_paid`
- `item_revenue`
- `avg_item_price`

### Qualidade da venda

- `order_date_brt`
- `paid_orders`
- `orders_2plus_items`
- `share_orders_2plus_items`
- `gift_units`
- `paid_units`
- `item_revenue_without_gifts`

Regra de brinde: item com `line_net_amount = 0`. Valor nulo permanece pendente de qualidade e nao vira brinde automaticamente.

## Pendencias que nao podem virar zero

- Meta diaria enquanto `black_targets_daily.csv` nao estiver preenchido.
- Acao comercial enquanto `black_commercial_calendar.csv` nao estiver carregado.
- Cesta 2+ enquanto a base de itens nao tiver chave de pedido validada.
- ROAS enquanto a origem de midia/canal nao estiver conciliada.
- Produto/familia/categoria enquanto nao houver de-para oficial.

# BDB - captação e tratativas de dados

Este diretório organiza a camada de dados do BDB.

O objetivo é transformar as fontes do SSOT/BigQuery em bases semânticas para o painel:

- Status da Black.
- Evolução e ritmo.
- Heatmap comercial.
- Produto e mix.
- Qualidade da venda.
- Canais.
- Estoque e risco operacional.
- Decisões.
- Leitura semanal.
- Resumo Slack.

## Fonte recebida

Arquivo original:

`C:/Users/reise/OneDrive/Área de Trabalho/DADOS/reise-bigquery-project.zip`

Cópia extraída para consulta:

`../02_SOURCE_BIGQUERY/reise-ssot-bq/`

## Observação crítica

O pacote BigQuery traz SQL, documentação e Apps Script. Ele não traz, por si só, uma exportação transacional pronta em CSV.

A fonte nomeada em trabalhos anteriores como `Vendas_pedidos_Linha` não aparece no pacote. A candidata documentada no SSOT é:

`reise-ssot.mart_shared.ssot_order_items`

Essa substituição precisa ficar explícita até validação no BigQuery. Não tratar `ssot_order_items` como equivalente final sem conferência de schema e números.

## Estrutura deste diretório

- `docs/`: documentação de fontes, regras e pendências.
- `templates/`: planilhas manuais de apoio para calendário comercial, metas e decisões.
- `sql/`: consultas e views propostas para materializar as bases do BDB.

## Ordem de uso

1. Validar fontes oficiais.
2. Preencher templates mínimos.
3. Rodar SQLs em ambiente controlado.
4. Exportar payload para o front.
5. Validar números contra a Black 2025 antes de usar em operação real.

## Não fazer ainda

- Não automatizar Slack.
- Não publicar painel.
- Não executar queries recorrentes sem estimar custo.
- Não misturar dados pendentes com zero.
- Não misturar pedido total, pedido pago, item pago, brinde e receita atribuída.

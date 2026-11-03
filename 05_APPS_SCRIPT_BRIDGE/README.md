# BDB - Apps Script Bridge

Camada proposta para puxar dados do BigQuery e entregar JSON para o painel com controle de custo.

## Fluxo

```text
BigQuery
  -> consultas diretas nas marts existentes
  -> Apps Script Web App
  -> snapshot JSON no Drive
  -> JSON
  -> 04_APP_FRONT
```

## Por que usar Apps Script no MVP

- Evita criar um back-end pesado agora.
- Consegue consultar BigQuery com servico avancado.
- Evita consulta no BigQuery a cada abertura do painel.
- Usa snapshot salvo no Drive.
- Atualiza dados apenas por botao manual.
- Define limite de bytes por query.
- Pode evoluir depois para Slack e rotinas agendadas.

## Decisao atual

Nesta fase nao serao criadas views nem tabelas novas no BigQuery.

O Apps Script consulta diretamente as tabelas existentes e entrega JSON para o front. A tratativa leve, como agrupamento visual, formatacao, leitura de pendencias e montagem de cards, fica no front.

Fontes em uso:

- `reise-ssot.mart_shared.orders_all_valid`
- `reise-ssot.mart_shared.ssot_order_items`
- `reise-ssot.mart_shared.inventory_sku_current`
- Planilha CRM `[CRM] Central de Controle` (`1vlkkrA52FBGk79k0ou3vch1XqM-AdHVDj42IXO7hIZo`), somente leitura.

Leituras ainda pendentes ficam marcadas como pendentes no front, nunca como zero.

## Regra imutavel da planilha CRM

A planilha `[CRM] Central de Controle` e uma fonte operacional protegida. Esta regra e obrigatoria:

- O projeto pode apenas abrir e ler os valores atualizados diariamente.
- E proibido editar celulas, formulas, nomes de abas, ordem de colunas, filtros, validacoes ou qualquer outro elemento estrutural.
- E proibido criar, excluir, renomear, ocultar ou reordenar abas.
- E proibido escrever de volta na planilha, mesmo para corrigir ou completar dados.
- Campos que nao existem na planilha permanecem `null`/`Pendente` no painel.
- Qualquer transformacao ocorre somente na leitura do Apps Script ou na exibicao do front.

O codigo de CRM deve permanecer limitado a `SpreadsheetApp.openById()` e leitura de `getDisplayValues()`. Qualquer proposta que altere a planilha deve ser recusada.

## Arquivos

- `Code.gs`: API em Apps Script.
- `appsscript.json`: manifest com BigQuery Advanced Service.
- `queries.gs`: consultas usadas pela API.
- `deploy-checklist.md`: passo a passo de publicacao.
- `configuracao-passo-a-passo.md`: guia curto para configurar no Apps Script.

## Endpoints planejados

```text
?view=all
?view=all&refresh=1
?view=all&refresh=1&start=2026-10-05&end=2026-10-06&compareStart=2025-10-05&compareEnd=2025-10-06
?view=health
?view=status
?view=heatmap
?view=products
?view=quality
?view=stock
?view=slack
?view=targets
?view=channels
?view=growth
?view=crm
```

`targets` le as metas diarias publicadas em `mart_growth_us`. A consulta usa a localizacao `US`; se ainda nao houver uma versao publicada para o periodo, o painel mantem o pace como pendente.

`channels` le sessoes humanas e pedidos/receita atribuidos por last click na view final de canais. A consulta tambem usa a localizacao `US`.


`crm` le as abas `Controle Disparos de Whatsapp` e `Controle de disparos` da planilha protegida. A leitura respeita o periodo selecionado e nao altera a planilha.

## Regra de custo

- `?view=all`: le o snapshot salvo. Nao consulta BigQuery.
- `?view=all&refresh=1`: consulta BigQuery e grava novo snapshot.
- `start/end`: periodo analisado.
- `compareStart/compareEnd`: periodo de comparacao.
- `BDB_MIN_REFRESH_INTERVAL_SECONDS`: evita atualizacoes repetidas em curto intervalo.
- `BDB_MAX_BYTES_BILLED`: limita bytes cobrados por query.

## Como o front consome

No front, configurar a URL do Web App no arquivo:

`../04_APP_FRONT/src/config.js`

Se a URL estiver vazia, o painel segue usando mock. Com URL preenchida, a abertura normal le snapshot e o botao manual chama `refresh=1`.

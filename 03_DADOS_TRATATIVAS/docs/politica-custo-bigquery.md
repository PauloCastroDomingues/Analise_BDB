# BDB - politica de custo BigQuery

## Decisao

No MVP, o painel nao deve consultar BigQuery a cada abertura.

Atualizacao por tarefa diaria as 08:00 (Brasilia) e por acao manual. Abertura do painel e acompanhamento do snapshot nao executam consultas BigQuery, mesmo se detalhes estiverem pendentes.

## Fluxo atual

```text
Usuario abre painel
  -> front chama Apps Script sem refresh
  -> Apps Script le snapshot salvo
  -> custo BigQuery: zero

Usuario clica em Atualizar dados
  -> front chama Apps Script com refresh=1
  -> Apps Script consulta BigQuery
  -> Apps Script grava novo snapshot
  -> painel passa a ler snapshot atualizado

Tarefa diaria as 08:00
  -> consultas sequenciais por visao, com refresh=1 e force=1
  -> mes acumulado para KPIs e detalhes; mes completo para heatmap
  -> registra sucesso, carga parcial ou falha
```

## Regras

- Consulta BigQuery por tarefa diaria ou acao manual, incluindo busca de periodo.
- Leitura padrao sempre por snapshot.
- Busca normal reaproveita uma visao do mesmo periodo gerada ha menos de 15 minutos.
- `Atualizar agora` e a tarefa diaria ignoram esse intervalo para solicitar nova carga. O cache proprio do BigQuery e independente dessa regra.
- Limite publicado e validado em 03/11/2026: 2 GiB somente para estoque; demais consultas continuam em 1 GiB.
- Se o limite estourar, a query deve falhar em vez de gerar custo inesperado.
- Dados ausentes continuam como pendentes, nunca zero.

## Implicacoes

- O painel pode ficar alguns minutos ou horas defasado.
- Isso e aceitavel neste momento porque o objetivo e controlar custo e validar o produto.
- Durante a Black real, a frequencia pode ser revista: manual, de hora em hora ou por janela critica.

## Carga incremental: ainda nao implementada

A carga diaria relê o mes acumulado, o periodo comparativo e a janela mensal do heatmap. Estoque recalcula seis meses completos anteriores ao mes corrente. A existencia de um snapshot nao torna essas consultas incrementais. Nao prometer que a diaria custara menos que a primeira carga.

A proxima otimizacao deve separar carga inicial e atualizacao incremental: manter historico, substituir as particoes recentes por uma janela de reprocessamento validada, atualizar saldos de estoque e reutilizar a demanda historica consolidada. Mudancas antigas e atrasos das fontes precisam de reconciliacao periodica. Nenhuma janela fixa foi aprovada nem implantada nesta revisao.

Medicao pendente: registrar `totalBytesProcessed`, `totalBytesBilled`, `cacheHit`, duracao e identificador por job. Fazer dry run e validar particionamento das fontes antes de estimar economia. Aumentar o teto de bytes apenas permite a execucao; nao reduz os dados lidos.

## Onde isso esta implementado

- Apps Script: `05_APPS_SCRIPT_BRIDGE/Code.gs`
- Front: `04_APP_FRONT/src/data/dataProvider.js`
- Botao: `04_APP_FRONT/index.html`

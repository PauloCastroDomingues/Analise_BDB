# Checklist de deploy do Apps Script

## 1. Preparar BigQuery

- Nao criar views nem tabelas novas nesta fase.
- Usar apenas consultas diretas nas marts existentes.
- Confirmar que as fontes existem na mesma localizacao do BigQuery:
  - `reise-ssot.mart_shared.orders_all_valid`
  - `reise-ssot.mart_shared.ssot_order_items`
  - `reise-ssot.mart_shared.inventory_sku_current`
- Para a meta, confirmar que a view publicada existe em `US`:
  - `reise-ssot.mart_growth_us.dashboard_targets_daily_published_v`
  - `reise-ssot.mart_growth_us.shopify_channels_daily_shopify_attrib_with_shopify_sessions_human_complete_v`

## 2. Criar projeto Apps Script

### Projeto BDB ja conectado (situacao atual)

- Usar o projeto existente responsavel pela URL de `04_APP_FRONT/src/config.js`.
- Guardar a versao atual do `Code.gs` antes da substituicao.
- Sincronizar `05_APPS_SCRIPT_BRIDGE/Code.gs`, que prepara o limite de 2 GiB apenas para estoque.
- Salvar. Em **Implantar > Gerenciar implantacoes**, editar a implantacao existente, selecionar **Nova versao** e implantar.
- Manter a URL atual; nao criar outra implantacao para esse ajuste.
- No localhost, recarregar a pagina e clicar em **Atualizar agora**. Conferir estoque carregado e horario por visao.
- Esse ajuste libera a consulta de estoque; a carga incremental ainda exige implementacao e validacao.

### Somente para uma instalacao nova

- Criar projeto novo no Apps Script.
- Copiar:
  - `Code.gs`
  - `queries.gs`
  - `appsscript.json`
- Ativar o servico avancado do BigQuery.
- Confirmar `BDB_PROJECT_ID` e `BDB_LOCATION`.
- Confirmar `BDB_CRM_SPREADSHEET_ID` e os nomes das abas CRM.
- Autorizar o escopo `https://www.googleapis.com/auth/spreadsheets`. O Apps Script exige o escopo completo para `SpreadsheetApp.openById()`, mas o codigo CRM permanece somente leitura.

## Regra obrigatoria da planilha CRM

- A planilha `[CRM] Central de Controle` e somente leitura.
- Nao editar celulas, formulas, abas, colunas, filtros, validacoes ou estrutura.
- Nao usar metodos de escrita do `SpreadsheetApp`.
- Os dados sao lidos diariamente para o painel; nenhum dado e gravado de volta.

## 3. Testar endpoint

Testar no navegador:

```text
WEB_APP_URL?view=status
WEB_APP_URL?view=heatmap
WEB_APP_URL?view=products
WEB_APP_URL?view=quality
WEB_APP_URL?view=stock
WEB_APP_URL?view=targets&start=2026-10-01&end=2026-10-31
WEB_APP_URL?view=channels&start=2026-10-01&end=2026-10-31
WEB_APP_URL?view=growth&start=2026-10-01&end=2026-10-31
WEB_APP_URL?view=crm&start=2026-10-01&end=2026-10-31&force=1
WEB_APP_URL?view=all
WEB_APP_URL?view=all&refresh=1
WEB_APP_URL?view=health
```

Validar:

- `ok: true`
- `generatedAt`
- linhas retornando
- totais batendo com BigQuery
- `view=crm` retornando campanhas da planilha protegida sem alterar a planilha.
- chamada sem `refresh=1` deve ler snapshot, nao rodar query nova.
- `view=health` deve funcionar mesmo antes do primeiro snapshot.

## 4. Conectar no front

Editar:

```text
../04_APP_FRONT/src/config.js
```

Preencher:

```js
export const APPS_SCRIPT_URL = 'WEB_APP_URL';
```

## 5. Cuidados

- Nao colocar token ou credencial no front.
- Nao usar Apps Script para calculos pesados.
- Nao criar tabelas/views novas sem decisao explicita.
- Usar cache para evitar consulta repetida a cada refresh.
- Usar snapshot manual para evitar consulta a cada abertura do painel.
- Evitar clicar em atualizar varias vezes; o script tem trava de intervalo minimo.
- Se houver bloqueio de CORS no browser, alternativas:
  - hospedar o front no proprio Apps Script;
  - usar Apps Script para gerar JSON cacheado;
  - criar um back-end leve depois.

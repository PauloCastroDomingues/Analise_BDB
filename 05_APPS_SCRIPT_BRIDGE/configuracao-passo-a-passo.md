# Configuracao do Apps Script - BDB

## Objetivo

Criar um Web App que entrega dados ao painel sem consultar BigQuery a cada abertura.

Leitura normal:

```text
Painel -> Apps Script -> snapshot salvo no Drive
```

Atualizacao manual:

```text
Botao Atualizar dados -> Apps Script -> BigQuery -> snapshot novo
```

## 1. Criar projeto

1. Abrir `script.google.com`.
2. Criar projeto novo.
3. Nome sugerido: `BDB - Back Day Black API`.

## 2. Copiar arquivos

No Apps Script, criar/copiar estes arquivos:

- `Code.gs`
- `queries.gs`
- `appsscript.json`

Fonte local:

```text
C:/Users/reise/OneDrive/Área de Trabalho/DADOS/Balck BDB -2026/05_APPS_SCRIPT_BRIDGE/
```

## 3. Conferir configuracoes

Em `queries.gs`, validar:

```js
var BDB_PROJECT_ID = 'reise-ssot';
var BDB_LOCATION = 'US';
var BDB_DATASET = 'bdb_2026';
```

Se o dataset final tiver outro nome, trocar `bdb_2026`.

## 4. Ativar BigQuery

No editor do Apps Script:

1. Ir em `Services`.
2. Adicionar `BigQuery API`.
3. Conferir se o servico aparece como `BigQuery`.

No Google Cloud do projeto, a BigQuery API tambem precisa estar ativa.

## 5. Primeiro teste sem custo BigQuery

Executar no navegador:

```text
WEB_APP_URL?view=health
```

Esperado:

```json
{
  "ok": true,
  "source": "apps_script_health",
  "hasSnapshot": false
}
```

Esse teste nao consulta BigQuery.

## 6. Gerar primeiro snapshot

Depois que as views do BigQuery existirem, executar:

```text
WEB_APP_URL?view=all&refresh=1
```

Isso consulta BigQuery e salva o snapshot.

## 7. Testar leitura sem custo

Depois do snapshot criado:

```text
WEB_APP_URL?view=all
```

Esse endpoint deve ler o snapshot salvo.

## 8. Conectar no painel

Copiar a URL do Web App e colar em:

```text
04_APP_FRONT/src/config.js
```

Formato:

```js
export const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/XXXXX/exec';
```

## 9. Uso no painel

- Abrir painel: le snapshot.
- Clicar em `Atualizar dados`: consulta BigQuery.
- Se clicar varias vezes, o Apps Script bloqueia novas cargas por 15 minutos.

## Pontos de erro comuns

### `BigQuery is not defined`

O servico avancado BigQuery nao foi ativado no Apps Script.

### `Access denied`

A conta que publicou o Web App nao tem permissao no BigQuery.

### `Not found: Table`

As views/tabelas `bdb_*` ainda nao existem no dataset configurado.

### `Snapshot ainda nao existe`

Normal antes da primeira carga. Rodar uma vez com:

```text
?view=all&refresh=1
```

### Painel continua em mock

`APPS_SCRIPT_URL` ainda esta vazio ou a chamada falhou.

# Contrato imutavel da fonte CRM

Fonte: `[CRM] Central de Controle`

Spreadsheet ID: `1vlkkrA52FBGk79k0ou3vch1XqM-AdHVDj42IXO7hIZo`

Link operacional: https://docs.google.com/spreadsheets/d/1vlkkrA52FBGk79k0ou3vch1XqM-AdHVDj42IXO7hIZo/edit?gid=404910707#gid=404910707

## Regra gravada em pedra

Esta planilha nao pode ser excluida, editada ou ter sua estrutura alterada por este projeto. Isso inclui celulas, formulas, nomes, ordem, abas, colunas, filtros, validacoes, ocultacao e permissoes.

O unico uso autorizado e a leitura dos dados atualizados diariamente. O Apps Script usa o ID fixo da planilha, acessa as abas necessarias e le os valores exibidos. Nenhum metodo de escrita deve ser adicionado.

Observacao tecnica: o Apps Script exige o escopo `https://www.googleapis.com/auth/spreadsheets` para abrir uma planilha por ID. A existencia desse escopo nao autoriza alteracoes operacionais neste projeto; o codigo continua sem chamadas de escrita.

As abas usadas pelo painel sao:

- `Controle Disparos de Whatsapp`
- `Controle de disparos`

Quando uma coluna nao existe em uma aba, o painel preserva o valor como `null` e exibe `Pendente`. Nao criar colunas auxiliares nem preencher lacunas na fonte.

Qualquer ajuste de calculo, agrupamento, formatacao ou indicador deve ser feito no Apps Script, no front-end ou em consultas de leitura do BigQuery, sem modificar esta planilha.

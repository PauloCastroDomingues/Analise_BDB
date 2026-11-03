# Atualizacao do Black BDB

O Agendador de Tarefas do Windows executa `Refresh-Bdb.ps1` diariamente as **08:00, horario de Brasilia**. O navegador e o painel podem estar fechados. O computador precisa estar ligado e com a sessao do usuario conectada; a tarefa tenta despertar o computador e executar uma carga perdida assim que possivel.

A tarefa chama o Apps Script ja configurado, com `refresh=1&force=1`, uma visao por vez: status, heatmap, metas, canais, produtos, qualidade, estoque, Growth e CRM. Assim uma falha de estoque nao impede a atualizacao das demais visoes. Vendas, comparativo, metas, canais e detalhes usam o primeiro dia do mes ate hoje. O dia corrente e parcial. O heatmap usa a janela mensal. O resumo Slack e recalculado a partir das vendas do periodo. A fonte continua sendo o SSOT, com CRM somente leitura. Nenhuma tabela ou view e criada.

## Instalar ou atualizar a tarefa

```powershell
powershell -NoProfile -File .\06_AUTOMACAO\Install-BdbSchedule.ps1
```

A instalacao substitui apenas a tarefa `Reise - Black BDB - Atualizacao diaria 08h`. Se uma execucao falhar, o Windows tenta novamente duas vezes, a cada dez minutos. Nao executa instancias sobrepostas.

## Atualizar fora do horario

No painel, **Atualizar agora** forca uma carga completa para o periodo selecionado, mesmo se o snapshot tiver menos de quinze minutos. **Buscar** continua disponivel para consultas com cache. Durante a carga os botoes ficam desabilitados. Se a carga falhar, a tela preserva os dados anteriores e informa o erro.

Enquanto o usuario acompanha o snapshot inicial, a tela procura uma carga mais nova a cada cinco minutos e ao voltar para a aba, sem consultar BigQuery. Ao escolher datas ou fazer uma busca manual, preserva a janela escolhida; reabrir o painel volta a acompanhar o snapshot diario.

Tambem e possivel executar o script diretamente:

```powershell
powershell -NoProfile -File .\06_AUTOMACAO\Refresh-Bdb.ps1
```

`logs/last-run.json` e `logs/history.jsonl` registram horario, periodo, views e resultado. `partial` indica erro explicito em uma view alem de status; `failed` causa codigo de saida 1 para permitir nova tentativa. A tela nao reaproveita detalhes de outro periodo como se fossem atuais. Campos sem fonte permanecem pendentes no painel.

## Estoque: ajuste publicado e validado

O primeiro teste de 03/11/2026 atualizou oito visoes e encontrou uma exigencia de **1.907.359.744 bytes** na consulta de estoque. Apos publicacao pelo usuario, a API confirmou o limite de **2.147.483.648 bytes (2 GiB) somente para estoque**, mantendo 1 GiB nas demais consultas. A carga de estoque foi validada as **15:13 de 03/11/2026 (Brasilia)**: 80 linhas retornadas, 66 com cobertura calculavel, sem reaproveitamento de snapshot. Valores de cobertura ausentes continuam pendentes. Evidencia em `logs/validation-stock.json`; o historico anterior de carga parcial permanece preservado. O limite e um teto de bytes por consulta, nao uma cobranca fixa. A carga incremental ainda nao foi implementada.

## Limite atual

Este agendamento roda **neste Windows**. Para funcionar com o computador desligado, a tarefa deve ser migrada para um gatilho Apps Script ou outro agendador na nuvem. O acesso automatizado ao navegador foi bloqueado e a credencial local Google estava expirada durante esta configuracao; nenhum agendamento em nuvem foi declarado como ativo.

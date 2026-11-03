# Black BDB - Reise

Painel operacional da Black com nove areas: visao geral, vendas por horario, canais e conversao, midia e investimento, CRM e campanhas, produtos e mix, estoque e risco, acoes e resumo, fontes e metodologia.

## Desenvolvimento

Requer Node.js 24 para testes e build. O front nao possui dependencias externas.

```powershell
npm test
npm run build
python -m http.server 8001 --directory 04_APP_FRONT
```

Localhost: http://127.0.0.1:8001/index.html

## Publicacao

- Repositorio: https://github.com/PauloCastroDomingues/Analise_BDB
- Equipe Vercel: `reise-team`
- Projeto Vercel: `analise-bdb`
- Build: `npm run build`
- Diretorio publicado: `dist/`

O build copia somente `index.html`, `src/` e `assets/` da interface. Testes, documentacao, automacao Windows e codigo Apps Script nao sao servidos pelo site. Logs, backups, credenciais e o pacote externo do SSOT ficam fora do Git e do upload.

```powershell
vercel project inspect analise-bdb --scope reise-team --non-interactive
vercel deploy --prod --scope reise-team --project analise-bdb --yes
```

Publicacoes futuras exigem autorizacao do responsavel pelo projeto.

## Dados e atualizacao

O front le o snapshot do Apps Script configurado em `04_APP_FRONT/src/config.js`. Abrir ou navegar no painel nao consulta BigQuery. A busca de periodo e o botao `Atualizar agora` podem solicitar nova carga. Falhas individuais aparecem como atualizacao parcial; falhas de atualizacao preservam a tela anterior. Na falha da primeira carga, o modo demonstrativo e identificado.

A rotina diaria das 08:00 (Brasilia) continua no Agendador do Windows: requer computador ligado e sessao conectada. Publicar a interface nao cria um cron na nuvem. A extracao diaria ainda relê a janela de analise; nao e incremental. Detalhes e limites por consulta: `06_AUTOMACAO/README.md` e `03_DADOS_TRATATIVAS/docs/politica-custo-bigquery.md`.

Metas usam a publicacao diaria do SSOT quando disponivel. Informacao ausente permanece pendente. Receita de itens nao e rateada para coincidir com receita de pedidos; conciliacao entre bases e classificacao oficial de produtos seguem sujeitas a validacao. Item com valor liquido explicitamente zero e brinde.

O calendario comercial depende da identificacao e conexao da aplicacao de origem. Os registros em `03_DADOS_TRATATIVAS/templates/black_commercial_calendar.csv` sao exemplos, nao acoes executadas. Nao ha resultado atribuido a cupons, lives ou acoes sem vinculo validado.

## Estrutura

- `00_BRIEFING/`: requisitos funcionais e modelo de operacao.
- `03_DADOS_TRATATIVAS/`: contratos, templates, propostas SQL e politica de custo; conferir o estado de validacao de cada fonte antes de reutilizar.
- `04_APP_FRONT/`: interface Reise, adaptadores e testes.
- `05_APPS_SCRIPT_BRIDGE/`: codigo do back Apps Script; sua publicacao e separada da Vercel.
- `06_AUTOMACAO/`: agendamento e execucao local da carga.
- `scripts/build.mjs`: gera somente os arquivos publicaveis em `dist/`.

Identidade e verificacoes visuais: `04_APP_FRONT/README.md`. Referencias externas do SSOT e mockups antigos continuam locais e nao fazem parte do site publicado.

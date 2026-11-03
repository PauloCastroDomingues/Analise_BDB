# BDB - app front

Front funcional estatico do BDB.

## Interface Reise - revisao de 03/11/2026

O painel foi reorganizado em nove areas, com navegacao por URL e historico do navegador: Visao geral, Vendas por horario, Canais e conversao, Midia e investimento, CRM e campanhas, Produtos e mix, Estoque e risco, Acoes e resumo, Fontes e metodologia. A troca de area conserva filtros e dados, sem novas consultas.

### Identidade e organizacao do codigo

- `src/tokens.css`: cores, tipografia e variaveis visuais.
- `src/styles.css`: layout, componentes e regras responsivas; substitui a folha anterior com sobreposicoes acumuladas.
- `src/ui/workspace.js`: navegacao por areas, menu mobile, foco e teclado do heatmap.
- `src/app.js`: renderizacao e interacoes com dados.
- `assets/brand/` e `assets/fonts/`: originais locais da marca, sem chamadas a CDN.

Referencia de identidade: `C:/Users/reise/Debrief/Referencias/reise-cult-guia-identidade-visual-texto.md`, copia consultada do guia oficial Reise Cult. Cores digitais: Pneu Dark `#1D1D1B`, Branco `#F4F4F4`, Cinza Asfalto `#3F3A38`, Laranja Apex `#FB5D06`. Aalto para leitura; Formula1 para titulos. O guia reserva Formula1 ao uso interno. O painel foi preparado para publicacao na Vercel por solicitacao do usuario; continua voltado a operacao da equipe.

Ativos originais copiados do acervo `Debrief/Anexos/reise-cult/originais/`: logo monocromatico branco `1K_7lhfF6bsQlH9U1_I9tnTsC9DfDJCKB`, Aalto regular `1lTQw3K8JUorGKC6fXGOjdGKSSOGfG1U5`, Aalto bold `15swyZ7E2rn0hJk6gISVft_hvWv1th86l`, Formula1 bold `1PrlNE8jseCb2MqcMuSZxr8DOec28amFQ`.

### Usabilidade e integridade dos dados

- Cabecalho compacto, periodo sempre identificado, comparativo sob demanda e atualizacao manual destacada.
- Carregado indica disponibilidade de uma visao, nao validacao de todos os seus indicadores. O estado detalhado e acessivel por disclosure.
- Menu com grupos, estado ativo, rotulo acessivel, versao recolhida e gaveta mobile com foco contido e fechamento por Escape.
- Heatmap com rolagem horizontal confinada, navegacao por setas e horarios futuros marcados por traco, sem simular vendas zero.
- Estoque com quatro prioridades e acesso aos demais SKUs da carga; CRM com campanhas recentes e acesso as restantes.
- Fontes e metodologia explicitas. A receita dos produtos usa os valores de itens SSOT, sem rateio para coincidir com pedidos; a conciliacao entre bases continua pendente.
- Abertura e navegacao leem somente snapshot. Agenda diaria e consultas permanecem no fluxo existente.

### Verificacao

`node --test 04_APP_FRONT/tests/*.test.mjs` (a partir da raiz): 13 testes aprovados na entrega, cobrindo atualizacao, falhas, isolamento de periodos, navegacao, horario de Brasilia, grafico de um dia e preservacao da receita de itens.

Revisao visual no navegador integrado do VS Code com dados reais: desktop, tablet 768 x 1024 e celular 390 x 844. Foram conferidos menu, visao geral, CRM, canais, produtos, estoque, acoes e heatmap com rolagem. Nao equivale a auditoria completa WCAG ou a teste em aparelhos fisicos.

Backup anterior a esta revisao: `../.codex/backups/ui-20261103/`. Nenhum arquivo do SSOT, planilha operacional ou agendamento foi modificado por esta revisao visual.

## Como rodar local

Dentro desta pasta:

```powershell
python -m http.server 8088
```

Abrir:

```text
http://127.0.0.1:8088
```

## Estrutura

- `index.html`: entrada da aplicacao.
- `src/styles.css`: identidade visual e layout.
- `src/app.js`: renderizacao e interacoes.
- `src/data/bdbMockData.js`: dados mockados no formato esperado do back.
- `src/data/dataProvider.js`: carrega Apps Script quando configurado; usa mock como fallback.
- `src/config.js`: URL do Apps Script Web App.

## O que ja esta funcional

- KPIs principais.
- Grafico de evolucao e pace em SVG.
- Filtro de periodo analisado e periodo comparativo.
- Heatmap comercial clicavel com dados reais de pedidos e receita por hora.
- Detalhe de dia/hora com realizado. Acoes comerciais seguem pendentes ate existir uma fonte de calendario.
- Produto e mix.
- Qualidade da venda.
- Regra de brinde: todo item com valor liquido explicitamente igual a R$ 0,00.
- Canais como pendente, ate validar uma fonte na mesma localizacao ou um fluxo separado.
- Estoque e risco.
- Sugestoes automaticas derivadas do snapshot de vendas, heatmap e estoque, sempre marcadas para validacao.
- Texto-base para Slack com botao de copiar.
- Metodologia.
- Botao de atualizacao manual para Apps Script.
- Pace contra a meta diaria publicada do mes selecionado, incluindo o periodo de Black.
- Canais por sessoes humanas e pedidos/receita atribuidos por last click.

## Atualizacao diaria e manual

- Agendador local Windows: todos os dias as 08:00 (Brasilia); requer computador ligado e sessao conectada.
- `Atualizar agora`: forca uma nova carga de todas as visoes para o periodo selecionado, sem reutilizar o cache de quinze minutos.
- Falhas individuais aparecem como atualizacao parcial. Erros da fonte principal preservam os dados anteriores da tela.
- Detalhes de outro periodo nao sao apresentados como atualizados.
- Instalacao, logs e validacao do estoque: `../06_AUTOMACAO/README.md`.

## Proximo encaixe com back

Com URL configurada em `src/config.js`:

- A abertura normal do painel le o snapshot salvo.
- O botao `Atualizar dados` chama o Apps Script com `refresh=1`.
- O botao envia `start`, `end`, `compareStart` e `compareEnd`.
- A meta vem de `mart_growth_us.dashboard_targets_daily_published_v` e acompanha o periodo selecionado.
- Apenas esse refresh manual consulta BigQuery.
- Views/tabelas novas nao sao criadas nesta fase.

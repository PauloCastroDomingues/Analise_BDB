---
title: "BDB (BACK DAY BLACK)"
data: 2026-10-05
type: project
status: rascunho
scope: work
created: 2026-10-05
updated: 2026-10-05
tags:
  - "#projeto/black"
  - "#area/marketing"
  - "#area/dados"
  - "#canal/slack"
sources:
  - "[[Referencias/reise-cult-identidade-cultura-guias]]"
  - "[[Agentes/identidade-visual-cultura-reise-agent]]"
  - "C:/Users/reise/OneDrive/Área de Trabalho/DADOS/Black -analise 2025-2026/README.md"
  - "C:/Users/reise/OneDrive/Área de Trabalho/DADOS/Black -analise 2025-2026/data/black_nov_2025_dashboard.json"
related:
  - "[[Decisoes/aplicar-guias-reise-em-demandas-visuais]]"
---

# BDB (BACK DAY BLACK)

## Intencao

Criar uma rotina analitica diaria e semanal para a Black da Reise.

O BDB deve munir o time de marketing com leituras que hoje nao aparecem no painel gerencial ou que exigem cruzamentos manuais. O objetivo principal e reduzir o tempo entre pergunta, analise e decisao.

O projeto nao substitui o painel gerencial. Ele funciona como uma camada de inteligencia operacional da Black: mostra o que mudou, por que pode ter mudado, qual decisao precisa ser tomada e quem precisa agir.

## Tese do projeto

Durante a Black, a janela de decisao e curta. Cada cadeira perde tempo quando precisa montar a propria leitura do zero.

O BDB deve concentrar quatro perguntas:

1. Estamos no pace certo para bater a meta?
2. O que aconteceu desde a ultima leitura?
3. Qual acao comercial ou de marketing parece ter causado impacto?
4. Qual decisao precisa ser tomada agora?

## Publico

- Performance: verba, canal, campanha, ROAS, CAC, escala e eficiencia.
- CRM: disparos, base acionada, receita por jornada, recompra e comportamento por segmento.
- Conteudo e social: criativos, comunicacao, picos de interesse, timing e temas que puxam demanda.
- Comercial/produto: linhas, modelos, cores, faixas de preco, brindes, kits, estoque e margem.
- Diretoria: pace de meta, riscos, alavancas e decisoes criticas.

## Produto esperado

### 1. Central diaria da Black

Uma pagina ou painel operacional com leitura de D-0 ate o dia atual.

Deve responder rapido:

- Receita acumulada, pedidos, unidades, ticket medio e itens por pedido.
- Pace contra meta da Black.
- Gap para meta e venda diaria necessaria ate o fim da janela.
- Comparacao contra curva esperada, historico de 2025 ou plano comercial.
- Alertas de desvio: queda de conversao, canal perdendo eficiencia, produto rompendo estoque, horario fraco, brinde acima do previsto, queda de cesta.
- Top oportunidades do dia: onde escalar, onde cortar, onde comunicar melhor.

### 2. Leitura semanal

Uma visao mais analitica para tomada de decisao de estrategia.

Deve responder:

- Quais alavancas explicam o crescimento ou a queda da semana?
- O mix vendido esta saudavel?
- A venda esta vindo de novos clientes, recorrentes ou clientes reativados?
- O desconto esta comprando volume ou corroendo qualidade?
- Quais produtos e faixas merecem reforco de criativo, CRM ou midia?
- Quais horarios e dias concentram oportunidade real?

### 3. Newsletter automatizada no Slack

Um resumo curto, publicado em canal aprovado de colaboradores.

Formato sugerido:

```text
BDB | Resumo da Black | DD/MM

Pace:
Estamos em R$ X, Y% da meta. Gap atual: R$ Z.

Movimento do dia:
O maior ganho veio de [canal/produto/acao]. O maior risco esta em [ponto].

Calendario comercial:
[Acao] entrou em vigor as HHh. Depois disso, [indicador] mudou X%.

Produtos:
Top linhas/modelos: [lista curta]. Atencao para [estoque/mix/faixa].

Decisao sugerida:
[acao concreta], responsavel sugerido: [area].
```

No MVP, a newsletter pode nascer semi-automatizada: dados atualizados por script, texto revisado por uma pessoa e postagem manual. A automacao completa entra depois, quando metricas, fontes e canal estiverem validados.

## Principios

- Dado separado de leitura e hipotese.
- Toda comparacao precisa declarar base, periodo e denominador.
- Missing fica como pendente, nunca como zero.
- Black 2025 serve como referencia historica, nao como verdade para a Black atual.
- Toda conclusao precisa indicar a acao sugerida ou a pergunta que ainda falta responder.
- O calendario comercial deve ser tratado como fonte analitica, nao como anotacao solta.
- A newsletter nao deve gerar ruido. Ela deve avisar mudanca relevante, risco ou decisao.

## Arquitetura do projeto

### Camada 1. Fontes

Fontes candidatas:

- Pedidos e itens pagos da Black.
- Metas oficiais da Black por dia, semana, canal e total.
- Calendario comercial: promocao, cupom, frete, brinde, criativo, landing, CRM, midia, live, influenciador e mudanca de preco.
- Midia paga: investimento, campanha, conjunto, criativo, clique, conversao e eficiencia.
- CRM: disparos, listas, receita atribuida, abertura, clique e jornada.
- Estoque: disponibilidade por produto, cor e tamanho.
- Catalogo de produtos: linha, modelo, cor, categoria, faixa de preco, margem e status comercial.
- Clientes: novo, recorrente, reativado, cohort pre-Black e pos-Black.

### Camada 2. Bases tratadas

Tabelas semanticas sugeridas:

- `black_orders_daily`: dia, receita, pedidos, unidades, ticket, itens por pedido, desconto, frete.
- `black_items_daily`: dia, linha, modelo, cor, categoria, faixa de preco, unidades, receita, desconto.
- `black_customers_daily`: dia, clientes novos, recorrentes, reativados, recompra, cesta 2+.
- `black_marketing_daily`: dia, canal, campanha, gasto, receita atribuida, ROAS, CAC, conversao.
- `black_commercial_calendar`: data, hora, acao, mecanica, canal, produto, responsavel, objetivo, expectativa.
- `black_target_curve`: data, meta acumulada, meta diaria, curva esperada, tolerancia.
- `black_stock_daily`: dia, SKU, estoque, ruptura, dias de cobertura, risco.

### Camada 3. Motor de leitura

Regras para transformar dados em insight:

- Comparar realizado contra meta acumulada.
- Comparar dia contra curva esperada.
- Comparar horario contra padrao historico e contra media da campanha.
- Cruzar calendario comercial com mudanca posterior nos indicadores.
- Separar venda paga, brinde oficial, desconto integral e item fora do escopo.
- Destacar causa provavel somente quando houver sinal temporal e base suficiente.
- Classificar cada alerta como `risco`, `oportunidade`, `anomalia` ou `decisao`.

### Camada 4. Saidas

- Painel diario BDB.
- Visao semanal de estrategia.
- Newsletter no Slack.
- Log de decisoes tomadas durante a Black.
- Base pos-Black para retrospectiva e aprendizado.

## Visões candidatas

### Pace contra meta

Objetivo: saber se a Black esta acima, abaixo ou dentro do plano.

Metricas:

- Receita acumulada.
- Meta acumulada.
- Atingimento percentual.
- Gap absoluto.
- Venda diaria necessaria para bater a meta.
- Curva esperada ate o fim da janela.
- Status: acima do plano, dentro da faixa, abaixo do plano.

Leitura desejada:

> Estamos X% da meta. Para fechar a Black, precisamos vender R$ Y por dia. O ritmo atual indica risco/oportunidade em Z.

### Heatmap de vendas

Inspirado na analise Black 2025.

Objetivo: entender concentracao por dia, semana e hora.

Metricas:

- Pedidos pagos por hora.
- Receita por hora.
- Unidades por hora.
- Ticket medio por faixa horaria.
- Comparacao com calendario comercial.

Cortes:

- Semana da Black.
- Dia da semana.
- Hora de Sao Paulo.
- Canal ou campanha, quando a atribuicao for confiavel.

Cuidados:

- Declarar se a base usa pedido pago, item pago ou receita total.
- Nao misturar brindes com venda paga.
- Manter futuro e dado ausente como pendente.

### Calendario comercial com impacto

Objetivo: ligar as acoes executadas ao comportamento da venda.

Campos minimos:

- Data e hora.
- Acao.
- Tipo: preco, cupom, frete, brinde, CRM, midia, social, landing, influenciador, estoque.
- Responsavel.
- Canal.
- Produtos ou linhas afetadas.
- Expectativa.
- Indicador principal.
- Resultado observado.
- Hipotese.
- Proxima decisao.

Leitura desejada:

> A acao X entrou as HHh. Nas horas seguintes, pedidos subiram/caíram Y% versus padrao. O efeito parece concentrado em [linha/canal]. Precisa validar [ponto].

### Mix de produto e linha

Objetivo: entender se a venda esta vindo dos produtos certos.

Visões:

- Receita e unidades por linha.
- Modelos que puxam volume.
- Cores com tracao.
- Faixas de preco.
- Itens que aparecem em cesta 2+.
- Produtos que vendem bem mas podem romper.
- Produtos com baixo giro apesar de campanha.

### Cesta e comportamento de compra

Objetivo: aumentar qualidade da venda, nao apenas volume.

Visões:

- Itens pagos por pedido.
- Pedidos com 2+ itens.
- Receita em cesta 2+.
- Combos naturais.
- Brindes oficiais e impacto em conversao.
- Clientes com mais de um pedido dentro da Black.

### Cliente e recorrencia

Objetivo: separar aquisicao, reativacao e recorrencia.

Visões:

- Cliente novo da janela.
- Cliente que ja comprava antes da Black.
- Cliente que recompra durante a Black.
- Segmentos acionados por CRM.
- Receita de clientes de maior valor.

### Midia e atribuicao

Objetivo: entender se o investimento esta gerando venda incremental ou apenas capturando demanda existente.

Visões:

- Gasto por canal e campanha.
- Receita atribuida.
- ROAS.
- CAC.
- Conversao por landing ou campanha.
- Criativos com melhor resposta.
- Cruzamento com calendario comercial.

Cuidados:

- Separar dado observado de atribuicao modelada.
- Declarar janelas e regras de atribuicao.
- Nao usar uma origem de midia como prova isolada de causalidade.

### Estoque e risco operacional

Objetivo: evitar que uma decisao de marketing empurre produto sem cobertura.

Visões:

- Produtos com alta tracao e baixo estoque.
- Tamanhos ou cores criticos.
- Produtos com estoque alto e baixa comunicacao.
- Risco de ruptura por dia.
- Sugestao de troca de foco de campanha.

## Rotina diaria

### Antes da operacao

- Atualizar dados.
- Validar se a carga fechou.
- Conferir metas e calendario do dia.
- Registrar acoes previstas.
- Gerar primeira leitura de pace.

### Durante o dia

- Monitorar picos por hora.
- Cruzar mudancas com calendario comercial.
- Alertar desvios relevantes.
- Registrar decisoes tomadas.

### Fechamento do dia

- Fechar resultado do dia.
- Explicar principais movimentos.
- Separar fatos, hipoteses e pendencias.
- Publicar resumo no Slack.
- Atualizar backlog de decisoes para o dia seguinte.

## Rotina semanal

- Consolidar semana.
- Comparar contra meta e plano.
- Revisar eficacia das acoes comerciais.
- Mapear produtos e canais que precisam de reforco.
- Atualizar hipoteses da proxima semana.
- Preparar leitura executiva curta.

## Identidade visual

O BDB deve seguir a identidade visual da Reise documentada em [[Referencias/reise-cult-identidade-cultura-guias]] e [[Agentes/identidade-visual-cultura-reise-agent]].

Direcao:

- Base escura, com uso funcional do laranja #FB5D06.
- Laranja apenas para prioridade, alerta, conversao ou destaque real.
- Visual premium, tecnico e direto.
- Graficos legiveis antes de qualquer efeito visual.
- Hierarquia clara: status, leitura, evidencia e decisao.
- Linguagem proxima e objetiva.
- Referencia de performance e equipe sem transformar todo grafico em decoracao de Formula 1.

Para dashboards internos, Formula1 pode orientar titulos e destaques quando a fonte estiver disponivel. Aalto pode orientar corpo de texto. Para materiais externos/comerciais, respeitar a restricao registrada no guia antes de usar Formula1.

## Estrutura sugerida do painel

1. Status da Black: pace, meta, gap e venda necessaria.
2. Movimento desde a ultima leitura.
3. Calendario comercial e impactos observados.
4. Heatmap de vendas.
5. Produto, linha e mix.
6. Cesta, brindes e recompra.
7. Midia, CRM e canais.
8. Estoque e riscos.
9. Decisoes recomendadas.
10. Metodologia e alertas de qualidade dos dados.

## Metodologia obrigatoria

Toda visao deve mostrar:

- Periodo.
- Fonte.
- Base.
- Denominador.
- Regra de inclusao e exclusao.
- Ultima atualizacao.
- Pendencias de qualidade.

Exemplo de alerta metodologico:

> Esta visao usa pedidos pagos. Brindes oficiais e itens zerados nao entram no calculo de cesta paga. Comparacoes com pedido total precisam usar outro denominador.

## MVP

### Fase 1. Arquitetura e escopo

- Definir janela oficial da Black.
- Definir meta total, metas parciais e curva esperada.
- Definir fontes oficiais.
- Criar calendario comercial padrao.
- Listar metricas obrigatorias e metricas desejaveis.
- Validar denominadores.

### Fase 2. Painel diario

- Construir status de pace.
- Construir heatmap.
- Construir calendario com impacto.
- Construir leitura de produto e mix.
- Construir alertas metodologicos.

### Fase 3. Newsletter Slack

- Definir canal.
- Definir horario de envio.
- Definir tom e tamanho.
- Criar template.
- Testar resumo manual por alguns dias.
- Automatizar somente depois da validacao.

### Fase 4. Semana e retrospectiva

- Consolidar leitura semanal.
- Registrar decisoes tomadas.
- Preparar base pos-Black.
- Criar documento de aprendizados.

## Decisoes pendentes

- Qual e a janela oficial da Black?
- Qual e a meta total e qual curva de pace deve ser usada?
- O pace sera comparado contra meta linear, curva historica, curva planejada ou combinacao?
- Qual canal do Slack recebera a newsletter?
- Quem aprova o texto automatico antes da postagem?
- Quais fontes serao consideradas oficiais para receita, midia, CRM e estoque?
- O calendario comercial sera preenchido manualmente, por planilha ou por integracao?
- Quais cadeiras precisam receber alertas diferentes?
- Quais metricas sao obrigatorias no MVP?
- O projeto vira painel, relatorio, automacao ou os tres?

## Riscos

- Misturar denominadores e gerar conclusao errada.
- Tratar correlacao temporal como causalidade.
- Automatizar newsletter antes de validar as regras de leitura.
- Usar dados incompletos como zero.
- Repetir visoes do painel gerencial sem adicionar decisao.
- Criar excesso de alertas e reduzir confianca do time.
- Depender de uma fonte de atribuicao sem validar janela e regra.

## Proximo passo

Transformar esta pagina em briefing operacional.

Primeira reuniao sugerida:

1. Fechar objetivo do BDB.
2. Escolher as 5 visoes obrigatorias do MVP.
3. Validar fontes e donos.
4. Definir calendario comercial padrao.
5. Definir template da newsletter.
6. Definir o primeiro prototipo local.

## Notas de origem

A analise Black 2025 e referencia para estrutura, especialmente heatmap, calendario, cesta, recompra, brindes e cuidados de denominador. Ela nao deve ser copiada como resultado atual.

A identidade visual segue a base REISE Cult consultada no Debrief. Os guias sao fonte de direcao visual e cultura; nao sao fonte de dados comerciais.

## MVP aprovado para desenvolvimento

Esta seção objetiva o trabalho antes de iniciar o back-end no VS Code.

O front aprovado como direção é o mockup `bdb-all-views-sober.html`, criado como referência visual local. Ele define a hierarquia de leitura e as visões que precisam existir no MVP funcional. O arquivo é referência de interface, não fonte de dado.

### Visões oficiais

O BDB deve nascer com dez visões oficiais:

1. Status da Black.
2. Evolução e ritmo.
3. Heatmap comercial.
4. Produto e mix.
5. Qualidade da venda.
6. Canais.
7. Estoque e risco operacional.
8. Decisões.
9. Leitura semanal.
10. Resumo Slack.

### MVP mínimo para primeira versão funcional

Para não começar grande demais, a primeira versão funcional deve priorizar cinco blocos:

1. Status da Black.
2. Evolução e ritmo.
3. Heatmap comercial.
4. Produto + qualidade da venda.
5. Decisões + resumo Slack.

Canais e estoque entram no MVP completo, mas podem começar com status `pendente` se a fonte ainda não estiver confiável. O painel deve mostrar essa pendência, não ocultar.

## Mapa funcional por visão

### 1. Status da Black

Pergunta que responde:

> Estamos dentro, acima ou abaixo do plano da Black?

Métricas:

- Receita acumulada.
- Meta acumulada.
- Atingimento da meta.
- Gap absoluto.
- Venda necessária por dia.
- Pedidos pagos.
- Ticket médio.
- Última atualização.

Fonte candidata:

- Base de pedidos e itens pagos.
- Curva oficial de meta.

Denominador:

- Receita paga.
- Pedido pago.

Frequência:

- Diária no mínimo.
- Intradia se a carga permitir.

Dono sugerido:

- Dados para atualização.
- Performance e diretoria para decisão.

Decisão que deve provocar:

- Acelerar, manter ou segurar esforço comercial e de mídia.

### 2. Evolução e ritmo

Pergunta que responde:

> A Black está ganhando ou perdendo ritmo?

Métricas:

- Receita acumulada vs meta.
- Receita diária.
- Pedidos diários.
- Ticket médio por dia.
- Itens pagos por pedido.
- Projeção até o fim da janela.

Fonte candidata:

- Pedidos pagos.
- Itens pagos.
- Meta diária ou curva esperada.

Denominador:

- Dia da Black.
- Pedido pago.
- Receita paga.

Frequência:

- Diária.
- Atualização intradia em horários críticos, se disponível.

Dono sugerido:

- Dados.

Decisão que deve provocar:

- Identificar se o problema é volume, ticket, cesta ou ritmo de campanha.

### 3. Heatmap comercial

Pergunta que responde:

> Em quais dias e horários a venda reagiu, e qual ação comercial estava acontecendo?

Métricas:

- Pedidos pagos por dia e hora.
- Receita por dia e hora.
- Unidades por dia e hora.
- Total diário.
- Ações comerciais por horário.
- Realizado antes/depois da ação, quando houver base.

Fonte candidata:

- Pedidos pagos com timestamp em hora de São Paulo.
- Calendário comercial.

Denominador:

- Pedido pago.
- Receita paga.
- Hora local São Paulo.

Frequência:

- Intradia durante a operação.
- Fechamento diário consolidado.

Dono sugerido:

- Dados para montagem.
- Marketing, CRM e comercial para preenchimento das ações.

Decisão que deve provocar:

- Repetir, ajustar ou interromper ações por horário.
- Preparar reforços antes de janelas de pico.

Regra de interface:

- O heatmap e o calendário são uma única visão.
- O calendário entra como ponto clicável dentro do heatmap.
- Ao clicar no ponto, o painel deve abrir o dia e mostrar ação, horário, responsável, expectativa, realizado, leitura e próxima decisão.

### 4. Produto e mix

Pergunta que responde:

> A venda está vindo dos produtos certos?

Métricas:

- Receita por linha.
- Unidades por linha.
- Top modelos.
- Cores com tração.
- Faixas de preço.
- Produtos com alta venda e baixo estoque.
- Produtos com estoque alto e baixa venda.

Fonte candidata:

- Itens pagos.
- Catálogo de produtos.
- De-para de linha, modelo, cor e categoria.
- Estoque.

Denominador:

- Item pago.
- Receita paga.
- Produto/SKU.

Frequência:

- Diária.
- Intradia para produtos críticos.

Dono sugerido:

- Dados para classificação.
- Produto/comercial para interpretação.

Decisão que deve provocar:

- Definir o que deve receber mídia, CRM, social ou destaque comercial.

### 5. Qualidade da venda

Pergunta que responde:

> O crescimento é saudável ou está comprando volume ruim?

Métricas:

- Cesta 2+.
- Itens pagos por pedido.
- Receita em pedidos com 2+ itens.
- Ticket médio.
- Brindes oficiais.
- Desconto.
- Recompra dentro da Black.
- Clientes com mais de um pedido.

Fonte candidata:

- Pedidos pagos.
- Itens pagos.
- Lista oficial de brindes.
- Dados de cliente.

Denominador:

- Pedido pago.
- Item pago.
- Cliente pago.
- Brinde oficial separado de item pago.

Frequência:

- Diária.

Dono sugerido:

- Dados.
- Comercial para leitura de margem e brinde.

Decisão que deve provocar:

- Repetir ou não cupons.
- Criar trava de cesta mínima.
- Ajustar brinde, combo ou argumento de venda.

### 6. Canais

Pergunta que responde:

> Quais canais parecem contribuir para o movimento observado?

Métricas:

- Gasto por canal.
- Receita atribuída.
- ROAS.
- CAC.
- Conversão por landing.
- Disparos de CRM.
- Receita pós-disparo.
- Criativos ou campanhas com maior resposta.

Fonte candidata:

- Mídia paga.
- CRM.
- Social.
- Landing/site.
- Calendário comercial.

Denominador:

- Canal.
- Campanha.
- Janela de atribuição.
- Receita atribuída, quando confiável.

Frequência:

- Diária.
- Intradia somente quando a fonte for confiável.

Dono sugerido:

- Performance.
- CRM.
- Dados para integração.

Decisão que deve provocar:

- Escalar, pausar ou realocar verba.
- Repetir disparos.
- Reforçar criativos.

Cuidados:

- Separar dado observado de atribuição modelada.
- Não usar uma única fonte de mídia como prova de causalidade.
- Se atribuição estiver fraca, marcar como `pendente de validação`.

### 7. Estoque e risco operacional

Pergunta que responde:

> Podemos escalar esse produto sem gerar ruptura ou frustração?

Métricas:

- Estoque por SKU.
- Cobertura por dia.
- Produtos com alta tração e baixo estoque.
- Cores e tamanhos críticos.
- Produtos com estoque alto e baixa comunicação.
- Risco de ruptura.

Fonte candidata:

- Estoque.
- Itens vendidos.
- Catálogo/SKU.

Denominador:

- SKU.
- Cor.
- Tamanho.
- Linha/modelo.

Frequência:

- Diária.
- Intradia para produtos críticos, se possível.

Dono sugerido:

- Produto/comercial.
- Operação.
- Dados para cruzamento.

Decisão que deve provocar:

- Segurar mídia.
- Redirecionar comunicação.
- Trocar produto foco.
- Criar combo com produto de boa cobertura.

### 8. Decisões

Pergunta que responde:

> O que precisa ser feito agora, por quem e até quando?

Métricas/campos:

- Decisão recomendada.
- Motivo.
- Evidência.
- Dono.
- Prazo.
- Status.
- Risco se nada for feito.
- Decisão tomada.
- Horário da decisão.

Fonte candidata:

- Leitura do próprio BDB.
- Registro manual durante operação.

Denominador:

- Não é visão quantitativa principal.
- Usa evidência das outras visões.

Frequência:

- Contínua durante a operação.
- Fechamento diário.

Dono sugerido:

- Líder da rotina BDB.
- Donos das cadeiras.

Decisão que deve provocar:

- Execução. Esta visão é o ponto de saída do painel.

### 9. Leitura semanal

Pergunta que responde:

> Quais aprendizados da semana mudam a estratégia da próxima rodada?

Métricas:

- Resultado semanal.
- Meta semanal.
- Ações com melhor resposta.
- Produtos que puxaram venda.
- Produtos que limitaram escala.
- Canais com melhor sinal.
- Hipóteses validadas.
- Hipóteses pendentes.

Fonte candidata:

- Todas as bases consolidadas.
- Log de decisões.
- Calendário comercial.

Denominador:

- Semana da Black.
- Receita paga.
- Pedido pago.
- Produto/canal, conforme leitura.

Frequência:

- Semanal.
- Fechamento pós-Black.

Dono sugerido:

- Dados.
- Marketing.
- Comercial.
- Diretoria para decisões maiores.

Decisão que deve provocar:

- Ajustar plano da semana seguinte.
- Registrar aprendizados para a próxima Black.

### 10. Resumo Slack

Pergunta que responde:

> O que o time precisa saber agora sem abrir o painel?

Campos:

- Pace.
- Movimento desde a última leitura.
- Ação comercial relevante.
- Produto ou estoque crítico.
- Decisão sugerida.
- Pendência importante.

Fonte candidata:

- Saída consolidada do BDB.

Denominador:

- Deve herdar denominador das visões citadas.

Frequência:

- Fechamento diário.
- Intradia apenas quando houver mudança relevante.

Dono sugerido:

- Dados gera o rascunho.
- Humano revisa antes do envio no MVP.

Decisão que deve provocar:

- Alinhar o time rapidamente.
- Chamar responsáveis para uma ação objetiva.

Regra operacional:

- Começar semi-automatizado.
- Não enviar automático sem validação humana nos primeiros dias.
- Não mandar resumo se não houver mudança relevante.

## Ordem recomendada de implementação

### Etapa 1. Front funcional com dados históricos

Objetivo:

> Transformar o mockup aprovado em uma aplicação local funcional usando a Black 2025 como sandbox.

Escopo:

- Recriar o layout aprovado no template aberto no VS Code.
- Carregar dados históricos da Black 2025.
- Renderizar Status, Evolução, Heatmap Comercial, Produto, Qualidade da Venda e Decisões.
- Manter Canais e Estoque como blocos visuais com status pendente se os dados ainda não estiverem prontos.

Critério de pronto:

- Rodar localmente.
- Mostrar dados reais históricos.
- Declarar denominadores.
- Permitir clicar no heatmap e abrir o detalhe do dia/ação.
- Não publicar.

### Etapa 2. Mapa de dados e normalização

Objetivo:

> Criar as bases semânticas que sustentam as visões.

Bases mínimas:

- `black_orders_daily`
- `black_items_daily`
- `black_commercial_calendar`
- `black_target_curve`
- `black_decisions_log`

Bases desejáveis:

- `black_marketing_daily`
- `black_customers_daily`
- `black_stock_daily`

Critério de pronto:

- Cada métrica do front sabe de qual base vem.
- Cada visão mostra base, período e denominador.
- Missing aparece como pendente.

### Etapa 3. Newsletter semi-automatizada

Objetivo:

> Gerar o texto do Slack a partir das leituras do painel, com revisão humana.

Critério de pronto:

- Painel gera rascunho.
- Rascunho separa fato, leitura, hipótese e decisão.
- Humano aprova antes de enviar.

### Etapa 4. Operação diária

Objetivo:

> Transformar o painel em rotina.

Ritmo sugerido:

- Abertura do dia: status, meta, calendário e riscos.
- Meio do dia: heatmap e ações em andamento.
- Fechamento: resumo Slack, decisões e pendências.
- Semanal: leitura consolidada.

## Preparação para abrir no VS Code

Quando o template estiver aberto no VS Code, começar por:

1. Identificar stack e estrutura do projeto.
2. Definir onde ficam dados mockados e dados reais.
3. Criar componentes por visão, sem conectar tudo de uma vez.
4. Implementar primeiro `Status`, `Evolução` e `Heatmap Comercial`.
5. Validar visual local.
6. Só depois conectar Produto, Qualidade, Decisões e Slack.

Não iniciar back-end antes de fechar:

- formato da meta;
- fonte oficial de pedidos;
- regra de pedido pago;
- regra de item pago;
- lista oficial de brindes;
- formato do calendário comercial;
- regra de atualização diária.

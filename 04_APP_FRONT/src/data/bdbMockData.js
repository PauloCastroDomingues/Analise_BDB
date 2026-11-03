export const bdbData = {
  updatedAt: '05/10/2026 14:55',
  navigation: [
    ['status', 'Status'],
    ['evolucao', 'Evolucao'],
    ['heatmap', 'Heatmap'],
    ['produto', 'Produto'],
    ['canais', 'Canais'],
    ['growth', 'Growth'],
    ['decisoes', 'Decisoes'],
    ['metodologia', 'Metodo']
  ],
  kpis: [
    {
      label: 'Receita paga',
      value: 'R$ 1,84 mi',
      delta: '+12,4% vs meta',
      tone: 'positive',
      context: 'Acumulado da janela Black.'
    },
    {
      label: 'Pedidos pagos',
      value: '5.284',
      delta: '+8,1% vs plano',
      tone: 'positive',
      context: 'Pedidos validos, sem cancelados.'
    },
    {
      label: 'Ticket medio',
      value: 'R$ 348',
      delta: '-3,2% vs alvo',
      tone: 'risk',
      context: 'Pressao de cupom e mix.'
    },
    {
      label: 'Pace de meta',
      value: '71%',
      delta: 'D+18 de 30',
      tone: 'neutral',
      context: 'Meta acumulada ate hoje.'
    }
  ],
  pace: [
    { day: '01/11', receita: 62, meta: 55 },
    { day: '02/11', receita: 118, meta: 112 },
    { day: '03/11', receita: 181, meta: 171 },
    { day: '04/11', receita: 246, meta: 232 },
    { day: '05/11', receita: 326, meta: 299 },
    { day: '06/11', receita: 408, meta: 371 },
    { day: '07/11', receita: 502, meta: 448 },
    { day: '08/11', receita: 589, meta: 528 },
    { day: '09/11', receita: 675, meta: 612 },
    { day: '10/11', receita: 748, meta: 701 },
    { day: '11/11', receita: 836, meta: 795 },
    { day: '12/11', receita: 936, meta: 892 },
    { day: '13/11', receita: 1030, meta: 995 },
    { day: '14/11', receita: 1158, meta: 1108 },
    { day: '15/11', receita: 1284, meta: 1230 },
    { day: '16/11', receita: 1422, meta: 1365 },
    { day: '17/11', receita: 1628, meta: 1518 },
    { day: '18/11', receita: 1840, meta: 1636 }
  ],
  signals: [
    { label: 'Aceleracao', value: '+18% receita nas ultimas 24h', tone: 'positive' },
    { label: 'Atencao', value: 'Ticket caiu em horarios de cupom relampago', tone: 'warning' },
    { label: 'Risco', value: 'RS8 preto entra em cobertura critica se repetir ritmo', tone: 'risk' },
    { label: 'Oportunidade', value: 'CRM de base quente elevou pedidos sem derrubar ticket', tone: 'info' }
  ],
  heatmap: {
    hours: ['08h', '09h', '10h', '11h', '12h', '13h', '14h', '15h', '16h', '17h', '18h', '19h', '20h', '21h'],
    days: [
      {
        date: 'Seg 11',
        values: [18, 24, 29, 41, 30, 28, 46, 52, 61, 58, 72, 88, 94, 73],
        actions: [
          { hour: '09h', title: 'CRM base quente | tenis premium', result: '+18% pedidos', note: 'Pico de resposta apos disparo.' },
          { hour: '20h', title: 'Janela historica de pico', result: 'acao pendente', note: 'Preparar reforco antes do horario.' }
        ]
      },
      {
        date: 'Ter 12',
        values: [21, 27, 32, 43, 49, 34, 48, 66, 74, 69, 86, 96, 108, 91],
        actions: [
          { hour: '12h', title: 'Cupom relampago | 2 horas', result: '-7% ticket', note: 'Volume respondeu, mas ticket caiu.' }
        ]
      },
      {
        date: 'Qua 13',
        values: [28, 35, 40, 47, 72, 56, 58, 78, 85, 93, 110, 128, 142, 116],
        actions: [
          { hour: '15h', title: 'Prova social | modelos RS', result: '+11% receita', note: 'Maior resposta em RS6 e RS8.' }
        ]
      },
      {
        date: 'Qui 14',
        values: [31, 44, 53, 69, 88, 75, 91, 98, 114, 120, 138, 154, 169, 132],
        actions: []
      },
      {
        date: 'Sex 15',
        values: [52, 79, 92, 101, 138, 113, 142, 158, 181, 196, 218, 246, 270, 225],
        actions: [
          { hour: '18h', title: 'Reforco midia paga', result: '+22% receita', note: 'Crescimento concentrado em tenis.' }
        ]
      }
    ]
  },
  products: [
    { name: 'RS8 Preto', family: 'RS8', revenue: 318, share: 17 },
    { name: 'RS6 Cafe', family: 'RS6', revenue: 284, share: 15 },
    { name: '911 Couro', family: '911', revenue: 242, share: 13 },
    { name: 'Macan Off', family: 'Macan', revenue: 198, share: 11 },
    { name: 'Avant Preto', family: 'Avant', revenue: 174, share: 9 }
  ],
  quality: [
    { label: 'Pedidos 2+ itens', value: '28%', note: '+4 p.p. vs semana anterior' },
    { label: 'Itens pagos', value: '7.921', note: 'Nao inclui brindes oficiais' },
    { label: 'Brindes', value: '1.106', note: 'Separados do mix pago' },
    { label: 'Receita sem brindes', value: 'R$ 1,79 mi', note: 'Base para leitura de produto' }
  ],
  channels: [
    { canal: 'CRM', sessoes: 38240, pedidos: 1194, receita: 'R$ 418 mil', conv: '3,1%' },
    { canal: 'Pago Social', sessoes: 52780, pedidos: 1338, receita: 'R$ 462 mil', conv: '2,5%' },
    { canal: 'Direto', sessoes: 31890, pedidos: 1014, receita: 'R$ 366 mil', conv: '3,2%' },
    { canal: 'Organico', sessoes: 22410, pedidos: 612, receita: 'R$ 214 mil', conv: '2,7%' }
  ],
  stock: [
    { sku: 'RS8-PRETO-40', label: 'RS8 Preto 40', status: 'risco_critico', days: 1.8 },
    { sku: 'RS6-CAFE-41', label: 'RS6 Cafe 41', status: 'risco', days: 4.2 },
    { sku: '911-COURO-42', label: '911 Couro 42', status: 'ok', days: 8.6 },
    { sku: 'MACAN-OFF-39', label: 'Macan Off 39', status: 'ruptura', days: 0 }
  ],
  decisions: [
    { time: '09h40', owner: 'CRM', text: 'Repetir disparo de base quente sem cupom extra.', impact: 'Preserva ticket' },
    { time: '12h20', owner: 'Comercial', text: 'Limitar cupom relampago a cestas acima de R$ 399.', impact: 'Defende margem' },
    { time: '18h10', owner: 'Midia', text: 'Reforcar RS8 e pausar criativo com baixa conversao.', impact: 'Reduz dispersao' }
  ],
  slack: [
    'Black | 18/11',
    'Receita paga: R$ 1,84 mi | Pedidos: 5.284 | Ticket: R$ 348',
    'Pace: 71% da meta acumulada, +12,4% acima do plano do dia.',
    'Melhor janela: 19h-20h. Acao que mais respondeu: CRM base quente.',
    'Atencao: ticket cai quando o cupom relampago roda sem trava de cesta.',
    'Proxima decisao sugerida: reforcar RS8 antes do pico e validar estoque.'
  ].join('\n'),
  methodology: [
    { title: 'Pedido pago', text: 'Pedido valido, pago e nao cancelado.' },
    { title: 'Receita paga', text: 'Soma de pedidos validos. Brinde nao entra como venda paga.' },
    { title: 'Heatmap', text: 'Pedidos pagos por dia e hora em BRT, conectado ao calendario comercial.' },
    { title: 'Canais', text: 'Leitura separada ate validar atribuicao e localizacao da mart.' },
    { title: 'Produto', text: 'SKU e familia a partir de item pago. De-para oficial ainda precisa ser validado.' },
    { title: 'Missing', text: 'Dado ausente fica pendente. Nunca entra como zero.' }
  ]
};

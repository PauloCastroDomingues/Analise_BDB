const paths = {
  overview: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
  channels: '<path d="M4 4v16h16M8 14l4-5 4 3 5-7"/>',
  media: '<path d="M4 10h4l11-5v14l-11-5H4zM8 14l2 6h4l-2-5"/>',
  crm: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
  product: '<path d="m12 3 9 5v9l-9 5-9-5V8zM3 8l9 5 9-5M12 13v9M7 5.8l9 5"/>',
  stock: '<path d="M3 21V9l9-6 9 6v12M7 21V11h10v10M7 15h10M7 18h10"/>',
  actions: '<path d="m5 12 4 4 10-11M5 21h14"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v1"/>'
};

export const views = [
  { id: 'status', label: 'Visão geral', group: 'Acompanhamento', icon: 'overview', description: 'O ritmo das vendas, os principais sinais e as prioridades do período.' },
  { id: 'heatmap', label: 'Vendas por horário', group: 'Acompanhamento', icon: 'clock', description: 'Entenda em quais dias e horários os pedidos se concentram.' },
  { id: 'canais', label: 'Canais e conversão', group: 'Aquisição', icon: 'channels', description: 'Compare sessões, pedidos e receita atribuída por canal e origem.' },
  { id: 'growth', label: 'Mídia e investimento', group: 'Aquisição', icon: 'media', description: 'Acompanhe o investimento de marketing e os indicadores de retorno.' },
  { id: 'crm', label: 'CRM e campanhas', group: 'Aquisição', icon: 'crm', description: 'Acompanhe campanhas de WhatsApp e e-mail e os segmentos acionados.' },
  { id: 'produto', label: 'Produtos e mix', group: 'Operação', icon: 'product', description: 'Explore a composição das vendas e a qualidade da base de itens.' },
  { id: 'estoque', label: 'Estoque e risco', group: 'Operação', icon: 'stock', description: 'Identifique SKUs que exigem atenção antes de ampliar a exposição.' },
  { id: 'decisoes', label: 'Ações e resumo', group: 'Operação', icon: 'actions', description: 'Transforme os sinais do período em prioridades para o time.' },
  { id: 'metodologia', label: 'Fontes e metodologia', group: 'Referência', icon: 'info', description: 'Consulte as definições, os limites e a origem dos indicadores.' }
];

export function resolveView(hash) {
  const id = hash.replace(/^#/, '');
  return views.find((view) => view.id === id) || views[0];
}

export function setupSidebar() {
  const sidebar = document.querySelector('#sidebar');
  const toggle = document.querySelector('#sidebarToggle');
  const mobile = document.querySelector('#mobileMenu');
  const scrim = document.querySelector('#navScrim');
  const media = matchMedia('(max-width: 900px)');
  const apply = () => {
    const open = document.body.classList.contains('nav-open');
    const collapsed = document.body.classList.contains('sidebar-collapsed');
    scrim.hidden = !open || !media.matches;
    sidebar.inert = media.matches && !open;
    mobile.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-expanded', String(media.matches ? open : !collapsed));
    toggle.setAttribute('aria-label', media.matches ? 'Fechar navegação' : collapsed ? 'Expandir navegação' : 'Recolher navegação');
    toggle.firstElementChild.textContent = media.matches ? '×' : collapsed ? '›' : '‹';
  };
  document.body.classList.toggle('sidebar-collapsed', localStorage.getItem('bdbSidebarCollapsed') === '1');
  toggle.addEventListener('click', () => {
    if (media.matches) document.body.classList.remove('nav-open');
    else {
      document.body.classList.toggle('sidebar-collapsed');
      localStorage.setItem('bdbSidebarCollapsed', document.body.classList.contains('sidebar-collapsed') ? '1' : '0');
    }
    apply();
    if (media.matches) mobile.focus();
  });
  mobile.addEventListener('click', () => {
    document.body.classList.add('nav-open');
    apply();
    sidebar.querySelector('a[aria-current="page"]')?.focus();
  });
  scrim.addEventListener('click', () => { document.body.classList.remove('nav-open'); apply(); mobile.focus(); });
  document.addEventListener('keydown', (event) => {
    if (!media.matches || !document.body.classList.contains('nav-open')) return;
    if (event.key === 'Escape') { document.body.classList.remove('nav-open'); apply(); mobile.focus(); }
    if (event.key === 'Tab') {
      const controls = [...sidebar.querySelectorAll('a[href],button')].filter((node) => node.offsetParent !== null);
      const first = controls[0]; const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  document.addEventListener('bdb:viewchange', apply);
  media.addEventListener('change', () => { document.body.classList.remove('nav-open'); apply(); });
  apply();
}

export function setupNavigation() {
  const nav = document.querySelector('#sideNav');
  let group = '';
  nav.innerHTML = views.map((view) => {
    const heading = group !== view.group ? `<span class="nav-group-label">${view.group}</span>` : '';
    group = view.group;
    return `${heading}<a href="#${view.id}" title="${view.label}" aria-label="${view.label}"><span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${paths[view.icon]}</svg></span><span class="nav-label">${view.label}</span><span class="nav-active-dot" aria-hidden="true"></span></a>`;
  }).join('');

  function show(hash, focus = false) {
    const view = resolveView(hash);
    document.querySelectorAll('.view').forEach((section) => { section.hidden = section.id !== view.id; });
    nav.querySelectorAll('a').forEach((link) => {
      const active = link.hash === `#${view.id}`;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
    document.querySelector('#viewTitle').textContent = view.label;
    document.querySelector('#viewDescription').textContent = view.description;
    document.querySelector('#breadcrumbLabel').textContent = view.label;
    document.title = `${view.label} · Black BDB · Reise`;
    document.body.classList.remove('nav-open');
    document.dispatchEvent(new Event('bdb:viewchange'));
    if (focus) { document.querySelector('#viewTitle').focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }
  }
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || !views.some((view) => `#${view.id}` === link.hash)) return;
    event.preventDefault();
    history.pushState(null, '', link.hash);
    show(link.hash, true);
  });
  window.addEventListener('hashchange', () => show(location.hash, true));
  document.addEventListener('click', (event) => {
    document.querySelectorAll('.compare-control[open],.health-details[open]').forEach((details) => { if (!details.contains(event.target)) details.open = false; });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('.compare-control[open],.health-details[open]').forEach((details) => { details.open = false; details.querySelector('summary').focus(); });
  });
  show(location.hash);
}

export function setupHeatmapKeyboard() {
  const grid = document.querySelector('#heatmapGrid');
  grid.addEventListener('keydown', (event) => {
    const cell = event.target.closest('.heat-cell');
    if (!cell || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const day = Number(cell.dataset.day); const hour = Number(cell.dataset.hour);
    const nextDay = day + (event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0);
    const nextHour = event.key === 'Home' ? 0 : event.key === 'End' ? 23 : hour + (event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0);
    const next = grid.querySelector(`[data-day="${nextDay}"][data-hour="${nextHour}"]:not(:disabled)`);
    if (next) { next.click(); next.focus(); }
  });
}

export function isFutureHeatmapCell(isoDate, hour, now = new Date()) {
  if (!isoDate) return false;
  const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  const today = `${get('year')}-${get('month')}-${get('day')}`;
  return isoDate > today || (isoDate === today && hour > Number(get('hour')));
}

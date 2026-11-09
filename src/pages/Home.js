// ============================================
//   Money Tree — Home Page
// ============================================

import '../styles/home.css';
import { navigate } from '../router.js';

// Dados dos módulos do sistema
const MODULES = [
  {
    id: 'dashboard',
    label: 'Módulo 01',
    icon: '📊',
    name: 'Dashboard',
    desc: 'Visão geral do mês, saldo disponível e resumo de gastos em tempo real.',
    route: '/dashboard',
    active: true,
  },
  {
    id: 'gastos',
    label: 'Módulo 02',
    icon: '💸',
    name: 'Gastos',
    desc: 'Histórico de transações, categorias e integração com notificações Nubank.',
    route: '/gastos',
    active: false,
  },
  {
  id: 'cartao',
  label: 'Módulo 03',
  icon: '💳',
  name: 'Cartão de Crédito',
  desc: 'Cartões, compras parceladas, faturas e conciliação com o CSV do banco.',
  route: '/cartao',
  active: true,   
  },
  {
    id: 'investimentos',
    label: 'Módulo 04',
    icon: '📈',
    name: 'Investimentos',
    desc: 'Acompanhe sua carteira, aportes mensais e crescimento do patrimônio.',
    route: '/investimentos',
    active: true,
  },
];

// Estatísticas exibidas no rodapé (serão dinâmicas no futuro)
const STATS = {
  modulos: MODULES.length,
  transacoes: 0,
};

// ---- Builders de HTML ---- //

function buildTopBar() {
  return `
    <div class="home-topbar">
      <span class="version-tag">v0.1.0 — alpha</span>
      <div class="status-indicator">
        <div class="status-dot"></div>
        sistema offline
      </div>
    </div>
  `;
}

function buildHero() {
  return `
    <div class="home-hero">
      <div class="hero-tree" aria-hidden="true">🌳</div>

      <h1 class="hero-logo">
        Money <em>Tree</em>
      </h1>

      <p class="hero-tagline">Controle financeiro pessoal</p>
      <div class="hero-divider" aria-hidden="true"></div>

      <p class="hero-subtitle">
        Faça seu dinheiro crescer com clareza, intenção e raízes profundas.
      </p>
    </div>
  `;
}

function buildModuleCard(module) {
  const inactiveClass = module.active ? '' : 'inactive';
  const badge         = module.active ? '' : '<span class="module-badge">em breve</span>';

  return `
    <div
      class="module-card ${inactiveClass}"
      data-route="${module.route}"
      role="${module.active ? 'button' : 'presentation'}"
      tabindex="${module.active ? '0' : '-1'}"
      aria-label="${module.active ? `Ir para ${module.name}` : `${module.name} — em breve`}"
    >
      ${badge}
      <div class="module-icon" aria-hidden="true">${module.icon}</div>
      <div class="module-label">${module.label}</div>
      <div class="module-name">${module.name}</div>
      <p class="module-desc">${module.desc}</p>
    </div>
  `;
}

function buildModulesGrid() {
  const cards = MODULES.map(buildModuleCard).join('');
  return `<div class="modules-grid">${cards}</div>`;
}

function buildCTA() {
  return `
    <div class="cta-area">
      <button class="btn-primary" id="btn-dashboard">
        Acessar Dashboard →
      </button>
      <button class="btn-link" id="btn-nubank">
        Configurar integração Nubank
      </button>
    </div>
  `;
}

function buildBottomBar() {
  return `
    <div class="home-bottombar">
      <div class="stat-item">
        <span class="stat-num">${STATS.modulos}</span>
        <span class="stat-label">módulos</span>
      </div>

      <div class="nubank-badge" aria-label="Integração com Nubank pendente">
        <div class="nubank-icon" aria-hidden="true">N</div>
        <span>Integração Nubank — pendente</span>
      </div>

      <div class="stat-item">
        <span class="stat-num">${STATS.transacoes}</span>
        <span class="stat-label">transações</span>
      </div>
    </div>
  `;
}

// ---- Event Listeners ---- //

function attachEvents(container) {
  // Clique nos cards de módulo ativos
  container.querySelectorAll('.module-card:not(.inactive)').forEach((card) => {
    const route = card.dataset.route;

    card.addEventListener('click', () => navigate(route));

    // Acessibilidade: Enter e Space ativam o card
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        navigate(route);
      }
    });
  });

  // Botão principal
  container.querySelector('#btn-dashboard')?.addEventListener('click', () => {
    navigate('/dashboard');
  });

  // Botão de configuração Nubank (placeholder)
  container.querySelector('#btn-nubank')?.addEventListener('click', () => {
    alert('Integração Nubank em desenvolvimento. Em breve será possível conectar via webhook.');
  });
}

// ---- Render ---- //

/**
 * Renderiza a página Home dentro do elemento #app.
 * @param {HTMLElement} container - o elemento #app
 */
export function renderHome(container) {
  // Fundo e grid
  const bgPattern  = document.createElement('div');
  bgPattern.className = 'home-bg-pattern';

  const gridLines  = document.createElement('div');
  gridLines.className = 'home-grid-lines';

  // Container principal
  const main = document.createElement('main');
  main.className = 'home-container';
  main.setAttribute('aria-label', 'Money Tree — tela inicial');

  main.innerHTML = `
    ${buildTopBar()}
    ${buildHero()}
    ${buildModulesGrid()}
    ${buildCTA()}
  `;

  // Rodapé fixo
  const bottomBar = document.createElement('footer');
  bottomBar.innerHTML = buildBottomBar();

  // Monta tudo no #app
  container.appendChild(bgPattern);
  container.appendChild(gridLines);
  container.appendChild(main);
  container.appendChild(bottomBar.firstElementChild);

  // Eventos
  attachEvents(container);
}
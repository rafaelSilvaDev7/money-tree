// ============================================
//   Money Tree — Router
//   Simple hash-based client-side navigation
// ============================================

import { renderHome }          from './pages/Home.js';
import { renderInvestimentos } from './pages/Investimentos.js';
// Futuras páginas serão importadas aqui:
// import { renderDashboard }     from './pages/Dashboard.js';
// import { renderGastos }        from './pages/Gastos.js';
// import { renderParcelamentos } from './pages/Parcelamentos.js';

const routes = {
  '/':                renderHome,
  '/home':            renderHome,
  '/investimentos':   renderInvestimentos,
  // '/dashboard':    renderDashboard,
  // '/gastos':       renderGastos,
  // '/parcelamentos': renderParcelamentos,
};

/**
 * Navega para uma rota sem recarregar a página.
 * @param {string} path - ex: '/investimentos'
 */
export function navigate(path) {
  window.history.pushState({}, '', path);
  render();
}

/**
 * Lê a rota atual e renderiza a página correspondente.
 */
function render() {
  const path = window.location.pathname;
  const app  = document.getElementById('app');

  const renderFn = routes[path] ?? routes['/'];
  app.innerHTML  = '';
  renderFn(app);
}

/**
 * Inicializa o roteador: renderiza a rota atual e escuta
 * o botão Voltar/Avançar do navegador.
 */
export function initRouter() {
  window.addEventListener('popstate', render);
  render();
}
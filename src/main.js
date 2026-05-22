// ============================================
//   Money Tree — Entry Point
// ============================================

import './styles/global.css';
import { initRouter } from './router.js';

// Inicializa o roteador quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  initRouter();
});

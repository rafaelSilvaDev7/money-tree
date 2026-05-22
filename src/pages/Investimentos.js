// ============================================
//   Money Tree — Investimentos Page
// ============================================

import '../styles/investimentos.css';
import { navigate } from '../router.js';
import {
  getInvestments,
  upsertInvestment,
  removeInvestment,
  getTotalInvested,
} from '../services/storage.js';

// ---- Configuração de tipos ---- //

const TIPOS = {
  'renda-fixa': { label: 'Renda Fixa',  icon: '🏦', cssClass: 'type-renda-fixa' },
  'fii':        { label: 'FIIs',         icon: '🏢', cssClass: 'type-fii'        },
  'cripto':     { label: 'Cripto',       icon: '₿',  cssClass: 'type-cripto'     },
  'poupanca':   { label: 'Poupança',     icon: '🐷', cssClass: 'type-poupanca'   },
  'outros':     { label: 'Outros',       icon: '📦', cssClass: 'type-outros'     },
};

// ---- Estado local da página ---- //
let state = {
  filter:       'todos',
  modalOpen:    false,
  editingId:    null,    // null = novo, string = editando
};

// ---- Helpers financeiros ---- //

/**
 * Formata número como moeda BRL.
 */
function formatBRL(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Calcula rendimento estimado anual de um investimento.
 * Taxas aproximadas por tipo (simplificado — futuro: editável pelo usuário).
 */
const TAXAS_ANUAIS = {
  'renda-fixa': 0.1175, // ~CDI 2025
  'fii':        0.08,
  'cripto':     0.0,    // muito volátil — sem estimativa automática
  'poupanca':   0.0674,
  'outros':     0.07,
};

function calcRendimentoMensal(amount, tipo) {
  const taxa = TAXAS_ANUAIS[tipo] ?? 0.07;
  return amount * (taxa / 12);
}

function calcRendimentoTotal(investments) {
  return investments.reduce((sum, inv) => {
    return sum + calcRendimentoMensal(inv.amount, inv.tipo);
  }, 0);
}

/**
 * Gera dados dos últimos 6 meses para o mini gráfico.
 * Como não temos histórico real ainda, simula crescimento mensal.
 */
function gerarEvolucao(investments) {
  const total = getTotalInvested();
  const meses = [];
  const hoje  = new Date();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    const label = d.toLocaleString('pt-BR', { month: 'short' });

    // Simula crescimento mensal (quando tivermos histórico real, trocar aqui)
    const fator  = 1 - i * 0.012;
    const valor  = total * Math.max(fator, 0.85);

    meses.push({ label, valor });
  }

  return meses;
}

// ---- Builders de HTML ---- //

function buildTopbar() {
  return `
    <div class="inv-topbar">
      <div class="inv-nav-left">
        <button class="btn-back" id="btn-back">← Home</button>
        <h1 class="inv-page-title">Money <em>Tree</em> — Investimentos</h1>
      </div>
      <button class="btn-add" id="btn-open-modal">+ Novo investimento</button>
    </div>
  `;
}

function buildSummaryCards(investments) {
  const total      = getTotalInvested();
  const rendimento = calcRendimentoTotal(investments);
  const qtd        = investments.length;

  return `
    <div class="inv-summary-grid">
      <div class="summary-card">
        <div class="summary-label">Total investido</div>
        <div class="summary-value">${formatBRL(total)}</div>
        <div class="summary-sub">${qtd} ativo${qtd !== 1 ? 's' : ''} cadastrado${qtd !== 1 ? 's' : ''}</div>
      </div>

      <div class="summary-card highlight">
        <div class="summary-label">Rendimento est. mensal</div>
        <div class="summary-value">${formatBRL(rendimento)}</div>
        <div class="summary-sub">baseado nas taxas por categoria</div>
      </div>

      <div class="summary-card">
        <div class="summary-label">Rendimento est. anual</div>
        <div class="summary-value">${formatBRL(rendimento * 12)}</div>
        <div class="summary-sub">projeção dos próximos 12 meses</div>
      </div>
    </div>
  `;
}

function buildEvolutionChart(investments) {
  const dados = gerarEvolucao(investments);

  if (getTotalInvested() === 0) return '';

  const maxValor = Math.max(...dados.map((d) => d.valor));
  const W = 880;
  const H = 100;
  const padL = 10, padR = 10, padT = 10, padB = 20;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  // Pontos da linha
  const points = dados.map((d, i) => {
    const x = padL + (i / (dados.length - 1)) * innerW;
    const y = padT + innerH - (d.valor / maxValor) * innerH;
    return { x, y, label: d.label, valor: d.valor };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');

  // Área preenchida
  const areaPoints = [
    `${points[0].x},${padT + innerH}`,
    ...points.map((p) => `${p.x},${p.y}`),
    `${points[points.length - 1].x},${padT + innerH}`,
  ].join(' ');

  const labels = points
    .map(
      (p) => `
        <text x="${p.x}" y="${H - 4}" text-anchor="middle"
              font-family="'DM Mono', monospace" font-size="9"
              fill="rgba(120,170,70,0.45)" letter-spacing="0.1em">
          ${p.label}
        </text>
      `
    )
    .join('');

  const dots = points
    .map(
      (p, i) =>
        i === points.length - 1
          ? `<circle cx="${p.x}" cy="${p.y}" r="3" fill="#8fcc5c"/>`
          : ''
    )
    .join('');

  return `
    <div class="inv-evolution">
      <div class="section-header">
        <span class="section-title">Evolução dos últimos 6 meses</span>
        <div class="section-legend">
          <div class="legend-item">
            <div class="legend-dot total"></div>
            <span>Total investido</span>
          </div>
        </div>
      </div>
      <div class="chart-area">
        <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stop-color="#8fcc5c" stop-opacity="0.15"/>
              <stop offset="100%" stop-color="#8fcc5c" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <polygon points="${areaPoints}" fill="url(#chartGrad)"/>
          <polyline points="${polyline}" fill="none"
                    stroke="#8fcc5c" stroke-width="1.5"
                    stroke-linecap="round" stroke-linejoin="round"/>
          ${dots}
          ${labels}
        </svg>
      </div>
    </div>
  `;
}

function buildFilters(investments) {
  const tiposUsados = [...new Set(investments.map((i) => i.tipo))];

  const btns = [
    `<button class="filter-btn ${state.filter === 'todos' ? 'active' : ''}" data-filter="todos">Todos</button>`,
    ...tiposUsados.map(
      (tipo) => `
        <button class="filter-btn ${state.filter === tipo ? 'active' : ''}" data-filter="${tipo}">
          ${TIPOS[tipo]?.label ?? tipo}
        </button>
      `
    ),
  ].join('');

  return `<div class="inv-filters">${btns}</div>`;
}

function buildInvItem(inv) {
  const tipo        = TIPOS[inv.tipo] ?? TIPOS['outros'];
  const rendimento  = calcRendimentoMensal(inv.amount, inv.tipo);
  const taxaLabel   = inv.tipo === 'cripto' ? 'volátil' : `+${formatBRL(rendimento)}/mês`;

  return `
    <div class="inv-item" data-id="${inv.id}">
      <div class="inv-type-icon ${tipo.cssClass}">${tipo.icon}</div>

      <div class="inv-info">
        <div class="inv-name">${inv.name}</div>
        <div class="inv-meta">${tipo.label} ${inv.instituicao ? '· ' + inv.instituicao : ''}</div>
      </div>

      <div class="inv-rendimento">
        <div class="inv-rendimento-value">${taxaLabel}</div>
        <div class="inv-rendimento-label">rendimento est.</div>
      </div>

      <div class="inv-amount">
        <div class="inv-amount-value">${formatBRL(inv.amount)}</div>
        <div class="inv-amount-label">investido</div>
      </div>

      <div class="inv-actions">
        <button class="btn-icon btn-edit" data-id="${inv.id}" title="Editar">✎</button>
        <button class="btn-icon danger btn-delete" data-id="${inv.id}" title="Remover">✕</button>
      </div>
    </div>
  `;
}

function buildInvList(investments) {
  const filtered = state.filter === 'todos'
    ? investments
    : investments.filter((i) => i.tipo === state.filter);

  if (filtered.length === 0) {
    return `
      <div class="inv-empty">
        <div class="inv-empty-icon">🌱</div>
        <div class="inv-empty-text">Nenhum investimento cadastrado ainda</div>
      </div>
    `;
  }

  return `<div class="inv-list">${filtered.map(buildInvItem).join('')}</div>`;
}

function buildModal(editData = null) {
  const isEdit = !!editData;
  const v      = editData ?? {};

  const tipoOptions = Object.entries(TIPOS)
    .map(([key, t]) => `
      <option value="${key}" ${v.tipo === key ? 'selected' : ''}>${t.label}</option>
    `)
    .join('');

  return `
    <div class="modal-overlay ${state.modalOpen ? 'open' : ''}" id="modal-overlay">
      <div class="modal" role="dialog" aria-modal="true" aria-label="Cadastrar investimento">
        <div class="modal-header">
          <h2 class="modal-title">${isEdit ? 'Editar' : 'Novo'} <em>investimento</em></h2>
          <button class="btn-close" id="btn-modal-close" aria-label="Fechar">✕</button>
        </div>

        <input type="hidden" id="field-id" value="${v.id ?? ''}"/>

        <div class="form-group">
          <label class="form-label" for="field-name">Nome do investimento</label>
          <input class="form-input" id="field-name" type="text"
                 placeholder="ex: CDB Nubank 115% CDI"
                 value="${v.name ?? ''}"/>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="field-tipo">Tipo</label>
            <select class="form-select" id="field-tipo">
              ${tipoOptions}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="field-amount">Valor investido (R$)</label>
            <input class="form-input" id="field-amount" type="number"
                   placeholder="0,00" step="0.01" min="0"
                   value="${v.amount ?? ''}"/>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="field-instituicao">Instituição (opcional)</label>
          <input class="form-input" id="field-instituicao" type="text"
                 placeholder="ex: Nubank, XP, Binance..."
                 value="${v.instituicao ?? ''}"/>
        </div>

        <div class="form-actions">
          <button class="btn-cancel" id="btn-modal-cancel">Cancelar</button>
          <button class="btn-save" id="btn-modal-save">
            ${isEdit ? 'Salvar alterações' : 'Cadastrar'} →
          </button>
        </div>
      </div>
    </div>
  `;
}

// ---- Render principal ---- //

function renderPage(container) {
  const investments = getInvestments();

  const editData = state.editingId
    ? investments.find((i) => i.id === state.editingId) ?? null
    : null;

  container.innerHTML = `
    <div class="inv-bg"></div>
    <div class="inv-grid"></div>

    <div class="inv-page">
      ${buildTopbar()}

      <div class="inv-content">
        ${buildSummaryCards(investments)}
        ${buildEvolutionChart(investments)}
        ${investments.length > 0 ? buildFilters(investments) : ''}
        ${buildInvList(investments)}
      </div>
    </div>

    ${buildModal(editData)}
  `;

  attachEvents(container);
}

// ---- Events ---- //

function attachEvents(container) {
  // Voltar para home
  container.querySelector('#btn-back')?.addEventListener('click', () => navigate('/'));

  // Abrir modal (novo)
  container.querySelector('#btn-open-modal')?.addEventListener('click', () => {
    state.modalOpen = true;
    state.editingId = null;
    renderPage(container);
  });

  // Fechar modal
  const closeModal = () => {
    state.modalOpen = false;
    state.editingId = null;
    renderPage(container);
  };

  container.querySelector('#btn-modal-close')?.addEventListener('click', closeModal);
  container.querySelector('#btn-modal-cancel')?.addEventListener('click', closeModal);

  // Fechar ao clicar no overlay
  container.querySelector('#modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') closeModal();
  });

  // Salvar investimento
  container.querySelector('#btn-modal-save')?.addEventListener('click', () => {
    const name       = container.querySelector('#field-name')?.value.trim();
    const tipo       = container.querySelector('#field-tipo')?.value;
    const amount     = parseFloat(container.querySelector('#field-amount')?.value);
    const instituicao = container.querySelector('#field-instituicao')?.value.trim();
    const id         = container.querySelector('#field-id')?.value;

    if (!name || !tipo || isNaN(amount) || amount <= 0) {
      alert('Preencha nome, tipo e valor corretamente.');
      return;
    }

    upsertInvestment({ id: id || undefined, name, tipo, amount, instituicao });

    state.modalOpen = false;
    state.editingId = null;
    renderPage(container);
  });

  // Filtros
  container.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.filter = btn.dataset.filter;
      renderPage(container);
    });
  });

  // Editar
  container.querySelectorAll('.btn-edit').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.editingId = btn.dataset.id;
      state.modalOpen = true;
      renderPage(container);
    });
  });

  // Deletar
  container.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (confirm('Remover este investimento?')) {
        removeInvestment(btn.dataset.id);
        renderPage(container);
      }
    });
  });
}

// ---- Export ---- //

/**
 * Renderiza a página de Investimentos dentro do #app.
 * @param {HTMLElement} container
 */
export function renderInvestimentos(container) {
  state = { filter: 'todos', modalOpen: false, editingId: null };
  renderPage(container);
}
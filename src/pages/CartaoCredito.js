// ============================================
//   Money Tree — Cartão de Crédito
//   Passo 2: cadastro de cartões
// ============================================

import '../styles/investimentos.css'; // reaproveita topbar, modal e formulário
import '../styles/cartao.css';
import { navigate } from '../router.js';
import {
  listCartoes,
  getCartao,
  salvarCartao,
  alternarStatusCartao,
  excluirCartao,
  reaisParaCentavos,
  centavosParaReais,
} from '../services/cartoes.js';

// ---- Estado da página ---- //
let state = {
  modalOpen: false,
  editingId: null, // null = novo cartão
};

// ---- Helpers ---- //

function formatBRL(centavos) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(centavosParaReais(centavos));
}

/**
 * Escapa texto digitado pelo usuário antes de colocar no HTML.
 * Sem isso, um nome como <script>... poderia executar código.
 */
function esc(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---- Builders de HTML ---- //

function buildTopbar() {
  return `
    <div class="inv-topbar">
      <div class="inv-nav-left">
        <button class="btn-back" id="btn-back">← Home</button>
        <h1 class="inv-page-title">Money <em>Tree</em> — Cartão de Crédito</h1>
      </div>
        <div style="display:flex; gap:12px;">
        <button class="btn-back" id="btn-compras">Compras →</button>
        <button class="btn-add" id="btn-open-modal">+ Novo cartão</button>
      </div>
    </div>
  `;
}

function buildSummary(cartoes) {
  const ativos      = cartoes.filter((c) => c.ativo);
  const limiteTotal = ativos.reduce((soma, c) => soma + c.limiteCentavos, 0);

  return `
    <div class="inv-summary-grid" style="grid-template-columns: repeat(2, 1fr);">
      <div class="summary-card">
        <div class="summary-label">Cartões ativos</div>
        <div class="summary-value">${ativos.length}</div>
        <div class="summary-sub">${cartoes.length} cadastrado${cartoes.length !== 1 ? 's' : ''} no total</div>
      </div>
      <div class="summary-card highlight">
        <div class="summary-label">Limite total (ativos)</div>
        <div class="summary-value">${formatBRL(limiteTotal)}</div>
        <div class="summary-sub">soma dos limites dos cartões ativos</div>
      </div>
    </div>
  `;
}

function buildCartao(c) {
  const statusClass = c.ativo ? '' : 'inativo';

  return `
    <div class="cartao-card ${statusClass}">
      <div class="cartao-topo">
        <div>
          <div class="cartao-nome">${esc(c.nome)}</div>
          <div class="cartao-instituicao">${esc(c.instituicao)}</div>
        </div>
        <span class="cartao-status ${statusClass}">${c.ativo ? 'ativo' : 'inativo'}</span>
      </div>

      <div>
        <div class="cartao-limite-label">Limite</div>
        <div class="cartao-limite-valor">${formatBRL(c.limiteCentavos)}</div>
      </div>

      <div class="cartao-datas">
        <div>
          <div class="cartao-data-label">Fecha dia</div>
          <div class="cartao-data-valor">${c.diaFechamento}</div>
        </div>
        <div>
          <div class="cartao-data-label">Vence dia</div>
          <div class="cartao-data-valor">${c.diaVencimento}</div>
        </div>
      </div>

      <div class="cartao-acoes">
        <button class="btn-icon btn-edit"   data-id="${c.id}" title="Editar">✎</button>
        <button class="btn-icon btn-toggle" data-id="${c.id}" title="${c.ativo ? 'Inativar' : 'Ativar'}">${c.ativo ? '⏸' : '▶'}</button>
        <button class="btn-icon danger btn-delete" data-id="${c.id}" title="Excluir">✕</button>
      </div>
    </div>
  `;
}

function buildLista(cartoes) {
  if (cartoes.length === 0) {
    return `
      <div class="inv-empty">
        <div class="inv-empty-icon">💳</div>
        <div class="inv-empty-text">Nenhum cartão cadastrado ainda</div>
      </div>
    `;
  }
  return `<div class="cartoes-grid">${cartoes.map(buildCartao).join('')}</div>`;
}

function buildModal(editData) {
  const isEdit = !!editData;
  const v      = editData ?? { ativo: true };
  const limite = v.limiteCentavos ? centavosParaReais(v.limiteCentavos) : '';

  return `
    <div class="modal-overlay ${state.modalOpen ? 'open' : ''}" id="modal-overlay">
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h2 class="modal-title">${isEdit ? 'Editar' : 'Novo'} <em>cartão</em></h2>
          <button class="btn-close" id="btn-modal-close">✕</button>
        </div>

        <input type="hidden" id="field-id" value="${esc(v.id ?? '')}"/>

        <div class="form-group">
          <label class="form-label" for="field-nome">Nome do cartão</label>
          <input class="form-input" id="field-nome" type="text"
                 placeholder="ex: Nubank Roxinho" value="${esc(v.nome ?? '')}"/>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="field-instituicao">Instituição</label>
            <input class="form-input" id="field-instituicao" type="text"
                   placeholder="ex: Nubank" value="${esc(v.instituicao ?? '')}"/>
          </div>
          <div class="form-group">
            <label class="form-label" for="field-limite">Limite total (R$)</label>
            <input class="form-input" id="field-limite" type="number"
                   placeholder="0,00" step="0.01" min="0" value="${limite}"/>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="field-fechamento">Dia de fechamento</label>
            <input class="form-input" id="field-fechamento" type="number"
                   placeholder="1 a 31" min="1" max="31" value="${v.diaFechamento ?? ''}"/>
          </div>
          <div class="form-group">
            <label class="form-label" for="field-vencimento">Dia de vencimento</label>
            <input class="form-input" id="field-vencimento" type="number"
                   placeholder="1 a 31" min="1" max="31" value="${v.diaVencimento ?? ''}"/>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="field-ativo">Status</label>
          <select class="form-select" id="field-ativo">
            <option value="true"  ${v.ativo !== false ? 'selected' : ''}>Ativo</option>
            <option value="false" ${v.ativo === false ? 'selected' : ''}>Inativo</option>
          </select>
          <div class="form-hint">Cartões inativos não aparecem ao cadastrar novas compras.</div>
        </div>

        <div class="form-erros" id="form-erros"></div>

        <div class="form-actions">
          <button class="btn-cancel" id="btn-modal-cancel">Cancelar</button>
          <button class="btn-save"   id="btn-modal-save">${isEdit ? 'Salvar alterações' : 'Cadastrar'} →</button>
        </div>
      </div>
    </div>
  `;
}

// ---- Render ---- //

function renderPage(container) {
  const cartoes  = listCartoes();
  const editData = state.editingId ? getCartao(state.editingId) : null;

  container.innerHTML = `
    <div class="inv-bg"></div>
    <div class="inv-grid"></div>
    <div class="inv-page">
      ${buildTopbar()}
      <div class="inv-content">
        ${buildSummary(cartoes)}
        ${buildLista(cartoes)}
      </div>
    </div>
    ${buildModal(editData)}
  `;

  attachEvents(container);
}

// ---- Eventos ---- //

function attachEvents(container) {
  const closeModal = () => {
    state.modalOpen = false;
    state.editingId = null;
    renderPage(container);
  };

  container.querySelector('#btn-back')?.addEventListener('click', () => navigate('/'));
  container.querySelector('#btn-compras')?.addEventListener('click', () => navigate('/cartao/compras'));

  container.querySelector('#btn-open-modal')?.addEventListener('click', () => {
    state.modalOpen = true;
    state.editingId = null;
    renderPage(container);
  });

  container.querySelector('#btn-modal-close')?.addEventListener('click', closeModal);
  container.querySelector('#btn-modal-cancel')?.addEventListener('click', closeModal);
  container.querySelector('#modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') closeModal();
  });

  // Salvar (novo ou edição)
  container.querySelector('#btn-modal-save')?.addEventListener('click', () => {
    const get = (id) => container.querySelector(`#${id}`)?.value ?? '';

    const resultado = salvarCartao({
      id:             get('field-id') || undefined,
      nome:           get('field-nome'),
      instituicao:    get('field-instituicao'),
      limiteCentavos: reaisParaCentavos(get('field-limite')),
      diaFechamento:  parseInt(get('field-fechamento'), 10),
      diaVencimento:  parseInt(get('field-vencimento'), 10),
      ativo:          get('field-ativo') === 'true',
    });

    if (!resultado.ok) {
      // Mostra os erros dentro do modal, sem perder o que foi digitado
      const box = container.querySelector('#form-erros');
      box.innerHTML = resultado.erros.map((e) => `• ${esc(e)}`).join('<br>');
      box.classList.add('visivel');
      return;
    }

    closeModal();
  });

  // Editar
  container.querySelectorAll('.btn-edit').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.editingId = btn.dataset.id;
      state.modalOpen = true;
      renderPage(container);
    });
  });

  // Ativar / inativar
  container.querySelectorAll('.btn-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      alternarStatusCartao(btn.dataset.id);
      renderPage(container);
    });
  });

  // Excluir (com confirmação e checagem de integridade)
  container.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!confirm('Excluir este cartão? Essa ação não pode ser desfeita.')) return;

      const resultado = excluirCartao(btn.dataset.id);
      if (!resultado.ok) {
        alert(resultado.motivo);
        return;
      }
      renderPage(container);
    });
  });
}

// ---- Export ---- //

/**
 * Renderiza a página de Cartão de Crédito dentro do #app.
 * @param {HTMLElement} container
 */
export function renderCartaoCredito(container) {
  state = { modalOpen: false, editingId: null };
  renderPage(container);
}

// ============================================
//   Money Tree — Compras do Cartão
//   Passo 3: compras à vista e parceladas
// ============================================

import '../styles/investimentos.css'; // topbar, modal e formulário
import '../styles/cartao.css';
import { navigate } from '../router.js';
import {
  listCartoes,
  listCartoesAtivos,
  getCartao,
  reaisParaCentavos,
  centavosParaReais,
} from '../services/cartoes.js';
import { listCompras, listParcelas, criarCompra, excluirCompra } from '../services/compras.js';
import {
  gerarParcelas,
  dataFechamento,
  dataVencimento,
  dataValida,
  formatarRef,
  formatarDataBR,
} from '../services/faturas.js';

// ---- Estado ---- //
let state = { modalOpen: false };

// ---- Helpers ---- //

function formatBRL(centavos) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(centavosParaReais(centavos));
}

function esc(texto) {
  return String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Data de hoje como "AAAA-MM-DD" no fuso local (sem usar toISOString, que é UTC). */
function hojeISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

// ---- Builders ---- //

function buildTopbar() {
  return `
    <div class="inv-topbar">
      <div class="inv-nav-left">
        <button class="btn-back" id="btn-back">← Cartões</button>
        <h1 class="inv-page-title">Money <em>Tree</em> — Compras</h1>
      </div>
      <button class="btn-add" id="btn-open-modal">+ Nova compra</button>
    </div>
  `;
}

function buildSummary(compras) {
  const total = compras.reduce((soma, c) => soma + c.valorTotalCentavos, 0);
  return `
    <div class="inv-summary-grid" style="grid-template-columns: repeat(2, 1fr);">
      <div class="summary-card">
        <div class="summary-label">Compras cadastradas</div>
        <div class="summary-value">${compras.length}</div>
        <div class="summary-sub">à vista e parceladas</div>
      </div>
      <div class="summary-card highlight">
        <div class="summary-label">Soma das compras</div>
        <div class="summary-value">${formatBRL(total)}</div>
        <div class="summary-sub">valor total, antes de dividir em parcelas</div>
      </div>
    </div>
  `;
}

function buildCompra(compra, parcelas, nomeCartao) {
  const ultima = parcelas[parcelas.length - 1];
  const badge  = compra.tipo === 'vista'
    ? 'À vista'
    : `${compra.numParcelas}x de ${formatBRL(ultima.valorCentavos)}`;

  const linhas = parcelas.map((p) => `
    <div class="parcela-linha">
      <span>${p.numero}/${p.totalParcelas}</span>
      <span>Fatura ${formatarRef(p.faturaRef)}</span>
      <span class="parcela-valor">${formatBRL(p.valorCentavos)}</span>
    </div>
  `).join('');

  return `
    <details class="compra-item">
      <summary class="compra-resumo">
        <div>
          <div class="compra-nome">${esc(compra.descricao)}</div>
          <div class="compra-meta">${esc(nomeCartao)} · ${formatarDataBR(compra.dataCompra)} · 1ª fatura ${formatarRef(parcelas[0].faturaRef)}</div>
        </div>
        <span class="compra-badge ${compra.tipo}">${badge}</span>
        <div class="compra-valor">${formatBRL(compra.valorTotalCentavos)}</div>
        <button class="btn-icon danger btn-delete" data-id="${compra.id}" title="Excluir">✕</button>
      </summary>
      <div class="compra-parcelas">${linhas}</div>
    </details>
  `;
}

function buildLista(compras) {
  if (compras.length === 0) {
    return `
      <div class="inv-empty">
        <div class="inv-empty-icon">🛒</div>
        <div class="inv-empty-text">Nenhuma compra cadastrada ainda</div>
      </div>
    `;
  }

  const nomes = Object.fromEntries(listCartoes().map((c) => [c.id, c.nome]));
  const itens = compras
    .map((c) => buildCompra(c, listParcelas(c.id), nomes[c.cartaoId] ?? 'Cartão removido'))
    .join('');

  return `<div class="compras-lista">${itens}</div>`;
}

function buildModal() {
  const ativos = listCartoesAtivos();
  const opcoes = ativos
    .map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`)
    .join('');

  return `
    <div class="modal-overlay ${state.modalOpen ? 'open' : ''}" id="modal-overlay">
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h2 class="modal-title">Nova <em>compra</em></h2>
          <button class="btn-close" id="btn-modal-close">✕</button>
        </div>

        <div class="form-group">
          <label class="form-label" for="field-cartao">Cartão</label>
          <select class="form-select" id="field-cartao">${opcoes}</select>
        </div>

        <div class="form-group">
          <label class="form-label" for="field-descricao">Descrição</label>
          <input class="form-input" id="field-descricao" type="text" placeholder="ex: Notebook"/>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="field-valor">Valor total (R$)</label>
            <input class="form-input" id="field-valor" type="number"
                   placeholder="0,00" step="0.01" min="0"/>
          </div>
          <div class="form-group">
            <label class="form-label" for="field-data">Data da compra</label>
            <input class="form-input" id="field-data" type="date" value="${hojeISO()}"/>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="field-tipo">Tipo</label>
            <select class="form-select" id="field-tipo">
              <option value="vista">À vista</option>
              <option value="parcelada">Parcelada</option>
            </select>
          </div>
          <div class="form-group" id="grupo-parcelas" style="display:none;">
            <label class="form-label" for="field-parcelas">Parcelas</label>
            <input class="form-input" id="field-parcelas" type="number"
                   placeholder="ex: 10" min="2" max="48"/>
          </div>
        </div>

        <div class="preview-box" id="preview-box"></div>
        <div class="form-erros" id="form-erros"></div>

        <div class="form-actions">
          <button class="btn-cancel" id="btn-modal-cancel">Cancelar</button>
          <button class="btn-save"   id="btn-modal-save">Cadastrar →</button>
        </div>
      </div>
    </div>
  `;
}

// ---- Render ---- //

function renderPage(container) {
  const compras = listCompras();

  container.innerHTML = `
    <div class="inv-bg"></div>
    <div class="inv-grid"></div>
    <div class="inv-page">
      ${buildTopbar()}
      <div class="inv-content">
        ${buildSummary(compras)}
        ${buildLista(compras)}
      </div>
    </div>
    ${buildModal()}
  `;

  attachEvents(container);
}

// ---- Pré-visualização (mostra em qual fatura a compra vai cair) ---- //

function atualizarPreview(container) {
  const box = container.querySelector('#preview-box');
  if (!box) return;

  const get = (id) => container.querySelector(`#${id}`)?.value ?? '';

  const cartao = getCartao(get('field-cartao'));
  const valor  = reaisParaCentavos(get('field-valor'));
  const data   = get('field-data');
  const tipo   = get('field-tipo');
  const n      = tipo === 'parcelada' ? parseInt(get('field-parcelas'), 10) : 1;

  if (!cartao || !(valor > 0) || !dataValida(data) || !(n >= 1)) {
    box.textContent = 'Preencha cartão, valor e data para ver em qual fatura a compra entra.';
    return;
  }

  const parcelas = gerarParcelas({
    dataCompra: data,
    valorTotalCentavos: valor,
    numParcelas: n,
    diaFechamento: cartao.diaFechamento,
  });

  const primeira = parcelas[0];
  const ultima   = parcelas[parcelas.length - 1];
  const fecha    = formatarDataBR(dataFechamento(primeira.faturaRef, cartao.diaFechamento));
  const vence    = formatarDataBR(dataVencimento(primeira.faturaRef, cartao.diaFechamento, cartao.diaVencimento));

  let texto = `Entra na fatura <strong>${formatarRef(primeira.faturaRef)}</strong> (fecha ${fecha} · vence ${vence}).`;
  if (n > 1) {
    texto += `<br>${n} parcelas de ${formatBRL(ultima.valorCentavos)}, até a fatura ${formatarRef(ultima.faturaRef)}.`;
  }
  box.innerHTML = texto;
}

// ---- Eventos ---- //

function attachEvents(container) {
  const closeModal = () => {
    state.modalOpen = false;
    renderPage(container);
  };

  container.querySelector('#btn-back')?.addEventListener('click', () => navigate('/cartao'));

  container.querySelector('#btn-open-modal')?.addEventListener('click', () => {
    if (listCartoesAtivos().length === 0) {
      alert('Cadastre um cartão ativo antes de lançar compras.');
      navigate('/cartao');
      return;
    }
    state.modalOpen = true;
    renderPage(container);
  });

  container.querySelector('#btn-modal-close')?.addEventListener('click', closeModal);
  container.querySelector('#btn-modal-cancel')?.addEventListener('click', closeModal);
  container.querySelector('#modal-overlay')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') closeModal();
  });

  // Campos que mudam a pré-visualização
  const idsPreview = ['field-cartao', 'field-valor', 'field-data', 'field-tipo', 'field-parcelas'];
  idsPreview.forEach((id) => {
    const el = container.querySelector(`#${id}`);
    el?.addEventListener('input', () => atualizarPreview(container));
    el?.addEventListener('change', () => atualizarPreview(container));
  });

  // Mostra/esconde o campo de parcelas
  container.querySelector('#field-tipo')?.addEventListener('change', (e) => {
    const grupo = container.querySelector('#grupo-parcelas');
    grupo.style.display = e.target.value === 'parcelada' ? '' : 'none';
  });

  atualizarPreview(container);

  // Salvar
  container.querySelector('#btn-modal-save')?.addEventListener('click', () => {
    const get  = (id) => container.querySelector(`#${id}`)?.value ?? '';
    const tipo = get('field-tipo');

    const resultado = criarCompra({
      cartaoId:           get('field-cartao'),
      descricao:          get('field-descricao'),
      valorTotalCentavos: reaisParaCentavos(get('field-valor')),
      dataCompra:         get('field-data'),
      tipo,
      numParcelas:        tipo === 'parcelada' ? parseInt(get('field-parcelas'), 10) : 1,
    });

    if (!resultado.ok) {
      const box = container.querySelector('#form-erros');
      box.innerHTML = resultado.erros.map((e) => `• ${esc(e)}`).join('<br>');
      box.classList.add('visivel');
      return;
    }

    closeModal();
  });

  // Excluir (o botão fica dentro do <summary>, então bloqueamos o abrir/fechar)
  container.querySelectorAll('.btn-delete').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (!confirm('Excluir esta compra e todas as suas parcelas?')) return;

      const resultado = excluirCompra(btn.dataset.id);
      if (!resultado.ok) {
        alert(resultado.motivo);
        return;
      }
      renderPage(container);
    });
  });
}

// ---- Export ---- //

export function renderCartaoCompras(container) {
  state = { modalOpen: false };
  renderPage(container);
}

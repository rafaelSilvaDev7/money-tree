// ============================================
//   Money Tree — Compras Service
//   "Tabelas" de compras e parcelas (localStorage)
// ============================================
//
// COMPRA  (mt_compras)  — o que você comprou
// {
//   id, cartaoId, descricao,
//   valorTotalCentavos,
//   dataCompra:  "AAAA-MM-DD",
//   tipo:        "vista" | "parcelada",
//   numParcelas: 1 para à vista,
//   criadoEm
// }
//
// PARCELA (mt_parcelas) — o que cai em cada fatura
// {
//   id, compraId, cartaoId,
//   numero, totalParcelas, valorCentavos,
//   faturaRef:     "AAAA-MM",
//   conciliacaoId: null   ← preenchido no Passo de conciliação
// }
//
// Compra à vista também gera 1 parcela (1/1). Assim a fatura e a
// conciliação só precisam olhar para UMA tabela: parcelas.
// ------------------------------------------------

import { getCartao } from './cartoes.js';
import { gerarParcelas, dataValida } from './faturas.js';

const KEY_COMPRAS  = 'mt_compras';
const KEY_PARCELAS = 'mt_parcelas';

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(key, lista) {
  localStorage.setItem(key, JSON.stringify(lista));
}

// ---- Consultas ---- //

/** Compras da mais recente para a mais antiga. */
export function listCompras() {
  return read(KEY_COMPRAS).sort(
    (a, b) =>
      b.dataCompra.localeCompare(a.dataCompra) ||
      b.criadoEm.localeCompare(a.criadoEm)
  );
}

/** Todas as parcelas, ou só as de uma compra. */
export function listParcelas(compraId = null) {
  const todas = read(KEY_PARCELAS);
  const lista = compraId ? todas.filter((p) => p.compraId === compraId) : todas;
  return lista.sort((a, b) => a.numero - b.numero);
}

// ---- Validação ---- //

export function validarCompra(d) {
  const erros = [];

  const cartao = getCartao(d.cartaoId);
  if (!cartao) erros.push('Selecione um cartão.');
  else if (!cartao.ativo) erros.push('Este cartão está inativo.');

  if (!d.descricao?.trim()) erros.push('Informe a descrição da compra.');

  if (!Number.isInteger(d.valorTotalCentavos) || d.valorTotalCentavos <= 0) {
    erros.push('Informe um valor maior que zero.');
  }

  if (!dataValida(d.dataCompra)) erros.push('Informe uma data de compra válida.');

  if (d.tipo !== 'vista' && d.tipo !== 'parcelada') {
    erros.push('Escolha o tipo da compra.');
  }

  if (d.tipo === 'parcelada') {
    const n = d.numParcelas;
    if (!Number.isInteger(n) || n < 2 || n > 48) {
      erros.push('Parcelas deve ser um número entre 2 e 48.');
    } else if (d.valorTotalCentavos < n) {
      erros.push('O valor é pequeno demais para essa quantidade de parcelas.');
    }
  }

  return erros;
}

// ---- Escrita ---- //

/**
 * Cria a compra e todas as suas parcelas.
 * @returns {{ ok: boolean, erros: string[], compra?: object, parcelas?: object[] }}
 */
export function criarCompra(dados) {
  const erros = validarCompra(dados);
  if (erros.length > 0) return { ok: false, erros };

  const cartao      = getCartao(dados.cartaoId);
  const numParcelas = dados.tipo === 'parcelada' ? dados.numParcelas : 1;

  const compra = {
    id:                 crypto.randomUUID(),
    cartaoId:           dados.cartaoId,
    descricao:          dados.descricao.trim(),
    valorTotalCentavos: dados.valorTotalCentavos,
    dataCompra:         dados.dataCompra,
    tipo:               dados.tipo,
    numParcelas,
    criadoEm:           new Date().toISOString(),
  };

  const parcelas = gerarParcelas({
    dataCompra:         compra.dataCompra,
    valorTotalCentavos: compra.valorTotalCentavos,
    numParcelas,
    diaFechamento:      cartao.diaFechamento,
  }).map((p) => ({
    id:            crypto.randomUUID(),
    compraId:      compra.id,
    cartaoId:      compra.cartaoId,
    conciliacaoId: null,
    ...p,
  }));

  // Segurança: a soma das parcelas TEM que bater com o total
  const soma = parcelas.reduce((s, p) => s + p.valorCentavos, 0);
  if (soma !== compra.valorTotalCentavos) {
    return { ok: false, erros: ['Erro interno: a soma das parcelas não confere com o total.'] };
  }

  // Grava as duas tabelas; se a segunda falhar, desfaz a primeira
  const comprasAntes = read(KEY_COMPRAS);
  try {
    write(KEY_COMPRAS, [...comprasAntes, compra]);
    write(KEY_PARCELAS, [...read(KEY_PARCELAS), ...parcelas]);
  } catch {
    write(KEY_COMPRAS, comprasAntes);
    return { ok: false, erros: ['Não foi possível salvar (armazenamento cheio?).'] };
  }

  return { ok: true, erros: [], compra, parcelas };
}

/**
 * Exclui a compra e suas parcelas.
 * Bloqueia se alguma parcela já foi conciliada com uma fatura.
 */
export function excluirCompra(id) {
  const parcelas = read(KEY_PARCELAS);

  if (parcelas.some((p) => p.compraId === id && p.conciliacaoId)) {
    return {
      ok: false,
      motivo: 'Esta compra já foi conciliada com uma fatura e não pode ser excluída.',
    };
  }

  write(KEY_PARCELAS, parcelas.filter((p) => p.compraId !== id));
  write(KEY_COMPRAS, read(KEY_COMPRAS).filter((c) => c.id !== id));
  return { ok: true };
}

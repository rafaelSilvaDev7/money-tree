// ============================================
//   Money Tree — Cartões Service
//   "Tabela" de cartões de crédito (localStorage)
// ============================================
//
// Formato de um cartão:
// {
//   id:             string (uuid)
//   nome:           "Nubank Roxinho"
//   instituicao:    "Nubank"
//   limiteCentavos: 500000          ← R$ 5.000,00 em CENTAVOS (inteiro)
//   diaFechamento:  1..31
//   diaVencimento:  1..31
//   ativo:          true | false
//   criadoEm / atualizadoEm: ISO string
// }
//
// Por que centavos? Somar números decimais em JS dá erros
// (0.1 + 0.2 = 0.30000000000000004). Com inteiros isso não acontece.
// ------------------------------------------------

const KEY         = 'mt_cartoes';
const KEY_COMPRAS = 'mt_compras'; // será criada no Passo 3

// ---- Leitura / escrita ---- //

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function write(lista) {
  localStorage.setItem(KEY, JSON.stringify(lista));
}

// ---- Conversão de dinheiro ---- //

/** Reais (número do formulário) → centavos inteiros. 49.9 → 4990 */
export function reaisParaCentavos(reais) {
  return Math.round(Number(reais) * 100);
}

/** Centavos → reais. 4990 → 49.9 */
export function centavosParaReais(centavos) {
  return centavos / 100;
}

// ---- Consultas ---- //

export function listCartoes() {
  return read().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export function getCartao(id) {
  return read().find((c) => c.id === id) ?? null;
}

/** Cartões que aparecem nos formulários de compra (só os ativos). */
export function listCartoesAtivos() {
  return listCartoes().filter((c) => c.ativo);
}

// ---- Validação ---- //

/**
 * Valida os dados de um cartão.
 * @returns {string[]} lista de mensagens de erro (vazia = tudo certo)
 */
export function validarCartao(dados) {
  const erros = [];

  if (!dados.nome?.trim()) erros.push('Informe o nome do cartão.');
  if (!dados.instituicao?.trim()) erros.push('Informe a instituição financeira.');

  if (!Number.isInteger(dados.limiteCentavos) || dados.limiteCentavos <= 0) {
    erros.push('Informe um limite maior que zero.');
  }

  const diaOk = (d) => Number.isInteger(d) && d >= 1 && d <= 31;
  if (!diaOk(dados.diaFechamento)) erros.push('Dia de fechamento deve ser entre 1 e 31.');
  if (!diaOk(dados.diaVencimento)) erros.push('Dia de vencimento deve ser entre 1 e 31.');

  // Nome duplicado (ignora o próprio cartão quando está editando)
  const duplicado = read().some(
    (c) =>
      c.id !== dados.id &&
      c.nome.trim().toLowerCase() === (dados.nome ?? '').trim().toLowerCase()
  );
  if (duplicado) erros.push('Já existe um cartão com esse nome.');

  return erros;
}

// ---- Escrita ---- //

/**
 * Cria ou atualiza um cartão.
 * @returns {{ ok: boolean, erros: string[], cartao?: object }}
 */
export function salvarCartao(dados) {
  const erros = validarCartao(dados);
  if (erros.length > 0) return { ok: false, erros };

  const lista = read();
  const agora = new Date().toISOString();
  const limpo = {
    nome:           dados.nome.trim(),
    instituicao:    dados.instituicao.trim(),
    limiteCentavos: dados.limiteCentavos,
    diaFechamento:  dados.diaFechamento,
    diaVencimento:  dados.diaVencimento,
    ativo:          dados.ativo ?? true,
  };

  const idx = dados.id ? lista.findIndex((c) => c.id === dados.id) : -1;

  let cartao;
  if (idx >= 0) {
    cartao = { ...lista[idx], ...limpo, atualizadoEm: agora };
    lista[idx] = cartao;
  } else {
    cartao = { id: crypto.randomUUID(), ...limpo, criadoEm: agora, atualizadoEm: agora };
    lista.push(cartao);
  }

  write(lista);
  return { ok: true, erros: [], cartao };
}

/** Alterna entre ativo e inativo. */
export function alternarStatusCartao(id) {
  const lista = read();
  const cartao = lista.find((c) => c.id === id);
  if (!cartao) return;
  cartao.ativo = !cartao.ativo;
  cartao.atualizadoEm = new Date().toISOString();
  write(lista);
}

/** Verifica se existem compras ligadas ao cartão (integridade). */
export function cartaoTemCompras(id) {
  try {
    const compras = JSON.parse(localStorage.getItem(KEY_COMPRAS)) ?? [];
    return compras.some((c) => c.cartaoId === id);
  } catch {
    return false;
  }
}

/**
 * Exclui um cartão, SOMENTE se não tiver compras.
 * Se tiver, o usuário deve inativar em vez de excluir.
 * @returns {{ ok: boolean, motivo?: string }}
 */
export function excluirCartao(id) {
  if (cartaoTemCompras(id)) {
    return {
      ok: false,
      motivo: 'Este cartão possui compras cadastradas. Inative o cartão em vez de excluir.',
    };
  }
  write(read().filter((c) => c.id !== id));
  return { ok: true };
}

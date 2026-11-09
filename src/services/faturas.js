// ============================================
//   Money Tree — Regras de Fatura e Parcelas
//   Funções PURAS (sem localStorage, sem tela)
// ============================================
//
// Conceitos:
// - Uma fatura é identificada pelo mês em que ela FECHA, no formato
//   "AAAA-MM". Ex.: "2026-12" = fatura que fecha em dezembro/2026.
// - Datas são sempre texto "AAAA-MM-DD". Nunca usamos new Date("2026-11-05"),
//   porque o JS interpreta isso como UTC e, no Brasil, vira dia 04 às 21h.
// - Dinheiro sempre em centavos (inteiros).
//
// REGRA DE FECHAMENTO (ajuste aqui se o seu banco for diferente):
// compra feita NO dia do fechamento (ou depois) entra na PRÓXIMA fatura.
// Compra feita antes do dia do fechamento entra na fatura que fecha neste mês.
// ------------------------------------------------

// ---- Datas ---- //

/** Último dia do mês. mes: 1 a 12. */
export function diasNoMes(ano, mes) {
  return new Date(ano, mes, 0).getDate();
}

/** Valida texto "AAAA-MM-DD" e se a data realmente existe (rejeita 2026-02-30). */
export function dataValida(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso ?? '')) return false;
  const [ano, mes, dia] = iso.split('-').map(Number);
  return mes >= 1 && mes <= 12 && dia >= 1 && dia <= diasNoMes(ano, mes);
}

export function parseData(iso) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return { ano, mes, dia };
}

function montarISO(ano, mes, dia) {
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/** Soma n meses a { ano, mes }. Funciona virando o ano. */
export function somarMeses({ ano, mes }, n) {
  const total = ano * 12 + (mes - 1) + n;
  return { ano: Math.floor(total / 12), mes: (total % 12) + 1 };
}

export function refParaString({ ano, mes }) {
  return `${ano}-${String(mes).padStart(2, '0')}`;
}

export function stringParaRef(str) {
  const [ano, mes] = str.split('-').map(Number);
  return { ano, mes };
}

// ---- Regras de fatura ---- //

/**
 * Em qual fatura (mês de fechamento) a primeira cobrança cai.
 * @param {string} dataCompra    "AAAA-MM-DD"
 * @param {number} diaFechamento 1 a 31
 * @returns {{ano:number, mes:number}}
 */
export function calcularFaturaInicial(dataCompra, diaFechamento) {
  const { ano, mes, dia } = parseData(dataCompra);
  // Se o cartão fecha dia 31 e o mês tem 30 dias, fecha no dia 30
  const fechaEsteMes = Math.min(diaFechamento, diasNoMes(ano, mes));
  return dia >= fechaEsteMes ? somarMeses({ ano, mes }, 1) : { ano, mes };
}

/** Data de fechamento de uma fatura. refStr = "AAAA-MM". */
export function dataFechamento(refStr, diaFechamento) {
  const { ano, mes } = stringParaRef(refStr);
  return montarISO(ano, mes, Math.min(diaFechamento, diasNoMes(ano, mes)));
}

/**
 * Data de vencimento de uma fatura.
 * Se o vencimento é depois do fechamento (ex.: fecha 3, vence 10),
 * vence no mesmo mês. Senão (ex.: fecha 25, vence 5), vence no mês seguinte.
 */
export function dataVencimento(refStr, diaFechamento, diaVencimento) {
  const ref = stringParaRef(refStr);
  const base = diaVencimento > diaFechamento ? ref : somarMeses(ref, 1);
  return montarISO(base.ano, base.mes, Math.min(diaVencimento, diasNoMes(base.ano, base.mes)));
}

// ---- Parcelas ---- //

/**
 * Divide um valor em n parcelas SEM perder centavos.
 * Os centavos que sobram vão 1 a 1 para as primeiras parcelas.
 * 1000 centavos em 3 → [334, 333, 333] (soma = 1000)
 */
export function distribuirValor(totalCentavos, n) {
  const base  = Math.floor(totalCentavos / n);
  const resto = totalCentavos - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < resto ? 1 : 0));
}

/**
 * Gera todas as parcelas de uma compra, cada uma com sua fatura.
 * Compra à vista = 1 parcela (numPacelas = 1).
 */
export function gerarParcelas({ dataCompra, valorTotalCentavos, numParcelas, diaFechamento }) {
  const n        = Math.max(1, numParcelas || 1);
  const primeira = calcularFaturaInicial(dataCompra, diaFechamento);

  return distribuirValor(valorTotalCentavos, n).map((valorCentavos, i) => ({
    numero:        i + 1,
    totalParcelas: n,
    valorCentavos,
    faturaRef:     refParaString(somarMeses(primeira, i)),
  }));
}

// ---- Formatação ---- //

/** "2026-12" → "12/2026" */
export function formatarRef(refStr) {
  const { ano, mes } = stringParaRef(refStr);
  return `${String(mes).padStart(2, '0')}/${ano}`;
}

/** "2026-12-03" → "03/12/2026" */
export function formatarDataBR(iso) {
  const { ano, mes, dia } = parseData(iso);
  return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${ano}`;
}

// ============================================
//   Money Tree — Nubank Service
//   Integração com notificações do Nubank
// ============================================

// ---- Estratégia de integração ---- //
//
// No iPhone, o Nubank envia notificações push a cada transação.
// Como não existe API oficial do Nubank, as opções viáveis são:
//
// OPÇÃO 1 — Atalhos (Shortcuts) do iPhone + Webhook
//   1. Criar uma automação no app "Atalhos" que é disparada
//      ao receber uma notificação do Nubank.
//   2. A automação lê o texto da notificação e faz um POST
//      para o endpoint /api/transactions deste sistema.
//   3. O backend processa e salva a transação.
//
// OPÇÃO 2 — Integração manual via CSV
//   Exportar extrato do Nubank em CSV e importar aqui.
//
// OPÇÃO 3 — Scraping (não recomendado, viola ToS)
//
// Esta service implementará a OPÇÃO 1.
// ------------------------------------------------

const API_BASE = 'http://localhost:3000'; // altere para sua URL de produção

/**
 * Recebe o payload enviado pelo Atalho do iPhone
 * e salva a transação localmente.
 *
 * Formato esperado do body:
 * {
 *   "description": "iFood",
 *   "amount": 45.90,
 *   "type": "debit",       // "debit" | "credit"
 *   "timestamp": "2025-01-15T14:32:00Z"
 * }
 */
export async function receiveWebhook(payload) {
  // Valida campos obrigatórios
  const required = ['description', 'amount', 'type', 'timestamp'];
  for (const field of required) {
    if (!(field in payload)) {
      throw new Error(`Campo obrigatório ausente: ${field}`);
    }
  }

  // Salva no localStorage por enquanto (futuro: banco de dados)
  const transactions = getTransactions();
  const newTransaction = {
    id:          crypto.randomUUID(),
    description: payload.description,
    amount:      parseFloat(payload.amount),
    type:        payload.type,
    timestamp:   payload.timestamp,
    source:      'nubank',
    createdAt:   new Date().toISOString(),
  };

  transactions.push(newTransaction);
  localStorage.setItem('mt_transactions', JSON.stringify(transactions));

  return newTransaction;
}

/**
 * Retorna todas as transações salvas.
 * @returns {Array} lista de transações
 */
export function getTransactions() {
  try {
    const raw = localStorage.getItem('mt_transactions');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Retorna o total gasto no mês atual.
 * @returns {number}
 */
export function getTotalSpentThisMonth() {
  const now          = new Date();
  const transactions = getTransactions();

  return transactions
    .filter((t) => {
      const date = new Date(t.timestamp);
      return (
        t.type === 'debit' &&
        date.getMonth()    === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Limpa todas as transações (usar com cuidado).
 */
export function clearTransactions() {
  localStorage.removeItem('mt_transactions');
}

// ---- Endpoint de teste ---- //
// Para testar sem o iPhone, rode no console do navegador:
//
// import { receiveWebhook } from './src/services/nubank.js';
// receiveWebhook({
//   description: 'iFood',
//   amount: 45.90,
//   type: 'debit',
//   timestamp: new Date().toISOString()
// });

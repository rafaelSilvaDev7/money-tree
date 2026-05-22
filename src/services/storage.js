// ============================================
//   Money Tree — Storage Service
//   Gerencia salário, investimentos e config
// ============================================

const KEYS = {
  SALARY:      'mt_salary',
  INVESTMENTS: 'mt_investments',
  SETTINGS:    'mt_settings',
};

// ---- Salário ---- //

/**
 * Salva o salário mensal.
 * @param {number} amount
 */
export function setSalary(amount) {
  localStorage.setItem(KEYS.SALARY, JSON.stringify({ amount, updatedAt: new Date().toISOString() }));
}

/**
 * Retorna o salário cadastrado.
 * @returns {{ amount: number, updatedAt: string } | null}
 */
export function getSalary() {
  try {
    const raw = localStorage.getItem(KEYS.SALARY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ---- Investimentos ---- //

/**
 * Adiciona ou atualiza um investimento.
 * @param {{ name: string, amount: number, type: string }} investment
 */
export function upsertInvestment(investment) {
  const investments = getInvestments();
  const idx = investments.findIndex((i) => i.id === investment.id);

  if (idx >= 0) {
    investments[idx] = { ...investments[idx], ...investment, updatedAt: new Date().toISOString() };
  } else {
    investments.push({
      id:        crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...investment,
    });
  }

  localStorage.setItem(KEYS.INVESTMENTS, JSON.stringify(investments));
}

/**
 * Retorna todos os investimentos.
 * @returns {Array}
 */
export function getInvestments() {
  try {
    const raw = localStorage.getItem(KEYS.INVESTMENTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Retorna o total investido.
 * @returns {number}
 */
export function getTotalInvested() {
  return getInvestments().reduce((sum, i) => sum + i.amount, 0);
}

/**
 * Remove um investimento pelo ID.
 * @param {string} id
 */
export function removeInvestment(id) {
  const investments = getInvestments().filter((i) => i.id !== id);
  localStorage.setItem(KEYS.INVESTMENTS, JSON.stringify(investments));
}

// ---- Configurações ---- //

/**
 * Salva uma configuração.
 * @param {string} key
 * @param {*} value
 */
export function setSetting(key, value) {
  const settings = getSettings();
  settings[key] = value;
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}

/**
 * Retorna todas as configurações.
 * @returns {Object}
 */
export function getSettings() {
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// ============================================
//   Money Tree — Dashboard Page (placeholder)
// ============================================

// TODO: Implementar Dashboard com:
// - Saldo disponível do mês
// - Salário cadastrado
// - Total de gastos
// - Gráfico de gastos por categoria
// - Últimas transações (via Nubank webhook)

export function renderDashboard(container) {
  container.innerHTML = `
    <div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: 'DM Mono', monospace;
      color: rgba(150, 210, 100, 0.6);
      font-size: 12px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      gap: 16px;
    ">
      <span style="font-size: 48px;">📊</span>
      <p>Dashboard — em construção</p>
      <button
        onclick="window.history.back()"
        style="
          margin-top: 16px;
          background: none;
          border: 0.5px solid rgba(100, 180, 55, 0.4);
          color: rgba(150, 210, 100, 0.6);
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          padding: 10px 24px;
          cursor: pointer;
          border-radius: 2px;
        "
      >
        ← voltar
      </button>
    </div>
  `;
}

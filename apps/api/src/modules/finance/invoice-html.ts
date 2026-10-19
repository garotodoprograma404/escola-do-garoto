/** Escapa texto para dentro de HTML (título de curso e nome do cliente são texto livre de terceiros). */
export function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  })
}

export type InvoiceData = {
  invoiceNumber: string
  issueDate: Date
  transactionId: number
  customer: { name: string; cpf: string }
  items: Array<{ description: string; quantity: number; unitPrice: number; total: number }>
  subtotal: number
  taxes: number
  taxRate: number
  total: number
  paymentMethod: string
  paidAt: Date
  platformName: string
  supportEmail: string
  companyName: string
  companyDocument: string
}

/**
 * Comprovante de compra em HTML. TODO texto de fora passa por `escapeHtml` (montar o HTML
 * com texto cru deixaria um título de curso malicioso rodar script na página do comprovante). A resposta ainda sai com CSP restritiva e `nosniff` (ver o controller).
 */
export function renderInvoiceHtml(data: InvoiceData): string {
  const rows = data.items
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.description)}</td>
          <td>${item.quantity}</td>
          <td>${brl.format(item.unitPrice)}</td>
          <td>${brl.format(item.total)}</td>
        </tr>`,
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Comprovante de Compra - ${escapeHtml(data.invoiceNumber)}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; color: #333; }
    .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { margin: 0; font-size: 24px; }
    .info-section { margin-bottom: 30px; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
    .label { font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #f4f4f4; font-weight: bold; }
    .totals { margin-top: 20px; text-align: right; }
    .totals div { margin: 5px 0; }
    .total-final { font-size: 18px; font-weight: bold; margin-top: 10px; padding-top: 10px; border-top: 2px solid #000; }
    .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>COMPROVANTE DE COMPRA</h1>
    <p>${escapeHtml(data.platformName)} - Plataforma de Educação Online</p>
    <p>CNPJ: ${escapeHtml(data.companyDocument)}</p>
  </div>

  <div class="info-section">
    <h3>Dados do Comprovante</h3>
    <div class="info-row"><span class="label">Número:</span><span>${escapeHtml(data.invoiceNumber)}</span></div>
    <div class="info-row"><span class="label">Data de Emissão:</span><span>${formatDate(data.issueDate)}</span></div>
    <div class="info-row"><span class="label">ID da Transação:</span><span>${data.transactionId}</span></div>
  </div>

  <div class="info-section">
    <h3>Dados do Cliente</h3>
    <div class="info-row"><span class="label">Nome:</span><span>${escapeHtml(data.customer.name)}</span></div>
    <div class="info-row"><span class="label">CPF:</span><span>${escapeHtml(data.customer.cpf)}</span></div>
  </div>

  <div class="info-section">
    <h3>Itens</h3>
    <table>
      <thead><tr><th>Descrição</th><th>Qtd</th><th>Valor Unit.</th><th>Total</th></tr></thead>
      <tbody>${rows}
      </tbody>
    </table>
  </div>

  <div class="totals">
    <div><span class="label">Subtotal:</span> <span>${brl.format(data.subtotal)}</span></div>
    <div><span class="label">Impostos (${data.taxRate}%):</span> <span>${brl.format(data.taxes)}</span></div>
    <div class="total-final"><span class="label">TOTAL:</span> <span>${brl.format(data.total)}</span></div>
  </div>

  <div class="info-section">
    <h3>Informações de Pagamento</h3>
    <div class="info-row"><span class="label">Método:</span><span>${escapeHtml(data.paymentMethod)}</span></div>
    <div class="info-row"><span class="label">Status:</span><span>PAGO</span></div>
    <div class="info-row"><span class="label">Data do Pagamento:</span><span>${formatDate(data.paidAt)}</span></div>
  </div>

  <div class="footer">
    <p>Este é um comprovante de compra digital.</p>
    <p>Empresa: ${escapeHtml(data.companyName)}</p>
    <p>Para dúvidas, entre em contato: ${escapeHtml(data.supportEmail)}</p>
  </div>
</body>
</html>
`
}

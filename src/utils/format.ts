import type { RentPayment } from '../types/index.ts';

export function formatCurrency(amount: number | string | null | undefined): string {
  const num = Number(amount || 0);
  return `₹ ${num.toLocaleString('en-IN', {
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const clean = dateStr.split(' ')[0];
  const d = new Date(`${clean}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatMonth(monthStr: string | null | undefined): string {
  if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) return monthStr || '—';
  const [y, m] = monthStr.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

export function getCurrentBillingMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function exportToCsv(filename: string, headers: string[], rows: Array<Array<string | number | null | undefined>>): void {
  const escape = (val: string | number | null | undefined): string => {
    const str = val === null || val === undefined ? '' : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csvContent = [
    headers.map(escape).join(','),
    ...rows.map((r) => r.map(escape).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadReceiptHtml(payment: RentPayment): void {
  const total =
    Number(payment.amount || 0) +
    Number(payment.electricity_share || 0) +
    Number(payment.other_charges || 0);

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Receipt ${payment.transaction_id}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f8fafc; color: #0f172a; padding: 32px; }
    .card { max-width: 640px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 20px; }
    .brand { font-size: 20px; font-weight: 700; color: #0f294a; }
    .sub { font-size: 13px; color: #64748b; margin-top: 4px; }
    .status { font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 999px; background: #ecfdf5; color: #065f46; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; font-size: 14px; }
    .label { font-size: 12px; color: #64748b; }
    .val { font-weight: 600; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th, td { text-align: left; padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    th:last-child, td:last-child { text-align: right; }
    .total { font-size: 16px; font-weight: 700; color: #0f294a; }
    .foot { font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div>
        <div class="brand">Comfort Stay PG</div>
        <div class="sub">Official Rent &amp; Utility Payment Receipt</div>
      </div>
      <div class="status">${payment.payment_status}</div>
    </div>
    <div class="grid">
      <div><div class="label">Transaction ID</div><div class="val">${payment.transaction_id}</div></div>
      <div><div class="label">Billing Month</div><div class="val">${formatMonth(payment.payment_month)}</div></div>
      <div><div class="label">Tenant Name</div><div class="val">${payment.tenant_name || 'Resident'} (${payment.tenant_code || ''})</div></div>
      <div><div class="label">Room &amp; Bed</div><div class="val">Room ${payment.room_number || '—'} · ${payment.bed_number || '—'}</div></div>
      <div><div class="label">Payment Date</div><div class="val">${formatDate(payment.payment_date)}</div></div>
      <div><div class="label">Payment Method</div><div class="val">${payment.payment_method}</div></div>
    </div>
    <table>
      <thead>
        <tr><th>Description</th><th>Amount</th></tr>
      </thead>
      <tbody>
        <tr><td>Monthly Room Rent (${formatMonth(payment.payment_month)})</td><td>${formatCurrency(payment.amount)}</td></tr>
        <tr><td>Room Electricity Share</td><td>${formatCurrency(payment.electricity_share)}</td></tr>
        <tr><td>Other Charges</td><td>${formatCurrency(payment.other_charges)}</td></tr>
        <tr class="total"><td>Total Paid</td><td>${formatCurrency(total)}</td></tr>
      </tbody>
    </table>
    <div class="foot">
      Generated by Comfort Stay PG &amp; Hostel Management System. Payments processed in demonstration mode do not charge real bank accounts.
    </div>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Receipt_${payment.transaction_id}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

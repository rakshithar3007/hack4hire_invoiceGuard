/**
 * Enterprise Indian Currency & Number Formatting Utilities
 * Strictly avoids floating point arithmetic errors on client side.
 */

export function formatINR(amount: number | string | null | undefined, includeDecimals: boolean = false): string {
  if (amount === null || amount === undefined || amount === '') {
    return 'Rs 0';
  }

  // Parse as string or number without floating point drift
  let numStr = typeof amount === 'number' ? amount.toFixed(2) : String(amount).trim();
  
  // Clean non-numeric characters except minus and period
  numStr = numStr.replace(/[^0-9.-]/g, '');
  if (!numStr || isNaN(Number(numStr))) {
    return 'Rs 0';
  }

  const isNegative = numStr.startsWith('-');
  if (isNegative) {
    numStr = numStr.slice(1);
  }

  const parts = numStr.split('.');
  let integerPart = parts[0] || '0';
  const decimalPart = parts[1] || '00';

  // Indian number grouping logic:
  // Last 3 digits grouped, then every 2 digits grouped to the left
  let result = '';
  if (integerPart.length > 3) {
    const lastThree = integerPart.slice(-3);
    const remaining = integerPart.slice(0, -3);
    const withCommas = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    result = withCommas + ',' + lastThree;
  } else {
    result = integerPart;
  }

  const prefix = isNegative ? '-Rs ' : 'Rs ';

  if (includeDecimals && decimalPart !== '00') {
    return `${prefix}${result}.${decimalPart.padEnd(2, '0').slice(0, 2)}`;
  } else if (includeDecimals) {
    return `${prefix}${result}.00`;
  }

  return `${prefix}${result}`;
}

export function formatNumber(val: number | string | null | undefined): string {
  if (val === null || val === undefined || isNaN(Number(val))) return '0';
  return Number(val).toLocaleString('en-IN');
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return String(dateStr);
  }
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return String(dateStr);
  }
}

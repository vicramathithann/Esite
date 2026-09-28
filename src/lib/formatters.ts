export function formatINR(amount: number): string {
  if (isNaN(amount)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function calculateEMI(amount: number, months: number = 24, interestRate: number = 13.5): number {
  const monthlyRate = interestRate / (12 * 100);
  const emi = (amount * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
  return Math.round(emi);
}

export function formatDateTime(dateInput: string | Date): string {
  const d = new Date(dateInput);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateOnly(dateInput: string | Date): string {
  const d = new Date(dateInput);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function getDaysRemaining(expiryDateInput: string | Date): number {
  const expiry = new Date(expiryDateInput).getTime();
  const now = Date.now();
  const diffTime = expiry - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
// Türkçe sayı biçimi: gösterimde "1.234,56", girişte hem "12,5" hem "12.5" kabul edilir.

const MAX_FRACTION_DIGITS = 2;
const formatter = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: MAX_FRACTION_DIGITS });

export function formatNumber(value: number): string {
  return formatter.format(value);
}

/** Türkçe yüzde yazımı: "%42,5" */
export function formatPercent(value: number): string {
  return `%${formatNumber(value)}`;
}

/** Gerçek eksi işareti (U+2212): tire yerine, sayılarda daha okunaklı. */
const MINUS_SIGN = '\u2212';

/** İşaretli sayı: "+3,2" / "−5" / "0" (sapma gibi yön bildiren değerler için). */
export function formatSigned(value: number): string {
  if (value > 0) return `+${formatNumber(value)}`;
  if (value < 0) return `${MINUS_SIGN}${formatNumber(-value)}`;
  return formatNumber(0);
}

/**
 * Kullanıcı girdisini sayıya çevirir. "%" işareti ve boşluklar yok sayılır.
 * Virgül varsa ondalık ayırıcıdır ve noktalar binlik ayırıcı sayılır ("1.234,5").
 * Sayı değilse null döner.
 */
export function parseDecimal(text: string): number | null {
  let normalized = text.replace(/[\s%]/g, '');
  if (normalized.includes(',')) normalized = normalized.replace(/\./g, '').replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  return Number(normalized);
}

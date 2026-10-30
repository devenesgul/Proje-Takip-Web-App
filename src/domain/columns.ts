// Özel sütun yardımcıları (PROJECT.md Bölüm 5.3): sütun tanımı ile değerler ayrı tutulur.
// Sıralama, değer sayımı/temizliği, tip değişiminde dönüştürme, seçim seçenekleri ve güvenli bağlantı.
// Saf fonksiyonlar; girdileri değiştirmez, yeni nesne döner.
import type {
  ColumnDefinition,
  ColumnType,
  CustomValue,
  Group,
  Item,
  SelectOption,
} from '../types';
import { parseDecimal } from '../utils/number';

export const COLUMN_TYPE_LABELS: Record<ColumnType, string> = {
  text: 'Metin',
  number: 'Sayı',
  date: 'Tarih',
  select: 'Seçim',
  checkbox: 'Onay',
  link: 'Bağlantı',
};

/** Yeni seçeneklere sırayla verilen renkler. */
export const OPTION_COLORS = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#dc2626', '#0891b2'];

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}/;
const DATE_LENGTH = 10;
const TRUE_WORDS = ['evet', 'true', '1', 'var', 'x', '✓', '✔'];
const FALSE_WORDS = ['hayır', 'hayir', 'false', '0', 'yok'];
const SAFE_PROTOCOLS = ['http:', 'https:', 'mailto:'];

/** `order` alanına göre sıralı kopya. */
export function sortColumns(columns: ColumnDefinition[]): ColumnDefinition[] {
  return [...columns].sort((a, b) => a.order - b.order);
}

/** Tabloda gösterilecek sütunlar, sırasıyla. */
export function visibleColumns(columns: ColumnDefinition[]): ColumnDefinition[] {
  return sortColumns(columns).filter((column) => column.visible);
}

/** Boş hücre mi? (değer yok, null veya boş metin; onayda false da boş sayılır) */
export function isEmptyValue(value: CustomValue | undefined): boolean {
  return value === undefined || value === null || value === '' || value === false;
}

/** Sütunda dolu değeri olan kalem sayısı (silme uyarısı için). */
export function countColumnValues(groups: Group[], columnId: string): number {
  return groups
    .flatMap((group) => group.items)
    .filter((item) => !isEmptyValue(item.custom[columnId])).length;
}

function mapItems(groups: Group[], fn: (item: Item) => Item): Group[] {
  return groups.map((group) => ({ ...group, items: group.items.map(fn) }));
}

/** Değer haritasının belirtilen anahtar olmadan kopyası. */
export function withoutKey(custom: Item['custom'], key: string): Item['custom'] {
  return Object.fromEntries(Object.entries(custom).filter(([k]) => k !== key));
}

/** Sütunun tüm değerlerini kalemlerden kaldırır (JSON'da da kalmaz). */
export function removeColumnValues(groups: Group[], columnId: string): Group[] {
  return mapItems(groups, (item) =>
    columnId in item.custom ? { ...item, custom: withoutKey(item.custom, columnId) } : item,
  );
}

export type Conversion = { ok: true; value: CustomValue } | { ok: false };

/** Tek bir değeri yeni sütun tipine dönüştürür; dönüştürülemezse ok: false. */
export function convertValue(value: CustomValue, to: ColumnType): Conversion {
  if (value === null) return { ok: true, value: null };
  switch (to) {
    case 'text':
    case 'link':
    case 'select':
      if (typeof value === 'boolean') return { ok: true, value: value ? 'Evet' : 'Hayır' };
      return { ok: true, value: String(value) };
    case 'number': {
      if (typeof value === 'number') return { ok: true, value };
      const parsed = typeof value === 'string' ? parseDecimal(value) : null;
      return parsed === null ? { ok: false } : { ok: true, value: parsed };
    }
    case 'date':
      return typeof value === 'string' && DATE_PATTERN.test(value)
        ? { ok: true, value: value.slice(0, DATE_LENGTH) }
        : { ok: false };
    case 'checkbox': {
      if (typeof value === 'boolean') return { ok: true, value };
      const word = String(value).trim().toLocaleLowerCase('tr');
      if (TRUE_WORDS.includes(word)) return { ok: true, value: true };
      if (FALSE_WORDS.includes(word) || word === '') return { ok: true, value: false };
      return { ok: false };
    }
  }
}

export interface TypeChange {
  groups: Group[];
  /** Dönüştürülemeyip boşaltılan değer sayısı */
  lost: number;
  /** Seçim tipine geçerken mevcut değerlerden üretilen seçenekler */
  options?: SelectOption[];
}

/** Sütun tipini değiştirirken tüm değerleri dönüştürür; dönüştürülemeyenler silinir ve sayılır. */
export function changeColumnType(groups: Group[], columnId: string, to: ColumnType): TypeChange {
  let lost = 0;
  const next = mapItems(groups, (item) => {
    if (!(columnId in item.custom)) return item;
    const result = convertValue(item.custom[columnId], to);
    if (result.ok) return { ...item, custom: { ...item.custom, [columnId]: result.value } };
    lost += 1;
    return { ...item, custom: withoutKey(item.custom, columnId) };
  });

  if (to !== 'select') return { groups: next, lost };
  const values = new Set<string>();
  for (const item of next.flatMap((group) => group.items)) {
    const value = item.custom[columnId];
    if (typeof value === 'string' && value.trim() !== '') values.add(value);
  }
  const options = [...values].map((value, index) => ({
    value,
    color: OPTION_COLORS[index % OPTION_COLORS.length],
  }));
  return { groups: next, lost, options };
}

/** Seçeneğin adını değiştirir ve o seçeneği taşıyan değerleri de günceller. */
export function renameOptionValues(
  groups: Group[],
  columnId: string,
  from: string,
  to: string,
): Group[] {
  return mapItems(groups, (item) =>
    item.custom[columnId] === from ? { ...item, custom: { ...item.custom, [columnId]: to } } : item,
  );
}

/** Seçeneği kullanan kalem sayısı. */
export function countOptionUses(groups: Group[], columnId: string, option: string): number {
  return groups.flatMap((g) => g.items).filter((item) => item.custom[columnId] === option).length;
}

/** Silinen seçeneği taşıyan değerleri boşaltır. */
export function clearOptionValues(groups: Group[], columnId: string, option: string): Group[] {
  return mapItems(groups, (item) =>
    item.custom[columnId] === option
      ? { ...item, custom: withoutKey(item.custom, columnId) }
      : item,
  );
}

/**
 * Bağlantı değerini güvenli bir adrese çevirir. Şema yoksa https:// eklenir.
 * Yalnızca http, https ve mailto kabul edilir (javascript: vb. engellenir). Geçersizse null.
 */
export function safeHref(value: string): string | null {
  const text = value.trim();
  if (text === '') return null;
  const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(text);
  const candidate = hasScheme ? text : `https://${text}`;
  try {
    const url = new URL(candidate);
    return SAFE_PROTOCOLS.includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

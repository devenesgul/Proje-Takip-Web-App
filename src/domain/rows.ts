// Görünür satır listesi: tablo ve Gantt aynı listeden çizilir, böylece satırlar her zaman hizalı kalır.
// Filtre verilirse yalnızca uyan kalemler ve onları içeren gruplar listelenir; grup satırı yine
// grubun tamamını taşır (grup ağırlığı/ilerlemesi filtreden etkilenmez).
import type { Group, Item } from '../types';

export type Row =
  | { kind: 'group'; key: string; group: Group }
  | { kind: 'item'; key: string; group: Group; item: Item }
  /** Açık ama kalemi olmayan grubun "ilk kalemi ekle" satırı */
  | { kind: 'empty'; key: string; group: Group };

export function visibleRows(groups: Group[], include?: (item: Item) => boolean): Row[] {
  const rows: Row[] = [];
  for (const group of groups) {
    const items = include ? group.items.filter(include) : group.items;
    // Filtre varken eşleşmesi olmayan grup gizlenir.
    if (include && items.length === 0) continue;
    rows.push({ kind: 'group', key: group.id, group });
    if (!group.expanded) continue;
    if (items.length === 0) {
      rows.push({ kind: 'empty', key: `${group.id}:empty`, group });
      continue;
    }
    for (const item of items) {
      rows.push({ kind: 'item', key: item.id, group, item });
    }
  }
  return rows;
}

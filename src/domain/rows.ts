// Görünür satır listesi: tablo ve Gantt aynı listeden çizilir, böylece satırlar her zaman hizalı kalır.
import type { Group, Item } from '../types';

export type Row =
  | { kind: 'group'; key: string; group: Group }
  | { kind: 'item'; key: string; group: Group; item: Item }
  /** Açık ama kalemi olmayan grubun "ilk kalemi ekle" satırı */
  | { kind: 'empty'; key: string; group: Group };

export function visibleRows(groups: Group[]): Row[] {
  const rows: Row[] = [];
  for (const group of groups) {
    rows.push({ kind: 'group', key: group.id, group });
    if (!group.expanded) continue;
    if (group.items.length === 0) {
      rows.push({ kind: 'empty', key: `${group.id}:empty`, group });
      continue;
    }
    for (const item of group.items) {
      rows.push({ kind: 'item', key: item.id, group, item });
    }
  }
  return rows;
}

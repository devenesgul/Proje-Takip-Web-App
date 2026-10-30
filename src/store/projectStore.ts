// Uygulama durumu (Zustand): proje verisi ve onu değiştiren tüm aksiyonlar.
// Bileşenler veriyi doğrudan değiştirmez; yalnızca bu aksiyonları çağırır.
// Güncellemeler değişmez (immutable) yapılır: değişen dal yeni nesneyle değiştirilir.
import { create } from 'zustand';
import { sampleProject } from '../data/sampleProject';
import { checkDateRange, checkWeight, clampProgress, type CheckResult } from '../domain/validation';
import type {
  ColumnType,
  CustomValue,
  DateRange,
  GanttZoom,
  Group,
  InfoField,
  Item,
  Project,
  Theme,
} from '../types';
import * as columns from './columnActions';
import type { ColumnPatch } from './columnActions';
import { newId } from '../utils/id';

/** Yeni gruplara sırayla verilen renkler. */
export const GROUP_COLORS = [
  '#2563eb',
  '#16a34a',
  '#d97706',
  '#9333ea',
  '#dc2626',
  '#0891b2',
  '#4f46e5',
  '#65a30d',
];

export const NEW_GROUP_NAME = 'Yeni iş kısmı';
export const NEW_ITEM_NAME = 'Yeni kalem';
export const COPY_SUFFIX = ' (kopya)';

/** Kalemde satır içi düzenlenebilen alanlar. */
export type ItemPatch = Partial<Pick<Item, 'name' | 'weight' | 'progress' | 'note'>> & {
  planned?: DateRange;
  actual?: DateRange;
};

export type GroupPatch = Partial<Pick<Group, 'name' | 'color'>>;

export type ProjectPatch = Partial<Pick<Project, 'name' | 'description' | 'start' | 'end'>>;

export interface ProjectState {
  project: Project;
  /** Projeyi tümüyle değiştirir (açılışta yükleme, JSON içe aktarma). */
  replaceProject: (project: Project) => void;
  updateProject: (patch: ProjectPatch) => void;
  setInfo: (info: InfoField[]) => void;
  setTheme: (theme: Theme) => void;
  setGanttZoom: (zoom: GanttZoom) => void;

  addGroup: () => string;
  updateGroup: (groupId: string, patch: GroupPatch) => void;
  toggleGroup: (groupId: string) => void;
  removeGroup: (groupId: string) => void;

  addItem: (groupId: string) => string;
  /** Geçersiz değer (ör. negatif ağırlık, ters tarih aralığı) kaydedilmez, hata mesajı döner. */
  updateItem: (groupId: string, itemId: string, patch: ItemPatch) => CheckResult;
  removeItem: (groupId: string, itemId: string) => void;
  duplicateItem: (groupId: string, itemId: string) => string | null;

  /** Özel sütunlar (tanım `project.columns`, değerler `item.custom`) */
  addColumn: (name: string, type: ColumnType) => string;
  updateColumn: (columnId: string, patch: ColumnPatch) => void;
  moveColumn: (columnId: string, delta: number) => void;
  /** Tanımı ve tüm değerleri siler. */
  removeColumn: (columnId: string) => void;
  /** Değerleri yeni tipe dönüştürür; dönüşmeyenler silinir. */
  setColumnType: (columnId: string, type: ColumnType) => void;
  addOption: (columnId: string, value: string) => CheckResult;
  renameOption: (columnId: string, from: string, to: string) => CheckResult;
  setOptionColor: (columnId: string, value: string, color: string) => void;
  removeOption: (columnId: string, value: string) => void;
  setCustomValue: (groupId: string, itemId: string, columnId: string, value: CustomValue) => void;
}

/** Dizideki `order` alanlarını dizi sırasıyla eşitler. */
function reindex<T extends { order: number }>(list: T[]): T[] {
  return list.map((entry, index) => (entry.order === index ? entry : { ...entry, order: index }));
}

function mapGroup(project: Project, groupId: string, fn: (group: Group) => Group): Project {
  return {
    ...project,
    groups: project.groups.map((group) => (group.id === groupId ? fn(group) : group)),
  };
}

function setItems(group: Group, items: Item[]): Group {
  return { ...group, items: reindex(items) };
}

function createItem(order: number): Item {
  return {
    id: newId(),
    name: NEW_ITEM_NAME,
    order,
    weight: 0,
    planned: {},
    actual: {},
    progress: 0,
    status: 'notStarted',
    custom: {},
  };
}

/** Yamayı mevcut kaleme uygular ve kurallara göre doğrular. */
function applyItemPatch(item: Item, patch: ItemPatch): { item: Item; check: CheckResult } {
  if (patch.weight !== undefined) {
    const check = checkWeight(patch.weight);
    if (!check.ok) return { item, check };
  }
  const planned = patch.planned ? { ...item.planned, ...patch.planned } : item.planned;
  const actual = patch.actual ? { ...item.actual, ...patch.actual } : item.actual;
  for (const range of [planned, actual]) {
    const check = checkDateRange(range);
    if (!check.ok) return { item, check };
  }
  const next: Item = { ...item, ...patch, planned, actual };
  if (patch.progress !== undefined) next.progress = clampProgress(patch.progress);
  return { item: next, check: { ok: true } };
}

export const useProjectStore = create<ProjectState>()((set, get) => ({
  project: sampleProject,

  replaceProject: (project) => set({ project }),

  updateProject: (patch) => set(({ project }) => ({ project: { ...project, ...patch } })),

  setInfo: (info) => set(({ project }) => ({ project: { ...project, info } })),

  setTheme: (theme) =>
    set(({ project }) => ({ project: { ...project, settings: { ...project.settings, theme } } })),

  setGanttZoom: (ganttZoom) =>
    set(({ project }) => ({
      project: { ...project, settings: { ...project.settings, ganttZoom } },
    })),

  addGroup: () => {
    const id = newId();
    set(({ project }) => {
      const order = project.groups.length;
      const group: Group = {
        id,
        name: NEW_GROUP_NAME,
        color: GROUP_COLORS[order % GROUP_COLORS.length],
        order,
        expanded: true,
        items: [],
      };
      return { project: { ...project, groups: [...project.groups, group] } };
    });
    return id;
  },

  updateGroup: (groupId, patch) =>
    set(({ project }) => ({ project: mapGroup(project, groupId, (g) => ({ ...g, ...patch })) })),

  toggleGroup: (groupId) =>
    set(({ project }) => ({
      project: mapGroup(project, groupId, (g) => ({ ...g, expanded: !g.expanded })),
    })),

  removeGroup: (groupId) =>
    set(({ project }) => ({
      project: { ...project, groups: reindex(project.groups.filter((g) => g.id !== groupId)) },
    })),

  addItem: (groupId) => {
    let id = '';
    set(({ project }) => ({
      project: mapGroup(project, groupId, (group) => {
        const item = createItem(group.items.length);
        id = item.id;
        // Yeni kalem görünsün diye grup açılır.
        return { ...group, expanded: true, items: [...group.items, item] };
      }),
    }));
    return id;
  },

  updateItem: (groupId, itemId, patch) => {
    const group = get().project.groups.find((g) => g.id === groupId);
    const item = group?.items.find((i) => i.id === itemId);
    if (!group || !item) return { ok: false, message: 'Kalem bulunamadı' };

    const result = applyItemPatch(item, patch);
    if (!result.check.ok) return result.check;

    set(({ project }) => ({
      project: mapGroup(project, groupId, (g) => ({
        ...g,
        items: g.items.map((i) => (i.id === itemId ? result.item : i)),
      })),
    }));
    return result.check;
  },

  removeItem: (groupId, itemId) =>
    set(({ project }) => ({
      project: mapGroup(project, groupId, (g) =>
        setItems(
          g,
          g.items.filter((i) => i.id !== itemId),
        ),
      ),
    })),

  duplicateItem: (groupId, itemId) => {
    const group = get().project.groups.find((g) => g.id === groupId);
    const index = group?.items.findIndex((i) => i.id === itemId) ?? -1;
    if (!group || index < 0) return null;

    const original = group.items[index];
    const copy: Item = {
      ...structuredClone(original),
      id: newId(),
      name: original.name + COPY_SUFFIX,
    };
    const items = [...group.items];
    items.splice(index + 1, 0, copy);
    set(({ project }) => ({ project: mapGroup(project, groupId, (g) => setItems(g, items)) }));
    return copy.id;
  },

  addColumn: (name, type) => {
    const id = newId();
    set(({ project }) => ({ project: columns.addColumn(project, id, name, type) }));
    return id;
  },
  updateColumn: (columnId, patch) =>
    set(({ project }) => ({ project: columns.updateColumn(project, columnId, patch) })),
  moveColumn: (columnId, delta) =>
    set(({ project }) => ({ project: columns.moveColumn(project, columnId, delta) })),
  removeColumn: (columnId) =>
    set(({ project }) => ({ project: columns.removeColumn(project, columnId) })),
  setColumnType: (columnId, type) =>
    set(({ project }) => ({ project: columns.setColumnType(project, columnId, type) })),
  addOption: (columnId, value) => {
    const result = columns.addOption(get().project, columnId, value);
    if (result.check.ok) set({ project: result.project });
    return result.check;
  },
  renameOption: (columnId, from, to) => {
    const result = columns.renameOption(get().project, columnId, from, to);
    if (result.check.ok) set({ project: result.project });
    return result.check;
  },
  setOptionColor: (columnId, value, color) =>
    set(({ project }) => ({ project: columns.setOptionColor(project, columnId, value, color) })),
  removeOption: (columnId, value) =>
    set(({ project }) => ({ project: columns.removeOption(project, columnId, value) })),
  setCustomValue: (groupId, itemId, columnId, value) =>
    set(({ project }) => ({
      project: columns.setCustomValue(project, groupId, itemId, columnId, value),
    })),
}));

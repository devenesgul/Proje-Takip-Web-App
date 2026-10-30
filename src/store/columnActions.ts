// Özel sütun aksiyonları: proje üzerinde saf dönüşümler (Project → Project).
// projectStore bunları çağırır; böylece store dosyası küçük kalır ve dönüşümler ayrı test edilir.
import {
  changeColumnType,
  clearOptionValues,
  OPTION_COLORS,
  removeColumnValues,
  renameOptionValues,
  sortColumns,
  withoutKey,
} from '../domain/columns';
import type { CheckResult } from '../domain/validation';
import type { ColumnDefinition, ColumnType, CustomValue, Project, SelectOption } from '../types';

export type ColumnPatch = Partial<Pick<ColumnDefinition, 'name' | 'visible' | 'width'>>;

type Result = { project: Project; check: CheckResult };

const OK: CheckResult = { ok: true };
const fail = (project: Project, message: string): Result => ({
  project,
  check: { ok: false, message },
});

function reindexColumns(columns: ColumnDefinition[]): ColumnDefinition[] {
  return columns.map((c, index) => (c.order === index ? c : { ...c, order: index }));
}

function mapColumn(
  project: Project,
  columnId: string,
  fn: (column: ColumnDefinition) => ColumnDefinition,
): Project {
  return { ...project, columns: project.columns.map((c) => (c.id === columnId ? fn(c) : c)) };
}

function findColumn(project: Project, columnId: string): ColumnDefinition | undefined {
  return project.columns.find((c) => c.id === columnId);
}

export function addColumn(project: Project, id: string, name: string, type: ColumnType): Project {
  const column: ColumnDefinition = {
    id,
    name,
    type,
    visible: true,
    order: project.columns.length,
    ...(type === 'select' ? { options: [] } : {}),
  };
  return { ...project, columns: reindexColumns([...sortColumns(project.columns), column]) };
}

export function updateColumn(project: Project, columnId: string, patch: ColumnPatch): Project {
  return mapColumn(project, columnId, (c) => ({ ...c, ...patch }));
}

/** Sütunu sırada `delta` kadar kaydırır (−1 yukarı/sola, +1 aşağı/sağa). */
export function moveColumn(project: Project, columnId: string, delta: number): Project {
  const sorted = sortColumns(project.columns);
  const from = sorted.findIndex((c) => c.id === columnId);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= sorted.length) return project;
  const [moved] = sorted.splice(from, 1);
  sorted.splice(to, 0, moved);
  return { ...project, columns: reindexColumns(sorted) };
}

/** Sütun tanımını ve tüm kalemlerdeki değerlerini kaldırır. */
export function removeColumn(project: Project, columnId: string): Project {
  return {
    ...project,
    columns: reindexColumns(sortColumns(project.columns.filter((c) => c.id !== columnId))),
    groups: removeColumnValues(project.groups, columnId),
  };
}

/** Tipi değiştirir, değerleri dönüştürür (dönüşmeyenler silinir). */
export function setColumnType(project: Project, columnId: string, type: ColumnType): Project {
  const column = findColumn(project, columnId);
  if (!column || column.type === type) return project;
  const change = changeColumnType(project.groups, columnId, type);
  return {
    ...mapColumn(project, columnId, (c) => {
      const next: ColumnDefinition = { ...c, type };
      if (type === 'select') next.options = change.options ?? [];
      else delete next.options;
      return next;
    }),
    groups: change.groups,
  };
}

function setOptions(project: Project, columnId: string, options: SelectOption[]): Project {
  return mapColumn(project, columnId, (c) => ({ ...c, options }));
}

export function addOption(project: Project, columnId: string, value: string): Result {
  const column = findColumn(project, columnId);
  const text = value.trim();
  if (!column) return fail(project, 'Sütun bulunamadı');
  if (text === '') return fail(project, 'Seçenek adı boş olamaz');
  const options = column.options ?? [];
  if (options.some((o) => o.value === text)) return fail(project, 'Bu seçenek zaten var');
  const color = OPTION_COLORS[options.length % OPTION_COLORS.length];
  return {
    project: setOptions(project, columnId, [...options, { value: text, color }]),
    check: OK,
  };
}

export function renameOption(project: Project, columnId: string, from: string, to: string): Result {
  const column = findColumn(project, columnId);
  const text = to.trim();
  if (!column) return fail(project, 'Sütun bulunamadı');
  if (text === '') return fail(project, 'Seçenek adı boş olamaz');
  if (text === from) return { project, check: OK };
  const options = column.options ?? [];
  if (options.some((o) => o.value === text)) return fail(project, 'Bu seçenek zaten var');
  const renamed = options.map((o) => (o.value === from ? { ...o, value: text } : o));
  return {
    project: {
      ...setOptions(project, columnId, renamed),
      groups: renameOptionValues(project.groups, columnId, from, text),
    },
    check: OK,
  };
}

export function setOptionColor(
  project: Project,
  columnId: string,
  value: string,
  color: string,
): Project {
  const options = findColumn(project, columnId)?.options ?? [];
  return setOptions(
    project,
    columnId,
    options.map((o) => (o.value === value ? { ...o, color } : o)),
  );
}

/** Seçeneği kaldırır; o seçeneği taşıyan hücreler boşaltılır. */
export function removeOption(project: Project, columnId: string, value: string): Project {
  const options = findColumn(project, columnId)?.options ?? [];
  return {
    ...setOptions(
      project,
      columnId,
      options.filter((o) => o.value !== value),
    ),
    groups: clearOptionValues(project.groups, columnId, value),
  };
}

/** Hücre değerini yazar; null veya boş metin anahtarı kaldırır. */
export function setCustomValue(
  project: Project,
  groupId: string,
  itemId: string,
  columnId: string,
  value: CustomValue,
): Project {
  return {
    ...project,
    groups: project.groups.map((group) =>
      group.id !== groupId
        ? group
        : {
            ...group,
            items: group.items.map((item) => {
              if (item.id !== itemId) return item;
              const empty = value === null || value === '';
              const custom = empty
                ? withoutKey(item.custom, columnId)
                : { ...item.custom, [columnId]: value };
              return { ...item, custom };
            }),
          },
    ),
  };
}

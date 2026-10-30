// JSON içe aktarma: ayrıştırma, şema taşıma (migration) ve yapı doğrulaması.
// Hem yedek dosyası yüklerken hem de tarayıcı kaydını okurken kullanılır.
// Geçersiz veride hiçbir zaman istisna fırlatmaz; anlaşılır Türkçe hata mesajı döner.
import { clampProgress, checkWeight } from '../domain/validation';
import {
  CURRENT_SCHEMA_VERSION,
  type ColumnDefinition,
  type ColumnType,
  type CustomValue,
  type DateRange,
  type GanttZoom,
  type Group,
  type InfoField,
  type Item,
  type Project,
  type ProgressSnapshot,
  type Status,
  type Theme,
} from '../types';

export type ReadResult = { ok: true; project: Project } | { ok: false; error: string };

type RawObject = Record<string, unknown>;

/**
 * Şema taşıma adımları: anahtar = kaynak sürüm, değer = bir sonraki sürüme çeviren fonksiyon.
 * Şema değiştiğinde CURRENT_SCHEMA_VERSION artırılır ve buraya bir adım eklenir.
 */
const MIGRATIONS: Record<number, (data: RawObject) => RawObject> = {};

const STATUSES: readonly Status[] = ['notStarted', 'inProgress', 'done', 'delayed', 'onHold'];
const COLUMN_TYPES: readonly ColumnType[] = [
  'text',
  'number',
  'date',
  'select',
  'checkbox',
  'link',
];
const THEMES: readonly Theme[] = ['light', 'dark', 'system'];
const ZOOMS: readonly GanttZoom[] = ['day', 'week', 'month'];

/** Doğrulama hatası; yol bilgisiyle ("groups[2].items[0].weight") birlikte taşınır. */
class ValidationError extends Error {}

const fail = (path: string, expected: string): never => {
  throw new ValidationError(`"${path}" alanı ${expected} olmalı`);
};

function isObject(value: unknown): value is RawObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function obj(value: unknown, path: string): RawObject {
  return isObject(value) ? value : fail(path, 'nesne');
}

function str(value: unknown, path: string): string {
  return typeof value === 'string' ? value : fail(path, 'metin');
}

function optStr(value: unknown, path: string): string | undefined {
  return value === undefined || value === null ? undefined : str(value, path);
}

function num(value: unknown, path: string): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fail(path, 'sayı');
}

function bool(value: unknown, path: string): boolean {
  return typeof value === 'boolean' ? value : fail(path, 'true/false');
}

function arr<T>(value: unknown, path: string, read: (entry: unknown, path: string) => T): T[] {
  if (!Array.isArray(value)) return fail(path, 'liste');
  return value.map((entry, index) => read(entry, `${path}[${index}]`));
}

function oneOf<T extends string>(value: unknown, path: string, options: readonly T[]): T {
  return options.includes(value as T)
    ? (value as T)
    : fail(path, `şunlardan biri: ${options.join(', ')}`);
}

function readRange(value: unknown, path: string): DateRange {
  const raw = value === undefined ? {} : obj(value, path);
  return { start: optStr(raw.start, `${path}.start`), end: optStr(raw.end, `${path}.end`) };
}

function readCustom(value: unknown, path: string): Record<string, CustomValue> {
  const raw = value === undefined ? {} : obj(value, path);
  const result: Record<string, CustomValue> = {};
  for (const [key, entry] of Object.entries(raw)) {
    const valid = entry === null || ['string', 'number', 'boolean'].includes(typeof entry);
    result[key] = valid
      ? (entry as CustomValue)
      : fail(`${path}.${key}`, 'metin, sayı, true/false veya boş');
  }
  return result;
}

function readItem(value: unknown, path: string): Item {
  const raw = obj(value, path);
  const weight = num(raw.weight, `${path}.weight`);
  const weightCheck = checkWeight(weight);
  if (!weightCheck.ok) throw new ValidationError(`"${path}.weight": ${weightCheck.message}`);
  const tags = raw.tags === undefined ? undefined : arr(raw.tags, `${path}.tags`, str);
  return {
    id: str(raw.id, `${path}.id`),
    name: str(raw.name, `${path}.name`),
    order: num(raw.order, `${path}.order`),
    weight,
    planned: readRange(raw.planned, `${path}.planned`),
    actual: readRange(raw.actual, `${path}.actual`),
    progress: clampProgress(num(raw.progress, `${path}.progress`)),
    status: oneOf(raw.status, `${path}.status`, STATUSES),
    statusManual:
      raw.statusManual === undefined ? undefined : bool(raw.statusManual, `${path}.statusManual`),
    note: optStr(raw.note, `${path}.note`),
    tags,
    custom: readCustom(raw.custom, `${path}.custom`),
  };
}

function readGroup(value: unknown, path: string): Group {
  const raw = obj(value, path);
  return {
    id: str(raw.id, `${path}.id`),
    name: str(raw.name, `${path}.name`),
    color: str(raw.color, `${path}.color`),
    order: num(raw.order, `${path}.order`),
    expanded: bool(raw.expanded, `${path}.expanded`),
    items: arr(raw.items, `${path}.items`, readItem),
  };
}

function readColumn(value: unknown, path: string): ColumnDefinition {
  const raw = obj(value, path);
  const options =
    raw.options === undefined
      ? undefined
      : arr(raw.options, `${path}.options`, (entry, p) => {
          const option = obj(entry, p);
          return {
            value: str(option.value, `${p}.value`),
            color: optStr(option.color, `${p}.color`),
          };
        });
  return {
    id: str(raw.id, `${path}.id`),
    name: str(raw.name, `${path}.name`),
    type: oneOf(raw.type, `${path}.type`, COLUMN_TYPES),
    options,
    visible: bool(raw.visible, `${path}.visible`),
    order: num(raw.order, `${path}.order`),
    width: raw.width === undefined ? undefined : num(raw.width, `${path}.width`),
  };
}

function readInfo(value: unknown, path: string): InfoField {
  const raw = obj(value, path);
  return { key: str(raw.key, `${path}.key`), value: str(raw.value, `${path}.value`) };
}

function readSnapshot(value: unknown, path: string): ProgressSnapshot {
  const raw = obj(value, path);
  return {
    date: str(raw.date, `${path}.date`),
    overallProgress: num(raw.overallProgress, `${path}.overallProgress`),
  };
}

function readProjectFields(raw: RawObject): Project {
  const settings = obj(raw.settings, 'settings');
  const project: Project = {
    id: str(raw.id, 'id'),
    name: str(raw.name, 'name'),
    description: optStr(raw.description, 'description'),
    start: str(raw.start, 'start'),
    end: str(raw.end, 'end'),
    info: arr(raw.info, 'info', readInfo),
    columns: arr(raw.columns, 'columns', readColumn),
    groups: arr(raw.groups, 'groups', readGroup),
    progressSnapshots: arr(raw.progressSnapshots, 'progressSnapshots', readSnapshot),
    settings: {
      theme: oneOf(settings.theme, 'settings.theme', THEMES),
      ganttZoom: oneOf(settings.ganttZoom, 'settings.ganttZoom', ZOOMS),
    },
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };
  const ids = [
    ...project.groups.map((g) => g.id),
    ...project.groups.flatMap((g) => g.items.map((i) => i.id)),
  ];
  if (new Set(ids).size !== ids.length) {
    throw new ValidationError('Dosyada aynı ID birden fazla kez geçiyor');
  }
  return project;
}

/** Eski şema sürümlerini sırayla güncel sürüme taşır. */
function migrate(raw: RawObject): RawObject {
  let data = raw;
  let version = num(data.schemaVersion, 'schemaVersion');
  if (version > CURRENT_SCHEMA_VERSION) {
    throw new ValidationError(
      `Dosya daha yeni bir uygulama sürümüyle oluşturulmuş (şema ${version}, desteklenen ${CURRENT_SCHEMA_VERSION})`,
    );
  }
  while (version < CURRENT_SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) throw new ValidationError(`Şema ${version} için taşıma tanımlı değil`);
    data = step(data);
    version += 1;
  }
  return data;
}

/** Ayrıştırılmış değeri doğrular ve güncel şemaya taşınmış temiz bir Project döner. */
export function readProject(value: unknown): ReadResult {
  try {
    if (!isObject(value)) return { ok: false, error: 'Dosya bir proje nesnesi içermiyor' };
    return { ok: true, project: readProjectFields(migrate(value)) };
  } catch (error) {
    if (error instanceof ValidationError) return { ok: false, error: error.message };
    throw error;
  }
}

/** JSON metnini projeye çevirir. */
export function parseProjectJson(text: string): ReadResult {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Dosya geçerli bir JSON değil' };
  }
  return readProject(value);
}

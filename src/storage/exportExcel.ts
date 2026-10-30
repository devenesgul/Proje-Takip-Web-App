// Excel (.xlsx) dışa aktarım. Önce saf `buildSheets` ile sayfa verisi hazırlanır (test edilir),
// sonra SheetJS yalnızca indirme anında dinamik olarak yüklenir (ilk açılış hafif kalsın diye).
// Tarihler gerçek Excel tarihi (seri numarası + biçim) olarak yazılır; Excel'de sıralanıp hesaplanabilir.
import { sortColumns } from '../domain/columns';
import { groupProgress, groupWeight, overallProgress, totalWeight } from '../domain/progress';
import { effectiveStatus, isDelayed, remainingDays, STATUS_LABELS } from '../domain/schedule';
import { deviation, plannedProgress } from '../domain/scurve';
import type { ColumnDefinition, CustomValue, ISODateTime, Project } from '../types';
import { dayNumber } from '../utils/date';
import { exportFileName } from './exportJson';

/** 1899-12-30 (Excel'in sıfır günü) ile 1970-01-01 arasındaki gün sayısı */
const EXCEL_EPOCH_OFFSET = 25569;
export const DATE_TIME_FORMAT = 'dd.mm.yyyy hh:mm';
export const DATE_FORMAT = 'dd.mm.yyyy';

/** Tarih hücresi: Excel seri numarası + gösterim biçimi */
export interface DateCell {
  serial: number;
  format: string;
}

export type CellValue = string | number | DateCell | null;

export interface Sheet {
  name: string;
  rows: CellValue[][];
  /** Karakter cinsinden sütun genişlikleri */
  widths: number[];
}

/** ISO yerel zaman → Excel seri numarası (saat kesirli). Okunamazsa null. */
export function toExcelSerial(value: string): number | null {
  const day = dayNumber(value);
  return day === null ? null : day + EXCEL_EPOCH_OFFSET;
}

function dateCell(value: string | undefined, format = DATE_TIME_FORMAT): CellValue {
  if (!value) return null;
  const serial = toExcelSerial(value.length === 10 ? `${value}T00:00` : value);
  return serial === null ? value : { serial, format };
}

function customCell(column: ColumnDefinition, value: CustomValue | undefined): CellValue {
  if (value === undefined || value === null) return null;
  if (column.type === 'checkbox') return value === true ? 'Evet' : 'Hayır';
  if (column.type === 'date' && typeof value === 'string') return dateCell(value, DATE_FORMAT);
  if (typeof value === 'boolean') return value ? 'Evet' : 'Hayır';
  return value;
}

const BASE_HEADERS = [
  'İş kısmı',
  'Kalem',
  'Ağırlık (%)',
  'Planlanan başlangıç',
  'Planlanan bitiş',
  'Gerçek başlangıç',
  'Gerçek bitiş',
  'Tamamlanma (%)',
  'Durum',
  'Not',
];
const BASE_WIDTHS = [24, 32, 11, 18, 18, 18, 18, 14, 13, 40];
const CUSTOM_WIDTH = 16;

function scheduleSheet(project: Project, now: ISODateTime): Sheet {
  const columns = sortColumns(project.columns);
  const blanks = (n: number) => Array<CellValue>(n).fill(null);
  const rows: CellValue[][] = [[...BASE_HEADERS, ...columns.map((c) => c.name)]];

  for (const group of project.groups) {
    rows.push([
      group.name,
      null,
      groupWeight(group),
      ...blanks(4),
      groupProgress(group),
      ...blanks(2 + columns.length),
    ]);
    for (const item of group.items) {
      const status = STATUS_LABELS[effectiveStatus(item, now)];
      rows.push([
        group.name,
        item.name,
        item.weight,
        dateCell(item.planned.start),
        dateCell(item.planned.end),
        dateCell(item.actual.start),
        dateCell(item.actual.end),
        item.progress,
        isDelayed(item, now) ? STATUS_LABELS.delayed : status,
        item.note ?? null,
        ...columns.map((column) => customCell(column, item.custom[column.id])),
      ]);
    }
  }
  rows.push([
    'TOPLAM',
    null,
    totalWeight(project.groups),
    ...blanks(4),
    overallProgress(project.groups),
    ...blanks(2 + columns.length),
  ]);
  return {
    name: 'İş Programı',
    rows,
    widths: [...BASE_WIDTHS, ...columns.map(() => CUSTOM_WIDTH)],
  };
}

function infoSheet(project: Project, now: ISODateTime): Sheet {
  const days = remainingDays(project.end, now);
  return {
    name: 'Künye',
    rows: [
      ['Alan', 'Değer'],
      ['Proje adı', project.name],
      ['İşe başlama', dateCell(project.start)],
      ['İş bitimi', dateCell(project.end)],
      ...project.info.map((field): CellValue[] => [field.key, field.value]),
      ['Rapor tarihi', dateCell(now)],
      ['Genel ilerleme (%)', overallProgress(project.groups)],
      ['Planlanan ilerleme (%)', plannedProgress(project.groups, now)],
      ['Sapma (puan)', deviation(project.groups, now)],
      ['Kalan gün', days],
    ],
    widths: [36, 48],
  };
}

function snapshotSheet(project: Project): Sheet {
  const sorted = [...project.progressSnapshots].sort((a, b) => (a.date < b.date ? -1 : 1));
  return {
    name: 'İlerleme Kayıtları',
    rows: [
      ['Tarih', 'Gerçekleşen (%)', 'Planlanan (%)'],
      ...sorted.map((s): CellValue[] => [
        dateCell(s.date),
        s.overallProgress,
        plannedProgress(project.groups, s.date),
      ]),
    ],
    widths: [18, 16, 16],
  };
}

/** Excel'e yazılacak sayfalar (saf; test edilir). */
export function buildSheets(project: Project, now: ISODateTime): Sheet[] {
  return [scheduleSheet(project, now), infoSheet(project, now), snapshotSheet(project)];
}

/** JSON yedeğiyle aynı ad, .xlsx uzantılı: "kentsel-donusum-2026-10-30.xlsx" */
export function excelFileName(project: Project, date: Date = new Date()): string {
  return exportFileName(project, date).replace(/\.json$/, '.xlsx');
}

const isDateCell = (value: CellValue): value is DateCell =>
  typeof value === 'object' && value !== null;

/** SheetJS'i yükleyip çalışma kitabını oluşturur ve indirir. */
export async function downloadExcel(project: Project, now: ISODateTime): Promise<void> {
  const XLSX = await import('xlsx');
  const workbook = XLSX.utils.book_new();
  for (const sheet of buildSheets(project, now)) {
    const plain = sheet.rows.map((row) =>
      row.map((cell) => (isDateCell(cell) ? cell.serial : cell)),
    );
    const worksheet = XLSX.utils.aoa_to_sheet(plain);
    sheet.rows.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (!isDateCell(cell)) return;
        const address = XLSX.utils.encode_cell({ r, c });
        worksheet[address] = { t: 'n', v: cell.serial, z: cell.format };
      }),
    );
    worksheet['!cols'] = sheet.widths.map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name);
  }
  XLSX.writeFile(workbook, excelFileName(project));
}

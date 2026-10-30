// Örnek proje verisi: "Kentsel Dönüşüm İş Programı" PDF'inden esinlenmiştir.
// Kalem ağırlıkları proje genelinde mutlak yüzdedir ve toplamları tam 100'dür.
// ID'ler, örnek verinin her yüklemede aynı kalması için sabit ve okunabilir seçilmiştir.
import {
  CURRENT_SCHEMA_VERSION,
  type CustomValue,
  type Group,
  type ISODateTime,
  type Item,
  type Project,
  type Status,
} from '../types';

const WORK_START_HOUR = 'T08:00';
const WORK_END_HOUR = 'T17:00';

const COLUMN_RESPONSIBLE = 'col-responsible';
const COLUMN_INSPECTED = 'col-inspected';

interface ItemSeed {
  id: string;
  name: string;
  weight: number;
  /** Planlanan başlangıç (yyyy-aa-gg) */
  start: string;
  /** Planlanan bitiş (yyyy-aa-gg) */
  end: string;
  progress?: number;
  status?: Status;
  actualStart?: string;
  actualEnd?: string;
  note?: string;
  custom?: Record<string, CustomValue>;
}

const startOf = (date: string): ISODateTime => date + WORK_START_HOUR;
const endOf = (date: string): ISODateTime => date + WORK_END_HOUR;

function makeItem(seed: ItemSeed, order: number): Item {
  return {
    id: seed.id,
    name: seed.name,
    order,
    weight: seed.weight,
    planned: { start: startOf(seed.start), end: endOf(seed.end) },
    actual: {
      start: seed.actualStart ? startOf(seed.actualStart) : undefined,
      end: seed.actualEnd ? endOf(seed.actualEnd) : undefined,
    },
    progress: seed.progress ?? 0,
    status: seed.status ?? 'notStarted',
    note: seed.note,
    custom: seed.custom ?? {},
  };
}

function makeGroup(
  id: string,
  name: string,
  color: string,
  order: number,
  seeds: ItemSeed[],
): Group {
  return {
    id,
    name,
    color,
    order,
    expanded: true,
    items: seeds.map(makeItem),
  };
}

const groups: Group[] = [
  // Kaba İnşaat: %42
  makeGroup('g-rough', 'Kaba İnşaat', '#8b5cf6', 0, [
    {
      id: 'i-excavation',
      name: 'Hafriyat',
      weight: 3,
      start: '2026-07-24',
      end: '2026-08-21',
      progress: 100,
      status: 'done',
      actualStart: '2026-07-24',
      actualEnd: '2026-08-19',
      custom: { [COLUMN_RESPONSIBLE]: 'Saha şefi', [COLUMN_INSPECTED]: true },
    },
    {
      id: 'i-soil',
      name: 'Zemin iyileştirme',
      weight: 3,
      start: '2026-08-17',
      end: '2026-09-18',
      progress: 100,
      status: 'done',
      actualStart: '2026-08-20',
      actualEnd: '2026-09-22',
      custom: { [COLUMN_INSPECTED]: true },
    },
    {
      id: 'i-foundation',
      name: 'Temel betonu',
      weight: 6,
      start: '2026-09-14',
      end: '2026-10-23',
      progress: 70,
      status: 'delayed',
      actualStart: '2026-09-23',
      note: 'Beton tedarikindeki aksama nedeniyle yaklaşık bir hafta gecikme var.',
    },
    {
      id: 'i-slabs',
      name: 'Kat betonları',
      weight: 22,
      start: '2026-10-19',
      end: '2027-05-28',
      progress: 5,
      status: 'inProgress',
      actualStart: '2026-10-26',
    },
    { id: 'i-walls', name: 'Duvar', weight: 8, start: '2027-02-01', end: '2027-08-27' },
  ]),
  // Çatı: %5
  makeGroup('g-roof', 'Çatı', '#f97316', 1, [
    {
      id: 'i-roof-cover',
      name: 'Çatı konstrüksiyonu ve kaplaması',
      weight: 3,
      start: '2027-05-03',
      end: '2027-07-02',
    },
    {
      id: 'i-insulation',
      name: 'Çatı-temel su ve ısı yalıtımı',
      weight: 2,
      start: '2027-06-01',
      end: '2027-07-30',
    },
  ]),
  // Doğrama: %7
  makeGroup('g-joinery', 'Doğrama', '#0ea5e9', 2, [
    {
      id: 'i-windows',
      name: 'Pencere ve balkon doğramaları',
      weight: 7,
      start: '2027-07-05',
      end: '2027-10-29',
    },
  ]),
  // İç Sıva: %5
  makeGroup('g-plaster', 'İç Sıva', '#a3a3a3', 3, [
    { id: 'i-rough-plaster', name: 'Kaba sıva', weight: 3, start: '2027-08-02', end: '2027-10-29' },
    { id: 'i-fine-plaster', name: 'İnce sıva', weight: 2, start: '2027-10-04', end: '2027-12-31' },
  ]),
  // Dış Cephe Yalıtım: %6
  makeGroup('g-facade', 'Dış Cephe Yalıtım', '#14b8a6', 4, [
    { id: 'i-facade', name: 'Dış cephe', weight: 6, start: '2027-08-30', end: '2027-12-24' },
  ]),
  // Mekanik Tesisat (Sıhhi): %5
  makeGroup('g-plumbing', 'Mekanik Tesisat (Sıhhi)', '#3b82f6', 5, [
    {
      id: 'i-sanitary',
      name: 'Sıhhi tesisat montajı',
      weight: 3.5,
      start: '2027-06-07',
      end: '2028-01-28',
    },
    { id: 'i-fire', name: 'Yangın tesisatı', weight: 1.5, start: '2027-09-06', end: '2028-01-28' },
  ]),
  // Mekanik Tesisat (Isıtma/Havalandırma): %4
  makeGroup('g-hvac', 'Mekanik Tesisat (Isıtma/Havalandırma)', '#ef4444', 6, [
    {
      id: 'i-heating',
      name: 'Isıtma tesisatı',
      weight: 2.5,
      start: '2027-06-07',
      end: '2028-01-28',
    },
    {
      id: 'i-ventilation',
      name: 'Havalandırma tesisatı',
      weight: 1.5,
      start: '2027-09-06',
      end: '2028-02-25',
    },
  ]),
  // Elektrik Tesisatı: %7
  makeGroup('g-electric', 'Elektrik Tesisatı', '#eab308', 7, [
    { id: 'i-cabling', name: 'Kablo çekimi', weight: 4, start: '2027-06-07', end: '2027-12-31' },
    {
      id: 'i-panels',
      name: 'Pano, tablo ve sayaç',
      weight: 1.5,
      start: '2027-11-01',
      end: '2028-02-25',
    },
    {
      id: 'i-generator',
      name: 'Trafo ve jeneratör',
      weight: 1.5,
      start: '2028-01-03',
      end: '2028-03-31',
    },
  ]),
  // Asansör İmalatı: %3
  makeGroup('g-elevator', 'Asansör İmalatı', '#64748b', 8, [
    {
      id: 'i-rails',
      name: 'Asansör ray montajı',
      weight: 1,
      start: '2027-09-06',
      end: '2027-11-26',
    },
    {
      id: 'i-cabin',
      name: 'Asansör kapı ve kabin montajı',
      weight: 2,
      start: '2027-11-29',
      end: '2028-03-31',
    },
  ]),
  // Döşeme ve Duvar Kaplaması: %7
  makeGroup('g-finishes', 'Döşeme ve Duvar Kaplaması', '#d946ef', 9, [
    { id: 'i-ceramic', name: 'Seramik kaplama', weight: 3, start: '2027-12-06', end: '2028-03-31' },
    { id: 'i-parquet', name: 'Parke kaplama', weight: 2.5, start: '2028-02-07', end: '2028-04-28' },
    { id: 'i-marble', name: 'Mermer kaplama', weight: 1.5, start: '2028-01-03', end: '2028-03-31' },
  ]),
  // Boya ve Asma Tavan: %4
  makeGroup('g-paint', 'Boya ve Asma Tavan', '#06b6d4', 10, [
    { id: 'i-ceiling', name: 'Asma tavan', weight: 1.5, start: '2028-01-03', end: '2028-03-03' },
    { id: 'i-paint', name: 'İç boya', weight: 2.5, start: '2028-02-07', end: '2028-05-26' },
  ]),
  // Mobilya: %3
  makeGroup('g-furniture', 'Mobilya', '#b45309', 11, [
    {
      id: 'i-kitchen',
      name: 'Mutfak dolabı ve tezgâhı',
      weight: 2,
      start: '2028-03-06',
      end: '2028-05-26',
    },
    { id: 'i-bathroom', name: 'Banyo dolabı', weight: 1, start: '2028-03-06', end: '2028-05-26' },
  ]),
  // Çevre Düzenlemesi: %1,5
  makeGroup('g-landscape', 'Çevre Düzenlemesi', '#22c55e', 12, [
    {
      id: 'i-landscape',
      name: 'Çevre düzenlemesi',
      weight: 1.5,
      start: '2028-04-03',
      end: '2028-06-23',
    },
  ]),
  // İskan Ruhsatı: %0,5
  makeGroup('g-permit', 'İskan Ruhsatı', '#78716c', 13, [
    { id: 'i-permit', name: 'İskan ruhsatı', weight: 0.5, start: '2028-06-05', end: '2028-07-13' },
  ]),
];

export const sampleProject: Project = {
  id: 'sample-project',
  name: 'Kentsel Dönüşüm İş Programı (Örnek)',
  description: 'Kat karşılığı inşaat işi için örnek iş programı.',
  start: startOf('2026-07-24'),
  end: endOf('2028-07-13'),
  info: [
    { key: 'İdarenin adı', value: '(kurum adı)' },
    { key: 'İşin adı', value: '(iş tanımı)' },
    { key: 'Yüklenici', value: '(firma adı)' },
    { key: 'İhale tarihi ve IKN no', value: '7.05.2026 / İHALE-İNŞ-2026/1' },
    { key: 'Sözleşme tarihi', value: '4.06.2026' },
    { key: 'Yer teslim ve ilk yapı ruhsat tarihi', value: '30.04.2026' },
    { key: 'Finansman bedeli', value: '121.000.000,00 TL' },
    { key: 'İşe başlama tarihi', value: '24.07.2026' },
    { key: 'İş bitim tarihi', value: '13.07.2028' },
    { key: 'İşin süresi', value: '720 gün' },
  ],
  columns: [
    { id: COLUMN_RESPONSIBLE, name: 'Sorumlu', type: 'text', visible: true, order: 0 },
    { id: COLUMN_INSPECTED, name: 'Kontrol edildi', type: 'checkbox', visible: true, order: 1 },
  ],
  groups,
  progressSnapshots: [
    { date: '2026-08-21T17:00', overallProgress: 2.5 },
    { date: '2026-09-25T17:00', overallProgress: 6 },
    { date: '2026-10-30T17:00', overallProgress: 11.3 },
  ],
  settings: {
    theme: 'system',
    ganttZoom: 'week',
  },
  schemaVersion: CURRENT_SCHEMA_VERSION,
};

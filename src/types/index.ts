// Uygulamanın veri modeli tipleri (PROJECT.md Bölüm 5.2).
// Kod içi adlar İngilizce; Türkçe karşılıkları yorumlarda verilmiştir.

/** Yerel zaman, saat dilimi eki yok. Örn: "2026-07-24T08:00" */
export type ISODateTime = string;

/** Şema sürümü: içe aktarımda veri taşıma (migration) için. */
export const CURRENT_SCHEMA_VERSION = 1;

/** Durum: baslamadi | devam | bitti | gecikti | beklemede */
export type Status = 'notStarted' | 'inProgress' | 'done' | 'delayed' | 'onHold';

/** Sütun tipi: metin | sayi | tarih | secim | onay | baglanti */
export type ColumnType = 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'link';

/** Seçim tipi sütunlardaki tek bir seçenek. */
export interface SelectOption {
  value: string;
  color?: string;
}

/** Özel sütun tanımı (SutunTanimi). Değerler kalemlerin `custom` alanında tutulur. */
export interface ColumnDefinition {
  id: string;
  name: string;
  type: ColumnType;
  /** Sadece type === 'select' ise */
  options?: SelectOption[];
  visible: boolean;
  order: number;
  width?: number;
}

export type CustomValue = string | number | boolean | null;

/** Başlangıç–bitiş aralığı (tarih + saat), alanlar boş olabilir. */
export interface DateRange {
  start?: ISODateTime;
  end?: ISODateTime;
}

/** İmalat kalemi (Kalem). */
export interface Item {
  id: string;
  name: string;
  order: number;
  /** Proje genelinde mutlak yüzde (pursantaj) */
  weight: number;
  /** Planlanan tarihler */
  planned: DateRange;
  /** Gerçekleşen tarihler */
  actual: DateRange;
  /** Tamamlanma 0..100 */
  progress: number;
  status: Status;
  /** Kullanıcı durumu elle seçtiyse otomatik öneri ezmez (durumElle) */
  statusManual?: boolean;
  note?: string;
  tags?: string[];
  /** Özel sütun değerleri: sütun id → değer */
  custom: Record<string, CustomValue>;
}

/** İş kısmı (Grup). Grup ağırlığı saklanmaz, kalemlerden hesaplanır. */
export interface Group {
  id: string;
  name: string;
  color: string;
  order: number;
  /** Ağaçta açık/kapalı */
  expanded: boolean;
  items: Item[];
}

/** Gerçekleşen S-eğrisi için ilerleme kaydı (snapshot). */
export interface ProgressSnapshot {
  date: ISODateTime;
  overallProgress: number;
}

/** Proje künyesi satırı (üst bilgi alanı). */
export interface InfoField {
  key: string;
  value: string;
}

export type Theme = 'light' | 'dark' | 'system';
export type GanttZoom = 'day' | 'week' | 'month';

export interface ProjectSettings {
  theme: Theme;
  ganttZoom: GanttZoom;
}

/** Proje (kök nesne). */
export interface Project {
  id: string;
  name: string;
  description?: string;
  start: ISODateTime;
  end: ISODateTime;
  /** Künye */
  info: InfoField[];
  /** Özel sütun tanımları */
  columns: ColumnDefinition[];
  groups: Group[];
  progressSnapshots: ProgressSnapshot[];
  settings: ProjectSettings;
  /** Şema sürümü */
  schemaVersion: number;
}

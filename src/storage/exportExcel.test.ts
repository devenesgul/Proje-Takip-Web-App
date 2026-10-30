// Excel dışa aktarım verisi testleri: seri tarih, başlıklar, satırlar, toplam ve dosya adı.
// Ayrıca gerçek SheetJS ile yazıp geri okuyarak dosyanın açılabildiği doğrulanır.
import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { sampleProject } from '../data/sampleProject';
import { buildSheets, excelFileName, toExcelSerial, type DateCell } from './exportExcel';

const NOW = '2026-10-30T12:00';

describe('toExcelSerial', () => {
  it('Excel seri numarasıyla birebir (01.01.2026 = 46023)', () => {
    expect(toExcelSerial('2026-01-01T00:00')).toBe(46023);
    expect(toExcelSerial('2026-01-01T12:00')).toBe(46023.5);
    expect(toExcelSerial('1970-01-01T00:00')).toBe(25569);
    expect(toExcelSerial('bozuk')).toBeNull();
  });
});

describe('buildSheets', () => {
  const [schedule, info, snapshots] = buildSheets(sampleProject, NOW);

  it('üç sayfa üretir', () => {
    expect([schedule.name, info.name, snapshots.name]).toEqual([
      'İş Programı',
      'Künye',
      'İlerleme Kayıtları',
    ]);
  });

  it('başlıkta sabit ve özel sütunlar var; satır sayısı grup + kalem + başlık + toplam', () => {
    expect(schedule.rows[0].slice(0, 3)).toEqual(['İş kısmı', 'Kalem', 'Ağırlık (%)']);
    expect(schedule.rows[0].slice(-2)).toEqual(['Sorumlu', 'Kontrol edildi']);
    const items = sampleProject.groups.flatMap((g) => g.items).length;
    expect(schedule.rows).toHaveLength(1 + sampleProject.groups.length + items + 1);
    expect(schedule.widths).toHaveLength(schedule.rows[0].length);
  });

  it('kalem satırı: tarih hücresi, durum, özel sütun değerleri', () => {
    const row = schedule.rows.find((r) => r[1] === 'Hafriyat');
    expect(row?.[2]).toBe(3);
    expect((row?.[3] as DateCell).serial).toBe(toExcelSerial('2026-07-24T08:00'));
    expect(row?.[8]).toBe('Bitti');
    expect(row?.slice(-2)).toEqual(['Saha şefi', 'Evet']);
    const late = schedule.rows.find((r) => r[1] === 'Temel betonu');
    expect(late?.[8]).toBe('Gecikti');
  });

  it('toplam satırı ağırlık 100 ve genel ilerleme', () => {
    const total = schedule.rows.at(-1);
    expect(total?.[0]).toBe('TOPLAM');
    expect(total?.[2]).toBe(100);
    expect(total?.[7]).toBe(11.3);
  });

  it('künye ve ilerleme kayıtları', () => {
    expect(info.rows.find((r) => r[0] === 'Yüklenici')?.[1]).toBe('(firma adı)');
    expect(info.rows.find((r) => r[0] === 'Kalan gün')?.[1]).toBe(622);
    expect(snapshots.rows).toHaveLength(1 + sampleProject.progressSnapshots.length);
  });
});

describe('gerçek .xlsx', () => {
  it('SheetJS ile yazılıp geri okunabilir; tarih biçimi korunur', () => {
    const workbook = XLSX.utils.book_new();
    const [schedule] = buildSheets(sampleProject, NOW);
    const sheet = XLSX.utils.aoa_to_sheet(
      schedule.rows.map((r) => r.map((c) => (typeof c === 'object' && c ? c.serial : c))),
    );
    sheet.D2 = { t: 'n', v: 46023.5, z: 'dd.mm.yyyy hh:mm' };
    XLSX.utils.book_append_sheet(workbook, sheet, schedule.name);
    const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    const back = XLSX.read(bytes, { type: 'array', cellNF: true });
    const read = back.Sheets['İş Programı'];
    expect(read.A1.v).toBe('İş kısmı');
    expect(read.D2.z).toBe('dd.mm.yyyy hh:mm');
  });
});

describe('excelFileName', () => {
  it('tarihli .xlsx adı', () => {
    expect(excelFileName(sampleProject, new Date(2026, 9, 30))).toBe(
      'kentsel-donusum-is-programi-ornek-2026-10-30.xlsx',
    );
  });
});

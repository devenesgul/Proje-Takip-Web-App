// Örnek proje verisinin tutarlılık testleri: ağırlık toplamı, benzersiz ID'ler, tarih aralıkları.
import { describe, expect, it } from 'vitest';
import { sampleProject } from './sampleProject';

const allItems = sampleProject.groups.flatMap((group) => group.items);

describe('sampleProject', () => {
  it('kalem ağırlıklarının toplamı tam 100', () => {
    const total = allItems.reduce((sum, item) => sum + item.weight, 0);
    expect(total).toBeCloseTo(100, 2);
  });

  it("tüm grup ve kalem ID'leri benzersiz", () => {
    const ids = [...sampleProject.groups.map((g) => g.id), ...allItems.map((i) => i.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('planlanan bitiş, başlangıçtan sonra ve proje aralığı içinde', () => {
    for (const item of allItems) {
      const { start = '', end = '' } = item.planned;
      expect(start, item.name).not.toBe('');
      expect(end, item.name).not.toBe('');
      expect(start < end, item.name).toBe(true);
      expect(start >= sampleProject.start, item.name).toBe(true);
      expect(end <= sampleProject.end, item.name).toBe(true);
    }
  });

  it('tamamlanma 0–100 aralığında', () => {
    for (const item of allItems) {
      expect(item.progress).toBeGreaterThanOrEqual(0);
      expect(item.progress).toBeLessThanOrEqual(100);
    }
  });
});

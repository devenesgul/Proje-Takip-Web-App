// progress.ts birim testleri: genel/grup ilerleme ve ağırlık doğrulaması.
import { describe, expect, it } from 'vitest';
import type { Group, Item } from '../../types';
import { sampleProject } from '../../data/sampleProject';
import {
  checkWeights,
  groupProgress,
  groupWeight,
  overallProgress,
  round2,
  totalWeight,
} from '../progress';

function item(weight: number, progress: number): Item {
  return {
    id: crypto.randomUUID(),
    name: 'k',
    order: 0,
    weight,
    planned: {},
    actual: {},
    progress,
    status: 'notStarted',
    custom: {},
  };
}

function group(...items: Item[]): Group {
  return { id: crypto.randomUUID(), name: 'g', color: '#000', order: 0, expanded: true, items };
}

describe('round2', () => {
  it('2 haneye yuvarlar ve kayan nokta hatasını giderir', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(42.555)).toBe(42.56);
    expect(round2(-0.001)).toBe(0);
  });
});

describe('overallProgress', () => {
  it('PROJECT.md 3.1 örneği: 8×1 + 25×0,5 + 5×0,5', () => {
    const groups = [group(item(8, 100), item(25, 50)), group(item(5, 50))];
    expect(overallProgress(groups)).toBe(23);
  });

  it('toplam 100 iken Σ(ağırlık × tamamlanma)/100 ile birebir eşleşir', () => {
    const items = sampleProject.groups.flatMap((g) => g.items);
    const expected = round2(items.reduce((s, i) => s + i.weight * i.progress, 0) / 100);
    expect(overallProgress(sampleProject.groups)).toBe(expected);
  });

  it('her şey bitince %100', () => {
    expect(overallProgress([group(item(60, 100)), group(item(40, 100))])).toBe(100);
  });

  it('kalem yoksa 0', () => {
    expect(overallProgress([])).toBe(0);
    expect(overallProgress([group()])).toBe(0);
  });

  it('ondalıklı ağırlıklarda yuvarlama hatası vermez', () => {
    const groups = [group(item(0.1, 100), item(0.2, 100), item(99.7, 0))];
    expect(overallProgress(groups)).toBe(0.3);
  });
});

describe('groupWeight / groupProgress', () => {
  it('grup ağırlığı kalemlerin toplamıdır', () => {
    expect(groupWeight(group(item(8, 0), item(25, 0), item(0.5, 0)))).toBe(33.5);
  });

  it('grup ilerlemesi ağırlıklı ortalamadır', () => {
    // (10×100 + 30×0) / 40 = 25
    expect(groupProgress(group(item(10, 100), item(30, 0)))).toBe(25);
  });

  it('ağırlığı 0 olan grupta 0 döner (sıfıra bölme yok)', () => {
    expect(groupProgress(group())).toBe(0);
    expect(groupProgress(group(item(0, 100)))).toBe(0);
  });
});

describe('checkWeights', () => {
  it('toplam 100 ise ok', () => {
    expect(checkWeights([group(item(33.3, 0), item(33.3, 0), item(33.4, 0))])).toEqual({
      total: 100,
      diff: 0,
      state: 'ok',
    });
  });

  it('eksikse farkı gösterir', () => {
    expect(checkWeights([group(item(96.5, 0))])).toEqual({
      total: 96.5,
      diff: 3.5,
      state: 'missing',
    });
  });

  it('fazlaysa farkı gösterir', () => {
    expect(checkWeights([group(item(60, 0)), group(item(42, 0))])).toEqual({
      total: 102,
      diff: 2,
      state: 'excess',
    });
  });

  it('örnek projede toplam 100', () => {
    expect(totalWeight(sampleProject.groups)).toBe(100);
    expect(checkWeights(sampleProject.groups).state).toBe('ok');
  });
});

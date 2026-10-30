// JSON dışa aktarma: projeyi okunabilir JSON'a çevirir ve tarihli dosya adıyla indirir.
import type { Project } from '../types';
import { todayStamp } from '../utils/date';

const JSON_INDENT = 2;
const FALLBACK_NAME = 'proje';

const TURKISH_ASCII: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' };

export function projectToJson(project: Project): string {
  return JSON.stringify(project, null, JSON_INDENT);
}

/** "Kentsel Dönüşüm" → "kentsel-donusum-2026-10-30.json" */
export function exportFileName(project: Project, now: Date = new Date()): string {
  const slug = project.name
    .toLocaleLowerCase('tr')
    .replace(/[çğıöşü]/g, (char) => TURKISH_ASCII[char])
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${slug || FALLBACK_NAME}-${todayStamp(now)}.json`;
}

/** Tarayıcıda dosya indirmeyi başlatır. */
export function downloadProjectJson(project: Project): void {
  const blob = new Blob([projectToJson(project)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = exportFileName(project);
  link.click();
  URL.revokeObjectURL(url);
}

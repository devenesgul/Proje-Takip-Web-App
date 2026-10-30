// Geri al / Yinele yardımcıları ve değişiklik sonrası ilerleme kaydı.
// Geçmiş, değişmez (immutable) proje anlık görüntülerinden oluşur; yapısal paylaşım sayesinde ucuzdur.
import { overallProgress } from '../domain/progress';
import { upsertSnapshot } from '../domain/scurve';
import type { ISODateTime, Project } from '../types';

/** Geri alınabilecek en fazla adım. */
export const HISTORY_LIMIT = 100;

export function pushHistory(stack: Project[], project: Project): Project[] {
  return [...stack, project].slice(-HISTORY_LIMIT);
}

/**
 * Geri alınan/yinelenen projeye şu anki görünüm durumunu taşır: tema, zoom ve grupların
 * açık/kapalı hâli geçmişe yazılmaz, bu yüzden geri almada değişmemelidir.
 */
export function keepViewState(restored: Project, current: Project): Project {
  const expanded = new Map(current.groups.map((g) => [g.id, g.expanded]));
  return {
    ...restored,
    settings: current.settings,
    groups: restored.groups.map((g) => {
      const value = expanded.get(g.id) ?? g.expanded;
      return value === g.expanded ? g : { ...g, expanded: value };
    }),
  };
}

/** Genel ilerleme değiştiyse bugünün ilerleme kaydını ekler/günceller (S-eğrisi için). */
export function recordProgress(previous: Project, next: Project, now: ISODateTime): Project {
  const after = overallProgress(next.groups);
  if (overallProgress(previous.groups) === after) return next;
  const snapshots = upsertSnapshot(next.progressSnapshots, now, after);
  return snapshots === next.progressSnapshots ? next : { ...next, progressSnapshots: snapshots };
}

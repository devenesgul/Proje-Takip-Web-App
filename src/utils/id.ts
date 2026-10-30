// Benzersiz ve sabit ID üretimi (PROJECT.md Bölüm 5.3).
export function newId(): string {
  return crypto.randomUUID();
}

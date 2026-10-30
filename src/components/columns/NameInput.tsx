// Ad düzenleme kutusu: Enter veya odak çıkışında kaydeder, Esc vazgeçer.
// Kayıt reddedilirse (boş/yinelenen ad) hata gösterilir ve eski ad geri gelir.
// Dışarıdan ad değişirse sıfırlanması için çağıran taraf `key={value}` vermelidir.
import { useState } from 'react';

interface NameInputProps {
  value: string;
  label: string;
  /** null = kaydedildi, metin = hata mesajı */
  onCommit: (text: string) => string | null;
}

export function NameInput({ value, label, onCommit }: NameInputProps) {
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);

  const commit = () => {
    if (draft.trim() === value) return setDraft(value);
    const message = onCommit(draft);
    setError(message);
    if (message) setDraft(value);
  };

  return (
    <span className="name-input">
      <input
        aria-label={label}
        aria-invalid={error !== null}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setError(null);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape') {
            // Modalın kapanmasını engelle; yalnızca bu düzenlemeden vazgeç.
            e.preventDefault();
            e.stopPropagation();
            setDraft(value);
            setError(null);
          }
        }}
      />
      {error && (
        <span className="form-error" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}

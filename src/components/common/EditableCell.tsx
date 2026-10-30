// Satır içi düzenlenebilir hücre: tıkla → yaz → Enter kaydeder, Esc vazgeçer.
// Geçersiz girişte kayıt yapılmaz: Enter'da hata gösterilir; odak dışına çıkılırsa değer geri alınır
// ve uyarı bildirim çubuğunda gösterilir.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useUiStore } from '../../store/uiStore';

/** Kaydetme sonucu: null = başarılı, metin = hata mesajı. */
export type CommitHandler = (text: string) => string | null;

interface EditableCellProps {
  /** Düzenleme dışındayken gösterilen içerik */
  display: ReactNode;
  /** Düzenlemeye başlarken input'a konan metin */
  value: string;
  onCommit: CommitHandler;
  /** Ekran okuyucu ve ipucu için alan adı */
  label: string;
  inputType?: 'text' | 'date' | 'datetime-local' | 'url';
  /** Sayısal girişte mobil klavye için */
  inputMode?: 'decimal' | 'text';
  placeholder?: string;
  className?: string;
}

export function EditableCell({
  display,
  value,
  onCommit,
  label,
  inputType = 'text',
  inputMode = 'text',
  placeholder = '—',
  className = '',
}: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  /** Düzenleme kapatıldıktan sonra gelen blur olayını yok saymak için */
  const closedRef = useRef(false);
  /** Klavyeyle kapatıldıysa odağı hücreye geri ver */
  const refocusRef = useRef(false);
  const showNotice = useUiStore((state) => state.showNotice);

  useEffect(() => {
    if (!editing && refocusRef.current) {
      refocusRef.current = false;
      buttonRef.current?.focus();
    }
  }, [editing]);

  const start = () => {
    closedRef.current = false;
    setDraft(value);
    setError(null);
    setEditing(true);
  };

  const close = (refocus: boolean) => {
    closedRef.current = true;
    refocusRef.current = refocus;
    setEditing(false);
    setError(null);
  };

  /** Değişiklik varsa kaydetmeyi dener; hata mesajını (varsa) döner. */
  const tryCommit = (): string | null => (draft === value ? null : onCommit(draft));

  if (!editing) {
    const empty = display === '' || display === null || display === undefined;
    return (
      <button
        ref={buttonRef}
        type="button"
        className={`cell-button ${className}`}
        onClick={start}
        title={
          typeof display === 'string' && display !== ''
            ? display
            : `${label}: düzenlemek için tıklayın`
        }
        aria-label={`${label} düzenle`}
      >
        {empty ? <span className="cell-placeholder">{placeholder}</span> : display}
      </button>
    );
  }

  return (
    <span className="cell-editor">
      <input
        autoFocus
        type={inputType}
        inputMode={inputMode}
        className={`cell-input ${className}`}
        aria-label={label}
        aria-invalid={error !== null}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          setError(null);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            const message = tryCommit();
            if (message) setError(message);
            else close(true);
          } else if (event.key === 'Escape') {
            event.preventDefault();
            close(true);
          }
        }}
        onBlur={() => {
          if (closedRef.current) return;
          const message = tryCommit();
          if (message)
            showNotice({ kind: 'error', text: `${label}: ${message}. Değer kaydedilmedi.` });
          close(false);
        }}
      />
      {error && (
        <span className="cell-error" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}

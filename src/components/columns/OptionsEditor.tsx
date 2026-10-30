// Seçim tipi sütunun seçenek listesi: ekle, yeniden adlandır, renk seç, sil.
// Kullanımdaki seçenek silinirken kaç hücrenin boşalacağı sorulur.
import { useState } from 'react';
import { countOptionUses } from '../../domain/columns';
import { useProjectStore } from '../../store/projectStore';
import type { ColumnDefinition } from '../../types';
import { NameInput } from './NameInput';

const DEFAULT_OPTION_COLOR = '#64748b';

interface OptionsEditorProps {
  column: ColumnDefinition;
}

export function OptionsEditor({ column }: OptionsEditorProps) {
  const groups = useProjectStore((state) => state.project.groups);
  const addOption = useProjectStore((state) => state.addOption);
  const renameOption = useProjectStore((state) => state.renameOption);
  const setOptionColor = useProjectStore((state) => state.setOptionColor);
  const removeOption = useProjectStore((state) => state.removeOption);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const options = column.options ?? [];

  const add = () => {
    const result = addOption(column.id, draft);
    if (result.ok) setDraft('');
    setError(result.ok ? null : result.message);
  };

  const remove = (value: string) => {
    const uses = countOptionUses(groups, column.id, value);
    const detail = uses > 0 ? ` ${uses} kalemde seçili; bu hücreler boşalacak.` : '';
    if (window.confirm(`"${value}" seçeneği silinsin mi?${detail}`)) removeOption(column.id, value);
  };

  return (
    <div className="options-editor">
      <ul className="options-list">
        {options.map((option) => (
          <li key={option.value} className="option-row">
            <input
              type="color"
              aria-label={`${option.value} rengi`}
              value={option.color ?? DEFAULT_OPTION_COLOR}
              onChange={(e) => setOptionColor(column.id, option.value, e.target.value)}
            />
            <NameInput
              key={option.value}
              label="Seçenek adı"
              value={option.value}
              onCommit={(text) => {
                const result = renameOption(column.id, option.value, text);
                return result.ok ? null : result.message;
              }}
            />
            <span className="option-uses">
              {countOptionUses(groups, column.id, option.value)} kalem
            </span>
            <button
              type="button"
              className="icon-button danger"
              aria-label={`${option.value} seçeneğini sil`}
              onClick={() => remove(option.value)}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <div className="option-add">
        <input
          aria-label="Yeni seçenek"
          placeholder="Yeni seçenek"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className="button" onClick={add}>
          + Seçenek
        </button>
        {error && (
          <span className="form-error" role="alert">
            {error}
          </span>
        )}
      </div>
    </div>
  );
}

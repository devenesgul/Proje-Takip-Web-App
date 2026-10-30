// Sütun yöneticisi (modal): özel sütun ekle, yeniden adlandır, tip değiştir, sırala, gizle/göster, sil.
// Değişiklikler anında uygulanır. Veri kaybettiren işlemler (silme, dönüşmeyen tip değişimi)
// önce kaç değerin etkileneceğini söyleyip onay ister.
import { useState } from 'react';
import {
  changeColumnType,
  COLUMN_TYPE_LABELS,
  countColumnValues,
  sortColumns,
} from '../../domain/columns';
import { useProjectStore } from '../../store/projectStore';
import type { ColumnDefinition, ColumnType } from '../../types';
import { Modal } from '../common/Modal';
import { NameInput } from './NameInput';
import { OptionsEditor } from './OptionsEditor';

const COLUMN_TYPES = Object.keys(COLUMN_TYPE_LABELS) as ColumnType[];

function TypeSelect({
  value,
  onChange,
  label,
}: {
  value: ColumnType;
  onChange: (type: ColumnType) => void;
  label: string;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as ColumnType)}
    >
      {COLUMN_TYPES.map((type) => (
        <option key={type} value={type}>
          {COLUMN_TYPE_LABELS[type]}
        </option>
      ))}
    </select>
  );
}

interface ColumnRowProps {
  column: ColumnDefinition;
  isFirst: boolean;
  isLast: boolean;
}

function ColumnRow({ column, isFirst, isLast }: ColumnRowProps) {
  const groups = useProjectStore((state) => state.project.groups);
  const updateColumn = useProjectStore((state) => state.updateColumn);
  const moveColumn = useProjectStore((state) => state.moveColumn);
  const removeColumn = useProjectStore((state) => state.removeColumn);
  const setColumnType = useProjectStore((state) => state.setColumnType);

  const changeType = (type: ColumnType) => {
    const { lost } = changeColumnType(groups, column.id, type);
    const message =
      `"${column.name}" sütununda ${lost} değer ${COLUMN_TYPE_LABELS[type].toLocaleLowerCase('tr')} ` +
      'tipine dönüştürülemiyor ve silinecek. Devam edilsin mi?';
    if (lost === 0 || window.confirm(message)) setColumnType(column.id, type);
  };

  const remove = () => {
    const count = countColumnValues(groups, column.id);
    const message =
      count > 0
        ? `"${column.name}" sütunu ve ${count} kalemdeki değeri kalıcı olarak silinecek.\n` +
          'Bu işlem geri alınamaz. Gerekirse önce "Dışa aktar" ile yedek alın.\n\nSilinsin mi?'
        : `"${column.name}" sütunu silinsin mi? (Bu sütunda değer yok.)`;
    if (window.confirm(message)) removeColumn(column.id);
  };

  return (
    <li className="column-row">
      <div className="column-row-main">
        <NameInput
          key={column.name}
          label="Sütun adı"
          value={column.name}
          onCommit={(text) => {
            if (text.trim() === '') return 'Ad boş olamaz';
            updateColumn(column.id, { name: text.trim() });
            return null;
          }}
        />
        <TypeSelect label={`${column.name} tipi`} value={column.type} onChange={changeType} />
        <label className="column-visible">
          <input
            type="checkbox"
            checked={column.visible}
            onChange={(e) => updateColumn(column.id, { visible: e.target.checked })}
          />
          Göster
        </label>
        <button
          type="button"
          className="icon-button"
          aria-label={`${column.name} sütununu yukarı taşı`}
          disabled={isFirst}
          onClick={() => moveColumn(column.id, -1)}
        >
          ↑
        </button>
        <button
          type="button"
          className="icon-button"
          aria-label={`${column.name} sütununu aşağı taşı`}
          disabled={isLast}
          onClick={() => moveColumn(column.id, 1)}
        >
          ↓
        </button>
        <button
          type="button"
          className="icon-button danger"
          aria-label={`${column.name} sütununu sil`}
          onClick={remove}
        >
          🗑
        </button>
      </div>
      {column.type === 'select' && <OptionsEditor column={column} />}
    </li>
  );
}

function AddColumnForm() {
  const addColumn = useProjectStore((state) => state.addColumn);
  const [name, setName] = useState('');
  const [type, setType] = useState<ColumnType>('text');
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    if (name.trim() === '') return setError('Sütun adı girin');
    addColumn(name.trim(), type);
    setName('');
    setError(null);
  };

  return (
    <form
      className="column-add"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <input
        aria-label="Yeni sütun adı"
        placeholder="Yeni sütun adı (ör. Taşeron)"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setError(null);
        }}
      />
      <TypeSelect label="Yeni sütun tipi" value={type} onChange={setType} />
      <button type="submit" className="button primary">
        + Sütun ekle
      </button>
      {error && (
        <span className="form-error" role="alert">
          {error}
        </span>
      )}
    </form>
  );
}

interface ColumnManagerProps {
  onClose: () => void;
}

export function ColumnManager({ onClose }: ColumnManagerProps) {
  const columns = sortColumns(useProjectStore((state) => state.project.columns));

  return (
    <Modal
      title="Sütunlar"
      onClose={onClose}
      footer={
        <button type="button" className="button primary" onClick={onClose}>
          Tamam
        </button>
      }
    >
      <AddColumnForm />
      {columns.length === 0 ? (
        <p className="muted">Henüz özel sütun yok. Yukarıdan ilk sütunu ekleyin.</p>
      ) : (
        <ul className="column-list">
          {columns.map((column, index) => (
            <ColumnRow
              key={column.id}
              column={column}
              isFirst={index === 0}
              isLast={index === columns.length - 1}
            />
          ))}
        </ul>
      )}
    </Modal>
  );
}

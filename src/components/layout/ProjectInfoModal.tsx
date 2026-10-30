// Proje künyesi düzenleme modalı: proje adı, başlangıç/bitiş ve serbest üst bilgi alanları
// (ekle/sil/düzenle). Değişiklikler "Kaydet"e basılana kadar taslakta tutulur.
import { useState } from 'react';
import { checkDateRange } from '../../domain/validation';
import { useProjectStore } from '../../store/projectStore';
import { fromInputValue, toInputValue } from '../../utils/date';
import { newId } from '../../utils/id';
import { Modal } from '../common/Modal';

interface DraftField {
  id: string;
  key: string;
  value: string;
}

interface ProjectInfoModalProps {
  onClose: () => void;
}

export function ProjectInfoModal({ onClose }: ProjectInfoModalProps) {
  const project = useProjectStore((state) => state.project);
  const updateProject = useProjectStore((state) => state.updateProject);
  const setInfo = useProjectStore((state) => state.setInfo);

  const [name, setName] = useState(project.name);
  const [start, setStart] = useState(toInputValue(project.start));
  const [end, setEnd] = useState(toInputValue(project.end));
  const [fields, setFields] = useState<DraftField[]>(() =>
    project.info.map((field) => ({ id: newId(), ...field })),
  );
  const [error, setError] = useState<string | null>(null);

  const changeField = (id: string, patch: Partial<DraftField>) =>
    setFields((list) => list.map((field) => (field.id === id ? { ...field, ...patch } : field)));

  const save = () => {
    const startIso = fromInputValue(start);
    const endIso = fromInputValue(end);
    if (name.trim() === '') return setError('Proje adı boş olamaz');
    if (!startIso || !endIso) return setError('Proje başlangıç ve bitiş tarihi gerekli');
    const range = checkDateRange({ start: startIso, end: endIso });
    if (!range.ok) return setError(range.message);

    updateProject({ name: name.trim(), start: startIso, end: endIso });
    setInfo(
      fields
        .map(({ key, value }) => ({ key: key.trim(), value: value.trim() }))
        .filter(({ key, value }) => key !== '' || value !== ''),
    );
    onClose();
  };

  return (
    <Modal
      title="Proje künyesi"
      onClose={onClose}
      footer={
        <>
          {error && (
            <span className="form-error" role="alert">
              {error}
            </span>
          )}
          <button type="button" className="button" onClick={onClose}>
            İptal
          </button>
          <button type="button" className="button primary" onClick={save}>
            Kaydet
          </button>
        </>
      }
    >
      <div className="form-grid">
        <label>
          Proje adı
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          İşe başlama
          <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label>
          İş bitimi
          <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
      </div>

      <h3>Üst bilgi alanları</h3>
      <ul className="info-list">
        {fields.map((field) => (
          <li key={field.id} className="info-row">
            <input
              aria-label="Alan adı"
              placeholder="Alan adı (ör. Yüklenici)"
              value={field.key}
              onChange={(e) => changeField(field.id, { key: e.target.value })}
            />
            <input
              aria-label={`${field.key || 'Alan'} değeri`}
              placeholder="Değer"
              value={field.value}
              onChange={(e) => changeField(field.id, { value: e.target.value })}
            />
            <button
              type="button"
              className="icon-button danger"
              aria-label={`${field.key || 'Alanı'} sil`}
              onClick={() => setFields((list) => list.filter((f) => f.id !== field.id))}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="button"
        onClick={() => setFields((list) => [...list, { id: newId(), key: '', value: '' }])}
      >
        + Alan ekle
      </button>
    </Modal>
  );
}

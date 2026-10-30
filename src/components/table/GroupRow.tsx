// İş kısmı (grup) satırı: aç/kapat, ad düzenleme, hesaplanan ağırlık ve ilerleme, kalem ekle, sil.
import type { CSSProperties } from 'react';
import { groupProgress, groupWeight } from '../../domain/progress';
import { useProjectStore } from '../../store/projectStore';
import type { Group } from '../../types';
import { formatPercent } from '../../utils/number';
import { EditableCell } from '../common/EditableCell';
import { ProgressBar } from '../common/ProgressBar';

interface GroupRowProps {
  group: Group;
  /** Grup satırında özel sütun hücreleri boş kalır; yalnızca sayısı gerekir. */
  customColumnCount: number;
}

export function GroupRow({ group, customColumnCount }: GroupRowProps) {
  const toggleGroup = useProjectStore((state) => state.toggleGroup);
  const updateGroup = useProjectStore((state) => state.updateGroup);
  const removeGroup = useProjectStore((state) => state.removeGroup);
  const addItem = useProjectStore((state) => state.addItem);

  const progress = groupProgress(group);

  const handleRemove = () => {
    const count = group.items.length;
    const detail = count > 0 ? ` İçindeki ${count} kalem de silinecek.` : '';
    if (window.confirm(`"${group.name}" iş kısmı silinsin mi?${detail} Bu işlem geri alınamaz.`)) {
      removeGroup(group.id);
    }
  };

  return (
    <tr className="group-row" style={{ '--group-color': group.color } as CSSProperties}>
      <td className="col-name">
        <span className="group-name">
          <button
            type="button"
            className="icon-button toggle"
            onClick={() => toggleGroup(group.id)}
            aria-expanded={group.expanded}
            aria-label={`${group.name} ${group.expanded ? 'daralt' : 'genişlet'}`}
          >
            {group.expanded ? '▼' : '▶'}
          </button>
          <span className="group-swatch" aria-hidden="true" />
          <EditableCell
            label="İş kısmı adı"
            display={group.name}
            value={group.name}
            onCommit={(text) => {
              if (text.trim() === '') return 'Ad boş olamaz';
              updateGroup(group.id, { name: text.trim() });
              return null;
            }}
          />
        </span>
      </td>
      <td className="col-num" title="Kalem ağırlıklarının toplamı">
        {formatPercent(groupWeight(group))}
      </td>
      <td className="col-date" />
      <td className="col-date" />
      <td className="col-progress">
        <ProgressBar value={progress} label={`${group.name} ilerleme`} />
        <span className="progress-value">{formatPercent(progress)}</span>
      </td>
      {Array.from({ length: customColumnCount }, (_, index) => (
        <td key={index} className="col-custom" />
      ))}
      <td className="col-actions">
        <button
          type="button"
          className="icon-button"
          onClick={() => addItem(group.id)}
          title="Kalem ekle"
          aria-label={`${group.name} grubuna kalem ekle`}
        >
          ＋
        </button>
        <button
          type="button"
          className="icon-button danger"
          onClick={handleRemove}
          title="İş kısmını sil"
          aria-label={`${group.name} iş kısmını sil`}
        >
          🗑
        </button>
      </td>
    </tr>
  );
}

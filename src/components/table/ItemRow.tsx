// Kalem satırı: ad, ağırlık, planlanan başlangıç/bitiş ve tamamlanma satır içi düzenlenir.
// Geciken kalem kırmızı gösterilir ve yanında "Gecikti" etiketi bulunur (yalnızca renge dayanmaz).
import type { CheckResult } from '../../domain/validation';
import { useProjectStore, type ItemPatch } from '../../store/projectStore';
import type { ColumnDefinition, Item } from '../../types';
import { formatDateTime, fromInputValue, toInputValue } from '../../utils/date';
import { formatNumber, formatPercent, parseDecimal } from '../../utils/number';
import { EditableCell, type CommitHandler } from '../common/EditableCell';
import { ProgressBar } from '../common/ProgressBar';
import { CustomCell } from './CustomCell';

const INVALID_NUMBER = 'Geçerli bir sayı girin';
const toMessage = (result: CheckResult) => (result.ok ? null : result.message);

interface ItemRowProps {
  groupId: string;
  item: Item;
  delayed: boolean;
  /** Görünür özel sütunlar, sırasıyla */
  columns: ColumnDefinition[];
}

export function ItemRow({ groupId, item, delayed, columns }: ItemRowProps) {
  const updateItem = useProjectStore((state) => state.updateItem);
  const removeItem = useProjectStore((state) => state.removeItem);
  const duplicateItem = useProjectStore((state) => state.duplicateItem);

  const update = (patch: ItemPatch) => toMessage(updateItem(groupId, item.id, patch));

  const commitNumber =
    (field: 'weight' | 'progress'): CommitHandler =>
    (text) => {
      const value = parseDecimal(text);
      return value === null ? INVALID_NUMBER : update({ [field]: value });
    };

  const commitPlanned =
    (field: 'start' | 'end'): CommitHandler =>
    (text) =>
      update({ planned: { [field]: fromInputValue(text) } });

  const handleRemove = () => {
    if (window.confirm(`"${item.name}" kalemi silinsin mi? Bu işlem geri alınamaz.`)) {
      removeItem(groupId, item.id);
    }
  };

  return (
    <tr className={delayed ? 'item-row is-delayed' : 'item-row'}>
      <td className="col-name item-name">
        <EditableCell
          label="Kalem adı"
          display={item.name}
          value={item.name}
          onCommit={(text) =>
            text.trim() === '' ? 'Ad boş olamaz' : update({ name: text.trim() })
          }
        />
        {delayed && <span className="badge badge-delayed">Gecikti</span>}
      </td>
      <td className="col-num">
        <EditableCell
          label="Ağırlık"
          inputMode="decimal"
          display={formatPercent(item.weight)}
          value={formatNumber(item.weight)}
          onCommit={commitNumber('weight')}
        />
      </td>
      <td className="col-date">
        <EditableCell
          label="Planlanan başlangıç"
          inputType="datetime-local"
          display={formatDateTime(item.planned.start)}
          value={toInputValue(item.planned.start)}
          placeholder="tarih yok"
          onCommit={commitPlanned('start')}
        />
      </td>
      <td className="col-date">
        <EditableCell
          label="Planlanan bitiş"
          inputType="datetime-local"
          display={formatDateTime(item.planned.end)}
          value={toInputValue(item.planned.end)}
          placeholder="tarih yok"
          onCommit={commitPlanned('end')}
        />
      </td>
      <td className="col-progress">
        <ProgressBar value={item.progress} label={`${item.name} tamamlanma`} />
        <EditableCell
          label="Tamamlanma"
          inputMode="decimal"
          className="progress-value"
          display={formatPercent(item.progress)}
          value={formatNumber(item.progress)}
          onCommit={commitNumber('progress')}
        />
      </td>
      {columns.map((column) => (
        <td key={column.id} className={`col-custom col-custom-${column.type}`}>
          <CustomCell column={column} groupId={groupId} item={item} />
        </td>
      ))}
      <td className="col-actions">
        <button
          type="button"
          className="icon-button"
          onClick={() => duplicateItem(groupId, item.id)}
          title="Kopyala"
          aria-label={`${item.name} kalemini kopyala`}
        >
          ⧉
        </button>
        <button
          type="button"
          className="icon-button danger"
          onClick={handleRemove}
          title="Sil"
          aria-label={`${item.name} kalemini sil`}
        >
          🗑
        </button>
      </td>
    </tr>
  );
}

// Özel sütun hücresi: sütun tipine göre uygun editörü gösterir
// (metin, sayı, tarih, seçim, onay, bağlantı). Değer store'a setCustomValue ile yazılır.
// İçe aktarılan dosyada tipe uymayan değer olabilir; o durumda değer olduğu gibi metin gösterilir.
import type { CSSProperties } from 'react';
import { safeHref } from '../../domain/columns';
import { useProjectStore } from '../../store/projectStore';
import type { ColumnDefinition, CustomValue, Item } from '../../types';
import { formatDate } from '../../utils/date';
import { formatNumber, parseDecimal } from '../../utils/number';
import { EditableCell } from '../common/EditableCell';

interface CustomCellProps {
  column: ColumnDefinition;
  groupId: string;
  item: Item;
}

const asText = (value: CustomValue | undefined) =>
  value === undefined || value === null ? '' : String(value);

export function CustomCell({ column, groupId, item }: CustomCellProps) {
  const setCustomValue = useProjectStore((state) => state.setCustomValue);
  const value = item.custom[column.id];
  const write = (next: CustomValue) => setCustomValue(groupId, item.id, column.id, next);
  const label = `${item.name} – ${column.name}`;

  switch (column.type) {
    case 'number':
      return (
        <EditableCell
          label={label}
          inputMode="decimal"
          className="custom-number"
          display={typeof value === 'number' ? formatNumber(value) : asText(value)}
          value={typeof value === 'number' ? formatNumber(value) : asText(value)}
          onCommit={(text) => {
            const parsed = text.trim() === '' ? null : parseDecimal(text);
            if (text.trim() !== '' && parsed === null) return 'Geçerli bir sayı girin';
            write(parsed);
            return null;
          }}
        />
      );

    case 'date':
      return (
        <EditableCell
          label={label}
          inputType="date"
          display={formatDate(asText(value))}
          value={asText(value)}
          onCommit={(text) => {
            write(text === '' ? null : text);
            return null;
          }}
        />
      );

    case 'checkbox':
      return (
        <input
          type="checkbox"
          className="custom-checkbox"
          aria-label={label}
          checked={value === true}
          onChange={(event) => write(event.target.checked)}
        />
      );

    case 'select': {
      const options = column.options ?? [];
      const current = asText(value);
      const known = options.find((o) => o.value === current);
      const style = { '--option-color': known?.color } as CSSProperties;
      return (
        <select
          className={`custom-select ${current ? 'has-value' : ''}`}
          style={style}
          aria-label={label}
          value={current}
          onChange={(event) => write(event.target.value === '' ? null : event.target.value)}
        >
          <option value="">—</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.value}
            </option>
          ))}
          {/* Seçenek listesinde olmayan eski değer kaybolmasın diye gösterilir. */}
          {current && !known && <option value={current}>{current} (listede yok)</option>}
        </select>
      );
    }

    case 'link': {
      const text = asText(value);
      const href = safeHref(text);
      return (
        <span className="link-cell">
          {href ? (
            <a href={href} target="_blank" rel="noopener noreferrer" title={href}>
              {text.replace(/^https?:\/\//, '')}
            </a>
          ) : (
            text && (
              <span className="cell-placeholder" title="Geçersiz bağlantı">
                {text}
              </span>
            )
          )}
          <EditableCell
            label={label}
            inputType="url"
            display={text ? '✎' : ''}
            placeholder="+ bağlantı"
            value={text}
            onCommit={(next) => {
              const trimmed = next.trim();
              if (trimmed !== '' && !safeHref(trimmed)) {
                return 'Geçerli bir web adresi girin (http/https/mailto)';
              }
              write(trimmed === '' ? null : trimmed);
              return null;
            }}
          />
        </span>
      );
    }

    case 'text':
      return (
        <EditableCell
          label={label}
          display={asText(value)}
          value={asText(value)}
          onCommit={(text) => {
            write(text.trim() === '' ? null : text.trim());
            return null;
          }}
        />
      );
  }
}

// Ağaç tablo: iş kısımları (grup) ve altlarındaki imalat kalemleri.
// Satırlar Gantt ile aynı listeden (visibleRows) çizilir; kaydırma alanı dışarıdan bağlanır.
import type { Ref, UIEventHandler } from 'react';
import type { Row } from '../../domain/rows';
import { visibleColumns } from '../../domain/columns';
import { isDelayed } from '../../domain/schedule';
import { useProjectStore } from '../../store/projectStore';
import type { ISODateTime } from '../../types';
import { GroupRow } from './GroupRow';
import { ItemRow } from './ItemRow';

/** Sabit sütunlar: ad, ağırlık, başlangıç, bitiş, tamamlanma, işlemler */
const FIXED_COLUMN_COUNT = 6;

interface ProjectTableProps {
  rows: Row[];
  now: ISODateTime;
  scrollRef: Ref<HTMLDivElement>;
  onScroll: UIEventHandler<HTMLDivElement>;
}

export function ProjectTable({ rows, now, scrollRef, onScroll }: ProjectTableProps) {
  const addItem = useProjectStore((state) => state.addItem);
  const allColumns = useProjectStore((state) => state.project.columns);
  const columns = visibleColumns(allColumns);

  return (
    <div className="pane table-pane" ref={scrollRef} onScroll={onScroll}>
      <table className="tree-table">
        <thead>
          <tr>
            <th className="col-name">İş kısmı / Kalem</th>
            <th className="col-num">Ağırlık</th>
            <th className="col-date">Başlangıç</th>
            <th className="col-date">Bitiş</th>
            <th className="col-progress">Tamamlanma</th>
            {columns.map((column) => (
              <th key={column.id} className={`col-custom col-custom-${column.type}`}>
                {column.name}
              </th>
            ))}
            <th className="col-actions">
              <span className="visually-hidden">İşlemler</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            switch (row.kind) {
              case 'group':
                return (
                  <GroupRow key={row.key} group={row.group} customColumnCount={columns.length} />
                );
              case 'item':
                return (
                  <ItemRow
                    key={row.key}
                    groupId={row.group.id}
                    item={row.item}
                    delayed={isDelayed(row.item, now)}
                    columns={columns}
                  />
                );
              case 'empty':
                return (
                  <tr key={row.key} className="item-row empty-row">
                    <td colSpan={FIXED_COLUMN_COUNT + columns.length}>
                      Bu iş kısmında kalem yok.{' '}
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => addItem(row.group.id)}
                      >
                        İlk kalemi ekle
                      </button>
                    </td>
                  </tr>
                );
            }
          })}
        </tbody>
      </table>
    </div>
  );
}

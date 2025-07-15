'use client';

import React, { useState, useMemo, Fragment } from 'react';
import { ColumnDef, DataTableProps } from '@/types';
import Pagination from '../Pagination';
import styles from './DataTable.module.css';

const ITEMS_PER_PAGE = 10;

export function DataTable<T extends { id: number | string }>({
  columns,
  data,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState<number | string | null>(null);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return data.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentPage, data]);

  const handleRowClick = (id: number | string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const hiddenOnMobileColumns = columns.filter(
    col => col.responsiveClass === 'tablet' || col.responsiveClass === 'desktop'
  );

  return (
    <div className={styles.tableWrapper}>
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={`${column.header}-${String(column.accessorKey)}`} className={styles[column.responsiveClass || '']}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row) => {
                const isExpanded = expandedRow === row.id;
                return (
                  <Fragment key={row.id}>
                    <tr onClick={() => handleRowClick(row.id)} className={styles.dataRow}>
                      {columns.map((column) => {
                        const value = row[column.accessorKey];
                        const cellKey = `${row.id}-${column.header}`;
                        return (
                          <td key={cellKey} className={styles[column.responsiveClass || '']}>
                            {column.cell ? column.cell(value, row) : String(value)}
                          </td>
                        );
                      })}
                    </tr>
                    {isExpanded && (
                       <tr className={styles.expandedRow}>
                          <td colSpan={columns.length}>
                              <div className={styles.expandedContent}>
                                  <h4>Full Details:</h4>
                                  {hiddenOnMobileColumns.map(col => (
                                      // CORRECTED: The key now uses the unique column header
                                      <p key={`expanded-${row.id}-${col.header}`}>
                                          <strong>{col.header}:</strong>
                                          <span>{col.cell ? col.cell(row[col.accessorKey], row) : String(row[col.accessorKey])}</span>
                                      </p>
                                  ))}
                              </div>
                          </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            ) : (
              <tr><td colSpan={columns.length} className={styles.noDataCell}>No data available.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination currentPage={currentPage} totalItems={data.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={(page) => setCurrentPage(page)} />
    </div>
  );
}
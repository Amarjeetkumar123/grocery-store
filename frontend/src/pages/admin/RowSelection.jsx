import { useEffect, useRef, useState } from 'react';
import { callApi } from '../../apiClient.js';
import { Icon } from '../../Icon.jsx';
import { useDialog } from '../../components/DialogProvider.jsx';
import { useToast } from '../../components/ToastProvider.jsx';

// Ticked rows of a table. Only rows still on screen count, so paging or
// filtering never deletes a row you cannot see.
export function useRowSelection(selectableIds) {
  const [tickedIds, setTickedIds] = useState(() => new Set());
  const selectedIds = selectableIds.filter((id) => tickedIds.has(id));
  const allSelected = selectableIds.length > 0 && selectedIds.length === selectableIds.length;
  function toggle(id) {
    setTickedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  return {
    selectedIds, allSelected, toggle,
    hasSelectable: selectableIds.length > 0,
    isSelected: (id) => selectedIds.includes(id),
    toggleAll: () => setTickedIds(new Set(allSelected ? [] : selectableIds)),
    clear: () => setTickedIds(new Set()),
  };
}

// Header checkbox: ticks every selectable row; shows a dash when only some are ticked.
export function SelectAllCheckbox({ selection, label }) {
  const checkboxRef = useRef(null);
  const someSelected = selection.selectedIds.length > 0 && !selection.allSelected;
  useEffect(() => {
    checkboxRef.current.indeterminate = someSelected;
  }, [someSelected]);
  return (
    <input ref={checkboxRef} type="checkbox" className="row-checkbox" checked={selection.allSelected}
      disabled={!selection.hasSelectable} onChange={selection.toggleAll} aria-label={label} />
  );
}

// Sits on top of the table while rows are ticked.
export function SelectionBar({ count, noun, onClear, onDelete, deleting }) {
  if (count === 0) return null;
  return (
    <div className="selection-bar">
      <strong>{count} {noun} selected</strong>
      <button type="button" className="text-button small-text-button" onClick={onClear}>Clear</button>
      <button type="button" className="button button-compact button-danger" onClick={onDelete} disabled={deleting}>
        {deleting ? <span className="spinner" aria-hidden="true" /> : <Icon name="trash" size={16} />} Delete selected
      </button>
    </div>
  );
}

// "Besan, Maida and 2 more"
function namesOf(items, nameOf) {
  const names = items.slice(0, 3).map(nameOf).join(', ');
  return items.length > 3 ? `${names} and ${items.length - 3} more` : names;
}

// ponytail: one DELETE per row; add a bulk endpoint if tables grow past ~50 rows a page.
async function deleteEach(items, pathOf) {
  const results = await Promise.allSettled(items.map((item) => callApi(pathOf(item), { method: 'DELETE' })));
  return {
    deleted: items.filter((item, index) => results[index].status === 'fulfilled'),
    failed: items.filter((item, index) => results[index].status === 'rejected'),
    firstError: results.find((result) => result.status === 'rejected')?.reason.message,
  };
}

// One row or many: asks first, deletes, then says what happened in a toast.
// words: { one: 'product', many: 'products', warning: 'Their pack sizes go too.' }
export function useDeleteRows({ words, pathOf, nameOf, onDone }) {
  const dialog = useDialog();
  const showToast = useToast();
  const [deleting, setDeleting] = useState(false);
  async function deleteRows(items) {
    const one = items.length === 1;
    const confirmed = await dialog.confirm({
      title: one ? `Delete ${nameOf(items[0])}?` : `Delete ${items.length} ${words.many}?`,
      message: `${one ? '' : `${namesOf(items, nameOf)}. `}${words.warning ?? ''} This cannot be undone.`.trim(),
      confirmLabel: one ? 'Delete' : `Delete ${items.length}`, tone: 'danger',
    });
    if (!confirmed) return;
    setDeleting(true);
    const { deleted, failed, firstError } = await deleteEach(items, pathOf);
    if (deleted.length > 0) showToast(deleted.length === 1 ? `${nameOf(deleted[0])} deleted` : `${deleted.length} ${words.many} deleted`);
    if (failed.length > 0) showToast(one ? firstError : `Not deleted: ${namesOf(failed, nameOf)}. ${firstError}`, 'error');
    await onDone();
    setDeleting(false);
  }
  return { deleting, deleteRows };
}

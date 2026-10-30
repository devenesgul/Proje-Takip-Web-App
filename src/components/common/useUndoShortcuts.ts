// Klavye kısayolları: Ctrl/⌘+Z geri al, Ctrl/⌘+Shift+Z veya Ctrl+Y yinele.
// Bir metin kutusu/seçim odaktayken tarayıcının kendi geri alması çalışsın diye devreye girmez.
import { useEffect } from 'react';
import { useProjectStore } from '../../store/projectStore';

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

export function useUndoShortcuts(): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || isEditable(event.target)) return;
      const key = event.key.toLowerCase();
      const { undo, redo } = useProjectStore.getState();
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
}

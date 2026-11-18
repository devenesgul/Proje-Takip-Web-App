// Modal pencere: yerleşik <dialog> öğesi (odak hapsi ve Esc ile kapatma tarayıcıdan gelir).
import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Ek sınıf (ör. geniş pencere için "modal-wide") */
  className?: string;
}

export function Modal({ title, onClose, children, footer, className = '' }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={`modal ${className}`}
      aria-labelledby="modal-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className="modal-header">
        <h2 id="modal-title">{title}</h2>
        <button type="button" className="icon-button" onClick={onClose} aria-label="Kapat">
          ✕
        </button>
      </header>
      <div className="modal-body">{children}</div>
      {footer && <footer className="modal-footer">{footer}</footer>}
    </dialog>
  );
}

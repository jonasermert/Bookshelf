import { useEffect, useRef, type ReactNode } from 'react';
import Icon from './Icon';

export default function Modal({ title, busy, onClose, children }: {
  title: string; busy: boolean; onClose: () => void; children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    dialog.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <dialog ref={ref} aria-labelledby="modal-title" className="modal"
      onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
      <div className="mb-7 flex items-center justify-between gap-4">
        <h2 id="modal-title" className="text-2xl font-semibold">{title}</h2>
        <button type="button" className="icon-button" aria-label="Schlie�en" disabled={busy} onClick={onClose}><Icon name="close" /></button>
      </div>
      {children}
    </dialog>
  );
}

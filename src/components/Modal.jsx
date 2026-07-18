import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

// Accessible modal wrapper — Radix Dialog gives focus trap, Escape-to-close,
// click-outside-to-close, and ARIA wiring for free, styled with the
// existing .fab-modal* classes so it's a visual no-op.
export default function Modal({ open, onOpenChange, title, children }) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fab-modal-overlay" />
        <Dialog.Content className="fab-modal">
          <div className="fab-modal-header">
            <Dialog.Title asChild><span>{title}</span></Dialog.Title>
            <Dialog.Close asChild>
              <button aria-label="Close"><X size={16} /></button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

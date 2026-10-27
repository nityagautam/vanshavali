import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import Sheet from './Sheet';
import { usePhone } from '../hooks/useMediaQuery';

// Accessible modal wrapper — Radix Dialog gives focus trap, Escape-to-close,
// click-outside-to-close, and ARIA wiring for free. On phones the same
// content opens as a full-height bottom sheet (sticky actions, keyboard-aware
// scrolling); on wider screens it stays a centred card.
export default function Modal({ open, onOpenChange, title, wide = false, children }) {
  const isPhone = usePhone();

  if (isPhone) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange} title={title} snap="full" flush>
        {children}
      </Sheet>
    );
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fab-modal-overlay" />
        <Dialog.Content className={`fab-modal${wide ? ' fab-modal-wide' : ''}`} aria-describedby={undefined}>
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

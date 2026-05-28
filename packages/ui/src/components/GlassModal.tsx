import React, { useEffect, useRef } from 'react';

interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const GlassModal: React.FC<GlassModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = '',
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };

    dialog.addEventListener('cancel', handleCancel);
    return () => {
      dialog.removeEventListener('cancel', handleCancel);
    };
  }, [onClose]);

  // Close when clicking backdrop
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const rect = dialog.getBoundingClientRect();
    const isInDialog = (
      rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX && e.clientX <= rect.left + rect.width
    );

    if (!isInDialog) {
      onClose();
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className={`glass-panel border-none outline-none p-0 backdrop:backdrop-blur-md backdrop:bg-black/40 text-[var(--singr-text-primary)] max-w-lg w-full ${className}`.trim()}
    >
      <div className="p-6">
        {title && (
          <div className="flex justify-between items-center mb-4 border-b border-[var(--glass-border)] pb-3">
            <h3 className="text-xl font-bold font-sans tracking-wide">{title}</h3>
            <button
              onClick={onClose}
              className="text-[var(--singr-text-secondary)] hover:text-[var(--singr-text-primary)] transition-colors text-2xl font-light leading-none p-1"
              aria-label="Close modal"
            >
              &times;
            </button>
          </div>
        )}
        <div className="font-sans text-sm md:text-base leading-relaxed">
          {children}
        </div>
      </div>
    </dialog>
  );
};

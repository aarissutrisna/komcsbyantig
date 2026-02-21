import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}

export function Modal({ isOpen, onClose, title, children, footer }: ModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            const originalStyle = window.getComputedStyle(document.body).overflow;
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleEsc);
            return () => {
                document.body.style.overflow = originalStyle;
                window.removeEventListener('keydown', handleEsc);
            };
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // Use Portal to render to document.body to avoid "transform: translateY" from parents like .animate-fade-in
    // which breaks "position: fixed" context.
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
            {/* 1. Backdrop Layer (Strictly fixed) */}
            <div
                className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm animate-modal-backdrop"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* 2. Modal Card (Centering via Flexbox parent) */}
            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                className="relative z-10 w-full max-w-lg flex flex-col bg-white dark:bg-gray-900 shadow-2xl rounded-2xl animate-modal-appear modal-content overflow-hidden"
                style={{ maxHeight: '90vh' }}
            >
                {/* Header: Non-shrinking top */}
                <header className="flex-none flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-colors focus:outline-none"
                        aria-label="Tutup"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </header>

                {/* Body: Independent scroll - the core of the internal scroll logic */}
                <main className="flex-1 overflow-y-auto p-6 custom-scrollbar min-h-0">
                    <div className="min-h-0 flex flex-col">
                        {children}
                    </div>
                </main>

                {/* Footer: Non-shrinking bottom */}
                {footer && (
                    <footer className="flex-none p-6 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                        {footer}
                    </footer>
                )}
            </div>
        </div>,
        document.body
    );
}

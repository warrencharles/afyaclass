import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'info' | 'success';
    isLoading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    variant = 'info',
    isLoading = false
}) => {
    const getVariantStyles = () => {
        switch (variant) {
            case 'danger':
                return {
                    icon: <AlertTriangle className="text-red-500" size={32} />,
                    bg: 'bg-red-50',
                    border: 'border-red-100',
                    button: 'bg-red-600 hover:bg-red-700 shadow-red-200'
                };
            case 'warning':
                return {
                    icon: <AlertTriangle className="text-amber-500" size={32} />,
                    bg: 'bg-amber-50',
                    border: 'border-amber-100',
                    button: 'bg-amber-500 hover:bg-amber-600 shadow-amber-200'
                };
            case 'success':
                return {
                    icon: <CheckCircle2 className="text-green-500" size={32} />,
                    bg: 'bg-green-50',
                    border: 'border-green-100',
                    button: 'bg-green-600 hover:bg-green-700 shadow-green-200'
                };
            default:
                return {
                    icon: <Info className="text-blue-500" size={32} />,
                    bg: 'bg-blue-50',
                    border: 'border-blue-100',
                    button: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                };
        }
    };

    const styles = getVariantStyles();

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={""} size="md">
            <div className="p-6 text-center">
                <div className={cn("mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 animate-in zoom-in duration-300", styles.bg)}>
                    {styles.icon}
                </div>

                <h3 className="text-xl font-black text-slate-800 mb-2 tracking-tight">{title}</h3>
                <p className="text-slate-500 font-medium leading-relaxed mb-8">
                    {message}
                </p>

                <div className="grid grid-cols-2 gap-3">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        disabled={isLoading}
                        className="rounded-2xl py-3 font-bold text-slate-500 hover:bg-slate-100"
                    >
                        {cancelText}
                    </Button>
                    <Button
                        onClick={onConfirm}
                        isLoading={isLoading}
                        className={cn("rounded-2xl py-3 font-black text-white shadow-lg transition-all active:scale-95", styles.button)}
                    >
                        {confirmText}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

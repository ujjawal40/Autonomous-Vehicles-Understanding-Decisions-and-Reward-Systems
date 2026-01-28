/**
 * Toast Notification Component
 *
 * Non-intrusive notifications for user feedback.
 */

import { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS = {
  success: {
    bg: 'rgba(0, 255, 136, 0.1)',
    border: 'rgba(0, 255, 136, 0.3)',
    icon: '#00ff88',
  },
  error: {
    bg: 'rgba(255, 51, 102, 0.1)',
    border: 'rgba(255, 51, 102, 0.3)',
    icon: '#ff3366',
  },
  warning: {
    bg: 'rgba(255, 107, 53, 0.1)',
    border: 'rgba(255, 107, 53, 0.3)',
    icon: '#ff6b35',
  },
  info: {
    bg: 'rgba(0, 212, 255, 0.1)',
    border: 'rgba(0, 212, 255, 0.3)',
    icon: '#00d4ff',
  },
};

export function Toast({
  id,
  type,
  title,
  message,
  duration = 5000,
  onClose,
}: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);
  const Icon = ICONS[type];
  const colors = COLORS[type];

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => onClose(id), 300);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, id, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onClose(id), 300);
  };

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg border backdrop-blur-sm
        transition-all duration-300 ease-out
        ${isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}
      `}
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
      }}
    >
      <Icon size={20} style={{ color: colors.icon }} className="flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-white">{title}</h4>
        {message && (
          <p className="text-xs text-white/60 mt-1">{message}</p>
        )}
      </div>
      <button
        onClick={handleClose}
        className="flex-shrink-0 text-white/40 hover:text-white transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
}

// Toast Container
interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-80">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={onRemove} />
      ))}
    </div>
  );
}

// Hook for managing toasts
export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = (toast: Omit<ToastItem, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const success = (title: string, message?: string) =>
    addToast({ type: 'success', title, message });

  const error = (title: string, message?: string) =>
    addToast({ type: 'error', title, message });

  const warning = (title: string, message?: string) =>
    addToast({ type: 'warning', title, message });

  const info = (title: string, message?: string) =>
    addToast({ type: 'info', title, message });

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info,
  };
}

import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose, duration = 3000 }) => {
  useEffect(() => {
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [onClose, duration]);

  return <div className="toast">{message}</div>;
};

interface ToastState {
  message: string;
  id: number;
}

export function useToast() {
  const [toast, setToast] = React.useState<ToastState | null>(null);
  const show = (message: string) => setToast({ message, id: Date.now() });
  const hide = () => setToast(null);
  return { toast, show, hide };
}

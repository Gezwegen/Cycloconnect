import { useState, useCallback, useRef } from 'react';

export type NotificationType = 'success' | 'info' | 'error';

export interface ActiveNotification {
  readonly id: string;
  readonly message: string;
  readonly type: NotificationType;
}

export function useNotification() {
  const [activeNotification, setActiveNotification] = useState<ActiveNotification | null>(null);
  const notifyTimeout = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((message: string, type: NotificationType = 'info') => {
    if (notifyTimeout.current) {
      clearTimeout(notifyTimeout.current);
    }

    const notif: ActiveNotification = {
      id: String(Date.now()),
      message,
      type,
    };

    setActiveNotification(notif);

    notifyTimeout.current = setTimeout(() => {
      setActiveNotification(null);
    }, 4500);
  }, []);

  const dismissToast = useCallback(() => {
    if (notifyTimeout.current) {
      clearTimeout(notifyTimeout.current);
    }
    setActiveNotification(null);
  }, []);

  return {
    activeNotification,
    showToast,
    dismissToast,
  };
}


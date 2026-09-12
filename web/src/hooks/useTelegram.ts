import { useEffect, useState } from 'react';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: any;
    };
  }
}

export function useTelegram() {
  const [isReady, setIsReady] = useState(false);
  const webApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;

  useEffect(() => {
    if (webApp) {
      try {
        webApp.ready();
        webApp.expand();
      } catch (e) {
        console.warn('Failed to initialize Telegram WebApp:', e);
      }
      setIsReady(true);
    }
  }, [webApp]);

  const haptic = (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => {
    if (!webApp?.HapticFeedback) return;
    try {
      if (type === 'success' || type === 'warning' || type === 'error') {
        webApp.HapticFeedback.notificationOccurred(type);
      } else {
        webApp.HapticFeedback.impactOccurred(type);
      }
    } catch {}
  };

  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const urlUserId = params?.get('userId');

  const user = webApp?.initDataUnsafe?.user || {
    id: urlUserId || 999999999,
    first_name: 'Pilot',
    username: 'demo_operator',
  };

  return {
    webApp,
    isReady,
    isTelegramWebApp: Boolean(webApp?.initData),
    initData: webApp?.initData || '',
    user,
    userId: String(user.id),
    haptic,
    close: () => webApp?.close(),
  };
}

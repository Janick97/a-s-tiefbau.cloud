import React, { createContext, useContext, useState, useEffect } from 'react';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState({
    dispositionMontage: false,
    dispositionTiefbau: false
  });

  // Lade Benachrichtigungen aus localStorage beim Start
  useEffect(() => {
    const saved = localStorage.getItem('chat_notifications');
    if (saved) {
      try {
        setNotifications(JSON.parse(saved));
      } catch (e) {
        console.error('Fehler beim Laden der Benachrichtigungen', e);
      }
    }
  }, []);

  // Speichere Benachrichtigungen in localStorage
  useEffect(() => {
    localStorage.setItem('chat_notifications', JSON.stringify(notifications));
  }, [notifications]);

  const setMontageNotification = (hasNew) => {
    setNotifications(prev => ({ ...prev, dispositionMontage: hasNew }));
  };

  const setTiefbauNotification = (hasNew) => {
    setNotifications(prev => ({ ...prev, dispositionTiefbau: hasNew }));
  };

  const clearMontageNotification = () => {
    setNotifications(prev => ({ ...prev, dispositionMontage: false }));
  };

  const clearTiefbauNotification = () => {
    setNotifications(prev => ({ ...prev, dispositionTiefbau: false }));
  };

  return (
    <NotificationContext.Provider 
      value={{ 
        notifications, 
        setMontageNotification, 
        setTiefbauNotification,
        clearMontageNotification,
        clearTiefbauNotification
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications muss innerhalb eines NotificationProvider verwendet werden');
  }
  return context;
}
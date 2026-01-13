import React, { createContext, useState, useContext, useEffect } from 'react';

const ChatNotificationContext = createContext();

export function ChatNotificationProvider({ children }) {
    const [notifications, setNotifications] = useState([]);
    const [isMinimized, setIsMinimized] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem('chat_notifications_v2');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                setNotifications(parsed.notifications || []);
                setIsMinimized(parsed.isMinimized || false);
            } catch (e) {
                console.error('Error parsing notifications:', e);
            }
        }
    }, []);

    // Save to localStorage whenever notifications change
    useEffect(() => {
        localStorage.setItem('chat_notifications_v2', JSON.stringify({
            notifications,
            isMinimized
        }));
    }, [notifications, isMinimized]);

    const addNotification = (notification) => {
        setNotifications(prev => {
            // Avoid duplicates based on comment_id
            const exists = prev.some(n => n.comment_id === notification.comment_id);
            if (exists) return prev;
            return [...prev, { ...notification, timestamp: Date.now() }];
        });
    };

    const removeNotification = (comment_id) => {
        setNotifications(prev => prev.filter(n => n.comment_id !== comment_id));
    };

    const clearAllNotifications = () => {
        setNotifications([]);
    };

    const toggleMinimize = () => {
        setIsMinimized(prev => !prev);
    };

    return (
        <ChatNotificationContext.Provider value={{
            notifications,
            isMinimized,
            addNotification,
            removeNotification,
            clearAllNotifications,
            toggleMinimize
        }}>
            {children}
        </ChatNotificationContext.Provider>
    );
}

export function useChatNotifications() {
    const context = useContext(ChatNotificationContext);
    if (!context) {
        throw new Error('useChatNotifications must be used within ChatNotificationProvider');
    }
    return context;
}
import React from 'react';
import { useChatNotifications } from '@/components/contexts/ChatNotificationContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Minimize2, Maximize2, Trash2, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ChatNotificationWindow() {
    const { 
        notifications, 
        isMinimized, 
        removeNotification, 
        clearAllNotifications, 
        toggleMinimize 
    } = useChatNotifications();

    if (notifications.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)]"
        >
            <Card className="shadow-2xl border-orange-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        <CardTitle className="text-base">
                            Neue Chat-Nachrichten ({notifications.length})
                        </CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                        {!isMinimized && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={clearAllNotifications}
                                className="h-8 w-8 text-white hover:bg-white/20"
                                title="Alle löschen"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleMinimize}
                            className="h-8 w-8 text-white hover:bg-white/20"
                        >
                            {isMinimized ? (
                                <Maximize2 className="w-4 h-4" />
                            ) : (
                                <Minimize2 className="w-4 h-4" />
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={clearAllNotifications}
                            className="h-8 w-8 text-white hover:bg-white/20"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </CardHeader>
                <AnimatePresence>
                    {!isMinimized && (
                        <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <CardContent className="p-0 max-h-96 overflow-y-auto">
                                {notifications.map((notification) => (
                                    <motion.div
                                        key={notification.comment_id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        className="border-b last:border-b-0 p-4 hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="flex-1 min-w-0">
                                                <Link
                                                    to={notification.link}
                                                    onClick={() => removeNotification(notification.comment_id)}
                                                    className="block group"
                                                >
                                                    <p className="font-semibold text-sm text-gray-900 group-hover:text-orange-600 transition-colors">
                                                        {notification.project_title}
                                                    </p>
                                                    <p className="text-xs text-gray-500 mt-0.5">
                                                        {notification.project_number}
                                                    </p>
                                                    <p className="text-sm text-gray-700 mt-2 line-clamp-2">
                                                        <span className="font-medium">{notification.user_name}:</span>{' '}
                                                        {notification.message || '(Anhang)'}
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {formatDistanceToNow(new Date(notification.timestamp), { 
                                                            addSuffix: true, 
                                                            locale: de 
                                                        })}
                                                    </p>
                                                </Link>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeNotification(notification.comment_id)}
                                                className="h-6 w-6 flex-shrink-0"
                                            >
                                                <X className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </motion.div>
                                ))}
                            </CardContent>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>
        </motion.div>
    );
}
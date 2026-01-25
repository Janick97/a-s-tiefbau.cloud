import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Bell, Check, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadNotifications();
      
      // Echtzeit-Abonnement für neue Benachrichtigungen
      const unsubscribe = base44.entities.Notification.subscribe((event) => {
        if (event.type === "create" && event.data.user_id === user.id) {
          loadNotifications();
        }
      });

      return unsubscribe;
    }
  }, [user]);

  const loadUser = async () => {
    try {
      const userData = await base44.auth.me();
      setUser(userData);
    } catch (error) {
      console.error("Fehler beim Laden des Benutzers:", error);
    }
  };

  const loadNotifications = async () => {
    if (!user) return;
    
    try {
      const data = await base44.entities.Notification.filter(
        { user_id: user.id },
        "-created_date",
        50
      );
      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.is_read).length || 0);
    } catch (error) {
      console.error("Fehler beim Laden der Benachrichtigungen:", error);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await base44.entities.Notification.update(notificationId, { is_read: true });
      loadNotifications();
    } catch (error) {
      console.error("Fehler beim Markieren:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.is_read);
      await Promise.all(
        unreadNotifications.map(n => 
          base44.entities.Notification.update(n.id, { is_read: true })
        )
      );
      loadNotifications();
    } catch (error) {
      console.error("Fehler beim Markieren aller:", error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await base44.entities.Notification.delete(notificationId);
      loadNotifications();
    } catch (error) {
      console.error("Fehler beim Löschen:", error);
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case "task_assigned":
      case "task_updated":
        return "bg-blue-100 text-blue-800";
      case "comment_added":
      case "chat_message":
        return "bg-green-100 text-green-800";
      case "project_updated":
      case "excavation_updated":
        return "bg-orange-100 text-orange-800";
      case "mention":
        return "bg-purple-100 text-purple-800";
      case "system":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case "task_assigned": return "Aufgabe";
      case "task_updated": return "Aufgabe aktualisiert";
      case "task_completed": return "Aufgabe erledigt";
      case "comment_added": return "Kommentar";
      case "project_updated": return "Projekt";
      case "excavation_updated": return "Ausgrabung";
      case "mention": return "Erwähnung";
      case "chat_message": return "Nachricht";
      case "system": return "System";
      default: return type;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="relative"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <Card className="border-none shadow-lg">
          <CardHeader className="border-b pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Benachrichtigungen</CardTitle>
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  <Check className="w-3 h-3 mr-1" />
                  Alle als gelesen
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-96 overflow-y-auto">
              <AnimatePresence>
                {notifications.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">Keine Benachrichtigungen</p>
                  </div>
                ) : (
                  notifications.map((notification, index) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className={`p-3 border-b hover:bg-gray-50 ${
                        !notification.is_read ? "bg-blue-50" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={`${getTypeColor(notification.type)} text-xs`}>
                              {getTypeLabel(notification.type)}
                            </Badge>
                            {!notification.is_read && (
                              <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                            )}
                          </div>
                          <h5 className="font-semibold text-sm text-gray-900 mb-1">
                            {notification.title}
                          </h5>
                          <p className="text-xs text-gray-600 mb-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(notification.created_date).toLocaleString("de-DE")}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {notification.link && (
                            <Link 
                              to={notification.link}
                              onClick={() => {
                                markAsRead(notification.id);
                                setIsOpen(false);
                              }}
                            >
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <Check className="w-4 h-4" />
                              </Button>
                            </Link>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => deleteNotification(notification.id)}
                            className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
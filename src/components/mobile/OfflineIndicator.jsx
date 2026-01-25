import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, RefreshCw, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function OfflineIndicator({ offlineQueueCount = 0, onSync }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="flex items-center gap-2">
      <AnimatePresence mode="wait">
        {isOnline ? (
          <motion.div
            key="online"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <Badge className="bg-green-500 text-white border-none">
              <Wifi className="w-3 h-3 mr-1" />
              Online
            </Badge>
          </motion.div>
        ) : (
          <motion.div
            key="offline"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
          >
            <Badge className="bg-red-500 text-white border-none">
              <WifiOff className="w-3 h-3 mr-1" />
              Offline
            </Badge>
          </motion.div>
        )}
      </AnimatePresence>

      {offlineQueueCount > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          {isOnline ? (
            <Button
              size="sm"
              onClick={onSync}
              className="bg-orange-600 hover:bg-orange-700 h-7 text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Sync ({offlineQueueCount})
            </Button>
          ) : (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300">
              <AlertCircle className="w-3 h-3 mr-1" />
              {offlineQueueCount} wartend
            </Badge>
          )}
        </motion.div>
      )}
    </div>
  );
}
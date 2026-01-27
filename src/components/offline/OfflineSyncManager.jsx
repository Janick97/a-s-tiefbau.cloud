import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { base44 } from '@/api/base44Client';
import { syncPendingChanges, getPendingChanges } from '../utils/offlineManager';
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OfflineSyncManager() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncResult, setSyncResult] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      if (pendingCount > 0) {
        handleSync();
      }
    };
    
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load pending count
    loadPendingCount();
    
    // Check pending count every 30 seconds
    const interval = setInterval(loadPendingCount, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [pendingCount]);

  const loadPendingCount = async () => {
    try {
      const changes = await getPendingChanges();
      setPendingCount(changes.length);
    } catch (error) {
      console.error('Fehler beim Laden der ausstehenden Änderungen:', error);
    }
  };

  const handleSync = async () => {
    if (!isOnline || isSyncing) return;
    
    setIsSyncing(true);
    setSyncResult(null);
    
    try {
      const result = await syncPendingChanges(base44);
      setSyncResult(result);
      setLastSyncTime(new Date());
      await loadPendingCount();
    } catch (error) {
      setSyncResult({ success: 0, failed: 1, errors: [error.message] });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <AnimatePresence>
        {(pendingCount > 0 || !isOnline || syncResult) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <Card className="shadow-2xl border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {isOnline ? (
                      <Wifi className="w-4 h-4 text-green-600" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-red-600" />
                    )}
                    {isOnline ? 'Online' : 'Offline-Modus'}
                  </span>
                  {pendingCount > 0 && (
                    <Badge variant="outline" className="bg-orange-100 text-orange-800">
                      {pendingCount} ausstehend
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!isOnline && (
                  <div className="flex items-center gap-2 text-xs text-gray-600 bg-yellow-50 p-2 rounded">
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                    Änderungen werden automatisch synchronisiert, sobald Sie online sind.
                  </div>
                )}

                {pendingCount > 0 && isOnline && (
                  <Button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="w-full bg-orange-600 hover:bg-orange-700"
                    size="sm"
                  >
                    {isSyncing ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Synchronisiere...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Jetzt synchronisieren
                      </>
                    )}
                  </Button>
                )}

                {isSyncing && (
                  <div className="space-y-2">
                    <Progress value={50} className="h-2" />
                    <p className="text-xs text-gray-600 text-center">
                      Synchronisiere {pendingCount} Änderung(en)...
                    </p>
                  </div>
                )}

                {syncResult && (
                  <div className="space-y-2">
                    {syncResult.success > 0 && (
                      <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 p-2 rounded">
                        <CheckCircle className="w-4 h-4" />
                        {syncResult.success} erfolgreich synchronisiert
                      </div>
                    )}
                    {syncResult.failed > 0 && (
                      <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 p-2 rounded">
                        <AlertCircle className="w-4 h-4" />
                        {syncResult.failed} fehlgeschlagen
                      </div>
                    )}
                  </div>
                )}

                {lastSyncTime && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    Letzte Sync: {lastSyncTime.toLocaleTimeString('de-DE')}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shovel, Package, CheckSquare, Euro } from "lucide-react";

// Assuming User is an existing utility to fetch user data
// You might need to adjust this import path based on your project structure
// For example: import { getCurrentUser } from '@/lib/auth'; or import User from '@/models/User';
// For this implementation, I'll assume a dummy User object or a globally available User service.
// If User is not defined, this code will cause a runtime error.
// A more robust solution would be to pass the user as a prop, or use a context API.
// For the sake of completing the task as outlined, I'll assume `User.me()` is available.
const User = {
  me: async () => {
    // This is a placeholder for your actual user fetching logic.
    // In a real application, this would fetch the current logged-in user.
    // Example: fetch('/api/user/me').then(res => res.json())
    // For demonstration, returning a dummy user.
    // To test the "Bauleiter" scenario, change position to 'Bauleiter'.
    return { id: '123', name: 'John Doe', position: 'Bauleiter' }; // or 'Projektleiter', 'Admin' etc.
  },
};


export default function ProjectStatsCard({ excavations }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await User.me();
        setUser(userData);
      } catch (error) {
        console.log("Benutzer nicht angemeldet oder Fehler beim Laden des Benutzers:", error);
        // Optionally set a default or guest user state if not logged in
        setUser(null); // Ensure user is null if not logged in or error occurs
      }
    };
    loadUser();
  }, []);

  const stats = useMemo(() => {
    const safeExcavations = Array.isArray(excavations) ? excavations : [];
    let count = 0;
    let revenue = 0;
    let not_closed = 0;
    let not_backfilled = 0;

    for (const exc of safeExcavations) {
      if (!exc) continue;
      count++;
      revenue += exc.calculated_price || 0;
      if (!exc.is_closed) not_closed++;
      if (!exc.is_backfilled) not_backfilled++;
    }
    return { count, revenue, not_closed, not_backfilled };
  }, [excavations]);

  // Für Bauleiter: Euro-Beträge ausblenden
  const shouldHideEuro = user && user.position === 'Bauleiter';

  return (
    <Card className="card-elevation border-none h-full">
      <CardHeader className="pb-2 md:pb-3">
        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
          <Shovel className="w-4 h-4 md:w-5 md:h-5 text-orange-600" />
          <span className="truncate">Leistungsübersicht</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 md:space-y-3 p-4 md:p-6">
        <div className="text-center p-2 md:p-3 bg-gray-50 rounded-lg">
          <div className="text-xl md:text-2xl font-bold text-gray-900">{stats.count}</div>
          <div className="text-xs md:text-sm text-gray-600">Gesamtleistungen</div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1 md:gap-2 min-w-0 flex-1">
              <Package className="w-3 h-3 md:w-4 md:h-4 text-orange-500 flex-shrink-0" />
              <span className="text-xs md:text-sm text-gray-600 truncate">Offen (Verfüllung)</span>
            </div>
            <span className="font-medium text-orange-700 text-xs md:text-sm flex-shrink-0 ml-1">
              {stats.not_backfilled} / {stats.count}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 md:h-2">
            <div 
              className="bg-orange-500 h-1.5 md:h-2 rounded-full" 
              style={{ width: `${stats.count > 0 ? ((stats.count - stats.not_backfilled) / stats.count) * 100 : 0}%` }}
            ></div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1 md:gap-2 min-w-0 flex-1">
              <CheckSquare className="w-3 h-3 md:w-4 md:h-4 text-red-500 flex-shrink-0" />
              <span className="text-xs md:text-sm text-gray-600 truncate">Offen (Abschluss)</span>
            </div>
            <span className="font-medium text-red-700 text-xs md:text-sm flex-shrink-0 ml-1">
              {stats.not_closed} / {stats.count}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 md:h-2">
            <div 
              className="bg-red-500 h-1.5 md:h-2 rounded-full" 
              style={{ width: `${stats.count > 0 ? ((stats.count - stats.not_closed) / stats.count) * 100 : 0}%` }}
            ></div>
          </div>
        </div>

        {!shouldHideEuro && (
          <div className="pt-2 md:pt-3 border-t">
            <div className="text-center">
              <div className="text-xs md:text-sm text-gray-600 mb-1">Gesamtumsatz</div>
              <div className="flex items-center justify-center gap-1 text-green-600">
                <Euro className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
                <span className="text-lg md:text-xl font-bold truncate">
                  €{stats.revenue.toLocaleString('de-DE')}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

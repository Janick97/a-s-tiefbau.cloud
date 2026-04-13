import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, User, Package, FolderOpen, Calendar } from "lucide-react";

export default function MaterialHistoryPage() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    base44.entities.MaterialWithdrawal.list("-created_date", 200).then(data => {
      setWithdrawals(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  const filtered = withdrawals.filter(w => {
    const q = search.toLowerCase();
    return !q ||
      w.user_name?.toLowerCase().includes(q) ||
      w.material_name?.toLowerCase().includes(q) ||
      w.material_article_number?.toLowerCase().includes(q) ||
      w.project_title?.toLowerCase().includes(q) ||
      w.project_number?.toLowerCase().includes(q) ||
      w.sm_number?.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl">
            <Package className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Materialhistorie</h1>
            <p className="text-gray-500 text-sm">Alle Materialentnahmen im Überblick</p>
          </div>
          <Badge className="ml-auto bg-gray-200 text-gray-700">{filtered.length} Buchungen</Badge>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Mitarbeiter, Material, Projektnummer oder SM-Nummer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 h-11"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-orange-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">Keine Buchungen gefunden</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(w => (
              <Card key={w.id} className="border-gray-200 hover:border-orange-300 transition-colors">
                <CardContent className="p-4 flex flex-wrap items-center gap-4">
                  {/* Datum */}
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 w-32 flex-shrink-0">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(w.created_date).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>

                  {/* Mitarbeiter */}
                  <div className="flex items-center gap-1.5 min-w-[120px]">
                    <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <User className="w-3.5 h-3.5 text-orange-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-800">{w.user_name}</span>
                  </div>

                  {/* Material */}
                  <div className="flex items-center gap-1.5 flex-1 min-w-[160px]">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Package className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{w.material_name}</p>
                      <p className="text-xs text-gray-400">{w.material_article_number}</p>
                    </div>
                  </div>

                  {/* Menge */}
                  <Badge variant="outline" className="font-bold text-sm border-gray-300 flex-shrink-0">
                    {w.quantity} {w.unit}
                  </Badge>

                  {/* Projekt */}
                  <div className="flex items-center gap-1.5 min-w-[160px]">
                    <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <FolderOpen className="w-3.5 h-3.5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800 truncate max-w-[180px]">{w.project_title}</p>
                      <p className="text-xs text-gray-400">#{w.project_number} · SM: {w.sm_number}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
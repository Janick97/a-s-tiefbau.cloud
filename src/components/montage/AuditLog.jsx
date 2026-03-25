import { Clock, User, FileText, ArrowRight } from "lucide-react";

const ACTION_LABELS = {
  status_change: { label: "Status geändert", color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
  notes_change: { label: "Notizen aktualisiert", color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  art_change: { label: "Art geändert", color: "text-purple-600", bg: "bg-purple-50 border-purple-200" },
  monteur_change: { label: "Monteure geändert", color: "text-green-600", bg: "bg-green-50 border-green-200" },
  created: { label: "Auftrag erstellt", color: "text-gray-600", bg: "bg-gray-50 border-gray-200" },
};

export default function AuditLog({ entries = [] }) {
  if (!entries || entries.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400 text-xs">
        <Clock className="w-6 h-6 mx-auto mb-2 opacity-40" />
        Noch keine Einträge vorhanden
      </div>
    );
  }

  const sorted = [...entries].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <div className="space-y-2">
      {sorted.map((entry, i) => {
        const config = ACTION_LABELS[entry.action] || { label: entry.action, color: "text-gray-600", bg: "bg-gray-50 border-gray-200" };
        return (
          <div key={i} className={`rounded-lg border p-3 text-xs ${config.bg}`}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className={`font-semibold ${config.color}`}>{config.label}</span>
              <span className="text-gray-400 flex items-center gap-1 flex-shrink-0">
                <Clock className="w-3 h-3" />
                {new Date(entry.timestamp).toLocaleString("de-DE", {
                  day: "2-digit", month: "2-digit", year: "2-digit",
                  hour: "2-digit", minute: "2-digit"
                })}
              </span>
            </div>
            <div className="flex items-center gap-1 text-gray-600">
              <User className="w-3 h-3 flex-shrink-0" />
              <span className="font-medium">{entry.user || "Unbekannt"}</span>
            </div>
            {entry.from && entry.to && (
              <div className="flex items-center gap-1.5 mt-1.5 text-gray-500">
                <span className="bg-white border rounded px-1.5 py-0.5 text-[10px] truncate max-w-[120px]">{entry.from}</span>
                <ArrowRight className="w-3 h-3 flex-shrink-0" />
                <span className="bg-white border rounded px-1.5 py-0.5 text-[10px] truncate max-w-[120px] font-medium text-gray-800">{entry.to}</span>
              </div>
            )}
            {entry.note && (
              <div className="mt-1.5 flex items-start gap-1 text-gray-500">
                <FileText className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span className="italic line-clamp-2">{entry.note}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
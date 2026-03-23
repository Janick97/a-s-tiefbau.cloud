import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function SearchPanel({ projects, selectedProjectId, onProjectChange }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = projects.filter(p => {
    const term = searchTerm.toLowerCase();
    return (
      p.project_number?.toLowerCase().includes(term) ||
      p.title?.toLowerCase().includes(term) ||
      p.city?.toLowerCase().includes(term) ||
      p.client?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Projekt suchen (Nr., Titel, Stadt, Kunde)..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="max-h-52 overflow-y-auto space-y-1">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Keine Projekte gefunden</p>
        ) : (
          filtered.map(p => (
            <button
              key={p.id}
              onClick={() => onProjectChange(p.id)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedProjectId === p.id
                  ? "bg-orange-50 border border-orange-300 text-orange-800 font-medium"
                  : "hover:bg-gray-50 text-gray-700"
              }`}
            >
              <span className="font-semibold">{p.project_number}</span>
              <span className="text-gray-500 mx-1">–</span>
              {p.title}
              {p.city && <span className="text-xs text-gray-400 ml-2">({p.city})</span>}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
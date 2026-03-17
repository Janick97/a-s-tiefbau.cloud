import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bookmark, BookmarkCheck, Save, Trash2, X, Star } from "lucide-react";

const MAX_QUICK_FILTERS = 5;

function getStorageKey(userId) {
  return `quick_filters_projects_${userId || 'default'}`;
}

export default function QuickFilters({ currentFilters, currentSearch, onApply, userId }) {
  const [savedFilters, setSavedFilters] = useState([]);
  const [activeFilterId, setActiveFilterId] = useState(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [newFilterName, setNewFilterName] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(getStorageKey(userId));
    if (stored) {
      setSavedFilters(JSON.parse(stored));
    }
  }, [userId]);

  const persist = (filters) => {
    setSavedFilters(filters);
    localStorage.setItem(getStorageKey(userId), JSON.stringify(filters));
  };

  const handleSave = () => {
    if (!newFilterName.trim()) return;
    const newFilter = {
      id: Date.now().toString(),
      name: newFilterName.trim(),
      filters: currentFilters,
      search: currentSearch,
    };
    const updated = [...savedFilters, newFilter].slice(-MAX_QUICK_FILTERS);
    persist(updated);
    setNewFilterName("");
    setShowSaveDialog(false);
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    const updated = savedFilters.filter(f => f.id !== id);
    persist(updated);
    if (activeFilterId === id) setActiveFilterId(null);
  };

  const handleApply = (filter) => {
    if (activeFilterId === filter.id) {
      setActiveFilterId(null);
      onApply(null, "");
    } else {
      setActiveFilterId(filter.id);
      onApply(filter.filters, filter.search);
    }
  };

  const countActiveFilters = (f) => {
    if (!f) return 0;
    let count = 0;
    const arrFields = ['project_number','sm_number','order_type','contact_person','project_status','ba_status','fa_status','city','street','vao_status','assigned_bauleiter'];
    arrFields.forEach(k => { if (f[k]?.length > 0) count++; });
    const strFields = ['material_booking_completed','documentation_completed','ev_ta','ev_sa','foreman_completed','is_follow_up'];
    strFields.forEach(k => { if (f[k] && f[k] !== 'all') count++; });
    if (f.vao_valid_from) count++;
    if (f.vao_valid_to) count++;
    if (f.vao_days_remaining) count++;
    if (f.date_filter_type && f.date_filter_type !== 'all') count++;
    return count;
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-gray-500 font-medium flex items-center gap-1 whitespace-nowrap">
        <Star className="w-3.5 h-3.5" />
        Schnellfilter:
      </span>

      {savedFilters.map(filter => {
        const isActive = activeFilterId === filter.id;
        const fCount = countActiveFilters(filter.filters);
        return (
          <button
            key={filter.id}
            onClick={() => handleApply(filter)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
              isActive
                ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                : 'bg-white text-gray-700 border-gray-300 hover:border-orange-400 hover:text-orange-600'
            }`}
          >
            <BookmarkCheck className="w-3 h-3" />
            {filter.name}
            {fCount > 0 && (
              <span className={`rounded-full px-1 text-xs ${isActive ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {fCount}
              </span>
            )}
            <span
              onClick={(e) => handleDelete(filter.id, e)}
              className={`ml-0.5 rounded-full p-0.5 hover:bg-white/30 cursor-pointer ${isActive ? 'text-white/80 hover:text-white' : 'text-gray-400 hover:text-red-500'}`}
            >
              <X className="w-2.5 h-2.5" />
            </span>
          </button>
        );
      })}

      {savedFilters.length < MAX_QUICK_FILTERS && !showSaveDialog && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSaveDialog(true)}
          className="h-7 text-xs text-gray-500 hover:text-orange-600 px-2"
        >
          <Save className="w-3.5 h-3.5 mr-1" />
          Speichern
        </Button>
      )}

      {showSaveDialog && (
        <div className="flex items-center gap-1.5">
          <Input
            value={newFilterName}
            onChange={e => setNewFilterName(e.target.value)}
            placeholder="Filtername..."
            className="h-7 text-xs w-36"
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setShowSaveDialog(false); }}
            autoFocus
          />
          <Button size="sm" onClick={handleSave} disabled={!newFilterName.trim()} className="h-7 text-xs bg-orange-500 hover:bg-orange-600 px-2">
            OK
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowSaveDialog(false)} className="h-7 text-xs px-2">
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
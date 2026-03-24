import React from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Eye, CheckCircle, Loader2, Construction, Building2, MapPin, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function MontageAuftragCard({ auftrag, index, completing, onComplete, onOpenNotes }) {
  return (
    <motion.div
      key={auftrag.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: index * 0.03 }}
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
    >
      {/* Color top bar */}
      <div className={`h-1 w-full ${auftrag.monteur_completed ? 'bg-green-400' : auftrag.tiefbau_offen ? 'bg-blue-500' : 'bg-orange-400'}`} />

      <div className="p-4">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">{auftrag.title}</p>
            <p className="text-xs text-gray-400 mt-0.5">{auftrag.sm_number}</p>
          </div>
          {auftrag.tiefbau_offen && (
            <span className="flex-shrink-0 inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
              <Construction className="w-3 h-3" />
              Tiefbau offen
            </span>
          )}
        </div>

        {/* Notes or Meta */}
        {auftrag.notes ? (
          <button
            className="w-full text-left bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 hover:bg-amber-100 transition-colors"
            onClick={() => onOpenNotes(auftrag)}
          >
            <p className="text-xs text-amber-800 line-clamp-2">{auftrag.notes}</p>
          </button>
        ) : (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 mb-3">
            {auftrag.client && (
              <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{auftrag.client}</span>
            )}
            {auftrag.city && (
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{auftrag.city}</span>
            )}
            {auftrag.art && (
              <span className="bg-gray-100 px-2 py-0.5 rounded-full">{auftrag.art}</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Link to={createPageUrl(`MontageAuftragDetail?id=${auftrag.id}`)} className="flex-1">
            <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              Öffnen
            </Button>
          </Link>

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs px-3 border-gray-200 text-gray-600 hover:bg-gray-50"
            onClick={() => onOpenNotes(auftrag)}
          >
            <FileText className="w-3.5 h-3.5" />
          </Button>

          {!auftrag.monteur_completed && (
            <Button
              size="sm"
              className="h-8 text-xs px-3 gap-1.5 bg-green-600 hover:bg-green-700"
              onClick={() => onComplete(auftrag.id)}
              disabled={completing === auftrag.id}
            >
              {completing === auftrag.id
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <CheckCircle className="w-3.5 h-3.5" />
              }
              Fertig
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
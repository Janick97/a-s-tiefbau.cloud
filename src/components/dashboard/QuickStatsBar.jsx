import React, { useState } from "react";
import { ChevronDown, ChevronUp, FolderOpen, Shovel, Ruler, Hash } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function QuickStatsBar({ projects, excavations, priceItems = [], montageAuftraege = [] }) {
  const [open, setOpen] = useState(false);

  const totalProjects = projects.length;

  // Erstelle eine Map: price_item_id → type ('Grube' | 'Graben')
  const priceItemMap = {};
  priceItems.forEach(p => { priceItemMap[p.id] = p; });

  let grubenCount = 0;
  let grabenM = 0;
  let mdCount = 0; // ST-Positionen ohne Typ-Zuordnung (z.B. Sonderleistungen)

  excavations.forEach(exc => {
    const pi = priceItemMap[exc.price_item_id];
    if (pi) {
      if (pi.type === 'Grube') {
        grubenCount += 1;
      } else if (pi.type === 'Graben') {
        grabenM += exc.quantity || 0;
      } else {
        mdCount += exc.quantity || 0;
      }
    } else {
      // Kein priceItem bekannt → zähle als MD
      mdCount += 1;
    }
  });

  const stats = [
    {
      label: "Projekte gesamt",
      value: totalProjects.toLocaleString('de-DE'),
      icon: FolderOpen,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      label: "Gruben erstellt",
      value: grubenCount.toLocaleString('de-DE'),
      icon: Shovel,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Graben gesamt",
      value: `${Math.round(grabenM).toLocaleString('de-DE')} m`,
      icon: Ruler,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Montageaufträge",
      value: montageAuftraege.length.toLocaleString('de-DE'),
      icon: Hash,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className="mb-5">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-orange-200 transition-all text-sm font-medium text-gray-700"
      >
        <span className="flex items-center gap-2">
          <span className="text-orange-500 font-semibold">Schnellstatistik</span>
          <span className="text-gray-400 font-normal hidden sm:inline">— Gesamtübersicht</span>
        </span>
        {open
          ? <ChevronUp className="w-4 h-4 text-gray-400" />
          : <ChevronDown className="w-4 h-4 text-gray-400" />
        }
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-white shadow-sm"
                >
                  <div className={`p-2 rounded-lg ${s.bg}`}>
                    <s.icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <div>
                    <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-xs text-gray-500">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
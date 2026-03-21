import React, { useState } from "react";
import { ChevronDown, ChevronUp, FolderOpen, Shovel, Ruler, Network } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function QuickStatsBar({ projects, excavations }) {
  const [open, setOpen] = useState(false);

  const totalProjects = projects.length;

  const gruben = excavations.filter(e => {
    // Grube: price_item unit ST oder type Grube, aber einfach: alle ohne Graben-Kennzeichen
    return e.excavation_length <= 2 || !e.excavation_length;
  });

  // Gruben = alle Excavations die keine Graben-Leistung sind
  // Wir verwenden hier eine einfache Heuristik:
  // Graben: quantity > 1 und unit M → aber wir haben kein priceItem hier direkt
  // Sicherer: Gruben = ST-Einträge (quantity == 1 oder factor basiert), Graben = quantity in Metern
  // Da wir priceItems nicht haben, nutzen wir: Graben erkennen wir an excavation_length > 5 (typisch für Gräben)
  
  const grabens = excavations.filter(e => e.quantity && e.quantity > 1);
  const totalGrabenM = grabens.reduce((sum, e) => sum + (e.quantity || 0), 0);

  // MD = Montageaufträge / Leistungen → hier: alle Excavations mit quantity > 0 (Stück)
  // "MD" = vermutlich Meter Daten oder Montage-Dokumentationen
  // Wir nutzen: alle Excavations mit quantity = 1 (ST = Grube/Schacht)
  const grubenCount = excavations.filter(e => !e.quantity || e.quantity === 1).length;
  
  // Graben in Metern = alle mit quantity > 1
  const grabenM = Math.round(excavations
    .filter(e => e.quantity && e.quantity > 1)
    .reduce((sum, e) => sum + (e.quantity || 0), 0));

  // MD = alle mit price_item_id die "MD" enthält → Fallback: alle ST-Positionen die keine Grube sind
  // Einfach: Anzahl Excavations gesamt minus Graben
  const mdCount = grubenCount; // Gruben = ST-Positionen

  const stats = [
    {
      label: "Projekte gesamt",
      value: totalProjects,
      icon: FolderOpen,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      label: "Gruben erstellt",
      value: grubenCount,
      icon: Shovel,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Graben gesamt",
      value: `${grabenM} m`,
      icon: Ruler,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Positionen (ST)",
      value: mdCount,
      icon: Network,
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
          <span className="text-gray-400 font-normal hidden sm:inline">— Gesamtübersicht Tiefbau</span>
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
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
                <div key={s.label} className={`flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-100 bg-white shadow-sm`}>
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
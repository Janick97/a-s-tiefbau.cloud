import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  MapPin,
  Euro,
  Edit,
  Camera,
  Ruler,
  User,
  List,
  FileText,
  Package,
  Layers // Added Layers icon for surface types
} from "lucide-react";

const statusColors = {
  planned: "bg-blue-100 text-blue-800 border-blue-200",
  in_progress: "bg-orange-100 text-orange-800 border-orange-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  approved: "bg-purple-100 text-purple-800 border-purple-200"
};

const statusLabels = {
  planned: "Geplant",
  in_progress: "In Arbeit",
  completed: "Abgeschlossen",
  approved: "Genehmigt"
};

export default function ExcavationCard({ excavation, projectTitle, priceItem, onEdit, index, isSelected, onSelect, selectionMode }) {
  // Defensive Programmierung - alle Eingaben prüfen
  if (!excavation) {
    return null;
  }

  const safeExcavation = {
    id: excavation.id || '',
    location_name: excavation.location_name || 'Unbekannter Standort',
    street: excavation.street || '',
    house_number: excavation.house_number || '',
    city: excavation.city || '',
    status: excavation.status || 'planned',
    foreman: excavation.foreman || 'Nicht zugewiesen',
    quantity: excavation.quantity || 1,
    calculated_price: excavation.calculated_price || 0,
    photo_before_url: excavation.photo_before_url || '',
    photo_after_url: excavation.photo_after_url || '',
    construction_justification: excavation.construction_justification || '',
    excavation_length: excavation.excavation_length || 0,
    excavation_depth: excavation.excavation_depth || 0,
    excavation_width: excavation.excavation_width || 0,
    excavation_factor: excavation.excavation_factor || 1,
    surface_type: excavation.surface_type || '',
    surface_type_2: excavation.surface_type_2 || '', // Added surface_type_2
    concrete_base_used: excavation.concrete_base_used || false,
    mortar_used: excavation.mortar_used || false,
    gravel_used: excavation.gravel_used || false
  };

  const safePriceItem = priceItem || { description: 'Unbekannte Position', unit: 'ST', type: 'Grube' };
  const safeProjectTitle = projectTitle || 'Unbekanntes Projekt';

  const isGrube = safePriceItem.type === 'Grube';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (index || 0) * 0.1 }}
      whileHover={{ y: -4, scale: 1.02 }}
    >
      <Link
        to={selectionMode ? "#" : createPageUrl(`ExcavationDetail?id=${safeExcavation.id}`)}
        onClick={selectionMode ? (e) => { e.preventDefault(); onSelect && onSelect(excavation); } : undefined}
      >
        <Card className={`card-elevation border-none h-full overflow-hidden group cursor-pointer transition-all ${isSelected ? 'ring-2 ring-orange-500' : ''}`}>
          <div className="h-2 bg-gradient-to-r from-orange-500 to-amber-600" />
          {selectionMode && (
            <div className="absolute top-3 left-3 z-10">
              <input
                type="checkbox"
                checked={!!isSelected}
                onChange={() => onSelect && onSelect(excavation)}
                onClick={(e) => e.stopPropagation()}
                className="w-5 h-5 rounded accent-orange-500 cursor-pointer"
              />
            </div>
          )}

          <CardHeader className="pb-3">
            <div className="flex justify-between items-start mb-2">
              <div className="space-y-1 flex-1">
                <h3 className="font-bold text-gray-900 text-lg group-hover:text-orange-700 transition-colors line-clamp-2">
                  {safeExcavation.location_name}
                </h3>
                <p className="text-sm text-gray-600 line-clamp-1">
                  {safeProjectTitle}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 ml-2">
                <Badge variant="outline" className={statusColors[safeExcavation.status]}>
                  {statusLabels[safeExcavation.status]}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onEdit) onEdit(excavation);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-orange-50"
                >
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Adresse */}
            <div className="flex items-start gap-2 text-gray-600">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <div>
                  {safeExcavation.street} {safeExcavation.house_number}
                </div>
                <div>
                  {safeExcavation.city}
                </div>
              </div>
            </div>

            {/* Position */}
            <div className="flex items-center gap-2 text-gray-600">
              <List className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm line-clamp-1">{safePriceItem.description}</span>
            </div>

            {/* Tiefbaubegründung */}
            {safeExcavation.construction_justification && (
              <div className="flex items-start gap-2 text-gray-600">
                <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span className="text-sm line-clamp-2">{safeExcavation.construction_justification}</span>
              </div>
            )}

            {/* Oberflächen */}
            {(safeExcavation.surface_type || safeExcavation.surface_type_2) && (
              <div className="flex items-start gap-2 text-gray-600">
                <Layers className="w-4 h-4 mt-0.5 flex-shrink-0" /> {/* Changed icon to Layers */}
                <div className="text-sm">
                  <div className="font-medium text-orange-700 mb-1">Oberflächen:</div> {/* Changed label to plural */}
                  <div className="flex gap-2 flex-wrap">
                    {safeExcavation.surface_type && (
                      <Badge variant="outline" className="bg-blue-50">
                        {safeExcavation.surface_type}
                      </Badge>
                    )}
                    {safeExcavation.surface_type_2 && (
                      <Badge variant="outline" className="bg-purple-50">
                        {safeExcavation.surface_type_2}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Verwendete Materialien */}
            {(safeExcavation.concrete_base_used || safeExcavation.mortar_used || safeExcavation.gravel_used) && (
              <div className="flex items-start gap-2 text-gray-600">
                <Package className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium text-blue-700 mb-1">Materialien:</div>
                  <div className="flex gap-2 flex-wrap">
                    {safeExcavation.concrete_base_used && <Badge className="bg-gray-100 text-gray-800 border">Unterbeton</Badge>}
                    {safeExcavation.mortar_used && <Badge className="bg-gray-100 text-gray-800 border">Mörtel</Badge>}
                    {safeExcavation.gravel_used && <Badge className="bg-gray-100 text-gray-800 border">Splitt</Badge>}
                  </div>
                </div>
              </div>
            )}

            {/* Grubenabmessungen anzeigen */}
            {isGrube && (safeExcavation.excavation_length || safeExcavation.excavation_depth || safeExcavation.excavation_width) && (
              <div className="flex items-start gap-2 text-gray-600">
                <Ruler className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-medium text-orange-700">Grubenabmessungen:</div>
                  <div>
                    {(safeExcavation.excavation_length || 1.2).toFixed(2)}m × {(safeExcavation.excavation_depth || 1.0).toFixed(2)}m × {(safeExcavation.excavation_width || 1.0).toFixed(2)}m
                    {safeExcavation.excavation_factor !== 1 && (
                      <span className="text-orange-600"> (Faktor: {safeExcavation.excavation_factor})</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Statistiken */}
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-orange-500 mb-1">
                  <Ruler className="w-4 h-4" />
                </div>
                <p className="text-lg font-bold text-gray-900">
                  {safePriceItem.unit === 'M' && !isGrube 
                    ? `${safeExcavation.excavation_length.toFixed(2)} m`
                    : isGrube 
                    ? `${safeExcavation.quantity.toFixed(2)} m³` 
                    : `${safeExcavation.quantity} ${safePriceItem.unit}`
                  }
                </p>
                <p className="text-xs text-gray-500">
                  {safePriceItem.unit === 'M' && !isGrube 
                    ? 'Länge'
                    : isGrube 
                    ? 'Volumen' 
                    : safePriceItem.unit
                  }
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-green-500 mb-1">
                  <Euro className="w-4 h-4" />
                </div>
                <p className="text-lg font-bold text-gray-900">
                  €{safeExcavation.calculated_price.toLocaleString('de-DE')}
                </p>
                <p className="text-xs text-gray-500">Preis</p>
              </div>
            </div>

            {/* Bauleiter */}
            <div className="flex items-center gap-2 text-sm text-gray-500 pt-2">
              <User className="w-4 h-4" />
              <span>{safeExcavation.foreman}</span>
            </div>

            {/* Fotos */}
            {(safeExcavation.photo_before_url || safeExcavation.photo_after_url) && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Camera className="w-4 h-4" />
                <span>
                  {safeExcavation.photo_before_url && safeExcavation.photo_after_url
                    ? 'Vorher & Nachher Fotos'
                    : safeExcavation.photo_before_url
                    ? 'Vorher Foto'
                    : 'Nachher Foto'
                  }
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
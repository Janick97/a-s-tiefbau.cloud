import React, { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Download, FileText, Plus } from "lucide-react";
import { UploadFile } from "@/integrations/Core";
import { jsPDF } from 'jspdf';

export default function EVergabeEditor({ 
  project, 
  excavations, 
  priceItems, 
  montageLeistungen, 
  montagePreisItems,
  allProjects = [],
  documents = []
}) {
  const [editableData, setEditableData] = useState({
    excavations: [],
    montageLeistungen: []
  });
  const [isExporting, setIsExporting] = useState(false);
  const [selectedExcIds, setSelectedExcIds] = useState(new Set());
  const [selectedMlIds, setSelectedMlIds] = useState(new Set());
  const exportRef = useRef(null);

  // Alle IDs vorauswählen wenn sich Daten ändern
  useEffect(() => {
    setSelectedExcIds(new Set(excavations.map(e => e.id)));
    setSelectedMlIds(new Set(montageLeistungen.map(m => m.id)));
  }, [excavations, montageLeistungen]);

  const toggleExcSelection = (id) => {
    setSelectedExcIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleMlSelection = (id) => {
    setSelectedMlIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Gruppiere Daten nach Projekt
  const excavationsByProject = useMemo(() => {
    const groups = {};
    
    excavations.forEach(exc => {
      const projectId = exc.project_id;
      if (!groups[projectId]) {
        groups[projectId] = {
          project: allProjects.find(p => p.id === projectId) || project,
          excavations: []
        };
      }
      groups[projectId].excavations.push(exc);
    });
    
    return groups;
  }, [excavations, allProjects, project]);

  const montageByProject = useMemo(() => {
    const groups = {};
    
    montageLeistungen.forEach(ml => {
      const projectId = ml.project_id || project.id;
      if (!groups[projectId]) {
        groups[projectId] = {
          project: allProjects.find(p => p.id === projectId) || project,
          montageLeistungen: []
        };
      }
      groups[projectId].montageLeistungen.push(ml);
    });
    
    return groups;
  }, [montageLeistungen, allProjects, project]);

  useEffect(() => {
    // Initialize editable data with images array for each position
    const excWithImages = excavations.map(exc => ({
      ...exc,
      evergabe_images: exc.evergabe_images || []
    }));
    
    const montageWithImages = montageLeistungen.map(ml => ({
      ...ml,
      evergabe_images: ml.evergabe_images || []
    }));

    setEditableData({
      excavations: excWithImages,
      montageLeistungen: montageWithImages
    });
  }, [excavations, montageLeistungen]);

  const handleImageUpload = async (file, type, index) => {
    if (!file) return;
    try {
      const { file_url } = await UploadFile({ file });
      
      setEditableData(prev => {
        const updated = { ...prev };
        const key = type === 'excavation' ? 'excavations' : 'montageLeistungen';
        const newArray = [...updated[key]];
        newArray[index] = {
          ...newArray[index],
          evergabe_images: [...(newArray[index].evergabe_images || []), file_url]
        };
        updated[key] = newArray;
        return updated;
      });
    } catch (error) {
      console.error("Fehler beim Upload:", error);
      alert("Fehler beim Hochladen des Bildes");
    }
  };

  const handleRemoveImage = (type, index, imageIndex) => {
    setEditableData(prev => {
      const updated = { ...prev };
      const key = type === 'excavation' ? 'excavations' : 'montageLeistungen';
      const newArray = [...updated[key]];
      const images = [...(newArray[index].evergabe_images || [])];
      images.splice(imageIndex, 1);
      newArray[index] = {
        ...newArray[index],
        evergabe_images: images
      };
      updated[key] = newArray;
      return updated;
    });
  };

  const handleSelectFromExisting = (type, index, imageUrl) => {
    setEditableData(prev => {
      const updated = { ...prev };
      const key = type === 'excavation' ? 'excavations' : 'montageLeistungen';
      const newArray = [...updated[key]];
      const currentImages = newArray[index].evergabe_images || [];
      
      // Check if already selected
      if (currentImages.includes(imageUrl)) {
        // Deselect
        newArray[index] = {
          ...newArray[index],
          evergabe_images: currentImages.filter(url => url !== imageUrl)
        };
      } else {
        // Select (max 4)
        if (currentImages.length < 4) {
          newArray[index] = {
            ...newArray[index],
            evergabe_images: [...currentImages, imageUrl]
          };
        } else {
          alert("Maximal 4 Bilder können ausgewählt werden");
          return prev;
        }
      }
      
      updated[key] = newArray;
      return updated;
    });
  };

  const getAllExcavationPhotos = (exc) => {
    const allPhotos = [];
    if (exc.photos_before) allPhotos.push(...exc.photos_before.map(url => ({ url, label: 'Vorher' })));
    if (exc.photos_after) allPhotos.push(...exc.photos_after.map(url => ({ url, label: 'Nachher' })));
    if (exc.photos_environment) allPhotos.push(...exc.photos_environment.map(url => ({ url, label: 'Umfeld' })));
    if (exc.photos_backfill) allPhotos.push(...exc.photos_backfill.map(url => ({ url, label: 'Verfüllung' })));
    if (exc.photos_surface) allPhotos.push(...exc.photos_surface.map(url => ({ url, label: 'Oberfläche' })));
    return allPhotos;
  };

  const getMontagePhotos = (ml) => {
    return ml.photos ? ml.photos.map(url => ({ url, label: 'Montage' })) : [];
  };

  const getDocumentPhotos = () => {
    return documents
      .filter(doc => doc.file_type && doc.file_type.includes('image'))
      .map(doc => ({ url: doc.file_url, label: doc.folder || 'Dokument' }));
  };

  const formatPriceItemDescription = (priceItem) => {
    if (!priceItem) return '';
    return `${priceItem.item_number} - ${priceItem.description}`;
  };

  const formatSurfaceType = (surfaceType) => {
    const surfaceMap = {
      'Naturstein': 'Naturstein',
      'Beton': 'Beton',
      'Platten': 'Platten',
      'Pflaster': 'Pflaster',
      'unbefestigt': 'Unbefestigt',
      'Asphalt': 'Asphalt'
    };
    return surfaceMap[surfaceType] || surfaceType || '-';
  };

  // Hilfsfunktion: Bild als base64 laden
  const loadImageAsBase64 = async (url) => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  };

  // Hilfsfunktion: Zeilenumbruch-Text mit Breite
  const addWrappedText = (pdf, text, x, y, maxWidth, lineHeight) => {
    const lines = pdf.splitTextToSize(text, maxWidth);
    lines.forEach((line, i) => {
      pdf.text(line, x, y + i * lineHeight);
    });
    return lines.length * lineHeight;
  };

  // Kopfzeile auf Folgeseiten
  const drawPageHeader = (pdf, pageNum) => {
    if (pageNum === 1) return;
    pdf.setFillColor(234, 88, 12);
    pdf.rect(0, 0, 210, 1.5, 'F');
    pdf.setFontSize(7.5);
    pdf.setFont(undefined, 'normal');
    pdf.setTextColor(130, 130, 130);
    pdf.text(`${project.project_number} – ${project.title} | E-Vergabe`, 10, 8);
    pdf.text(`Seite ${pageNum}`, 200, 8, { align: 'right' });
    pdf.setDrawColor(220, 220, 220);
    pdf.setLineWidth(0.2);
    pdf.line(10, 10, 200, 10);
    pdf.setTextColor(0, 0, 0);
  };

  const handleExportPDF = async () => {
    if (!exportRef.current) return;
    
    setIsExporting(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const PAGE_HEIGHT = 287;
      const MARGIN_TOP = 15;
      const MARGIN_BOTTOM = 10;
      const CONTENT_START = 15;
      const IMG_SIZE = 58; // quadratisch
      const IMG_WIDTH = IMG_SIZE;
      const IMG_HEIGHT = IMG_SIZE;
      const IMG_COLS = 3;
      const IMG_GAP = 5;
      let pageNum = 1;

      // --- Berechne benötigte Höhe einer Position ---
      const estimatePositionHeight = (detailLines, imageCount) => {
        let h = 12; // Header-Balken
        h += detailLines * 6; // Textzeilen
        h += 6; // Abstand
        if (imageCount > 0) {
          h += 6; // "Bilder:"-Label
          const rows = Math.ceil(imageCount / IMG_COLS);
          h += rows * (IMG_HEIGHT + 4);
        }
        h += 10; // Abstand nach Position
        return h;
      };

      // Neue Seite beginnen
      const startNewPage = () => {
        pdf.addPage();
        pageNum++;
        drawPageHeader(pdf, pageNum);
        return CONTENT_START;
      };

      // --- Header: weißer Hintergrund mit orange Akzentlinie ---
      const HEADER_H = 28;
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, 210, HEADER_H, 'F');
      // Orange Akzentlinie oben
      pdf.setFillColor(234, 88, 12); // orange-600
      pdf.rect(0, 0, 210, 2, 'F');
      // Linker Textblock
      pdf.setTextColor(30, 30, 30);
      pdf.setFontSize(15);
      pdf.setFont(undefined, 'bold');
      pdf.text('E-Vergabe', 10, 13);
      pdf.setFontSize(8.5);
      pdf.setFont(undefined, 'normal');
      pdf.setTextColor(100, 100, 100);
      pdf.text(`${project.project_number} – ${project.title}`, 10, 19);
      pdf.setFontSize(7.5);
      pdf.text(`Kunde: ${project.client}  |  ${project.street}, ${project.city}  |  ${new Date().toLocaleDateString('de-DE')}`, 10, 25);

      // Logo oben rechts laden – weißer Hintergrund + Logo quadratisch zentriert
      try {
        const logoBase64 = await loadImageAsBase64('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/d76156ea9_logo_a-s_tiefbaupdf.png');
        // Logo-Bereich: rechts, vertikal mittig im Header
        const LOGO_W = 36;
        const LOGO_H = 18;
        const LOGO_X = 210 - 10 - LOGO_W;
        const LOGO_Y = (HEADER_H - LOGO_H) / 2 + 1;
        pdf.addImage(logoBase64, 'PNG', LOGO_X, LOGO_Y, LOGO_W, LOGO_H);
      } catch (e) { /* Logo nicht verfügbar */ }

      // Trennlinie unter Header
      pdf.setDrawColor(234, 88, 12);
      pdf.setLineWidth(0.5);
      pdf.line(10, HEADER_H, 200, HEADER_H);
      pdf.setLineWidth(0.2);
      pdf.setTextColor(0, 0, 0);

      let yOffset = HEADER_H + 6;
      drawPageHeader(pdf, pageNum);

      // --- Excavations (nur ausgewählte) ---
      const selectedExcavations = editableData.excavations.filter(e => selectedExcIds.has(e.id));
      const selectedMontage = editableData.montageLeistungen.filter(m => selectedMlIds.has(m.id));

      for (let i = 0; i < selectedExcavations.length; i++) {
        const exc = selectedExcavations[i];
        const globalExcIndex = editableData.excavations.findIndex(e => e.id === exc.id);
        const priceItem = priceItems.find(p => p.id === exc.price_item_id);
        const imageCount = exc.evergabe_images?.length || 0;

        // Detailzeilen schätzen
        let detailLines = 3; // Leistung, Standort, Maße/Faktor
        if (exc.surface_type) detailLines++;
        if (exc.construction_justification) detailLines += Math.ceil((exc.construction_justification.length / 80));
        detailLines++; // Preis

        const neededHeight = estimatePositionHeight(detailLines, imageCount);

        // Passt die gesamte Position auf die aktuelle Seite?
        if (yOffset + neededHeight > PAGE_HEIGHT - MARGIN_BOTTOM) {
          yOffset = startNewPage();
        }

        // --- Position Header (kompakt) ---
        pdf.setFillColor(248, 248, 248);
        pdf.rect(10, yOffset, 190, 6, 'F');
        pdf.setDrawColor(220, 220, 220);
        pdf.rect(10, yOffset, 190, 6, 'S');
        pdf.setFillColor(234, 88, 12); // orange accent
        pdf.rect(10, yOffset, 3, 6, 'F');
        pdf.setFontSize(8);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(30, 30, 30);
        pdf.text(`#${globalExcIndex + 1}  ${exc.location_name}`, 15, yOffset + 4.2);
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(150, 150, 150);
        pdf.text('Tiefbau', 197, yOffset + 4.2, { align: 'right' });
        pdf.setTextColor(0, 0, 0);
        yOffset += 8;

        // --- Details ---
        const LINE_H = 5;
        const LABEL_X = 12;
        const VALUE_X = 42;

        pdf.setFontSize(9);
        pdf.setFont(undefined, 'bold');
        pdf.text('Leistung:', LABEL_X, yOffset);
        pdf.setFont(undefined, 'normal');
        const leistungLines = pdf.splitTextToSize(formatPriceItemDescription(priceItem) || '–', 155);
        leistungLines.forEach((line, li) => pdf.text(line, VALUE_X, yOffset + li * LINE_H));
        yOffset += leistungLines.length * LINE_H + 1;

        pdf.setFont(undefined, 'bold');
        pdf.text('Standort:', LABEL_X, yOffset);
        pdf.setFont(undefined, 'normal');
        pdf.text(`${exc.street || ''}, ${exc.city || ''}`, VALUE_X, yOffset);
        yOffset += LINE_H + 1;

        pdf.setFont(undefined, 'bold');
        if (priceItem?.type === 'Grube') {
          pdf.text('Maße:', LABEL_X, yOffset);
          pdf.setFont(undefined, 'normal');
          const l = exc.excavation_length || 1.2;
          const w = exc.excavation_width || 1.0;
          const d = exc.excavation_depth || 1.0;
          const f = exc.excavation_factor ?? 1;
          pdf.text(`${l} m × ${w} m × ${d} m  |  Faktor: ${f}`, VALUE_X, yOffset);
        } else if (priceItem?.type === 'Graben') {
          pdf.text('Maße:', LABEL_X, yOffset);
          pdf.setFont(undefined, 'normal');
          const gl = exc.excavation_length || 1.2;
          const gw = exc.excavation_width || 1.0;
          const gd = exc.excavation_depth || 1.0;
          pdf.text(`${gl} m × ${gw} m × ${gd} m`, VALUE_X, yOffset);
        } else {
          pdf.text('Menge:', LABEL_X, yOffset);
          pdf.setFont(undefined, 'normal');
          pdf.text(`${exc.quantity} ${priceItem?.unit || 'ST'}`, VALUE_X, yOffset);
        }
        yOffset += LINE_H + 1;

        if (exc.surface_type) {
          pdf.setFont(undefined, 'bold');
          pdf.text('Oberfläche:', LABEL_X, yOffset);
          pdf.setFont(undefined, 'normal');
          let surfaceText = formatSurfaceType(exc.surface_type);
          if (exc.surface_type === 'Asphalt' && exc.asphalt_thickness) {
            surfaceText += `  |  Dicke: ${exc.asphalt_thickness} cm`;
          }
          pdf.text(surfaceText, VALUE_X, yOffset);
          yOffset += LINE_H + 1;
        }

        // Unterbeton / Mörtel
        const extraNotes = [];
        if (exc.concrete_base_used) {
          extraNotes.push(`Unterbeton${exc.concrete_base_thickness ? ` (${exc.concrete_base_thickness} cm)` : ''}`);
        }
        if (exc.mortar_used) {
          extraNotes.push(`Mörtel${exc.mortar_thickness ? ` (${exc.mortar_thickness} cm)` : ''}`);
        }
        if (extraNotes.length > 0) {
          pdf.setFont(undefined, 'bold');
          pdf.text('Hinweis:', LABEL_X, yOffset);
          pdf.setFont(undefined, 'normal');
          pdf.setTextColor(180, 100, 0);
          pdf.text(extraNotes.join('  |  '), VALUE_X, yOffset);
          pdf.setTextColor(0, 0, 0);
          yOffset += LINE_H + 1;
        }

        if (exc.construction_justification) {
          pdf.setFont(undefined, 'bold');
          pdf.text('Begründung:', LABEL_X, yOffset);
          pdf.setFont(undefined, 'normal');
          const justLines = pdf.splitTextToSize(exc.construction_justification, 155);
          justLines.forEach((line, li) => pdf.text(line, VALUE_X, yOffset + li * LINE_H));
          yOffset += justLines.length * LINE_H + 1;
        }

        yOffset += 3;

        // --- Bilder ---
        if (imageCount > 0) {
          pdf.setDrawColor(220, 220, 220);
          pdf.line(12, yOffset, 198, yOffset);
          yOffset += 4;
          pdf.setFontSize(9);
          pdf.setFont(undefined, 'bold');
          pdf.text('Dokumentationsfotos:', 12, yOffset);
          pdf.setFont(undefined, 'normal');
          yOffset += 5;

          for (let imgIdx = 0; imgIdx < imageCount; imgIdx++) {
            const col = imgIdx % IMG_COLS;
            const xPos = 12 + col * (IMG_SIZE + IMG_GAP);

            if (col === 0 && imgIdx > 0) {
              yOffset += IMG_SIZE + IMG_GAP;
            }

            if (col === 0 && yOffset + IMG_SIZE > PAGE_HEIGHT - MARGIN_BOTTOM) {
              yOffset = startNewPage();
              pdf.setFontSize(8);
              pdf.setFont(undefined, 'italic');
              pdf.setTextColor(120, 120, 120);
              pdf.text(`(Fortsetzung: ${exc.location_name})`, 12, yOffset);
              pdf.setTextColor(0, 0, 0);
              yOffset += 5;
            }

            try {
              const base64 = await loadImageAsBase64(exc.evergabe_images[imgIdx]);
              pdf.addImage(base64, 'JPEG', xPos, yOffset, IMG_SIZE, IMG_SIZE);
              pdf.setDrawColor(180, 180, 180);
              pdf.setLineWidth(0.3);
              pdf.rect(xPos, yOffset, IMG_SIZE, IMG_SIZE, 'S');
              pdf.setLineWidth(0.2);
            } catch (err) {
              console.error('Bildfehler:', err);
            }
          }
          yOffset += IMG_SIZE + IMG_GAP + 3;
        }

        // Trennlinie nach Position
        pdf.setDrawColor(230, 230, 230);
        pdf.line(10, yOffset, 200, yOffset);
        yOffset += 8;
      }

      // --- Montage Leistungen (nur ausgewählte) ---
      for (let i = 0; i < selectedMontage.length; i++) {
        const ml = selectedMontage[i];
        const globalMlIndex = editableData.montageLeistungen.findIndex(m => m.id === ml.id);
        const priceItem = montagePreisItems.find(p => p.id === ml.preis_item_id);
        const imageCount = ml.evergabe_images?.length || 0;

        let detailLines = 2;
        if (ml.work_description) detailLines += Math.ceil((ml.work_description.length / 80));
        detailLines++;

        const neededHeight = estimatePositionHeight(detailLines, imageCount);

        if (yOffset + neededHeight > PAGE_HEIGHT - MARGIN_BOTTOM) {
          yOffset = startNewPage();
        }

        // --- Position Header (kompakt) ---
        pdf.setFillColor(248, 248, 248);
        pdf.rect(10, yOffset, 190, 6, 'F');
        pdf.setDrawColor(220, 220, 220);
        pdf.rect(10, yOffset, 190, 6, 'S');
        pdf.setFillColor(59, 130, 246); // blau accent
        pdf.rect(10, yOffset, 3, 6, 'F');
        pdf.setFontSize(8);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(30, 30, 30);
        pdf.text(`#${editableData.excavations.length + globalMlIndex + 1}  ${ml.location_name}`, 15, yOffset + 4.2);
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(7);
        pdf.setTextColor(150, 150, 150);
        pdf.text('Montage', 197, yOffset + 4.2, { align: 'right' });
        pdf.setTextColor(0, 0, 0);
        yOffset += 8;

        // --- Details ---
        const ML_LINE_H = 5;
        const ML_LABEL_X = 12;
        const ML_VALUE_X = 42;

        pdf.setFontSize(9);
        pdf.setFont(undefined, 'bold');
        pdf.text('Leistung:', ML_LABEL_X, yOffset);
        pdf.setFont(undefined, 'normal');
        const mlLeistungLines = pdf.splitTextToSize(formatPriceItemDescription(priceItem) || '–', 155);
        mlLeistungLines.forEach((line, li) => pdf.text(line, ML_VALUE_X, yOffset + li * ML_LINE_H));
        yOffset += mlLeistungLines.length * ML_LINE_H + 1;

        pdf.setFont(undefined, 'bold');
        pdf.text('Menge:', ML_LABEL_X, yOffset);
        pdf.setFont(undefined, 'normal');
        pdf.text(`${ml.quantity} ${priceItem?.unit || 'ST'}`, ML_VALUE_X, yOffset);
        yOffset += ML_LINE_H + 1;

        if (ml.work_description) {
          pdf.setFont(undefined, 'bold');
          pdf.text('Beschreibung:', ML_LABEL_X, yOffset);
          pdf.setFont(undefined, 'normal');
          const descLines = pdf.splitTextToSize(ml.work_description, 155);
          descLines.forEach((line, li) => pdf.text(line, ML_VALUE_X, yOffset + li * ML_LINE_H));
          yOffset += descLines.length * ML_LINE_H + 1;
        }

        yOffset += 3;

        // --- Bilder ---
        if (imageCount > 0) {
          pdf.setDrawColor(220, 220, 220);
          pdf.line(12, yOffset, 198, yOffset);
          yOffset += 4;
          pdf.setFontSize(9);
          pdf.setFont(undefined, 'bold');
          pdf.text('Dokumentationsfotos:', 12, yOffset);
          pdf.setFont(undefined, 'normal');
          yOffset += 5;

          for (let imgIdx = 0; imgIdx < imageCount; imgIdx++) {
            const col = imgIdx % IMG_COLS;
            const xPos = 12 + col * (IMG_SIZE + IMG_GAP);

            if (col === 0 && imgIdx > 0) {
              yOffset += IMG_SIZE + IMG_GAP;
            }

            if (col === 0 && yOffset + IMG_SIZE > PAGE_HEIGHT - MARGIN_BOTTOM) {
              yOffset = startNewPage();
              pdf.setFontSize(8);
              pdf.setFont(undefined, 'italic');
              pdf.setTextColor(120, 120, 120);
              pdf.text(`(Fortsetzung: ${ml.location_name})`, 12, yOffset);
              pdf.setTextColor(0, 0, 0);
              yOffset += 5;
            }

            try {
              const base64 = await loadImageAsBase64(ml.evergabe_images[imgIdx]);
              pdf.addImage(base64, 'JPEG', xPos, yOffset, IMG_SIZE, IMG_SIZE);
              pdf.setDrawColor(180, 180, 180);
              pdf.setLineWidth(0.3);
              pdf.rect(xPos, yOffset, IMG_SIZE, IMG_SIZE, 'S');
              pdf.setLineWidth(0.2);
            } catch (err) {
              console.error('Bildfehler:', err);
            }
          }
          yOffset += IMG_SIZE + IMG_GAP + 3;
        }

        pdf.setDrawColor(230, 230, 230);
        pdf.line(10, yOffset, 200, yOffset);
        yOffset += 8;
      }

      pdf.save(`EVergabe_${project.project_number}.pdf`);
    } catch (error) {
      console.error("Fehler beim PDF Export:", error);
      alert("Fehler beim PDF Export: " + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold">E-Vergabe Export</h3>
          <p className="text-sm text-gray-600">Bearbeiten Sie die Positionen und fügen Sie Bilder hinzu</p>
        </div>
        <Button 
          onClick={handleExportPDF}
          disabled={isExporting || (selectedExcIds.size === 0 && selectedMlIds.size === 0)}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Download className="w-4 h-4 mr-2" />
          {isExporting
            ? 'Exportiere...'
            : `Als PDF exportieren (${selectedExcIds.size + selectedMlIds.size} Position${selectedExcIds.size + selectedMlIds.size !== 1 ? 'en' : ''})`
          }
        </Button>
      </div>

      {/* Preview Container */}
      <div ref={exportRef} className="space-y-8">

        {/* Excavation Positions - Gruppiert nach Projekt */}
        {Object.entries(excavationsByProject).map(([projectId, group]) => (
          <div key={`exc-project-${projectId}`} className="space-y-6">
            {/* Projektüberschrift */}
            {Object.keys(excavationsByProject).length > 1 && (
              <div className="bg-gradient-to-r from-green-100 to-emerald-50 border-l-4 border-green-500 p-4 rounded">
                <h3 className="text-lg font-bold text-gray-900">
                  {group.project.project_number} - {group.project.title}
                  {group.project.id !== project.id && (
                    <Badge variant="outline" className="ml-2">Folgeauftrag</Badge>
                  )}
                </h3>
                <p className="text-sm text-gray-600">{group.excavations.length} Tiefbau-Leistung(en)</p>
              </div>
            )}

            {/* Leistungen */}
            {group.excavations.map((exc, excIndex) => {
          const globalIndex = editableData.excavations.findIndex(e => e.id === exc.id);
          const editableExc = editableData.excavations[globalIndex];
          const priceItem = priceItems.find(p => p.id === exc.price_item_id);
          
          const isExcSelected = selectedExcIds.has(exc.id);
          return (
            <Card key={exc.id} className={`evergabe-position border-2 transition-all ${isExcSelected ? 'border-green-400' : 'border-gray-200 opacity-60'}`}>
              <CardHeader className={isExcSelected ? 'bg-green-50' : 'bg-gray-50'}>
                <CardTitle className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={isExcSelected}
                      onCheckedChange={() => toggleExcSelection(exc.id)}
                      className="w-5 h-5"
                    />
                    <span className={!isExcSelected ? 'text-gray-400' : ''}>
                      Position {globalIndex + 1}: {exc.location_name}
                    </span>
                  </div>
                  <Badge className="bg-green-600">Tiefbau</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-semibold text-gray-700">Leistung:</p>
                    <p>{formatPriceItemDescription(priceItem)}</p>
                  </div>
                  <div>
                   <p className="font-semibold text-gray-700">{priceItem?.type === 'Grube' ? 'Faktor:' : 'Menge:'}</p>
                   <p>{priceItem?.type === 'Grube' ? (exc.excavation_factor ?? 1) : `${exc.quantity} ${priceItem?.unit || 'ST'}`}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Standort:</p>
                    <p>{exc.street}, {exc.city}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Oberflächenart:</p>
                    <p>{formatSurfaceType(exc.surface_type)}</p>
                  </div>
                  {exc.construction_justification && (
                    <div className="col-span-2">
                      <p className="font-semibold text-gray-700">Tiefbaubegründung:</p>
                      <p>{exc.construction_justification}</p>
                    </div>
                  )}
                  {/* Asphaltdicke */}
                  {exc.surface_type === 'Asphalt' && exc.asphalt_thickness && (
                    <div>
                      <p className="font-semibold text-gray-700">Asphaltdicke:</p>
                      <p>{exc.asphalt_thickness} cm</p>
                    </div>
                  )}
                  {/* Unterbeton / Mörtel Hinweise */}
                  {(exc.concrete_base_used || exc.mortar_used) && (
                    <div className="col-span-2 flex flex-wrap gap-2">
                      {exc.concrete_base_used && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 border border-amber-300 text-amber-800 text-xs font-semibold rounded">
                          ⚠ Unterbeton{exc.concrete_base_thickness ? ` (${exc.concrete_base_thickness} cm)` : ''}
                        </span>
                      )}
                      {exc.mortar_used && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 border border-amber-300 text-amber-800 text-xs font-semibold rounded">
                          ⚠ Mörtel{exc.mortar_thickness ? ` (${exc.mortar_thickness} cm)` : ''}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Image Management */}
                <div className="border-t pt-4 space-y-4">
                  {/* Available Photos from Position */}
                  {getAllExcavationPhotos(exc).length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-blue-700">
                        Verfügbare Bilder von der Position (max. 4 auswählen)
                      </Label>
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                        {getAllExcavationPhotos(exc).map((photo, photoIndex) => {
                          const isSelected = editableExc?.evergabe_images?.includes(photo.url);
                          return (
                            <div 
                              key={photoIndex} 
                              className={`relative cursor-pointer rounded border-2 transition-all ${
                                isSelected ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-300 hover:border-blue-400'
                              }`}
                              onClick={() => handleSelectFromExisting('excavation', globalIndex, photo.url)}
                            >
                              <img 
                                src={photo.url} 
                                alt={photo.label}
                                className="w-full h-20 object-cover rounded"
                              />
                              <Badge className="absolute bottom-1 left-1 text-xs py-0 px-1 bg-black/70 text-white">
                                {photo.label}
                              </Badge>
                              {isSelected && (
                                <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center rounded">
                                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-gray-500">
                        {editableExc?.evergabe_images?.length || 0} von 4 Bildern ausgewählt
                      </p>
                    </div>
                  )}

                  {/* Available Photos from Documents - Excavations */}
                  {getDocumentPhotos().length > 0 && (
                   <div className="space-y-2">
                     <Label className="text-sm font-semibold text-purple-700">
                       Bilder aus Anlagenkorb (max. 4 auswählen)
                     </Label>
                     <div className="grid grid-cols-3 md:grid-cols-5 gap-2 max-h-80 overflow-y-auto">
                       {getDocumentPhotos().map((photo, photoIndex) => {
                         const isSelected = editableExc?.evergabe_images?.includes(photo.url);
                         return (
                           <div 
                             key={`doc-exc-${photoIndex}`}
                             className={`relative cursor-pointer rounded border-2 transition-all ${
                               isSelected ? 'border-purple-500 ring-2 ring-purple-300' : 'border-gray-300 hover:border-purple-400'
                             }`}
                             onClick={() => handleSelectFromExisting('excavation', globalIndex, photo.url)}
                           >
                             <img 
                               src={photo.url} 
                               alt={photo.label}
                               className="w-full h-20 object-cover rounded"
                             />
                             <Badge className="absolute bottom-1 left-1 text-xs py-0 px-1 bg-black/70 text-white">
                               {photo.label}
                             </Badge>
                             {isSelected && (
                               <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center rounded">
                                 <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                                   <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                     <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                   </svg>
                                 </div>
                               </div>
                             )}
                           </div>
                         );
                       })}
                     </div>
                   </div>
                  )}

                  {/* Custom Upload */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">Eigene Bilder hochladen</Label>
                      <label>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => document.getElementById(`upload-exc-${globalIndex}`).click()}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Bild hochladen
                        </Button>
                        <input
                          id={`upload-exc-${globalIndex}`}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageUpload(e.target.files[0], 'excavation', globalIndex)}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Selected Images Preview */}
                  {editableExc?.evergabe_images && editableExc.evergabe_images.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-green-700">Ausgewählte Bilder für Export</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {editableExc.evergabe_images.map((imgUrl, imgIndex) => (
                          <div key={imgIndex} className="relative group">
                            <img 
                              src={imgUrl} 
                              alt={`Ausgewählt ${imgIndex + 1}`}
                              className="w-full h-32 object-cover rounded border-2 border-green-500"
                            />
                            <Button
                              size="sm"
                              variant="destructive"
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                              onClick={() => handleRemoveImage('excavation', globalIndex, imgIndex)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
          </div>
        ))}

        {/* Montage Positions - Gruppiert nach Projekt */}
        {Object.entries(montageByProject).map(([projectId, group]) => (
          <div key={`montage-project-${projectId}`} className="space-y-6">
            {/* Projektüberschrift */}
            {Object.keys(montageByProject).length > 1 && (
              <div className="bg-gradient-to-r from-blue-100 to-cyan-50 border-l-4 border-blue-500 p-4 rounded">
                <h3 className="text-lg font-bold text-gray-900">
                  {group.project.project_number} - {group.project.title}
                  {group.project.id !== project.id && (
                    <Badge variant="outline" className="ml-2">Folgeauftrag</Badge>
                  )}
                </h3>
                <p className="text-sm text-gray-600">{group.montageLeistungen.length} Montage-Leistung(en)</p>
              </div>
            )}

            {/* Leistungen */}
            {group.montageLeistungen.map((ml, mlIndex) => {
          const globalIndex = editableData.montageLeistungen.findIndex(m => m.id === ml.id);
          const editableMl = editableData.montageLeistungen[globalIndex];
          const priceItem = montagePreisItems.find(p => p.id === ml.preis_item_id);
          
          const isMlSelected = selectedMlIds.has(ml.id);
          return (
            <Card key={ml.id} className={`evergabe-position border-2 transition-all ${isMlSelected ? 'border-blue-400' : 'border-gray-200 opacity-60'}`}>
              <CardHeader className={isMlSelected ? 'bg-blue-50' : 'bg-gray-50'}>
                <CardTitle className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={isMlSelected}
                      onCheckedChange={() => toggleMlSelection(ml.id)}
                      className="w-5 h-5"
                    />
                    <span className={!isMlSelected ? 'text-gray-400' : ''}>
                      Position {editableData.excavations.length + globalIndex + 1}: {ml.location_name}
                    </span>
                  </div>
                  <Badge className="bg-blue-600">Montage</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-semibold text-gray-700">Leistung:</p>
                    <p>{formatPriceItemDescription(priceItem)}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Menge:</p>
                    <p>{ml.quantity} {priceItem?.unit || 'ST'}</p>
                  </div>
                  {ml.work_description && (
                    <div className="col-span-2">
                      <p className="font-semibold text-gray-700">Arbeitsbeschreibung:</p>
                      <p>{ml.work_description}</p>
                    </div>
                  )}
                </div>

                {/* Image Management */}
                <div className="border-t pt-4 space-y-4">
                  {/* Available Photos from Montage */}
                  {getMontagePhotos(ml).length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-blue-700">
                        Verfügbare Bilder von der Montageleistung (max. 4 auswählen)
                      </Label>
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                        {getMontagePhotos(ml).map((photo, photoIndex) => {
                          const isSelected = editableMl?.evergabe_images?.includes(photo.url);
                          return (
                            <div 
                              key={photoIndex} 
                              className={`relative cursor-pointer rounded border-2 transition-all ${
                                isSelected ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-300 hover:border-blue-400'
                              }`}
                              onClick={() => handleSelectFromExisting('montage', globalIndex, photo.url)}
                            >
                              <img 
                                src={photo.url} 
                                alt={photo.label}
                                className="w-full h-20 object-cover rounded"
                              />
                              <Badge className="absolute bottom-1 left-1 text-xs py-0 px-1 bg-black/70 text-white">
                                {photo.label}
                              </Badge>
                              {isSelected && (
                                <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center rounded">
                                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-gray-500">
                        {editableMl?.evergabe_images?.length || 0} von 4 Bildern ausgewählt
                      </p>
                    </div>
                  )}

                  {/* Available Photos from Documents - Montage */}
                  {getDocumentPhotos().length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-purple-700">
                        Bilder aus Anlagenkorb (max. 4 auswählen)
                      </Label>
                      <div className="grid grid-cols-3 md:grid-cols-5 gap-2 max-h-80 overflow-y-auto">
                        {getDocumentPhotos().map((photo, photoIndex) => {
                          const isSelected = editableMl?.evergabe_images?.includes(photo.url);
                          return (
                            <div 
                              key={`doc-montage-${photoIndex}`}
                              className={`relative cursor-pointer rounded border-2 transition-all ${
                                isSelected ? 'border-purple-500 ring-2 ring-purple-300' : 'border-gray-300 hover:border-purple-400'
                              }`}
                              onClick={() => handleSelectFromExisting('montage', globalIndex, photo.url)}
                            >
                              <img 
                                src={photo.url} 
                                alt={photo.label}
                                className="w-full h-20 object-cover rounded"
                              />
                              <Badge className="absolute bottom-1 left-1 text-xs py-0 px-1 bg-black/70 text-white">
                                {photo.label}
                              </Badge>
                              {isSelected && (
                                <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center rounded">
                                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Custom Upload */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">Eigene Bilder hochladen</Label>
                      <label>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => document.getElementById(`upload-ml-${globalIndex}`).click()}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Bild hochladen
                        </Button>
                        <input
                          id={`upload-ml-${globalIndex}`}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageUpload(e.target.files[0], 'montage', globalIndex)}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Selected Images Preview */}
                  {editableMl?.evergabe_images && editableMl.evergabe_images.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-green-700">Ausgewählte Bilder für Export</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {editableMl.evergabe_images.map((imgUrl, imgIndex) => (
                          <div key={imgIndex} className="relative group">
                            <img 
                              src={imgUrl} 
                              alt={`Ausgewählt ${imgIndex + 1}`}
                              className="w-full h-32 object-cover rounded border-2 border-green-500"
                            />
                            <Button
                              size="sm"
                              variant="destructive"
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                              onClick={() => handleRemoveImage('montage', globalIndex, imgIndex)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
          </div>
        ))}

        {editableData.excavations.length === 0 && editableData.montageLeistungen.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-500 mb-2">Keine Positionen vorhanden</h3>
              <p className="text-gray-400">Fügen Sie erst Leistungen oder Montagearbeiten hinzu.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
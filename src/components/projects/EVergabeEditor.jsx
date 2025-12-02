import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Upload, X, Download, FileText, Image as ImageIcon, Plus, Trash2 } from "lucide-react";
import { UploadFile } from "@/integrations/Core";
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export default function EVergabeEditor({ 
  project, 
  excavations, 
  priceItems, 
  montageLeistungen, 
  montagePreisItems 
}) {
  const [editableData, setEditableData] = useState({
    excavations: [],
    montageLeistungen: []
  });
  const [isExporting, setIsExporting] = useState(false);
  const exportRef = React.useRef(null);

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
        // Select (max 2)
        if (currentImages.length < 2) {
          newArray[index] = {
            ...newArray[index],
            evergabe_images: [...currentImages, imageUrl]
          };
        } else {
          alert("Maximal 2 Bilder können ausgewählt werden");
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

  const handleExportPDF = async () => {
    if (!exportRef.current) return;
    
    setIsExporting(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      let isFirstPage = true;
      
      // Header hinzufügen
      pdf.setFontSize(18);
      pdf.setFont(undefined, 'bold');
      pdf.text('E-Vergabe Aufstellung', 105, 20, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'normal');
      pdf.text(`Projekt: ${project.project_number} - ${project.title}`, 105, 30, { align: 'center' });
      pdf.text(`Kunde: ${project.client}`, 105, 37, { align: 'center' });
      pdf.text(`Standort: ${project.street}, ${project.city}`, 105, 44, { align: 'center' });
      
      let yOffset = 55;
      
      // Excavations
      for (let i = 0; i < editableData.excavations.length; i++) {
        const exc = editableData.excavations[i];
        const priceItem = priceItems.find(p => p.id === exc.price_item_id);
        
        if (yOffset > 240) {
          pdf.addPage();
          yOffset = 20;
        }
        
        // Position Header
        pdf.setFillColor(240, 240, 240);
        pdf.rect(10, yOffset, 190, 10, 'F');
        pdf.setFontSize(12);
        pdf.setFont(undefined, 'bold');
        pdf.text(`Position ${i + 1}: ${exc.location_name}`, 12, yOffset + 7);
        
        yOffset += 15;
        
        // Details
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');
        pdf.text(`Leistung: ${formatPriceItemDescription(priceItem)}`, 12, yOffset);
        yOffset += 6;
        pdf.text(`Menge: ${exc.quantity} ${priceItem?.unit || 'ST'}`, 12, yOffset);
        yOffset += 6;
        pdf.text(`Standort: ${exc.street}, ${exc.city}`, 12, yOffset);
        yOffset += 6;
        pdf.text(`Oberfläche: ${formatSurfaceType(exc.surface_type)}`, 12, yOffset);
        yOffset += 6;
        
        if (exc.construction_justification) {
          pdf.text(`Begründung: ${exc.construction_justification}`, 12, yOffset);
          yOffset += 6;
        }
        
        pdf.setFont(undefined, 'bold');
        pdf.text(`Preis: ${exc.calculated_price?.toFixed(2) || '0.00'} €`, 12, yOffset);
        yOffset += 10;
        
        // Bilder hinzufügen
        if (exc.evergabe_images && exc.evergabe_images.length > 0) {
          pdf.setFont(undefined, 'normal');
          pdf.text('Bilder:', 12, yOffset);
          yOffset += 5;
          
          for (let imgIdx = 0; imgIdx < exc.evergabe_images.length; imgIdx++) {
            const imgUrl = exc.evergabe_images[imgIdx];
            
            try {
              // Bild laden und als base64 konvertieren
              const response = await fetch(imgUrl);
              const blob = await response.blob();
              const base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
              });
              
              const imgWidth = 85;
              const imgHeight = 60;
              const xPos = 12 + (imgIdx % 2) * 95;
              
              if (yOffset + imgHeight > 280) {
                pdf.addPage();
                yOffset = 20;
              }
              
              pdf.addImage(base64, 'JPEG', xPos, yOffset, imgWidth, imgHeight);
              
              if (imgIdx % 2 === 1 || imgIdx === exc.evergabe_images.length - 1) {
                yOffset += imgHeight + 5;
              }
            } catch (error) {
              console.error('Fehler beim Laden des Bildes:', error);
            }
          }
        }
        
        yOffset += 10;
      }
      
      // Montage Leistungen
      for (let i = 0; i < editableData.montageLeistungen.length; i++) {
        const ml = editableData.montageLeistungen[i];
        const priceItem = montagePreisItems.find(p => p.id === ml.preis_item_id);
        
        if (yOffset > 240) {
          pdf.addPage();
          yOffset = 20;
        }
        
        // Position Header
        pdf.setFillColor(220, 240, 255);
        pdf.rect(10, yOffset, 190, 10, 'F');
        pdf.setFontSize(12);
        pdf.setFont(undefined, 'bold');
        pdf.text(`Position ${editableData.excavations.length + i + 1}: ${ml.location_name}`, 12, yOffset + 7);
        
        yOffset += 15;
        
        // Details
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'normal');
        pdf.text(`Leistung: ${formatPriceItemDescription(priceItem)}`, 12, yOffset);
        yOffset += 6;
        pdf.text(`Menge: ${ml.quantity} ${priceItem?.unit || 'ST'}`, 12, yOffset);
        yOffset += 6;
        
        if (ml.work_description) {
          pdf.text(`Beschreibung: ${ml.work_description}`, 12, yOffset);
          yOffset += 6;
        }
        
        pdf.setFont(undefined, 'bold');
        pdf.text(`Preis: ${ml.calculated_price?.toFixed(2) || '0.00'} €`, 12, yOffset);
        yOffset += 10;
        
        // Bilder hinzufügen
        if (ml.evergabe_images && ml.evergabe_images.length > 0) {
          pdf.setFont(undefined, 'normal');
          pdf.text('Bilder:', 12, yOffset);
          yOffset += 5;
          
          for (let imgIdx = 0; imgIdx < ml.evergabe_images.length; imgIdx++) {
            const imgUrl = ml.evergabe_images[imgIdx];
            
            try {
              const response = await fetch(imgUrl);
              const blob = await response.blob();
              const base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
              });
              
              const imgWidth = 85;
              const imgHeight = 60;
              const xPos = 12 + (imgIdx % 2) * 95;
              
              if (yOffset + imgHeight > 280) {
                pdf.addPage();
                yOffset = 20;
              }
              
              pdf.addImage(base64, 'JPEG', xPos, yOffset, imgWidth, imgHeight);
              
              if (imgIdx % 2 === 1 || imgIdx === ml.evergabe_images.length - 1) {
                yOffset += imgHeight + 5;
              }
            } catch (error) {
              console.error('Fehler beim Laden des Bildes:', error);
            }
          }
        }
        
        yOffset += 10;
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
          disabled={isExporting}
          className="bg-purple-600 hover:bg-purple-700"
        >
          <Download className="w-4 h-4 mr-2" />
          {isExporting ? 'Exportiere...' : 'Als PDF exportieren'}
        </Button>
      </div>

      {/* Preview Container */}
      <div ref={exportRef} className="space-y-8">
        {/* Header */}
        <Card className="evergabe-header border-2 border-purple-200">
          <CardHeader className="bg-purple-50">
            <CardTitle className="text-center">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-purple-900">E-Vergabe Aufstellung</h2>
                <div className="text-lg text-gray-700">
                  <p>Projekt: {project.project_number} - {project.title}</p>
                  <p>Kunde: {project.client}</p>
                  <p>Standort: {project.street}, {project.city}</p>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Excavation Positions */}
        {editableData.excavations.map((exc, index) => {
          const priceItem = priceItems.find(p => p.id === exc.price_item_id);
          
          return (
            <Card key={exc.id} className="evergabe-position border-2 border-gray-300">
              <CardHeader className="bg-gray-50">
                <CardTitle className="flex items-center justify-between">
                  <span>Position {index + 1}: {exc.location_name}</span>
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
                    <p className="font-semibold text-gray-700">Menge:</p>
                    <p>{exc.quantity} {priceItem?.unit || 'ST'}</p>
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
                  <div className="col-span-2">
                    <p className="font-semibold text-gray-700">Preis:</p>
                    <p className="text-lg font-bold text-green-600">
                      {exc.calculated_price?.toFixed(2) || '0.00'} €
                    </p>
                  </div>
                </div>

                {/* Image Management */}
                <div className="border-t pt-4 space-y-4">
                  {/* Available Photos from Position */}
                  {getAllExcavationPhotos(exc).length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-blue-700">
                        Verfügbare Bilder von der Position (max. 2 auswählen)
                      </Label>
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                        {getAllExcavationPhotos(exc).map((photo, photoIndex) => {
                          const isSelected = exc.evergabe_images?.includes(photo.url);
                          return (
                            <div 
                              key={photoIndex} 
                              className={`relative cursor-pointer rounded border-2 transition-all ${
                                isSelected ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-300 hover:border-blue-400'
                              }`}
                              onClick={() => handleSelectFromExisting('excavation', index, photo.url)}
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
                        {exc.evergabe_images?.length || 0} von 2 Bildern ausgewählt
                      </p>
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
                          onClick={() => document.getElementById(`upload-exc-${index}`).click()}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Bild hochladen
                        </Button>
                        <input
                          id={`upload-exc-${index}`}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageUpload(e.target.files[0], 'excavation', index)}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Selected Images Preview */}
                  {exc.evergabe_images && exc.evergabe_images.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-green-700">Ausgewählte Bilder für Export</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {exc.evergabe_images.map((imgUrl, imgIndex) => (
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
                              onClick={() => handleRemoveImage('excavation', index, imgIndex)}
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

        {/* Montage Positions */}
        {editableData.montageLeistungen.map((ml, index) => {
          const priceItem = montagePreisItems.find(p => p.id === ml.preis_item_id);
          
          return (
            <Card key={ml.id} className="evergabe-position border-2 border-gray-300">
              <CardHeader className="bg-blue-50">
                <CardTitle className="flex items-center justify-between">
                  <span>Position {editableData.excavations.length + index + 1}: {ml.location_name}</span>
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
                  <div className="col-span-2">
                    <p className="font-semibold text-gray-700">Preis:</p>
                    <p className="text-lg font-bold text-blue-600">
                      {ml.calculated_price?.toFixed(2) || '0.00'} €
                    </p>
                  </div>
                </div>

                {/* Image Management */}
                <div className="border-t pt-4 space-y-4">
                  {/* Available Photos from Montage */}
                  {getMontagePhotos(ml).length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-blue-700">
                        Verfügbare Bilder von der Montageleistung (max. 2 auswählen)
                      </Label>
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                        {getMontagePhotos(ml).map((photo, photoIndex) => {
                          const isSelected = ml.evergabe_images?.includes(photo.url);
                          return (
                            <div 
                              key={photoIndex} 
                              className={`relative cursor-pointer rounded border-2 transition-all ${
                                isSelected ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-300 hover:border-blue-400'
                              }`}
                              onClick={() => handleSelectFromExisting('montage', index, photo.url)}
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
                        {ml.evergabe_images?.length || 0} von 2 Bildern ausgewählt
                      </p>
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
                          onClick={() => document.getElementById(`upload-ml-${index}`).click()}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Bild hochladen
                        </Button>
                        <input
                          id={`upload-ml-${index}`}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleImageUpload(e.target.files[0], 'montage', index)}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Selected Images Preview */}
                  {ml.evergabe_images && ml.evergabe_images.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-green-700">Ausgewählte Bilder für Export</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {ml.evergabe_images.map((imgUrl, imgIndex) => (
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
                              onClick={() => handleRemoveImage('montage', index, imgIndex)}
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
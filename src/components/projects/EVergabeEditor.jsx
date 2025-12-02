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
      const positions = exportRef.current.querySelectorAll('.evergabe-position');
      
      for (let i = 0; i < positions.length; i++) {
        if (i > 0) pdf.addPage();
        
        const canvas = await html2canvas(positions[i], {
          scale: 2,
          backgroundColor: '#ffffff',
          logging: false,
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.85);
        const imgWidth = 190;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addImage(imgData, 'JPEG', 10, 10, imgWidth, imgHeight);
        
        await new Promise(resolve => setTimeout(resolve, 100));
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
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Bilder für E-Vergabe</Label>
                    <label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => document.getElementById(`upload-exc-${index}`).click()}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Bild hinzufügen
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

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {exc.evergabe_images?.map((imgUrl, imgIndex) => (
                      <div key={imgIndex} className="relative group">
                        <img 
                          src={imgUrl} 
                          alt={`Position ${index + 1} - Bild ${imgIndex + 1}`}
                          className="w-full h-32 object-cover rounded border"
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

                  {(!exc.evergabe_images || exc.evergabe_images.length === 0) && (
                    <div className="text-center py-8 bg-gray-50 rounded border-2 border-dashed">
                      <ImageIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-500">Keine Bilder hinzugefügt</p>
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
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Bilder für E-Vergabe</Label>
                    <label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => document.getElementById(`upload-ml-${index}`).click()}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Bild hinzufügen
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

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {ml.evergabe_images?.map((imgUrl, imgIndex) => (
                      <div key={imgIndex} className="relative group">
                        <img 
                          src={imgUrl} 
                          alt={`Position ${editableData.excavations.length + index + 1} - Bild ${imgIndex + 1}`}
                          className="w-full h-32 object-cover rounded border"
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

                  {(!ml.evergabe_images || ml.evergabe_images.length === 0) && (
                    <div className="text-center py-8 bg-gray-50 rounded border-2 border-dashed">
                      <ImageIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm text-gray-500">Keine Bilder hinzugefügt</p>
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
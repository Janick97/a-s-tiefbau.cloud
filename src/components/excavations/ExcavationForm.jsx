import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Shovel, Upload, Camera, AlertTriangle, Trash2, Loader2, MapPin, Navigation, Info, User as UserIcon } from "lucide-react";
import { UploadFile } from "@/integrations/Core";
import { PriceItem, City, Project, User } from "@/entities/all";

// Helper Component for Image Upload Sections
function ImageUploadSection({ title, description, images = [], onImagesChange, maxFiles = 10 }) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    const filesToUpload = files.slice(0, maxFiles - images.length);
    if (files.length + images.length > maxFiles) {
      alert(`Sie können maximal ${maxFiles} Bilder hochladen. Es werden nur die ersten ${filesToUpload.length} Bilder berücksichtigt.`);
    }

    if (filesToUpload.length === 0) return; // No files to upload

    setIsUploading(true);
    try {
      const uploadPromises = filesToUpload.map(file => UploadFile({ file }));
      const uploadedFiles = await Promise.all(uploadPromises);
      const newImageUrls = uploadedFiles.map(res => res.file_url);
      onImagesChange([...images, ...newImageUrls]);
    } catch (error) {
      console.error("Fehler beim Hochladen der Bilder:", error);
      alert("Ein Fehler ist beim Hochladen aufgetreten.");
    } finally {
      setIsUploading(false);
      // Reset input value to allow re-uploading the same file if needed
      event.target.value = null;
    }
  };

  const handleDeleteImage = (urlToDelete) => {
    onImagesChange(images.filter(url => url !== urlToDelete));
  };

  return (
    <Card className="bg-gray-50/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-base flex items-center gap-2">
          <Camera className="w-5 h-5 text-gray-600" />
          {title}
        </CardTitle>
        <p className="text-sm text-gray-500">{description}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 mb-4">
          {images.map((url, index) => (
            <div key={url + index} className="relative group aspect-square rounded-md overflow-hidden border border-gray-200">
              <img src={url} alt={`Vorschau ${index + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => handleDeleteImage(url)}
                className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10"
                aria-label="Bild löschen"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          {isUploading && (
             <div className="flex items-center justify-center aspect-square border-2 border-dashed rounded-md bg-gray-100">
                <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
            </div>
          )}
        </div>
        
        <Input
          id={`file-upload-${title.replace(/\s+/g, '-')}`}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={isUploading || images.length >= maxFiles}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => document.getElementById(`file-upload-${title.replace(/\s+/g, '-')}`).click()}
          disabled={isUploading || images.length >= maxFiles}
          className="w-full"
        >
          <Upload className="w-4 h-4 mr-2" />
          {isUploading ? 'Lädt hoch...' : `Bilder auswählen (${images.length}/${maxFiles})`}
        </Button>
        {images.length >= maxFiles && (
            <p className="text-sm text-yellow-600 mt-2 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                Maximale Anzahl von {maxFiles} Bildern erreicht.
            </p>
        )}
      </CardContent>
    </Card>
  );
}

// Helper function to get initial form data, now accepting projects and defaultProjectId, and currentUser
const getInitialData = (excavation, projects = [], defaultProjectId = null, currentUser = null) => {
  // Find the project to prefill address
  const project = projects.find(p => p.id === (excavation?.project_id || defaultProjectId)) || projects[0];
  
  return {
    project_id: excavation?.project_id || defaultProjectId || (projects.length === 1 ? projects[0].id : ''),
    price_item_id: excavation?.price_item_id || '',
    quantity: parseFloat(excavation?.quantity) || 1, 
    location_name: excavation?.location_name || '',
    street: excavation?.street || project?.street || '',
    house_number: excavation?.house_number || '',
    postal_code: excavation?.postal_code || '',
    city: excavation?.city || project?.city || '',
    latitude: excavation?.latitude || null,
    longitude: excavation?.longitude || null,
    excavation_length: parseFloat(excavation?.excavation_length) || 1.2,
    excavation_depth: parseFloat(excavation?.excavation_depth) || 1.0,
    excavation_width: parseFloat(excavation?.excavation_width) || 1.0,
    excavation_factor: parseFloat(excavation?.excavation_factor) || 1,
    surface_type: excavation?.surface_type || '',
    surface_type_2: excavation?.surface_type_2 || null,
    surface_1_sqm: excavation?.surface_1_sqm !== undefined && excavation?.surface_1_sqm !== null ? parseFloat(excavation.surface_1_sqm) : '',
    surface_2_sqm: excavation?.surface_2_sqm !== undefined && excavation?.surface_2_sqm !== null ? parseFloat(excavation.surface_2_sqm) : '',
    asphalt_thickness: excavation?.asphalt_thickness !== undefined && excavation?.asphalt_thickness !== null ? parseFloat(excavation.asphalt_thickness) : '',
    concrete_base_used: excavation?.concrete_base_used || false,
    mortar_used: excavation?.mortar_used || false,
    gravel_used: excavation?.gravel_used || false,
    iron_plate_laid: excavation?.iron_plate_laid || false,
    curb_length: excavation?.curb_length !== undefined && excavation?.curb_length !== null ? parseFloat(excavation.curb_length) : '',
    edge_stone_length: excavation?.edge_stone_length !== undefined && excavation?.edge_stone_length !== null ? parseFloat(excavation.edge_stone_length) : '',
    gutter_length: excavation?.gutter_length !== undefined && excavation?.gutter_length !== null ? parseFloat(excavation.gutter_length) : '',
    excavated_material_left_onsite: excavation?.excavated_material_left_onsite || false,
    photos_before: Array.isArray(excavation?.photos_before) ? excavation.photos_before : [],
    photos_after: Array.isArray(excavation?.photos_after) ? excavation.photos_after : [],
    photos_environment: Array.isArray(excavation?.photos_environment) ? excavation.photos_environment : [],
    photos_backfill: Array.isArray(excavation?.photos_backfill) ? excavation.photos_backfill : [],
    photos_surface: Array.isArray(excavation?.photos_surface) ? excavation.photos_surface : [],
    foreman: excavation?.foreman || (currentUser?.full_name || 'Nicht zugewiesen'),
    calculated_price: parseFloat(excavation?.calculated_price) || 0,
    foreman_commission: parseFloat(excavation?.foreman_commission) || 0,
    backfill_commission: parseFloat(excavation?.backfill_commission) || 0,
    surface_commission: parseFloat(excavation?.surface_commission) || 0,
    foreman_user_id: excavation?.foreman_user_id || null,
    notes: excavation?.notes || '',
    construction_justification: excavation?.construction_justification || '',
  };
};

export default function ExcavationForm({ excavation, projects = [], defaultProjectId, onSubmit, onCancel }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState(getInitialData(excavation, projects, defaultProjectId, null));
  const [priceItems, setPriceItems] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // New state for submission loading
  const [selectedPriceItemUnit, setSelectedPriceItemUnit] = useState(null); // State to hold the effective unit for display
  const [displayCalculatedQuantity, setDisplayCalculatedQuantity] = useState(0); // State to store the effective quantity for display
  const [serviceCategory, setServiceCategory] = useState('grube'); // 'grube', 'graben', 'andere'

  // Helper to calculate the final monetary price based on current form data and selected item
  const calculatePrice = useCallback(() => {
    const priceItem = priceItems.find(item => item.id === formData.price_item_id);
    if (!priceItem) return 0;
    
    // Positions that should show detailed dimensions (alle Grube-Positionen)
    const detailDimensionPositions = ['10001', '10002', '10003', '10004', '10005'];
    
    // For specific item numbers (10021010, 10021040), use simple quantity * price calculation
    if (['10021010', '10021040'].includes(priceItem.item_number)) {
      const result = parseFloat(formData.quantity || 0) * priceItem.price;
      return result;
    }
    
    // For Grube positions with detailed dimensions
    if (detailDimensionPositions.includes(priceItem.item_number)) {
      const factor = parseFloat(formData.excavation_factor) || 0;
      const result = factor * priceItem.price;
      return result;
    }
    
    // For regular ST items
    if (priceItem.unit === 'ST') {
      const result = parseFloat(formData.quantity || 0) * priceItem.price;
      return result;
    } 
    
    // For Graben items (M unit) or any other default
    const result = parseFloat(formData.quantity || 0) * priceItem.price;
    return result;
  }, [
    formData.price_item_id, 
    formData.quantity, 
    formData.excavation_length, 
    formData.excavation_width, 
    formData.excavation_depth, 
    formData.excavation_factor,
    priceItems // priceItems is needed to find the selected priceItem
  ]);

  // Helper to derive effective quantity and unit for display purposes
  const getDisplayMetrics = useCallback(() => {
    const selectedItem = priceItems.find(p => p.id === formData.price_item_id);
    if (!selectedItem) {
        return { effectiveQuantity: 0, displayUnit: null };
    }

    let effectiveQuantity = 0;
    let displayUnit = null;

    const inputQuantity = parseFloat(formData.quantity) || 0;

    const detailDimensionPositions = ['10001', '10002', '10003', '10004', '10005'];
    const specialPieceItems = ['10021010', '10021040'];

    const isGrubeWithDimensions = detailDimensionPositions.includes(selectedItem.item_number);
    const isPieceBased = specialPieceItems.includes(selectedItem.item_number) || selectedItem.unit === 'ST';
    const isGrabenMeterBased = selectedItem.unit === 'M' && !isGrubeWithDimensions;

    if (isGrubeWithDimensions) {
        const factor_dim = parseFloat(formData.excavation_factor) || 0;
        effectiveQuantity = factor_dim;
        displayUnit = 'Faktor';
    } else if (isPieceBased) {
        effectiveQuantity = inputQuantity;
        displayUnit = 'ST';
    } else if (isGrabenMeterBased) {
        effectiveQuantity = inputQuantity;
        displayUnit = 'M';
    } else {
        effectiveQuantity = inputQuantity;
        displayUnit = selectedItem.unit;
    }

    return { effectiveQuantity: Math.max(0, effectiveQuantity), displayUnit };
  }, [
    formData.price_item_id,
    formData.quantity,
    formData.excavation_length,
    formData.excavation_width,
    formData.excavation_depth,
    formData.excavation_factor,
    priceItems
  ]);

  // Auto-calculate factor for Standardgrube positions
  useEffect(() => {
    const selectedItem = priceItems.find(p => p.id === formData.price_item_id);
    if (!selectedItem) return;

    const detailDimensionPositions = ['10001', '10002', '10003', '10004', '10005'];
    if (detailDimensionPositions.includes(selectedItem.item_number)) {
      const length = parseFloat(formData.excavation_length) || 0;
      const width = parseFloat(formData.excavation_width) || 0;
      
      // Formel: =AUFRUNDEN((((Länge * Breite) - 1,2) / 0,25) / 10; 1) + 1
      // AUFRUNDEN mit Parameter 1 = auf 1 Dezimalstelle aufrunden
      const intermediateValue = (((length * width) - 1.2) / 0.25) / 10;
      const roundedValue = Math.ceil(intermediateValue * 10) / 10;
      const calculatedFactor = roundedValue + 1;
      const finalFactor = Math.max(1, calculatedFactor); // Minimum Faktor = 1
      
      if (finalFactor !== formData.excavation_factor) {
        setFormData(prev => ({ ...prev, excavation_factor: finalFactor }));
      }
    }
  }, [formData.excavation_length, formData.excavation_width, formData.price_item_id, priceItems]);

  // Update calculation whenever relevant fields change
  useEffect(() => {
    // Only calculate if price items are loaded and a price item is selected
    if (priceItems.length > 0 && formData.price_item_id) {
        const newPrice = calculatePrice();
        const { effectiveQuantity, displayUnit } = getDisplayMetrics();
        
        setFormData(prev => ({ ...prev, calculated_price: newPrice }));
        setSelectedPriceItemUnit(displayUnit);
        setDisplayCalculatedQuantity(effectiveQuantity);
    } else {
        // Reset if no item selected or data not loaded
        setFormData(prev => ({ ...prev, calculated_price: 0 }));
        setSelectedPriceItemUnit(null);
        setDisplayCalculatedQuantity(0);
    }
  }, [
    formData.price_item_id, 
    formData.quantity, 
    formData.excavation_length, 
    formData.excavation_width, 
    formData.excavation_depth, 
    formData.excavation_factor,
    priceItems, // Dependency for calculatePrice and getDisplayMetrics
    calculatePrice, // Dependency because calculatePrice is a useCallback
    getDisplayMetrics // Dependency because getDisplayMetrics is a useCallback
  ]);

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await User.me();
        setCurrentUser(userData);
      } catch (error) {
        console.log("Benutzer nicht angemeldet oder Fehler beim Laden:", error);
        setCurrentUser(null);
      }
    };
    loadUser();
  }, []);

  // Effect to load dropdown data (price items, cities)
  useEffect(() => {
    const loadDropdownData = async () => {
        setIsLoadingData(true);
        try {
            const [priceData] = await Promise.all([
                PriceItem.list('item_number').catch(() => []),
            ]);
            setPriceItems(Array.isArray(priceData) ? priceData : []);
        } catch (error) {
            console.error("Fehler beim Laden der Formular-Daten:", error);
            setPriceItems([]);
        }
        setIsLoadingData(false);
    };
    loadDropdownData();
  }, []); // Runs once on mount

  // Effect to re-initialize form data when relevant props change
  useEffect(() => {
    setFormData(getInitialData(excavation, projects, defaultProjectId, currentUser));
  }, [excavation, projects, defaultProjectId, currentUser]);
  
  // General input handler
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImagesChange = (field, urls) => {
    setFormData(prev => ({ ...prev, [field]: urls }));
  };

  const handlePriceItemChange = (itemId) => {
    setFormData(prev => {
      const updatedFormData = { ...prev, price_item_id: itemId };
      // Auto-fill address if a project is selected (using current project_id from updatedFormData)
      const project = projects.find(p => p.id === updatedFormData.project_id);
      if(project){
        updatedFormData.street = project.street || '';
        updatedFormData.city = project.city || '';
        updatedFormData.location_name = (project.street || '') + ' ' + (project.house_number || '');
      }
      return updatedFormData;
    });
  };

  const handleFetchLocation = async () => {
    if (!navigator.geolocation) {
      alert("GPS-Standort wird von Ihrem Browser nicht unterstützt.");
      return;
    }
    setIsFetchingLocation(true);

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const { latitude, longitude } = position.coords;
      
      // Reverse Geocoding mit Nominatim
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
          { headers: { 'Accept-Language': 'de' } }
        );
        const data = await response.json();
        
        if (data.address) {
          setFormData(prev => ({
            ...prev,
            latitude,
            longitude,
            street: data.address.road || prev.street,
            house_number: data.address.house_number || '',
            postal_code: data.address.postcode || prev.postal_code,
            city: data.address.city || data.address.town || data.address.village || prev.city,
          }));
          alert("Standort und Adresse erfolgreich erfasst! Sie können die Daten noch anpassen.");
        } else {
          throw new Error("Adresse konnte nicht ermittelt werden");
        }
      } catch (geocodeError) {
        console.error("Reverse Geocoding fehlgeschlagen:", geocodeError);
        // Fallback: Projektdaten verwenden
        const project = projects.find(p => p.id === formData.project_id);
        setFormData(prev => ({
          ...prev,
          latitude,
          longitude,
          street: project?.street || prev.street,
          city: project?.city || prev.city,
        }));
        alert("GPS erfasst! Adresse wurde mit Projektdaten vorausgefüllt. Bitte prüfen und anpassen.");
      }

    } catch (error) {
      console.error("Fehler beim Abrufen des Standorts:", error);
      let errorMessage = "Standort konnte nicht abgerufen werden. ";
      
      switch(error.code) {
        case error.PERMISSION_DENIED:
          errorMessage += "GPS-Berechtigung wurde verweigert.";
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage += "Standortinformationen sind nicht verfügbar.";
          break;
        case error.TIMEOUT:
          errorMessage += "Zeitüberschreitung. Versuchen Sie es erneut.";
          break;
        default:
          errorMessage += error.message || "Unbekannter Fehler.";
      }
      
      alert(errorMessage);
    } finally {
      setIsFetchingLocation(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
        const calculatedPrice = calculatePrice();

        // Provisionen berechnen
        const totalPrice = calculatedPrice || 0;
        const foremanCommission = totalPrice * 0.5;
        const backfillCommission = totalPrice * 0.2;
        const surfaceCommission = totalPrice * 0.3;

        // Automatische Standortbezeichnung: Stadt Straße Hausnummer
        const autoLocationName = [
          formData.city,
          formData.street,
          formData.house_number
        ].filter(Boolean).join(' ');

        const dataToSubmit = { 
          ...formData,
          location_name: autoLocationName || formData.location_name,
          asphalt_thickness: formData.asphalt_thickness === '' ? null : formData.asphalt_thickness,
          surface_1_sqm: formData.surface_1_sqm === '' ? null : formData.surface_1_sqm,
          surface_2_sqm: formData.surface_2_sqm === '' ? null : formData.surface_2_sqm,
          curb_length: formData.curb_length === '' ? null : formData.curb_length,
          edge_stone_length: formData.edge_stone_length === '' ? null : formData.edge_stone_length,
          gutter_length: formData.gutter_length === '' ? null : formData.gutter_length,
          calculated_price: calculatedPrice,
          foreman_commission: foremanCommission,
          backfill_commission: backfillCommission,
          surface_commission: surfaceCommission,
          foreman_user_id: currentUser?.id || null,
        };
        
        console.log('Submitting data:', dataToSubmit);
        await onSubmit(dataToSubmit);
    } catch (error) {
        console.error("Submission failed:", error);
        alert("Fehler beim Speichern der Leistung.");
    } finally {
        setIsSubmitting(false);
    }
  };
  
  // Memoize selected price item for efficient lookups in render
  const selectedPriceItem = useMemo(() => {
    return priceItems.find(p => p.id === formData.price_item_id);
  }, [formData.price_item_id, priceItems]);

  // Helper to determine form display logic based on position number and type
  const detailDimensionPositions = useMemo(() => ['10001', '10002', '10003', '10004', '10005'], []);
  
  // Filtering price items into categories for the select dropdown
  const grubenItems = useMemo(() => {
    return priceItems.filter(item => detailDimensionPositions.includes(item.item_number));
  }, [priceItems, detailDimensionPositions]);

  const grabenItems = useMemo(() => {
    return priceItems.filter(item => 
      !detailDimensionPositions.includes(item.item_number) && item.unit === 'M'
    );
  }, [priceItems, detailDimensionPositions]);

  const andereItems = useMemo(() => {
    return priceItems.filter(item => 
      !detailDimensionPositions.includes(item.item_number) && item.unit !== 'M'
    );
  }, [priceItems, detailDimensionPositions]);

  // Get filtered items based on selected category
  const filteredPriceItems = useMemo(() => {
    if (serviceCategory === 'grube') return grubenItems;
    if (serviceCategory === 'graben') return grabenItems;
    if (serviceCategory === 'andere') return andereItems;
    return priceItems;
  }, [serviceCategory, grubenItems, grabenItems, andereItems, priceItems]);

  // Generate Google Maps link
  const getGoogleMapsLink = () => {
    if (formData.latitude && formData.longitude) {
      return `https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`;
    }
    return null;
  };

  const googleMapsLink = getGoogleMapsLink();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-4xl my-8"
      >
        <Card className="card-elevation border-none">
          <CardHeader className="bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-t-lg py-3 px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shovel className="w-5 h-5" />
                {excavation ? 'Leistung bearbeiten' : 'Neue Leistung erfassen'}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={onCancel} className="text-white hover:text-white/80">
                  <X className="w-4 h-4"/>
              </Button>
            </div>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">

              {/* Kategorie-Auswahl */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Leistungsart auswählen</Label>
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    type="button"
                    variant={serviceCategory === 'grube' ? 'default' : 'outline'}
                    onClick={() => setServiceCategory('grube')}
                    className={serviceCategory === 'grube' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                  >
                    <Shovel className="w-4 h-4 mr-2" />
                    Grube
                  </Button>
                  <Button
                    type="button"
                    variant={serviceCategory === 'graben' ? 'default' : 'outline'}
                    onClick={() => setServiceCategory('graben')}
                    className={serviceCategory === 'graben' ? 'bg-blue-500 hover:bg-blue-600' : ''}
                  >
                    <Shovel className="w-4 h-4 mr-2" />
                    Graben
                  </Button>
                  <Button
                    type="button"
                    variant={serviceCategory === 'andere' ? 'default' : 'outline'}
                    onClick={() => setServiceCategory('andere')}
                    className={serviceCategory === 'andere' ? 'bg-purple-500 hover:bg-purple-600' : ''}
                  >
                    <Shovel className="w-4 h-4 mr-2" />
                    Andere
                  </Button>
                </div>
              </div>

              {/* Standortinformationen */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Standortinformationen</h3>
                
                {/* GPS Button zuerst */}
                <div className="space-y-2">
                    <Label>GPS-Standort erfassen</Label>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleFetchLocation}
                            disabled={isFetchingLocation}
                            className="flex-1 sm:flex-none"
                        >
                            {isFetchingLocation ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <MapPin className="w-4 h-4 mr-2" />
                            )}
                            Standort erfassen
                        </Button>
                        {formData.latitude && formData.longitude && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => window.open(googleMapsLink, '_blank')}
                                className="flex-1 sm:flex-none"
                            >
                                <Navigation className="w-4 h-4 mr-2" />
                                Karte öffnen
                            </Button>
                        )}
                    </div>
                    {formData.latitude && formData.longitude && (
                      <p className="text-xs text-green-600">
                        ✓ GPS erfasst: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                      </p>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="street">Straße *</Label>
                    <Input
                      id="street"
                      value={formData.street}
                      onChange={(e) => handleInputChange('street', e.target.value)}
                      placeholder="Wird automatisch erfasst..."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="house_number">Hausnummer</Label>
                    <Input
                      id="house_number"
                      value={formData.house_number}
                      onChange={(e) => handleInputChange('house_number', e.target.value)}
                      placeholder="Nr."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">Stadt *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="Wird automatisch erfasst..."
                    required
                  />
                </div>
              </div>

              {/* Leistungsdetails */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Leistungsdetails</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="price_item_id">Position aus Preisliste *</Label>
                  <Select 
                    value={formData.price_item_id} 
                    onValueChange={(value) => handlePriceItemChange(value)}
                  >
                    <SelectTrigger className="h-auto min-h-[44px]">
                      <SelectValue placeholder={isLoadingData ? "Lade..." : "Position auswählen..."} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[60vh]">
                      <style>{`
                        [data-radix-select-viewport] [data-state="checked"] {
                          background-color: #fed7aa !important;
                          color: #000000 !important;
                        }
                        [data-radix-select-viewport] [data-state="checked"] * {
                          color: #000000 !important;
                        }
                      `}</style>
                      {filteredPriceItems.map(item => (
                        <SelectItem key={item.id} value={item.id} className="py-2 text-[10px] sm:text-xs leading-tight">
                          <div className="flex flex-col gap-0.5">
                            <div className="font-semibold">{item.item_number}</div>
                            <div className="line-clamp-2">{item.description}</div>
                            <div className="font-semibold text-[9px] sm:text-[10px]">
                              {item.unit}{currentUser?.position !== 'Bauleiter' && ` • €${item.price.toFixed(2)}`}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                      {filteredPriceItems.length === 0 && (
                        <div className="p-4 text-center text-sm text-gray-500">
                          Keine Positionen in dieser Kategorie
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  {selectedPriceItem && (
                    <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border">
                      <div className="font-medium text-gray-900">{selectedPriceItem.item_number}</div>
                      <div className="mt-1">{selectedPriceItem.description}</div>
                      <div className="mt-1 text-green-700 font-semibold">{selectedPriceItem.unit}{currentUser?.position !== 'Bauleiter' && ` • €${selectedPriceItem.price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantity">
                    Menge * {selectedPriceItem && `(${selectedPriceItem.unit === 'ST' ? 'Stück' : 'Meter'})`}
                  </Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => handleInputChange('quantity', parseFloat(e.target.value))}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="excavation_length">Länge (m)</Label>
                    <Input
                      id="excavation_length"
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.excavation_length}
                      onChange={(e) => handleInputChange('excavation_length', parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="excavation_width">Breite (m)</Label>
                    <Input
                      id="excavation_width"
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.excavation_width}
                      onChange={(e) => handleInputChange('excavation_width', parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="excavation_depth">Tiefe (m)</Label>
                    <Input
                      id="excavation_depth"
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.excavation_depth}
                      onChange={(e) => handleInputChange('excavation_depth', parseFloat(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="excavation_factor" className="flex items-center gap-1">
                      Faktor
                      {selectedPriceItem && detailDimensionPositions.includes(selectedPriceItem.item_number) && (
                        <span className="text-xs text-blue-600">(auto)</span>
                      )}
                    </Label>
                    <Input
                      id="excavation_factor"
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.excavation_factor}
                      onChange={(e) => handleInputChange('excavation_factor', parseFloat(e.target.value))}
                      readOnly={selectedPriceItem && detailDimensionPositions.includes(selectedPriceItem.item_number)}
                      className={selectedPriceItem && detailDimensionPositions.includes(selectedPriceItem.item_number) ? 'bg-gray-100 cursor-not-allowed' : ''}
                    />
                  </div>
                </div>

                {/* Price Display */}
                {selectedPriceItem && currentUser?.position !== 'Bauleiter' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-green-800">Berechneter Preis:</span>
                        <span className="text-xl font-bold text-green-700">
                          €{formData.calculated_price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="text-sm text-green-600 mt-1">
                          {displayCalculatedQuantity.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{selectedPriceItemUnit} × €{selectedPriceItem?.price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || 0}
                      </div>
                    </div>
                )}
              </div>

            {/* Surface Type Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Oberflächendetails</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="surface_type">Oberfläche 1 *</Label>
                  <Select 
                    value={formData.surface_type} 
                    onValueChange={(value) => handleInputChange('surface_type', value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Oberfläche auswählen..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value="Naturstein">Naturstein</SelectItem>
                      <SelectItem value="Beton">Beton</SelectItem>
                      <SelectItem value="Platten">Platten</SelectItem>
                      <SelectItem value="Pflaster">Pflaster</SelectItem>
                      <SelectItem value="unbefestigt">Unbefestigt</SelectItem>
                      <SelectItem value="Asphalt">Asphalt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="surface_1_sqm">Oberfläche 1 Meter</Label>
                  <Input
                    id="surface_1_sqm"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.surface_1_sqm}
                    onChange={(e) => handleInputChange('surface_1_sqm', e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="Meter"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="surface_type_2">Oberfläche 2 (optional)</Label>
                  <Select 
                    value={formData.surface_type_2 === null || formData.surface_type_2 === '' ? "none" : formData.surface_type_2} 
                    onValueChange={(value) => handleInputChange('surface_type_2', value === "none" ? null : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Zweite Oberfläche auswählen..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <SelectItem value="none">Keine zweite Oberfläche</SelectItem>
                      <SelectItem value="Naturstein">Naturstein</SelectItem>
                      <SelectItem value="Beton">Beton</SelectItem>
                      <SelectItem value="Platten">Platten</SelectItem>
                      <SelectItem value="Pflaster">Pflaster</SelectItem>
                      <SelectItem value="unbefestigt">Unbefestigt</SelectItem>
                      <SelectItem value="Asphalt">Asphalt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.surface_type_2 && formData.surface_type_2 !== "none" && formData.surface_type_2 !== "" && (
                  <div className="space-y-2">
                    <Label htmlFor="surface_2_sqm">Oberfläche 2 Meter</Label>
                    <Input
                      id="surface_2_sqm"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.surface_2_sqm}
                      onChange={(e) => handleInputChange('surface_2_sqm', e.target.value === '' ? '' : parseFloat(e.target.value))}
                      placeholder="Meter"
                    />
                  </div>
                )}
              </div>

              {/* Asphaltdicke - nur wenn Asphalt gewählt */}
              {(formData.surface_type === 'Asphalt' || formData.surface_type_2 === 'Asphalt') && (
                <div className="space-y-2 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <Label htmlFor="asphalt_thickness" className="flex items-center gap-2 font-medium text-yellow-900">
                    <Info className="w-4 h-4" />
                    Asphaltdicke (cm) *
                  </Label>
                  <Input
                    id="asphalt_thickness"
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.asphalt_thickness}
                    onChange={(e) => handleInputChange('asphalt_thickness', e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="z.B. 5.0"
                    required
                  />
                  <p className="text-xs text-yellow-700">
                    Bitte geben Sie die Dicke der Asphaltschicht in Zentimetern an
                  </p>
                </div>
              )}

              {/* Material checkboxes */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="concrete_base_used"
                    checked={formData.concrete_base_used}
                    onCheckedChange={(checked) => handleInputChange('concrete_base_used', checked)}
                  />
                  <Label htmlFor="concrete_base_used" className="cursor-pointer">Unterbeton</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="mortar_used"
                    checked={formData.mortar_used}
                    onCheckedChange={(checked) => handleInputChange('mortar_used', checked)}
                  />
                  <Label htmlFor="mortar_used" className="cursor-pointer">Mörtel</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="gravel_used"
                    checked={formData.gravel_used}
                    onCheckedChange={(checked) => handleInputChange('gravel_used', checked)}
                  />
                  <Label htmlFor="gravel_used" className="cursor-pointer">Splitt</Label>
                </div>
              </div>
            </div>

            {/* Neue Sektion: Zusätzliche Baustellendetails */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Zusätzliche Baustellendetails</h3>
              
              {/* Eisenplatte */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="iron_plate_laid"
                  checked={formData.iron_plate_laid}
                  onCheckedChange={(checked) => handleInputChange('iron_plate_laid', checked)}
                />
                <Label htmlFor="iron_plate_laid" className="cursor-pointer">Eisenplatte vor Ort ausgelegt</Label>
              </div>

              {/* Bordstein, Kantenstein, Rinne */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="curb_length">Bordstein (m)</Label>
                  <Input
                    id="curb_length"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.curb_length}
                    onChange={(e) => handleInputChange('curb_length', e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edge_stone_length">Kantenstein (m)</Label>
                  <Input
                    id="edge_stone_length"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.edge_stone_length}
                    onChange={(e) => handleInputChange('edge_stone_length', e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gutter_length">Rinne (m)</Label>
                  <Input
                    id="gutter_length"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.gutter_length}
                    onChange={(e) => handleInputChange('gutter_length', e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Aushub vor Ort gelassen */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="excavated_material_left_onsite"
                  checked={formData.excavated_material_left_onsite}
                  onCheckedChange={(checked) => handleInputChange('excavated_material_left_onsite', checked)}
                />
                <Label htmlFor="excavated_material_left_onsite" className="cursor-pointer">Aushub vor Ort gelassen</Label>
              </div>
            </div>

            {/* Sektion Tiefbaubegründung */}
            <Card className="bg-gray-50/50">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-500" />
                        Tiefbaubegründung
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Textarea
                        id="construction_justification"
                        value={formData.construction_justification}
                        onChange={(e) => handleInputChange('construction_justification', e.target.value)}
                        placeholder="Begründung für die Tiefbaumaßnahme (z.B. Kabelverlegung, Störungsbeseitigung, Hausanschluss, etc.)"
                        className="min-h-20"
                    />
                </CardContent>
              </Card>

              {/* Sektionen für Bilder-Upload */}
              <div className="space-y-6">
                <ImageUploadSection 
                  title="Vorher-Bilder"
                  description="Bilder vor Beginn der Arbeiten."
                  images={formData.photos_before}
                  onImagesChange={(urls) => handleImagesChange('photos_before', urls)}
                />
                <ImageUploadSection 
                  title="Bilder vom Umfeld"
                  description="Fotos von der Umgebung der Baustelle."
                  images={formData.photos_environment}
                  onImagesChange={(urls) => handleImagesChange('photos_environment', urls)}
                />
                 <ImageUploadSection 
                  title="Bilder zur Verfüllung"
                  description="Fotos, die den Verfüllprozess dokumentieren."
                  images={formData.photos_backfill}
                  onImagesChange={(urls) => handleImagesChange('photos_backfill', urls)}
                />
                 <ImageUploadSection 
                  title="Bilder der Oberfläche"
                  description="Fotos der wiederhergestellten Oberfläche."
                  images={formData.photos_surface}
                  onImagesChange={(urls) => handleImagesChange('photos_surface', urls)}
                />
                <ImageUploadSection 
                  title="Aufmaß Bilder"
                  description="Bilder für das Aufmaß."
                  images={formData.photos_after}
                  onImagesChange={(urls) => handleImagesChange('photos_after', urls)}
                />
              </div>

              <Card className="bg-gray-50/50">
                <CardHeader>
                    <CardTitle className="text-base text-gray-800">Zusätzliche Notizen</CardTitle>
                </CardHeader>
                <CardContent>
                    <Textarea
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        placeholder="Optionale Notizen zur Ausgrabung..."
                        className="min-h-24"
                    />
                </CardContent>
              </Card>

            </CardContent>

            <CardFooter className="flex justify-end gap-3 bg-gray-50 rounded-b-lg sticky bottom-0 py-4 backdrop-blur-sm">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                Abbrechen
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Speichere...
                    </>
                ) : (
                    <>
                        <Save className="w-4 h-4 mr-2" />
                        {excavation ? 'Aktualisieren' : 'Erstellen'}
                    </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </motion.div>
  );
}
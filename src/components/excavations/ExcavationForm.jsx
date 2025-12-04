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
const getInitialData = (excavation, projects = [], defaultProjectId = null, currentUser = null) => ({
    project_id: excavation?.project_id || defaultProjectId || (projects.length === 1 ? projects[0].id : ''),
    price_item_id: excavation?.price_item_id || '',
    // For Grube/Graben, quantity is now the user input (e.g., length in meters, or number of pits)
    // For ST, it's pieces. It's no longer the derived volume for Grube from initial data.
    quantity: parseFloat(excavation?.quantity) || 1, 
    location_name: excavation?.location_name || '',
    street: excavation?.street || '',
    house_number: excavation?.house_number || '',
    postal_code: excavation?.postal_code || '',
    city: excavation?.city || '',
    latitude: excavation?.latitude || null,
    longitude: excavation?.longitude || null,
    excavation_length: parseFloat(excavation?.excavation_length) || 1.2,
    excavation_depth: parseFloat(excavation?.excavation_depth) || 1.0,
    excavation_width: parseFloat(excavation?.excavation_width) || 1.0,
    excavation_factor: parseFloat(excavation?.excavation_factor) || 1,
    surface_type: excavation?.surface_type || '',
    surface_type_2: excavation?.surface_type_2 || null,
    asphalt_thickness: excavation?.asphalt_thickness !== undefined && excavation?.asphalt_thickness !== null ? parseFloat(excavation.asphalt_thickness) : '',
    concrete_base_used: excavation?.concrete_base_used || false,
    mortar_used: excavation?.mortar_used || false,
    gravel_used: excavation?.gravel_used || false,
    iron_plate_laid: excavation?.iron_plate_laid || false,
    curb_length: parseFloat(excavation?.curb_length) || 0,
    edge_stone_length: parseFloat(excavation?.edge_stone_length) || 0,
    gutter_length: parseFloat(excavation?.gutter_length) || 0,
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
});

export default function ExcavationForm({ excavation, projects = [], defaultProjectId, onSubmit, onCancel }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState(getInitialData(excavation, projects, defaultProjectId, null));
  const [priceItems, setPriceItems] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // New state for submission loading
  const [selectedPriceItemUnit, setSelectedPriceItemUnit] = useState(null); // State to hold the effective unit for display
  const [displayCalculatedQuantity, setDisplayCalculatedQuantity] = useState(0); // State to store the effective quantity for display

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
      
      setFormData(prev => ({
        ...prev,
        latitude, 
        longitude,
      }));
      
      alert("GPS-Standort erfolgreich erfasst! Sie können jetzt die Adresse manuell eingeben.");

    } catch (error) {
      console.error("Fehler beim Abrufen des Standorts:", error);
      let errorMessage = "Standort konnte nicht abgerufen werden. ";
      
      switch(error.code) {
        case error.PERMISSION_DENIED:
          errorMessage += "GPS-Berechtigung wurde verweigert. Bitte erlauben Sie den Zugriff auf Ihren Standort in den Browsereinstellungen.";
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage += "Standortinformationen sind nicht verfügbar. Bitte stellen Sie sicher, dass GPS aktiviert ist.";
          break;
        case error.TIMEOUT:
          errorMessage += "Zeitüberschreitung beim Abrufen des Standorts. Versuchen Sie es erneut.";
          break;
        default:
          errorMessage += `Unbekannter Fehler beim GPS-Zugriff: ${error.message || error}.`;
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
        const calculatedPrice = calculatePrice(); // Ensure the latest price is used

        // Provisionen berechnen
        const totalPrice = calculatedPrice || 0;
        const foremanCommission = totalPrice * 0.5;  // 50% für Bauleiter
        const backfillCommission = totalPrice * 0.2; // 20% für Verfüllung
        const surfaceCommission = totalPrice * 0.3;  // 30% für Oberfläche

        const dataToSubmit = { 
          ...formData,
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
    // For "Graben" category, include items with unit 'M' AND other items not in Grube, 
    // as per the outline's structure that only has two main categories.
    return priceItems.filter(item => !detailDimensionPositions.includes(item.item_number));
  }, [priceItems, detailDimensionPositions]);

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
          <CardHeader className="bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Shovel className="w-5 h-5" />
              {excavation ? 'Leistung bearbeiten' : 'Neue Leistung erfassen'}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onCancel} className="text-white hover:text-white/80 absolute top-4 right-4">
                <X className="w-4 h-4"/>
            </Button>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              
              {/* Projekt auswählen */}
              <div className="space-y-2">
                <Label htmlFor="project_id">Projekt *</Label>
                <Select 
                  value={formData.project_id} 
                  onValueChange={(value) => handleInputChange('project_id', value)}
                  disabled={!!defaultProjectId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Projekt auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.project_number} - {project.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Standortinformationen */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Standortinformationen</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="location_name">Standortbezeichnung *</Label>
                  <Input
                    id="location_name"
                    value={formData.location_name}
                    onChange={(e) => handleInputChange('location_name', e.target.value)}
                    placeholder="z.B. Hausanschluss, Schrankstandort..."
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="street">Straße *</Label>
                    <Input
                      id="street"
                      value={formData.street}
                      onChange={(e) => handleInputChange('street', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="house_number">Hausnummer</Label>
                    <Input
                      id="house_number"
                      value={formData.house_number}
                      onChange={(e) => handleInputChange('house_number', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="postal_code">PLZ</Label>
                    <Input
                      id="postal_code"
                      value={formData.postal_code}
                      onChange={(e) => handleInputChange('postal_code', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">Stadt *</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      required
                    />
                  </div>
                </div>
                
                {/* GPS section */}
                <div className="space-y-2">
                    <Label>GPS-Standort</Label>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleFetchLocation}
                            disabled={isFetchingLocation}
                        >
                            {isFetchingLocation ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <MapPin className="w-4 h-4 mr-2" />
                            )}
                            Standort erfassen
                        </Button>
                        {formData.latitude && formData.longitude && (
                          <>
                            <Input
                                value={`${formData.latitude.toFixed(6)}, ${formData.longitude.toFixed(6)}`}
                                readOnly
                                className="bg-gray-100 text-sm flex-grow min-w-[150px]"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => window.open(googleMapsLink, '_blank')}
                            >
                                <Navigation className="w-4 h-4 mr-2" />
                                In Google Maps öffnen
                            </Button>
                          </>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="latitude">GPS Breitengrad</Label>
                    <Input
                      id="latitude"
                      type="number"
                      step="any"
                      value={formData.latitude || ''}
                      onChange={(e) => handleInputChange('latitude', parseFloat(e.target.value))}
                      placeholder="z.B. 51.1657"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="longitude">GPS Längengrad</Label>
                    <Input
                      id="longitude"
                      type="number"
                      step="any"
                      value={formData.longitude || ''}
                      onChange={(e) => handleInputChange('longitude', parseFloat(e.target.value))}
                      placeholder="z.B. 10.4515"
                    />
                  </div>
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
                      <SelectItem value="grube-header" disabled className="font-bold bg-orange-50 text-xs sm:text-sm">
                        === GRUBEN ===
                      </SelectItem>
                      {grubenItems.map(item => (
                        <SelectItem key={item.id} value={item.id} className="py-3 text-xs sm:text-sm leading-tight">
                          <div className="flex flex-col gap-1">
                            <div className="font-medium">{item.item_number}</div>
                            <div className="text-gray-600 whitespace-normal break-words">{item.description}</div>
                            <div className="text-green-700 font-semibold">{item.unit} • €{item.price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                          </div>
                        </SelectItem>
                      ))}
                      <SelectItem value="graben-header" disabled className="font-bold bg-blue-50 mt-2 text-xs sm:text-sm">
                        === GRÄBEN & ANDERE ===
                      </SelectItem>
                      {grabenItems.map(item => (
                        <SelectItem key={item.id} value={item.id} className="py-3 text-xs sm:text-sm leading-tight">
                          <div className="flex flex-col gap-1">
                            <div className="font-medium">{item.item_number}</div>
                            <div className="text-gray-600 whitespace-normal break-words">{item.description}</div>
                            <div className="text-green-700 font-semibold">{item.unit} • €{item.price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedPriceItem && (
                    <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded border">
                      <div className="font-medium text-gray-900">{selectedPriceItem.item_number}</div>
                      <div className="mt-1">{selectedPriceItem.description}</div>
                      <div className="mt-1 text-green-700 font-semibold">{selectedPriceItem.unit} • €{selectedPriceItem.price.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
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
                {selectedPriceItem && (
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
                  {formData.surface_type_2 && formData.surface_type_2 !== "" && (
                    <p className="text-xs text-blue-600">
                      Es wurde eine zweite Oberfläche ausgewählt
                    </p>
                  )}
                </div>
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
                    onChange={(e) => handleInputChange('curb_length', parseFloat(e.target.value) || 0)}
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
                    onChange={(e) => handleInputChange('edge_stone_length', parseFloat(e.target.value) || 0)}
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
                    onChange={(e) => handleInputChange('gutter_length', parseFloat(e.target.value) || 0)}
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

            {/* Status & Zuordnung (Bauleiter) - now read-only */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Status & Zuordnung</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <Label className="text-sm font-medium text-blue-900">Erfasst von</Label>
                    <p className="text-lg font-semibold text-blue-800">
                      {currentUser?.full_name || formData.foreman || 'Lädt...'}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Die Leistung wird automatisch Ihrem Benutzerkonto zugeordnet
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Sektion Tiefbaubegründung */}
            <Card className="bg-gray-50/50">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                        Tiefbaubegründung *
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Textarea
                        id="construction_justification"
                        value={formData.construction_justification}
                        onChange={(e) => handleInputChange('construction_justification', e.target.value)}
                        placeholder="Begründung für die Tiefbaumaßnahme (z.B. Kabelverlegung, Störungsbeseitigung, Hausanschluss, etc.)"
                        className="min-h-20"
                        required
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
                  title="Nachher-Bilder"
                  description="Bilder nach Abschluss der Arbeiten."
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
import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Cloud, CloudRain, CloudSnow, Sun, Wind, Droplets, AlertCircle, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

export default function WeatherWidget() {
  const [weather, setWeather] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWeather();
    const interval = setInterval(loadWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadWeather = async () => {
    try {
      setIsLoading(true);
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: "Was ist das aktuelle Wetter in 52353 Düren, Deutschland? Gib mir die Temperatur in Celsius, Wetterbeschreibung (sonnig, bewölkt, regnerisch, etc.), Luftfeuchtigkeit in Prozent und Windgeschwindigkeit in km/h.",
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            temperature: { type: "number" },
            description: { type: "string" },
            humidity: { type: "number" },
            wind_speed: { type: "number" }
          }
        }
      });
      setWeather(response);
    } catch (error) {
      console.error("Fehler beim Laden des Wetters:", error);
      setWeather(null);
    }
    setIsLoading(false);
  };

  const getWeatherIcon = (description) => {
    if (!description) return Sun;
    const desc = description.toLowerCase();
    if (desc.includes('regen') || desc.includes('rain')) return CloudRain;
    if (desc.includes('schnee') || desc.includes('snow')) return CloudSnow;
    if (desc.includes('bewölkt') || desc.includes('cloud') || desc.includes('wolke')) return Cloud;
    return Sun;
  };

  const WeatherIcon = weather ? getWeatherIcon(weather.description) : Sun;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="card-elevation border-none">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Wetter in Düren</h3>
            <Button variant="ghost" size="icon" onClick={loadWeather} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>

          {isLoading ? (
            <div className="text-center py-4">
              <Cloud className="w-12 h-12 mx-auto mb-2 text-gray-400 animate-pulse" />
              <p className="text-sm text-gray-600">Wird geladen...</p>
            </div>
          ) : weather ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <WeatherIcon className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-gray-900">
                      {Math.round(weather.temperature)}°C
                    </div>
                    <div className="text-sm text-gray-600 capitalize">
                      {weather.description}
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Droplets className="w-4 h-4" />
                  <span>{weather.humidity}% Luftfeuchtigkeit</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Wind className="w-4 h-4" />
                  <span>{Math.round(weather.wind_speed)} km/h</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 text-red-400" />
              <p className="text-sm text-gray-600">Nicht verfügbar</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
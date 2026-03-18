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
        prompt: "Aktuelles Wetter in 52353 Düren, Deutschland. Gib NUR die Temperatur in Celsius als Zahl zurück. Kein Text, keine Erklärung.",
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            temperature: { type: "number" }
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
            <p className="text-sm text-gray-400">Wird geladen...</p>
          ) : weather ? (
            <div className="flex items-center gap-2">
              <WeatherIcon className="w-5 h-5 text-blue-500" />
              <span className="text-lg font-bold text-gray-900">{Math.round(weather.temperature)}°C</span>
              <span className="text-sm text-gray-500">Düren</span>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Nicht verfügbar</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
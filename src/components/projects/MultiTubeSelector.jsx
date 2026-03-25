import React from 'react';
import { Check } from 'lucide-react';

export default function MultiTubeSelector({ selectedTubes, onChange }) {
  const TUBES = [
    { id: 'tube1', label: '28mm', size: '28' },
    { id: 'tube2', label: '28mm', size: '28' },
    { id: 'tube3', label: '35mm', size: '35' },
    { id: 'tube4', label: '35mm', size: '35' },
  ];

  const toggleTube = (tubeId) => {
    const updated = selectedTubes.includes(tubeId)
      ? selectedTubes.filter(id => id !== tubeId)
      : [...selectedTubes, tubeId];
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-gray-700">Welche Rohre wurden verwendet?</p>
      
      <div className="grid grid-cols-4 gap-2">
        {TUBES.map((tube, idx) => {
          const isSelected = selectedTubes.includes(tube.id);
          return (
            <button
              key={tube.id}
              onClick={() => toggleTube(tube.id)}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all aspect-square ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              {/* Rohr-Visualisierung */}
              <div
                className={`w-12 h-6 rounded border-2 flex items-center justify-center mb-2 transition-all ${
                  isSelected
                    ? 'border-blue-600 bg-blue-100'
                    : 'border-gray-300 bg-gray-50'
                }`}
              >
                <span className="text-xs font-bold text-gray-700">{tube.size}</span>
              </div>
              
              {/* Label */}
              <span className="text-xs font-semibold text-gray-700 text-center">{tube.label}</span>
              
              {/* Check-Icon */}
              {isSelected && (
                <Check className="w-4 h-4 text-blue-600 absolute top-1 right-1" />
              )}
            </button>
          );
        })}
      </div>

      {/* Zusammenfassung */}
      {selectedTubes.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-gray-600 font-medium mb-1">Ausgewählte Rohre:</p>
          <div className="flex flex-wrap gap-1">
            {selectedTubes.map((tubeId) => {
              const tube = TUBES.find(t => t.id === tubeId);
              return (
                <span
                  key={tubeId}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-blue-300 rounded-full text-xs font-medium text-blue-700"
                >
                  {tube?.label}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
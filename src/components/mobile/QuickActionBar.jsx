import React from "react";
import { Button } from "@/components/ui/button";
import { Camera, Clock, MessageSquare, CheckCircle } from "lucide-react";

export default function QuickActionBar({ onAction }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-2xl z-50 lg:hidden">
      <div className="grid grid-cols-4 gap-1 p-2">
        <Button
          onClick={() => onAction('photos')}
          variant="ghost"
          className="flex flex-col items-center justify-center h-16 gap-1 hover:bg-blue-50"
        >
          <Camera className="w-5 h-5 text-blue-600" />
          <span className="text-xs text-gray-700">Fotos</span>
        </Button>

        <Button
          onClick={() => onAction('timesheet')}
          variant="ghost"
          className="flex flex-col items-center justify-center h-16 gap-1 hover:bg-purple-50"
        >
          <Clock className="w-5 h-5 text-purple-600" />
          <span className="text-xs text-gray-700">Zeit</span>
        </Button>

        <Button
          onClick={() => onAction('comment')}
          variant="ghost"
          className="flex flex-col items-center justify-center h-16 gap-1 hover:bg-green-50"
        >
          <MessageSquare className="w-5 h-5 text-green-600" />
          <span className="text-xs text-gray-700">Kommentar</span>
        </Button>

        <Button
          onClick={() => onAction('status')}
          variant="ghost"
          className="flex flex-col items-center justify-center h-16 gap-1 hover:bg-orange-50"
        >
          <CheckCircle className="w-5 h-5 text-orange-600" />
          <span className="text-xs text-gray-700">Status</span>
        </Button>
      </div>
    </div>
  );
}
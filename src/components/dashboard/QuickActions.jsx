import React from 'react';
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Plus, FolderPlus, Shovel } from "lucide-react";

export default function QuickActions() {
  return (
    <div className="flex gap-3">
      <Link to={createPageUrl("Projects")}>
        <Button className="ripple-effect bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 shadow-lg">
          <FolderPlus className="w-4 h-4 mr-2" />
          Neues Projekt
        </Button>
      </Link>
      <Link to={createPageUrl("Excavations")}>
        <Button variant="outline" className="ripple-effect border-2 hover:bg-blue-50 hover:border-blue-300">
          <Shovel className="w-4 h-4 mr-2" />
          Ausgrabung hinzufügen
        </Button>
      </Link>
    </div>
  );
}
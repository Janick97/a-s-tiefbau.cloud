import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { FolderOpen, Construction } from "lucide-react";
import { motion } from "framer-motion";

export default function BauleiterDashboard({ user }) {
  const tiles = [
  {
    title: "Meine Aufträge",
    icon: FolderOpen,
    url: user?.position === 'Oberfläche' ?
    createPageUrl("MyProjectsOberflaeche") :
    createPageUrl("MyProjects"),
    color: "from-orange-500 to-amber-500",
    bg: "from-orange-50 to-amber-50",
    border: "border-orange-200"
  },
  {
    title: "Fahrzeugpflege",
    icon: Construction,
    url: createPageUrl("MyVehicleMaintenance"),
    color: "from-blue-500 to-indigo-500",
    bg: "from-blue-50 to-indigo-50",
    border: "border-blue-200"
  }];


  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
      





      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-lg">
        {tiles.map((tile, i) =>
        <motion.div
          key={tile.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}>
          
            <Link to={tile.url}>
              <div className={`bg-gradient-to-br ${tile.bg} border ${tile.border} rounded-2xl p-8 flex flex-col items-center gap-4 shadow hover:shadow-md transition-all hover:scale-105 cursor-pointer`}>
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${tile.color} flex items-center justify-center shadow-lg`}>
                  <tile.icon className="w-8 h-8 text-white" />
                </div>
                <span className="text-lg font-semibold text-gray-800">{tile.title}</span>
              </div>
            </Link>
          </motion.div>
        )}
      </div>
    </div>);

}
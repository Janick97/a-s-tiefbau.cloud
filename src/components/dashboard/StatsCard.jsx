
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";

export default function StatsCard({ title, value, icon: Icon, color, trend }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="card-elevation border-none overflow-hidden relative">
        <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-5`} />
        <CardContent className="p-3 md:p-4 lg:p-6">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div className={`p-2 md:p-3 rounded-xl bg-gradient-to-br ${color} bg-opacity-10`}>
              <Icon className={`w-4 h-4 md:w-6 md:h-6 text-white`} style={{ filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.3))' }} />
            </div>
            <div className={`w-8 h-8 md:w-16 md:h-16 rounded-full bg-gradient-to-br ${color} opacity-10`} />
          </div>
          
          <div className="space-y-1 md:space-y-2">
            <p className="text-xs md:text-sm font-medium text-gray-600 tracking-wide">{title}</p>
            <p className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 truncate">{value}</p>
            {trend && (
              <div className="flex items-center gap-1 text-xs md:text-sm text-gray-500">
                <TrendingUp className="w-3 h-3 text-green-500" />
                <span>{trend}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

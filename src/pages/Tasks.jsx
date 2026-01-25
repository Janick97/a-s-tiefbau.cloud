import React from "react";
import TaskManager from "../components/collaboration/TaskManager";

export default function TasksPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Meine Aufgaben</h1>
          <p className="text-gray-600">Übersicht aller zugewiesenen Aufgaben</p>
        </div>
        
        <TaskManager />
      </div>
    </div>
  );
}
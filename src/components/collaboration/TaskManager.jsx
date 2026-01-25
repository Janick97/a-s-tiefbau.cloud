import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertCircle, 
  Plus, 
  User, 
  Calendar,
  Filter,
  X,
  Upload,
  Tag
} from "lucide-react";

export default function TaskManager({ projectId = null, excavationId = null }) {
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assigned_to_user_id: "",
    assigned_to_name: "",
    priority: "medium",
    due_date: "",
    tags: []
  });

  useEffect(() => {
    loadData();
  }, [projectId, excavationId, statusFilter, priorityFilter]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [userData, usersData] = await Promise.all([
        base44.auth.me(),
        base44.entities.User.list()
      ]);

      setCurrentUser(userData);
      setUsers(usersData || []);

      // Aufgaben laden
      let taskQuery = {};
      if (projectId) taskQuery.project_id = projectId;
      if (excavationId) taskQuery.excavation_id = excavationId;
      if (statusFilter !== "all") taskQuery.status = statusFilter;
      if (priorityFilter !== "all") taskQuery.priority = priorityFilter;

      const tasksData = await base44.entities.Task.filter(taskQuery, "-created_date");
      setTasks(tasksData || []);
    } catch (error) {
      console.error("Fehler beim Laden:", error);
    }
    setIsLoading(false);
  };

  const createTask = async () => {
    try {
      const selectedUser = users.find(u => u.id === newTask.assigned_to_user_id);
      
      const taskData = {
        ...newTask,
        assigned_to_name: selectedUser?.full_name || "",
        assigned_by_user_id: currentUser.id,
        assigned_by_name: currentUser.full_name,
        project_id: projectId || undefined,
        excavation_id: excavationId || undefined
      };

      await base44.entities.Task.create(taskData);

      // Benachrichtigung erstellen
      await base44.entities.Notification.create({
        user_id: newTask.assigned_to_user_id,
        type: "task_assigned",
        title: "Neue Aufgabe zugewiesen",
        message: `${currentUser.full_name} hat Ihnen die Aufgabe "${newTask.title}" zugewiesen`,
        link: projectId ? `/ProjectDetail?id=${projectId}` : "/Tasks",
        related_entity_type: "task",
        sender_user_id: currentUser.id,
        sender_name: currentUser.full_name
      });

      setShowCreateDialog(false);
      setNewTask({
        title: "",
        description: "",
        assigned_to_user_id: "",
        assigned_to_name: "",
        priority: "medium",
        due_date: "",
        tags: []
      });
      loadData();
    } catch (error) {
      console.error("Fehler beim Erstellen:", error);
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      const updates = { status: newStatus };
      
      if (newStatus === "completed") {
        updates.completed_date = new Date().toISOString();
      }

      await base44.entities.Task.update(taskId, updates);

      // Benachrichtigung an Ersteller
      if (task.assigned_by_user_id) {
        await base44.entities.Notification.create({
          user_id: task.assigned_by_user_id,
          type: "task_updated",
          title: "Aufgabenstatus aktualisiert",
          message: `${currentUser.full_name} hat die Aufgabe "${task.title}" auf "${getStatusLabel(newStatus)}" gesetzt`,
          link: projectId ? `/ProjectDetail?id=${projectId}` : "/Tasks",
          related_entity_type: "task",
          related_entity_id: taskId,
          sender_user_id: currentUser.id,
          sender_name: currentUser.full_name
        });
      }

      loadData();
    } catch (error) {
      console.error("Fehler beim Aktualisieren:", error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "open": return "bg-blue-100 text-blue-800";
      case "in_progress": return "bg-yellow-100 text-yellow-800";
      case "completed": return "bg-green-100 text-green-800";
      case "cancelled": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "urgent": return "bg-red-100 text-red-800 border-red-300";
      case "high": return "bg-orange-100 text-orange-800 border-orange-300";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "low": return "bg-green-100 text-green-800 border-green-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "open": return "Offen";
      case "in_progress": return "In Bearbeitung";
      case "completed": return "Erledigt";
      case "cancelled": return "Abgebrochen";
      default: return status;
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case "urgent": return "Dringend";
      case "high": return "Hoch";
      case "medium": return "Mittel";
      case "low": return "Niedrig";
      default: return priority;
    }
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            Aufgabenverwaltung
          </CardTitle>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Neue Aufgabe
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Neue Aufgabe erstellen</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Titel*</Label>
                  <Input
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    placeholder="Aufgabentitel..."
                  />
                </div>
                <div>
                  <Label>Beschreibung</Label>
                  <Textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    placeholder="Beschreibung..."
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Zuweisen an*</Label>
                    <Select
                      value={newTask.assigned_to_user_id}
                      onValueChange={(value) => setNewTask({ ...newTask, assigned_to_user_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Benutzer wählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name} ({user.position || "Benutzer"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priorität</Label>
                    <Select
                      value={newTask.priority}
                      onValueChange={(value) => setNewTask({ ...newTask, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Niedrig</SelectItem>
                        <SelectItem value="medium">Mittel</SelectItem>
                        <SelectItem value="high">Hoch</SelectItem>
                        <SelectItem value="urgent">Dringend</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Fälligkeitsdatum</Label>
                  <Input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Abbrechen
                  </Button>
                  <Button 
                    onClick={createTask}
                    disabled={!newTask.title || !newTask.assigned_to_user_id}
                  >
                    Aufgabe erstellen
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {/* Filter */}
        <div className="flex gap-3 mb-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              <SelectItem value="open">Offen</SelectItem>
              <SelectItem value="in_progress">In Bearbeitung</SelectItem>
              <SelectItem value="completed">Erledigt</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-48">
              <AlertCircle className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Prioritäten</SelectItem>
              <SelectItem value="urgent">Dringend</SelectItem>
              <SelectItem value="high">Hoch</SelectItem>
              <SelectItem value="medium">Mittel</SelectItem>
              <SelectItem value="low">Niedrig</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Aufgabenliste */}
        <div className="space-y-3">
          <AnimatePresence>
            {tasks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>Keine Aufgaben gefunden</p>
              </div>
            ) : (
              tasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className={`border-2 rounded-lg p-4 ${
                    task.status === "completed" ? "bg-gray-50 opacity-75" : "bg-white"
                  } ${getPriorityColor(task.priority)} border-l-4`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className={`font-semibold text-gray-900 mb-1 ${
                        task.status === "completed" ? "line-through" : ""
                      }`}>
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 items-center">
                        <Badge className={getStatusColor(task.status)}>
                          {getStatusLabel(task.status)}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <User className="w-3 h-3 mr-1" />
                          {task.assigned_to_name}
                        </Badge>
                        {task.due_date && (
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              isOverdue(task.due_date) && task.status !== "completed" 
                                ? "bg-red-50 text-red-700 border-red-300" 
                                : ""
                            }`}
                          >
                            <Calendar className="w-3 h-3 mr-1" />
                            {new Date(task.due_date).toLocaleDateString("de-DE")}
                            {isOverdue(task.due_date) && task.status !== "completed" && " (Überfällig)"}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Status-Aktionen */}
                    {task.assigned_to_user_id === currentUser?.id && (
                      <div className="flex gap-2 ml-4">
                        {task.status === "open" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateTaskStatus(task.id, "in_progress")}
                          >
                            Starten
                          </Button>
                        )}
                        {task.status === "in_progress" && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => updateTaskStatus(task.id, "completed")}
                          >
                            Erledigen
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Meta-Informationen */}
                  <div className="text-xs text-gray-500 mt-2 pt-2 border-t">
                    Zugewiesen von: {task.assigned_by_name} • Erstellt: {new Date(task.created_date).toLocaleDateString("de-DE")}
                    {task.completed_date && ` • Erledigt: ${new Date(task.completed_date).toLocaleDateString("de-DE")}`}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
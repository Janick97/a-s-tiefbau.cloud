import React, { useState, useEffect } from "react";
import { Ticket, User } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ThumbsUp, Trash2, Check, X, AlertCircle, Lightbulb, Palette, Loader2 } from "lucide-react";

const categoryIcons = {
  "Allgemeine Störung": AlertCircle,
  "Feature-Vorschlag": Lightbulb,
  "Design/Layout-Fehler": Palette
};

const categoryColors = {
  "Allgemeine Störung": "bg-red-100 text-red-800 border-red-300",
  "Feature-Vorschlag": "bg-blue-100 text-blue-800 border-blue-300",
  "Design/Layout-Fehler": "bg-purple-100 text-purple-800 border-purple-300"
};

const statusColors = {
  "open": "bg-yellow-100 text-yellow-800",
  "in_progress": "bg-blue-100 text-blue-800",
  "closed": "bg-green-100 text-green-800"
};

const statusLabels = {
  "open": "Offen",
  "in_progress": "In Bearbeitung",
  "closed": "Erledigt"
};

export default function TicketSystem() {
  const [tickets, setTickets] = useState([]);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ category: "Allgemeine Störung", description: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [userData, ticketData] = await Promise.all([
          User.me(),
          Ticket.list("-created_date")
        ]);
        setUser(userData);
        setTickets(Array.isArray(ticketData) ? ticketData : []);
      } catch (error) {
        console.error("Fehler beim Laden:", error);
      }
      setIsLoading(false);
    };
    loadData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.description.trim()) return;

    setIsSubmitting(true);
    try {
      const newTicket = await Ticket.create({
        category: formData.category,
        description: formData.description.trim(),
        user_id: user.id,
        user_name: user.full_name,
        status: "open",
        rating: 0,
        rated_by: []
      });
      setTickets([newTicket, ...tickets]);
      setFormData({ category: "Allgemeine Störung", description: "" });
      setShowForm(false);
    } catch (error) {
      console.error("Fehler beim Erstellen des Tickets:", error);
    }
    setIsSubmitting(false);
  };

  const handleRate = async (ticketId, currentRating) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    const hasRated = ticket.rated_by?.includes(user.id);
    
    let newRating = currentRating;
    let newRatedBy = ticket.rated_by || [];

    if (hasRated) {
      newRating = Math.max(0, currentRating - 1);
      newRatedBy = newRatedBy.filter((id) => id !== user.id);
    } else {
      newRating = currentRating + 1;
      newRatedBy = [...newRatedBy, user.id];
    }

    try {
      await Ticket.update(ticketId, { rating: newRating, rated_by: newRatedBy });
      setTickets(tickets.map((t) => t.id === ticketId ? { ...t, rating: newRating, rated_by: newRatedBy } : t));
    } catch (error) {
      console.error("Fehler beim Bewerten:", error);
    }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      await Ticket.update(ticketId, { status: newStatus });
      setTickets(tickets.map((t) => t.id === ticketId ? { ...t, status: newStatus } : t));
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Status:", error);
    }
  };

  const handleDelete = async (ticketId) => {
    if (window.confirm("Ticket wirklich löschen?")) {
      try {
        await Ticket.delete(ticketId);
        setTickets(tickets.filter((t) => t.id !== ticketId));
      } catch (error) {
        console.error("Fehler beim Löschen:", error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-4 md:p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Ticketsystem</h1>
            <p className="text-gray-600 text-sm mt-1">Ideen und Fehler melden</p>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-orange-600 hover:bg-orange-700 h-11">
            <Plus className="w-5 h-5 mr-2" />
            Neues Ticket
          </Button>
        </div>

        {/* Neues Ticket Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}>
              <Card className="border-dashed border-2 border-orange-300">
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label>Kategorie *</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData({ ...formData, category: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Allgemeine Störung">Allgemeine Störung</SelectItem>
                          <SelectItem value="Feature-Vorschlag">Feature-Vorschlag</SelectItem>
                          <SelectItem value="Design/Layout-Fehler">Design/Layout-Fehler</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Beschreibung *</Label>
                      <Textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Beschreiben Sie Ihre Idee oder den Fehler..."
                        rows={4}
                        required />
                    </div>

                    <div className="flex gap-3 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowForm(false)}
                        disabled={isSubmitting}>
                        Abbrechen
                      </Button>
                      <Button
                        type="submit"
                        disabled={isSubmitting || !formData.description.trim()}
                        className="bg-orange-600 hover:bg-orange-700">
                        {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                        Ticket erstellen
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tickets Liste */}
        <div className="space-y-4">
          {tickets.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-gray-500">Noch keine Tickets vorhanden</p>
              </CardContent>
            </Card>
          ) : (
            tickets.map((ticket) => {
              const hasRated = ticket.rated_by?.includes(user?.id);
              const Icon = categoryIcons[ticket.category];
              return (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}>
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <Icon className={`w-5 h-5 mt-1 flex-shrink-0 ${ticket.category === "Allgemeine Störung" ? "text-red-600" : ticket.category === "Feature-Vorschlag" ? "text-blue-600" : "text-purple-600"}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <Badge className={categoryColors[ticket.category]}>{ticket.category}</Badge>
                              <Badge className={statusColors[ticket.status]}>{statusLabels[ticket.status]}</Badge>
                            </div>
                            <p className="text-sm text-gray-600">von {ticket.user_name}</p>
                          </div>
                        </div>
                        {user?.role === "admin" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(ticket.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <p className="text-gray-700">{ticket.description}</p>

                      <div className="flex items-center justify-between pt-4 border-t">
                        <button
                          onClick={() => handleRate(ticket.id, ticket.rating)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                            hasRated
                              ? "bg-orange-100 text-orange-600 hover:bg-orange-200"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}>
                          <ThumbsUp className="w-4 h-4" />
                          <span className="text-sm font-medium">{ticket.rating}</span>
                        </button>

                        {user?.role === "admin" && (
                          <Select value={ticket.status} onValueChange={(value) => handleStatusChange(ticket.id, value)}>
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Offen</SelectItem>
                              <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                              <SelectItem value="closed">Erledigt</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
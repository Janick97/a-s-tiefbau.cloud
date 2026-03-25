import React, { useState, useEffect, useMemo } from "react";
import { InternalContact } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Phone, Search, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function InternalPhoneBook() {
  const [contacts, setContacts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    setIsLoading(true);
    try {
      const data = await InternalContact.list("full_name");
      setContacts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fehler beim Laden der Kontakte:", error);
      setContacts([]);
    }
    setIsLoading(false);
  };

  const filtered = useMemo(() => {
    return contacts.filter(
      (c) =>
        c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone_number.includes(searchTerm)
    );
  }, [contacts, searchTerm]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <Phone className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
              Telefonbuch
            </h1>
          </div>
          <p className="text-gray-500">Interner Kontaktverzeichnis</p>
        </motion.div>

        {/* Suche */}
        <Card className="card-elevation border-none mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Nach Name oder Telefonnummer suchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Kontakte */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Phone className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Keine Kontakte gefunden</p>
            </div>
          ) : (
            filtered.map((contact, index) => (
              <motion.div
                key={contact.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="card-elevation border-none hover:shadow-md transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {contact.full_name}
                        </h3>
                        {contact.role && (
                          <p className="text-xs text-gray-500 mt-1">
                            {contact.role}
                          </p>
                        )}
                      </div>
                      <a
                        href={`tel:${contact.phone_number}`}
                        className="ml-4 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-mono text-sm transition-colors"
                      >
                        <Phone className="w-4 h-4" />
                        {contact.phone_number}
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>

        {/* Zähler */}
        {filtered.length > 0 && (
          <p className="text-center text-sm text-gray-500 mt-6">
            {filtered.length} von {contacts.length} Kontakt
            {filtered.length !== 1 ? "en" : ""}
          </p>
        )}
      </div>
    </div>
  );
}
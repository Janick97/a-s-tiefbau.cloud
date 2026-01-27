import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, BueroUserActivity } from "@/entities/all";
import { Trophy, TrendingUp, Calendar, Award, Search, Users, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const ACTIVITY_POINTS = {
  projekt_angelegt: 10,
  projekt_bearbeitet: 5,
  vao_geaendert: 8,
  dokument_hochgeladen: 3,
  bild_hochgeladen: 2,
  chat_nachricht: 1,
  projekt_abgeschlossen: 15,
  montageauftrag_angelegt: 10,
  leistung_geprueft: 5,
  materialbuchung: 3
};

const ACTIVITY_LABELS = {
  projekt_angelegt: 'Projekt angelegt',
  projekt_bearbeitet: 'Projekt bearbeitet',
  vao_geaendert: 'VAO geändert',
  dokument_hochgeladen: 'Dokument hochgeladen',
  bild_hochgeladen: 'Bild hochgeladen',
  chat_nachricht: 'Chat Nachricht',
  projekt_abgeschlossen: 'Projekt abgeschlossen',
  montageauftrag_angelegt: 'Montageauftrag angelegt',
  leistung_geprueft: 'Leistung geprüft',
  materialbuchung: 'Materialbuchung'
};

const COLORS = ['#FF8042', '#00C49F', '#FFBB28', '#0088FE', '#8884D8', '#82CA9D', '#FFC658', '#FF6B9D'];

export default function BueroUserAuswertung() {
  const [currentUser, setCurrentUser] = useState(null);
  const [bueroUsers, setBueroUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('month');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState('all');

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      const userData = await User.me();
      setCurrentUser(userData);

      const allUsers = await User.list();
      const bueroUsersFiltered = allUsers.filter(u => 
        u.position === 'Büro' || u.role === 'admin'
      );
      setBueroUsers(bueroUsersFiltered);

      const allActivities = await BueroUserActivity.list('-activity_date');
      
      // Filter by time range
      const now = new Date();
      const filteredActivities = allActivities.filter(act => {
        const actDate = new Date(act.activity_date || act.created_date);
        if (timeRange === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return actDate >= weekAgo;
        } else if (timeRange === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return actDate >= monthAgo;
        } else if (timeRange === 'year') {
          const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          return actDate >= yearAgo;
        }
        return true;
      });

      setActivities(filteredActivities);
    } catch (error) {
      console.error('Fehler beim Laden:', error);
    }
    setLoading(false);
  };

  const getUserStats = () => {
    const stats = {};
    
    bueroUsers.forEach(user => {
      const userActivities = activities.filter(a => a.user_id === user.id);
      const totalPoints = userActivities.reduce((sum, a) => sum + (a.points || 0), 0);
      
      const activityCounts = {};
      userActivities.forEach(a => {
        activityCounts[a.activity_type] = (activityCounts[a.activity_type] || 0) + 1;
      });

      stats[user.id] = {
        user: user,
        totalPoints: totalPoints,
        activityCount: userActivities.length,
        activityCounts: activityCounts,
        activities: userActivities
      };
    });

    return stats;
  };

  const userStats = getUserStats();
  const sortedUsers = Object.values(userStats)
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .filter(stat => 
      !searchTerm || 
      stat.user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(stat => selectedUser === 'all' || stat.user.id === selectedUser);

  // Chart data
  const topUsersData = sortedUsers.slice(0, 10).map(stat => ({
    name: stat.user.full_name,
    punkte: stat.totalPoints,
    aktivitäten: stat.activityCount
  }));

  const activityTypeData = Object.entries(
    activities.reduce((acc, act) => {
      acc[act.activity_type] = (acc[act.activity_type] || 0) + 1;
      return acc;
    }, {})
  ).map(([type, count]) => ({
    name: ACTIVITY_LABELS[type] || type,
    value: count
  }));

  const dailyActivityData = activities.reduce((acc, act) => {
    const date = new Date(act.activity_date || act.created_date).toLocaleDateString('de-DE');
    const existing = acc.find(d => d.date === date);
    if (existing) {
      existing.aktivitäten += 1;
      existing.punkte += act.points || 0;
    } else {
      acc.push({ date, aktivitäten: 1, punkte: act.points || 0 });
    }
    return acc;
  }, []).slice(0, 14).reverse();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Lade Auswertung...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Trophy className="w-8 h-8 text-orange-600" />
              Büro-User Auswertung
            </h1>
            <p className="text-gray-600 mt-1">Aktivitäten und Leistung im Überblick</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Letzte Woche</SelectItem>
                <SelectItem value="month">Letzter Monat</SelectItem>
                <SelectItem value="year">Letztes Jahr</SelectItem>
                <SelectItem value="all">Gesamt</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Aktive Büro-User</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-gray-900">{bueroUsers.length}</div>
                <Users className="w-8 h-8 text-blue-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Gesamt Aktivitäten</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-gray-900">{activities.length}</div>
                <Activity className="w-8 h-8 text-green-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Gesamt Punkte</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-gray-900">
                  {activities.reduce((sum, a) => sum + (a.points || 0), 0).toLocaleString('de-DE')}
                </div>
                <Award className="w-8 h-8 text-orange-500 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Ø Punkte/User</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-gray-900">
                  {bueroUsers.length > 0 
                    ? Math.round(activities.reduce((sum, a) => sum + (a.points || 0), 0) / bueroUsers.length)
                    : 0}
                </div>
                <TrendingUp className="w-8 h-8 text-purple-500 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Users */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-orange-600" />
                Top 10 Büro-User
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topUsersData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="punkte" fill="#FF8042" name="Punkte" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Activity Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-600" />
                Aktivitätsverteilung
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={activityTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {activityTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Daily Activity Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Aktivitätsverlauf
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={dailyActivityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="aktivitäten" stroke="#00C49F" strokeWidth={2} name="Aktivitäten" />
                <Line yAxisId="right" type="monotone" dataKey="punkte" stroke="#FF8042" strokeWidth={2} name="Punkte" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* User Rankings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                User-Rangliste
              </span>
              <div className="flex gap-2">
                <Input
                  placeholder="Suche..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-48"
                />
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Alle User" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle User</SelectItem>
                    {bueroUsers.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sortedUsers.map((stat, index) => (
                <div
                  key={stat.user.id}
                  className="flex items-center gap-4 p-4 bg-white rounded-lg border hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white font-bold text-lg">
                    #{index + 1}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{stat.user.full_name}</h3>
                      {index === 0 && <Trophy className="w-4 h-4 text-yellow-500" />}
                      {index === 1 && <Trophy className="w-4 h-4 text-gray-400" />}
                      {index === 2 && <Trophy className="w-4 h-4 text-amber-600" />}
                    </div>
                    <div className="flex gap-4 text-sm text-gray-600">
                      <span>{stat.activityCount} Aktivitäten</span>
                      <span className="font-semibold text-orange-600">{stat.totalPoints} Punkte</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 max-w-xs">
                    {Object.entries(stat.activityCounts).slice(0, 3).map(([type, count]) => (
                      <Badge key={type} variant="outline" className="text-xs">
                        {ACTIVITY_LABELS[type]}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activity Points Reference */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-purple-600" />
              Punktesystem
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {Object.entries(ACTIVITY_POINTS).map(([type, points]) => (
                <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">{ACTIVITY_LABELS[type]}</span>
                  <Badge className="bg-orange-500">{points} P</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
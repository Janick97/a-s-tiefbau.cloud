import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User } from '@/entities/all';
import {
  LayoutDashboard,
  FolderOpen,
  Shovel,
  BarChart3,
  Settings,
  Users as UsersIcon,
  Construction,
  ListRestart,
  AlertTriangle,
  Upload,
  FileText,
  ClipboardList,
  Layers,
  LogOut,
  UserCircle,
  MapPin,
  ChevronDown,
  ChevronRight,
  Package,
  Wrench,
  Users,
  WifiOff,
  Network } from
"lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
  useSidebar } from
"@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import NotificationCenter from "@/components/collaboration/NotificationCenter";

// Navigationselemente - mit Verwaltungs-Untermenü
const navigationItems = [
{
  title: "Dashboard",
  url: createPageUrl("Dashboard"),
  icon: LayoutDashboard
},
{
  title: "Auftragsübersicht",
  url: createPageUrl("Projects"),
  icon: FolderOpen
},
// Removed "Baustellenkarte" as per the request
{
  title: "Dispo Tiefbau",
  url: createPageUrl("Disposition"),
  icon: ClipboardList,
  hasSubmenu: true
},
{
  title: "Dispo Montage",
  url: createPageUrl("DispositionMonteur"),
  icon: Construction,
  hasSubmenu: true
},
{
  title: "Meine Aufträge",
  url: createPageUrl("MyProjects"),
  icon: FolderOpen
},
{
  title: "Meine Montageaufträge",
  url: createPageUrl("MyMontageAuftraege"),
  icon: Construction
},
{
  title: "Oberfläche",
  url: createPageUrl("Surface"),
  icon: Layers
},
{
  title: "Montageaufträge",
  url: createPageUrl("MontageAuftraege"),
  icon: Construction
},
{
  title: "Verwaltung",
  url: createPageUrl("Excavations"),
  icon: Settings,
  hasSubmenu: true
},
{
  title: "Auswertungen",
  url: createPageUrl("Analytics"),
  icon: BarChart3,
  hasSubmenu: true
},
{
  title: "Büro-User Auswertung",
  url: createPageUrl("BueroUserAuswertung"),
  icon: Users
},
{
  title: "Berichte",
  url: createPageUrl("Reports"),
  icon: FileText
},
{
  title: "Fahrzeugpflege",
  url: createPageUrl("MyVehicleMaintenance"),
  icon: Construction
},
{
  title: "Fahrzeugpflege Kontrolle",
  url: createPageUrl("VehicleMaintenanceOverview"),
  icon: Settings
},
{
  title: "Projekt-Explorer",
  url: createPageUrl("ProjectExplorer"),
  icon: FolderOpen
},
{
  title: "FTTH Visioplan",
  url: createPageUrl("FTTHVisioplan"),
  icon: Network
}];


function LayoutContent({ children, currentPageName, user, bauleiter, monteure, handleLogout }) {
  const location = useLocation();
  const { setOpen } = useSidebar();
  const [dispositionOpen, setDispositionOpen] = React.useState(false);
  const [dispositionMontageOpen, setDispositionMontageOpen] = React.useState(false);
  const [verwaltungOpen, setVerwaltungOpen] = React.useState(false);
  const [auswertungenOpen, setAuswertungenOpen] = React.useState(false);

  const handleLinkClick = () => {
    setOpen(false);
  };

  // Filtern der Navigationselemente basierend auf der Benutzerrolle/Position
  const filteredNavigationItems = React.useMemo(() => {
    if (!user) {
      return navigationItems.filter((item) => item.title === 'Dashboard');
    }

    return navigationItems.filter((item) => {
      // "Meine Montageaufträge" nur für Monteure, nicht für Admins
      if (item.title === 'Meine Montageaufträge') {
        return user.position === 'Monteur';
      }

      if (user.role === 'admin') return true;

      if (user.position === 'Bauleiter') {
        return item.title === 'Dashboard' ||
        item.title === 'Meine Aufträge' ||
        item.title === 'Auswertungen' ||
        item.title === 'Fahrzeugpflege';
      }

      if (user.position === 'Monteur') {
        return item.title === 'Dashboard' ||
        item.title === 'Meine Montageaufträge';
      }

      if (user.position === 'Oberfläche') {
        return item.title === 'Dashboard' ||
        item.title === 'Meine Aufträge' ||
        item.title === 'Auswertungen' ||
        item.title === 'Fahrzeugpflege';
      }

      if (item.title === 'Dispo Tiefbau' || item.title === 'Dispo Montage') {
        return user.role === 'admin';
      }

      if (item.title === 'Auswertungen') {
        return user.role === 'admin' || user.position === 'Bauleiter' || user.position === 'Oberfläche';
      }

      if (item.title === 'Büro-User Auswertung') {
        return user.role === 'admin' || user.position === 'Büro';
      }

      if (item.title === 'Fahrzeugpflege') {
        return user.position === 'Bauleiter' || user.position === 'Oberfläche' || user.position === 'Monteur';
      }

      if (item.title === 'Fahrzeugpflege Kontrolle') {
        return user.role === 'admin' || user.position === 'Büro';
      }

      if (item.title === 'Meine Aufträge') {
        return user.position === 'Bauleiter' || user.position === 'Oberfläche';
      }

      if (item.title === 'Meine Montageaufträge') {
        return user.position === 'Monteur';
      }

      if (item.title === 'Auftragsübersicht') {
        return user.role === 'admin' || user.position !== 'Bauleiter' && user.position !== 'Monteur' && user.position !== 'Oberfläche';
      }

      // "Baustellenkarte" logic is removed here as the item itself is removed from navigationItems
      // if (item.title === 'Baustellenkarte') {
      //   return user.role === 'admin' || (user.position !== 'Bauleiter' && user.position !== 'Monteur');
      // }

      return user.position !== 'Bauleiter' && user.position !== 'Monteur' && user.position !== 'Oberfläche';
    }).map((item) => {
      // Anpassen der URL für "Meine Aufträge" basierend auf der Position
      if (item.title === 'Meine Aufträge' && user.position === 'Oberfläche') {
        return { ...item, url: createPageUrl("MyProjectsOberflaeche") };
      }
      return item;
    });
  }, [user]);

  return (
    <>
      <style>
        {`
          :root {
            --primary: 25 95% 53%;
            --primary-foreground: 0 0% 98%;
            --secondary: 213 94% 48%;
            --secondary-foreground: 0 0% 98%;
            --accent: 210 11% 26%;
            --accent-foreground: 0 0% 98%;
            --background: 0 0% 100%;
            --foreground: 0 0% 9%;
            --card: 0 0% 100%;
            --card-foreground: 0 0% 9%;
            --muted: 210 40% 96%;
            --muted-foreground: 215 16% 47%;
            --border: 220 13% 91%;
            --input: 220 13% 91%;
            --ring: 25 95% 53%;
            --radius: 0.75rem;
          }

          .sidebar-gradient {
            background: linear-gradient(135deg, hsl(30, 95%, 53%) 0%, hsl(25, 95%, 50%) 100%);
          }

          .card-elevation {
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            transition: box-shadow 0.3s ease;
          }

          .card-elevation:hover {
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
          }

          .ripple-effect {
            position: relative;
            overflow: hidden;
          }

          .ripple-effect::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            width: 0;
            height: 0;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.3);
            transform: translate(-50%, -50%);
            transition: width 0.3s ease, height 0.3s ease;
          }

          .ripple-effect:active::before {
            width: 300px;
            height: 300px;
          }

          .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }

          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }

          * {
            max-width: 100%;
            box-sizing: border-box;
          }

          @media print {
            body * {
              visibility: hidden;
            }
            .printable-area, .printable-area * {
              visibility: visible;
            }
            .printable-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .no-print {
              display: none !important;
            }
            .page-break-inside-avoid {
                page-break-inside: avoid;
            }
          }
        `}
      </style>

      <div className="min-h-screen flex w-full bg-gradient-to-br from-gray-50 to-gray-100">
        <Sidebar className="border-none shadow-lg no-print">
          <div className="sidebar-gradient h-full flex flex-col">
            <SidebarHeader className="border-b border-white/20 p-6 flex-shrink-0">
              <div className="flex items-center gap-3">
                <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/d76156ea9_logo_a-s_tiefbaupdf.png" alt="Logo" className="h-10" />
                <div>
                  <h2 className="font-bold text-white text-lg">Tiefbau.Cloud</h2>
                  <p className="text-xs text-white/70">Auftragsverwaltung</p>
                </div>
              </div>
            </SidebarHeader>

            <SidebarContent className="p-4 flex-grow">
              <SidebarGroup>
                <SidebarGroupLabel className="text-xs font-semibold text-white/60 uppercase tracking-wider px-2 py-3">
                  Navigation
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="space-y-2">
                    {filteredNavigationItems.map((item) => {
                      // Dispo Tiefbau mit Untermenü
                      if (item.hasSubmenu && item.title === 'Dispo Tiefbau' && user?.role === 'admin') {
                        return (
                          <Collapsible
                            key={item.title}
                            open={dispositionOpen}
                            onOpenChange={setDispositionOpen}>

                            <SidebarMenuItem>
                              <CollapsibleTrigger asChild>
                                <SidebarMenuButton
                                  className={`ripple-effect hover:bg-white/10 hover:text-white transition-all duration-300 rounded-xl py-3 px-4 ${
                                  location.pathname.includes('Disposition') ?
                                  'bg-white/15 text-white shadow-lg' :
                                  'text-white/80'}`
                                  }>

                                  <item.icon className="w-5 h-5" />
                                  <span className="font-medium">{item.title}</span>
                                  {dispositionOpen ?
                                  <ChevronDown className="w-4 h-4 ml-auto" /> :

                                  <ChevronRight className="w-4 h-4 ml-auto" />
                                  }
                                </SidebarMenuButton>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <SidebarMenuSub className="ml-4 mt-2 space-y-1">
                                  <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild>
                                      <Link
                                        to={item.url}
                                        className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg py-2 px-3 text-sm"
                                        onClick={handleLinkClick}>

                                        <ClipboardList className="w-4 h-4 mr-2" />
                                        Übersicht
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                  {bauleiter.map((bl) =>
                                  <SidebarMenuSubItem key={bl.id}>
                                      <SidebarMenuSubButton asChild>
                                        <Link
                                        to={createPageUrl(`DispositionBauleiter?id=${bl.id}`)}
                                        className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg py-2 px-3 text-sm"
                                        onClick={handleLinkClick}>

                                          <UserCircle className="w-4 h-4 mr-2" />
                                          {bl.full_name}
                                        </Link>
                                      </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                  )}
                                </SidebarMenuSub>
                              </CollapsibleContent>
                            </SidebarMenuItem>
                          </Collapsible>);

                      }

                      // Dispo Montage mit Untermenü
                      if (item.hasSubmenu && item.title === 'Dispo Montage' && user?.role === 'admin') {
                        return (
                          <Collapsible
                            key={item.title}
                            open={dispositionMontageOpen}
                            onOpenChange={setDispositionMontageOpen}>

                            <SidebarMenuItem>
                              <CollapsibleTrigger asChild>
                                <SidebarMenuButton
                                  className={`ripple-effect hover:bg-white/10 hover:text-white transition-all duration-300 rounded-xl py-3 px-4 ${
                                  location.pathname.includes('DispositionMonteur') ?
                                  'bg-white/15 text-white shadow-lg' :
                                  'text-white/80'}`
                                  }>

                                  <item.icon className="w-5 h-5" />
                                  <span className="font-medium">{item.title}</span>
                                  {dispositionMontageOpen ?
                                  <ChevronDown className="w-4 h-4 ml-auto" /> :

                                  <ChevronRight className="w-4 h-4 ml-auto" />
                                  }
                                </SidebarMenuButton>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <SidebarMenuSub className="ml-4 mt-2 space-y-1">
                                  <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild>
                                      <Link
                                        to={item.url}
                                        className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg py-2 px-3 text-sm"
                                        onClick={handleLinkClick}>

                                        <Construction className="w-4 h-4 mr-2" />
                                        Übersicht
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                  {monteure.map((monteur) =>
                                  <SidebarMenuSubItem key={monteur.id}>
                                      <SidebarMenuSubButton asChild>
                                        <Link
                                        to={createPageUrl(`DispositionMonteurDetail?id=${monteur.id}`)}
                                        className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg py-2 px-3 text-sm"
                                        onClick={handleLinkClick}>

                                          <UserCircle className="w-4 h-4 mr-2" />
                                          {monteur.full_name}
                                        </Link>
                                      </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                  )}
                                </SidebarMenuSub>
                              </CollapsibleContent>
                            </SidebarMenuItem>
                          </Collapsible>);

                      }

                      // Auswertungen mit Untermenü
                      if (item.hasSubmenu && item.title === 'Auswertungen') {
                        return (
                          <Collapsible
                            key={item.title}
                            open={auswertungenOpen}
                            onOpenChange={setAuswertungenOpen}>

                            <SidebarMenuItem>
                              <CollapsibleTrigger asChild>
                                <SidebarMenuButton
                                  className={`ripple-effect hover:bg-white/10 hover:text-white transition-all duration-300 rounded-xl py-3 px-4 ${
                                  location.pathname.includes('Analytics') ||
                                  location.pathname.includes('KolonnenUebersicht') ?
                                  'bg-white/15 text-white shadow-lg' :
                                  'text-white/80'}`
                                  }>

                                  <item.icon className="w-5 h-5" />
                                  <span className="font-medium">{item.title}</span>
                                  {auswertungenOpen ?
                                  <ChevronDown className="w-4 h-4 ml-auto" /> :

                                  <ChevronRight className="w-4 h-4 ml-auto" />
                                  }
                                </SidebarMenuButton>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <SidebarMenuSub className="ml-4 mt-2 space-y-1">
                                  <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild>
                                      <Link
                                        to={item.url}
                                        className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg py-2 px-3 text-sm"
                                        onClick={handleLinkClick}>

                                        <BarChart3 className="w-4 h-4 mr-2" />
                                        Standard
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                  <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild>
                                      <Link
                                        to={createPageUrl("KolonnenUebersicht")}
                                        className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg py-2 px-3 text-sm"
                                        onClick={handleLinkClick}>
                                        <UsersIcon className="w-4 h-4 mr-2" />
                                        Kolonnen
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                  <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild>
                                      <Link
                                        to={createPageUrl("KolonnenKonfiguration")}
                                        className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg py-2 px-3 text-sm"
                                        onClick={handleLinkClick}>
                                        <Settings className="w-4 h-4 mr-2" />
                                        Konfiguration
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                  <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild>
                                      <Link
                                        to={createPageUrl("TeamPerformanceHistory")}
                                        className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg py-2 px-3 text-sm"
                                        onClick={handleLinkClick}>
                                        <BarChart3 className="w-4 h-4 mr-2" />
                                        Leistungs-Historie
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                </SidebarMenuSub>
                              </CollapsibleContent>
                            </SidebarMenuItem>
                          </Collapsible>);

                      }

                      // Verwaltung mit Untermenü
                      if (item.hasSubmenu && item.title === 'Verwaltung' && user?.role === 'admin') {
                        return (
                          <Collapsible
                            key={item.title}
                            open={verwaltungOpen}
                            onOpenChange={setVerwaltungOpen}>

                            <SidebarMenuItem>
                              <CollapsibleTrigger asChild>
                                <SidebarMenuButton
                                  className={`ripple-effect hover:bg-white/10 hover:text-white transition-all duration-300 rounded-xl py-3 px-4 ${
                                  location.pathname.includes('Excavations') ||
                                  location.pathname.includes('PriceList') ||
                                  location.pathname.includes('VAOMonitoring') ||
                                  location.pathname.includes('OpenMaterialBookings') ||
                                  location.pathname.includes('OpenDocumentations') ||
                                  location.pathname.includes('MaterialInventory') ?
                                  'bg-white/15 text-white shadow-lg' :
                                  'text-white/80'}`
                                  }>

                                  <item.icon className="w-5 h-5" />
                                  <span className="font-medium">{item.title}</span>
                                  {verwaltungOpen ?
                                  <ChevronDown className="w-4 h-4 ml-auto" /> :

                                  <ChevronRight className="w-4 h-4 ml-auto" />
                                  }
                                </SidebarMenuButton>
                              </CollapsibleTrigger>
                              <CollapsibleContent>
                                <SidebarMenuSub className="ml-4 mt-2 space-y-1">
                                  <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild>
                                      <Link
                                        to={createPageUrl("Excavations")}
                                        className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg py-2 px-3 text-xs whitespace-normal break-words"
                                        onClick={handleLinkClick}>

                                        <Shovel className="w-4 h-4 mr-2 flex-shrink-0" />
                                        <span>Ausgrabungen</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                  <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild>
                                      <Link
                                        to={createPageUrl("PriceList")}
                                        className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg py-2 px-3 text-xs whitespace-normal break-words"
                                        onClick={handleLinkClick}>

                                        <Settings className="w-4 h-4 mr-2 flex-shrink-0" />
                                        <span>Preisliste</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                  <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild>
                                      <Link
                                        to={createPageUrl("VAOMonitoring")}
                                        className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg py-2 px-3 text-xs whitespace-normal break-words"
                                        onClick={handleLinkClick}>

                                        <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
                                        <span>VAO-Überwachung</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                  <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild>
                                      <Link
                                        to={createPageUrl("OpenMaterialBookings")}
                                        className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg py-2 px-3 text-xs whitespace-normal break-words"
                                        onClick={handleLinkClick}>

                                        <Construction className="w-4 h-4 mr-2 flex-shrink-0" />
                                        <span>Offene Materialbuchungen</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                  <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild>
                                      <Link
                                        to={createPageUrl("OpenDocumentations")}
                                        className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg py-2 px-3 text-xs whitespace-normal break-words"
                                        onClick={handleLinkClick}>

                                        <FileText className="w-4 h-4 mr-2 flex-shrink-0" />
                                        <span>Offene Dokumentationen</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                  <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild>
                                      <Link
                                        to={createPageUrl("MaterialInventory")}
                                        className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg py-2 px-3 text-xs whitespace-normal break-words"
                                        onClick={handleLinkClick}>

                                        <Package className="w-4 h-4 mr-2 flex-shrink-0" />
                                        <span>Materiallager</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                  <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild>
                                      <Link
                                        to={createPageUrl("MontagePriceList")}
                                        className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg py-2 px-3 text-xs whitespace-normal break-words"
                                        onClick={handleLinkClick}>

                                        <Wrench className="w-4 h-4 mr-2 flex-shrink-0" />
                                        <span>Montage-Preisliste</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                  <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild>
                                      <Link
                                        to={createPageUrl("MontageMaterialInventory")}
                                        className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg py-2 px-3 text-xs whitespace-normal break-words"
                                        onClick={handleLinkClick}>

                                        <Package className="w-4 h-4 mr-2 flex-shrink-0" />
                                        <span>Montage-Materiallager</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                  <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild>
                                      <a
                                        href="https://tankstelle.aunds.cloud/upload_remote/admin.html"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg py-2 px-3 text-xs whitespace-normal break-words flex items-center"
                                        onClick={handleLinkClick}>
                                        <Fuel className="w-4 h-4 mr-2 flex-shrink-0" />
                                        <span>Tankstelle Verwaltung</span>
                                      </a>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                  <SidebarMenuSubItem>
                                    <SidebarMenuSubButton asChild>
                                      <a
                                        href="https://kolonnenplanung.aunds.cloud/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-white/70 hover:text-white hover:bg-white/10 rounded-lg py-2 px-3 text-xs whitespace-normal break-words flex items-center"
                                        onClick={handleLinkClick}>
                                        <CalendarDays className="w-4 h-4 mr-2 flex-shrink-0" />
                                        <span>Kolonnenplanung</span>
                                      </a>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                </SidebarMenuSub>
                              </CollapsibleContent>
                            </SidebarMenuItem>
                          </Collapsible>);

                      }

                      // Normale Menüpunkte
                      return (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton
                            asChild
                            className={`ripple-effect hover:bg-white/10 hover:text-white transition-all duration-300 rounded-xl py-3 px-4 ${
                            location.pathname === item.url ?
                            'bg-white/15 text-white shadow-lg' :
                            'text-white/80'}`
                            }>

                            <Link to={item.url} className="flex items-center gap-3" onClick={handleLinkClick}>
                              <item.icon className="w-5 h-5" />
                              <span className="font-medium">{item.title}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>);

                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            <div className="p-4 mt-auto border-t border-white/20 flex-shrink-0">
              {user ?
              <div className="flex items-center justify-between">
                  <Link to={createPageUrl("Profile")} className="flex items-center gap-3 text-white/90 hover:text-white">
                    <UserCircle className="w-8 h-8" />
                    <div className="text-sm">
                      <p className="font-semibold">{user.full_name}</p>
                      <p className="text-xs text-white/70">{user.email}</p>
                    </div>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={handleLogout} className="text-white/70 hover:text-white hover:bg-white/10">
                    <LogOut className="w-5 h-5" />
                  </Button>
                </div> :

          <div className="h-10"></div>
          }
        </div>
      </div>
    </Sidebar>

    <main className="flex-1 flex flex-col">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 px-4 py-3 shadow-sm no-print">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="hover:bg-gray-100 p-3 rounded-xl transition-colors duration-200 min-w-[44px] min-h-[44px] flex items-center justify-center" />
            <div className="hidden md:flex items-center gap-2">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/d76156ea9_logo_a-s_tiefbaupdf.png" alt="Logo" className="h-8" />
              <h1 className="text-xl font-bold text-gray-900">Tiefbau.Cloud</h1>
            </div>
            <div className="flex md:hidden items-center gap-2">
              <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/d76156ea9_logo_a-s_tiefbaupdf.png" alt="Logo" className="h-8" />
              <h1 className="text-xl font-bold text-gray-900">Tiefbau.Cloud</h1>
            </div>
          </div>
          <NotificationCenter />
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </main>
  </div>
  </>
  );
}

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = React.useState(null);
  const [bauleiter, setBauleiter] = React.useState([]);
  const [monteure, setMonteure] = React.useState([]);

  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await User.me();
        setUser(userData);

        // Bauleiter, Oberfläche und Monteure laden
        if (userData && userData.role === 'admin') {
          const users = await User.list();
          const bauLeiterUsers = users.filter((u) => u.position === 'Bauleiter' || u.position === 'Oberfläche');
          const monteurUsers = users.filter((u) => u.position === 'Monteur');
          setBauleiter(bauLeiterUsers);
          setMonteure(monteurUsers);
        }
      } catch (error) {
        console.log("Benutzer nicht angemeldet oder Fehler beim Laden:", error);
        setUser(null);
      }
    };
    loadUser();
  }, []);

  const handleLogout = async () => {
    await User.logout();
    window.location.reload();
  };

  return (
    <SidebarProvider>
      <LayoutContent 
        children={children} 
        currentPageName={currentPageName} 
        user={user} 
        bauleiter={bauleiter}
        monteure={monteure}
        handleLogout={handleLogout}
      />
    </SidebarProvider>
  );
}
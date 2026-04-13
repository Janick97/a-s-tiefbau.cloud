/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Analytics from './pages/Analytics';
import BaustellenKarte from './pages/BaustellenKarte';
import BaustellenModus from './pages/BaustellenModus';
import BueroUserAuswertung from './pages/BueroUserAuswertung';
import Dashboard from './pages/Dashboard';
import Disposition from './pages/Disposition';
import DispositionBauleiter from './pages/DispositionBauleiter';
import DispositionMonteur from './pages/DispositionMonteur';
import DispositionMonteurDetail from './pages/DispositionMonteurDetail';
import ExcavationDetail from './pages/ExcavationDetail';
import Excavations from './pages/Excavations';
import FTTHVisioplan from './pages/FTTHVisioplan';
import Home from './pages/Home';
import ImportProjects from './pages/ImportProjects';
import KolonnenBildschirmView from './pages/KolonnenBildschirmView';
import KolonnenKonfiguration from './pages/KolonnenKonfiguration';
import KolonnenUebersicht from './pages/KolonnenUebersicht';
import MaterialInventory from './pages/MaterialInventory';
import MeineMontageAuftraege from './pages/MeineMontageAuftraege';
import MitarbeiterDetail from './pages/MitarbeiterDetail';
import MontageAuftraege from './pages/MontageAuftraege';
import MontageAuftraegeArchiv from './pages/MontageAuftraegeArchiv';
import MontageAuftragDetail from './pages/MontageAuftragDetail';

import MontagePriceList from './pages/MontagePriceList';
import MyMontageAuftraege from './pages/MyMontageAuftraege';
import MyProjects from './pages/MyProjects';
import MyProjectsOberflaeche from './pages/MyProjectsOberflaeche';
import OfflineProjectDetail from './pages/OfflineProjectDetail';
import OpenDocumentations from './pages/OpenDocumentations';
import OpenMaterialBookings from './pages/OpenMaterialBookings';
import PriceList from './pages/PriceList';
import Profile from './pages/Profile';
import ProjectDetail from './pages/ProjectDetail';
import ProjectDetailOberflaeche from './pages/ProjectDetailOberflaeche';
import ProjectExplorer from './pages/ProjectExplorer';
import ProjectStatus from './pages/ProjectStatus';
import Projects from './pages/Projects';
import Surface from './pages/Surface';
import Tasks from './pages/Tasks';
import VAOApplication from './pages/VAOApplication';
import VAOMonitoring from './pages/VAOMonitoring';
import TeamPerformanceHistory from './pages/TeamPerformanceHistory';
import MyVehicleMaintenance from './pages/MyVehicleMaintenance';
import VehicleMaintenanceOverview from './pages/VehicleMaintenanceOverview';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Analytics": Analytics,
    "BaustellenKarte": BaustellenKarte,
    "BaustellenModus": BaustellenModus,
    "BueroUserAuswertung": BueroUserAuswertung,
    "Dashboard": Dashboard,
    "Disposition": Disposition,
    "DispositionBauleiter": DispositionBauleiter,
    "DispositionMonteur": DispositionMonteur,
    "DispositionMonteurDetail": DispositionMonteurDetail,
    "ExcavationDetail": ExcavationDetail,
    "Excavations": Excavations,
    "FTTHVisioplan": FTTHVisioplan,
    "Home": Home,
    "ImportProjects": ImportProjects,
    "KolonnenBildschirmView": KolonnenBildschirmView,
    "KolonnenKonfiguration": KolonnenKonfiguration,
    "KolonnenUebersicht": KolonnenUebersicht,
    "MaterialInventory": MaterialInventory,
    "MeineMontageAuftraege": MeineMontageAuftraege,
    "MitarbeiterDetail": MitarbeiterDetail,
    "MontageAuftraege": MontageAuftraege,
    "MontageAuftraegeArchiv": MontageAuftraegeArchiv,
    "MontageAuftragDetail": MontageAuftragDetail,

    "MontagePriceList": MontagePriceList,
    "MyMontageAuftraege": MyMontageAuftraege,
    "MyProjects": MyProjects,
    "MyProjectsOberflaeche": MyProjectsOberflaeche,
    "OfflineProjectDetail": OfflineProjectDetail,
    "OpenDocumentations": OpenDocumentations,
    "OpenMaterialBookings": OpenMaterialBookings,
    "PriceList": PriceList,
    "Profile": Profile,
    "ProjectDetail": ProjectDetail,
    "ProjectDetailOberflaeche": ProjectDetailOberflaeche,
    "ProjectExplorer": ProjectExplorer,
    "ProjectStatus": ProjectStatus,
    "Projects": Projects,
    "Surface": Surface,
    "Tasks": Tasks,
    "VAOApplication": VAOApplication,
    "VAOMonitoring": VAOMonitoring,
    "TeamPerformanceHistory": TeamPerformanceHistory,
    "MyVehicleMaintenance": MyVehicleMaintenance,
    "VehicleMaintenanceOverview": VehicleMaintenanceOverview,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};
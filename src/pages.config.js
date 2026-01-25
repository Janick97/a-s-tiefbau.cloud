import Analytics from './pages/Analytics';
import BaustellenKarte from './pages/BaustellenKarte';
import Dashboard from './pages/Dashboard';
import Disposition from './pages/Disposition';
import DispositionBauleiter from './pages/DispositionBauleiter';
import DispositionMonteur from './pages/DispositionMonteur';
import DispositionMonteurDetail from './pages/DispositionMonteurDetail';
import ExcavationDetail from './pages/ExcavationDetail';
import Excavations from './pages/Excavations';
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
import MontageMaterialInventory from './pages/MontageMaterialInventory';
import MontagePriceList from './pages/MontagePriceList';
import MyMontageAuftraege from './pages/MyMontageAuftraege';
import MyProjects from './pages/MyProjects';
import MyProjectsOberflaeche from './pages/MyProjectsOberflaeche';
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
import VAOApplication from './pages/VAOApplication';
import VAOMonitoring from './pages/VAOMonitoring';
import Tasks from './pages/Tasks';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Analytics": Analytics,
    "BaustellenKarte": BaustellenKarte,
    "Dashboard": Dashboard,
    "Disposition": Disposition,
    "DispositionBauleiter": DispositionBauleiter,
    "DispositionMonteur": DispositionMonteur,
    "DispositionMonteurDetail": DispositionMonteurDetail,
    "ExcavationDetail": ExcavationDetail,
    "Excavations": Excavations,
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
    "MontageMaterialInventory": MontageMaterialInventory,
    "MontagePriceList": MontagePriceList,
    "MyMontageAuftraege": MyMontageAuftraege,
    "MyProjects": MyProjects,
    "MyProjectsOberflaeche": MyProjectsOberflaeche,
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
    "VAOApplication": VAOApplication,
    "VAOMonitoring": VAOMonitoring,
    "Tasks": Tasks,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};
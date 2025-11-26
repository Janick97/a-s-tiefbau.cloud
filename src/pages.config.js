import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import Excavations from './pages/Excavations';
import Analytics from './pages/Analytics';
import PriceList from './pages/PriceList';
import ProjectDetail from './pages/ProjectDetail';
import ProjectStatus from './pages/ProjectStatus';
import ExcavationDetail from './pages/ExcavationDetail';
import VAOMonitoring from './pages/VAOMonitoring';
import ImportProjects from './pages/ImportProjects';
import OpenMaterialBookings from './pages/OpenMaterialBookings';
import OpenDocumentations from './pages/OpenDocumentations';
import Disposition from './pages/Disposition';
import VAOApplication from './pages/VAOApplication';
import Surface from './pages/Surface';
import MyProjects from './pages/MyProjects';
import Profile from './pages/Profile';
import MontageAuftraege from './pages/MontageAuftraege';
import BaustellenKarte from './pages/BaustellenKarte';
import DispositionBauleiter from './pages/DispositionBauleiter';
import MeineMontageAuftraege from './pages/MeineMontageAuftraege';
import MyMontageAuftraege from './pages/MyMontageAuftraege';
import MyProjectsOberflaeche from './pages/MyProjectsOberflaeche';
import ProjectDetailOberflaeche from './pages/ProjectDetailOberflaeche';
import MaterialInventory from './pages/MaterialInventory';
import ProjectExplorer from './pages/ProjectExplorer';
import DispositionMonteur from './pages/DispositionMonteur';
import DispositionMonteurDetail from './pages/DispositionMonteurDetail';
import MontagePriceList from './pages/MontagePriceList';
import MontageMaterialInventory from './pages/MontageMaterialInventory';
import MontageAuftragDetail from './pages/MontageAuftragDetail';
import MitarbeiterDetail from './pages/MitarbeiterDetail';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Projects": Projects,
    "Excavations": Excavations,
    "Analytics": Analytics,
    "PriceList": PriceList,
    "ProjectDetail": ProjectDetail,
    "ProjectStatus": ProjectStatus,
    "ExcavationDetail": ExcavationDetail,
    "VAOMonitoring": VAOMonitoring,
    "ImportProjects": ImportProjects,
    "OpenMaterialBookings": OpenMaterialBookings,
    "OpenDocumentations": OpenDocumentations,
    "Disposition": Disposition,
    "VAOApplication": VAOApplication,
    "Surface": Surface,
    "MyProjects": MyProjects,
    "Profile": Profile,
    "MontageAuftraege": MontageAuftraege,
    "BaustellenKarte": BaustellenKarte,
    "DispositionBauleiter": DispositionBauleiter,
    "MeineMontageAuftraege": MeineMontageAuftraege,
    "MyMontageAuftraege": MyMontageAuftraege,
    "MyProjectsOberflaeche": MyProjectsOberflaeche,
    "ProjectDetailOberflaeche": ProjectDetailOberflaeche,
    "MaterialInventory": MaterialInventory,
    "ProjectExplorer": ProjectExplorer,
    "DispositionMonteur": DispositionMonteur,
    "DispositionMonteurDetail": DispositionMonteurDetail,
    "MontagePriceList": MontagePriceList,
    "MontageMaterialInventory": MontageMaterialInventory,
    "MontageAuftragDetail": MontageAuftragDetail,
    "MitarbeiterDetail": MitarbeiterDetail,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};
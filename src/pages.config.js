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
import AddTransaction from './pages/AddTransaction';
import AgentIntake from './pages/AgentIntake';
import AgentPortal from './pages/AgentPortal';
import AuditLog from './pages/AuditLog';
import Billing from './pages/Billing';
import BrokerageSetup from './pages/BrokerageSetup';
import ClientPortal from './pages/ClientPortal';
import Dashboard from './pages/Dashboard';
import Deadlines from './pages/Deadlines';
import Documents from './pages/Documents';
import Notifications from './pages/Notifications';
import PortalSelect from './pages/PortalSelect';
import Settings from './pages/Settings';
import Tasks from './pages/Tasks';
import Templates from './pages/Templates';
import Transactions from './pages/Transactions';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AddTransaction": AddTransaction,
    "AgentIntake": AgentIntake,
    "AgentPortal": AgentPortal,
    "AuditLog": AuditLog,
    "Billing": Billing,
    "BrokerageSetup": BrokerageSetup,
    "ClientPortal": ClientPortal,
    "Dashboard": Dashboard,
    "Deadlines": Deadlines,
    "Documents": Documents,
    "Notifications": Notifications,
    "PortalSelect": PortalSelect,
    "Settings": Settings,
    "Tasks": Tasks,
    "Templates": Templates,
    "Transactions": Transactions,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};
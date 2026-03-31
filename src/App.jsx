import { Toaster } from "@/components/ui/toaster"
import Landing from './pages/Landing'
import SetupProfile from './pages/SetupProfile'
import UserManagement from './pages/UserManagement'
import Contacts from './pages/Contacts'
import DotloopIntegration from './pages/DotloopIntegration'
import CommissionStatements from './pages/CommissionStatements'
import FuelProrations from './pages/FuelProrations'
import DeadlineResponse from './pages/DeadlineResponse'
import ClientLookup from './pages/ClientLookup'
import AddendumBuilder from './pages/AddendumBuilder'
import TutorialFAQPage from './pages/TutorialFAQPage'
import Notifications from './pages/Notifications.jsx'
import FeedbackCenter from './pages/FeedbackCenter.jsx'
import SignDocument from './pages/SignDocument.jsx'
import SystemDiagnostics from './pages/SystemDiagnostics.jsx'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { CurrentUserProvider } from '@/lib/CurrentUserContext.jsx';
import { PWAProvider } from '@/lib/PWAContext.jsx';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/Landing" element={<Landing />} />
      <Route path="/SetupProfile" element={<SetupProfile />} />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/UserManagement" element={
        <LayoutWrapper currentPageName="UserManagement">
          <UserManagement />
        </LayoutWrapper>
      } />
      <Route path="/DotloopIntegration" element={
        <LayoutWrapper currentPageName="DotloopIntegration">
          <DotloopIntegration />
        </LayoutWrapper>
      } />
      <Route path="/CommissionStatements" element={
        <LayoutWrapper currentPageName="CommissionStatements">
          <CommissionStatements />
        </LayoutWrapper>
      } />
      <Route path="/Contacts" element={
        <LayoutWrapper currentPageName="Contacts">
          <Contacts />
        </LayoutWrapper>
      } />
      <Route path="/FuelProrations" element={
        <LayoutWrapper currentPageName="FuelProrations">
          <FuelProrations />
        </LayoutWrapper>
      } />
      <Route path="/help" element={
        <LayoutWrapper currentPageName="TutorialFAQPage">
          <TutorialFAQPage />
        </LayoutWrapper>
      } />
      <Route path="/DeadlineResponse" element={<DeadlineResponse />} />
      <Route path="/ClientLookup" element={<ClientLookup />} />
      <Route path="/AddendumBuilder" element={
        <LayoutWrapper currentPageName="AddendumBuilder">
          <AddendumBuilder />
        </LayoutWrapper>
      } />
      <Route path="/FeedbackCenter" element={
        <LayoutWrapper currentPageName="FeedbackCenter">
          <FeedbackCenter />
        </LayoutWrapper>
      } />
      <Route path="/Notifications" element={
        <LayoutWrapper currentPageName="Notifications">
          <Notifications />
        </LayoutWrapper>
      } />
      <Route path="/SignDocument" element={<SignDocument />} />
      <Route path="/settings/system-diagnostics" element={
        <LayoutWrapper currentPageName="SystemDiagnostics">
          <SystemDiagnostics />
        </LayoutWrapper>
      } />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <CurrentUserProvider>
          <PWAProvider>
            <Router>
              <AuthenticatedApp />
            </Router>
            <Toaster />
          </PWAProvider>
        </CurrentUserProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
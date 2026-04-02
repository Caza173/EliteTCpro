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
import AgentSignIn from './pages/AgentSignIn.jsx'
import AgentIntake from './pages/AgentIntake'
import TCSignIn from './pages/TCSignIn.jsx'
import AgentSubmitTransaction from './pages/AgentSubmitTransaction.jsx'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { CurrentUserProvider } from '@/lib/CurrentUserContext.jsx';
import { PWAProvider } from '@/lib/PWAContext.jsx';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import RequireAuth from '@/components/auth/RequireAuth';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

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
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/Landing" element={<Landing />} />
      <Route path="/SetupProfile" element={
        <RequireAuth>
          <LayoutWrapper currentPageName="SetupProfile">
            <SetupProfile />
          </LayoutWrapper>
        </RequireAuth>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <RequireAuth>
              <LayoutWrapper currentPageName={path}>
                <Page />
              </LayoutWrapper>
            </RequireAuth>
          }
        />
      ))}
      <Route path="/UserManagement" element={
        <RequireAuth>
          <LayoutWrapper currentPageName="UserManagement">
            <UserManagement />
          </LayoutWrapper>
        </RequireAuth>
      } />
      <Route path="/DotloopIntegration" element={
        <RequireAuth>
          <LayoutWrapper currentPageName="DotloopIntegration">
            <DotloopIntegration />
          </LayoutWrapper>
        </RequireAuth>
      } />
      <Route path="/CommissionStatements" element={
        <RequireAuth>
          <LayoutWrapper currentPageName="CommissionStatements">
            <CommissionStatements />
          </LayoutWrapper>
        </RequireAuth>
      } />
      <Route path="/Contacts" element={
        <RequireAuth>
          <LayoutWrapper currentPageName="Contacts">
            <Contacts />
          </LayoutWrapper>
        </RequireAuth>
      } />
      <Route path="/FuelProrations" element={
        <RequireAuth>
          <LayoutWrapper currentPageName="FuelProrations">
            <FuelProrations />
          </LayoutWrapper>
        </RequireAuth>
      } />
      <Route path="/help" element={
        <RequireAuth>
          <LayoutWrapper currentPageName="TutorialFAQPage">
            <TutorialFAQPage />
          </LayoutWrapper>
        </RequireAuth>
      } />
      <Route path="/DeadlineResponse" element={<DeadlineResponse />} />
      <Route path="/ClientLookup" element={<ClientLookup />} />
      <Route path="/AddendumBuilder" element={
        <RequireAuth>
          <LayoutWrapper currentPageName="AddendumBuilder">
            <AddendumBuilder />
          </LayoutWrapper>
        </RequireAuth>
      } />
      <Route path="/FeedbackCenter" element={
        <RequireAuth>
          <LayoutWrapper currentPageName="FeedbackCenter">
            <FeedbackCenter />
          </LayoutWrapper>
        </RequireAuth>
      } />
      <Route path="/Notifications" element={
        <RequireAuth>
          <LayoutWrapper currentPageName="Notifications">
            <Notifications />
          </LayoutWrapper>
        </RequireAuth>
      } />
      <Route path="/SignDocument" element={<SignDocument />} />
      <Route path="/settings/system-diagnostics" element={
        <RequireAuth>
          <LayoutWrapper currentPageName="SystemDiagnostics">
            <SystemDiagnostics />
          </LayoutWrapper>
        </RequireAuth>
      } />
      <Route path="/agent-signin" element={<AgentSignIn />} />
      <Route path="/tc-login" element={<TCSignIn />} />
      <Route path="/agent/submit-transaction" element={<AgentSubmitTransaction />} />
      <Route path="/AgentIntake" element={<AgentIntake />} />
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
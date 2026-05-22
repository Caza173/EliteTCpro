// cache-bust: 2026-05-22-billing-removed
import { useState, useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/toaster"
import Landing from './pages/Landing'
import About from './pages/About'
import Contact from './pages/Contact'
import SetupProfile from './pages/SetupProfile'
import UserManagement from './pages/UserManagement'

import Integrations from './pages/Integrations'
import GmailSetup from './pages/GmailSetup'
import GoogleCalendarSetup from './pages/GoogleCalendarSetup'
import FuelProrations from './pages/FuelProrations'
import DeadlineResponse from './pages/DeadlineResponse'
import ApprovalAction from './pages/ApprovalAction'
import AddendumBuilder from './pages/AddendumBuilder'
import TutorialFAQPage from './pages/TutorialFAQPage'
import Notifications from './pages/Notifications.jsx'
import FeedbackCenter from './pages/FeedbackCenter.jsx'
import SignDocument from './pages/SignDocument.jsx'
import SystemDiagnostics from './pages/SystemDiagnostics.jsx'
import AgentIntake from './pages/AgentIntake'
import TransactionDiagnostics from './pages/TransactionDiagnostics'
import Onboarding from './pages/Onboarding'
import TemplateManager from './pages/TemplateManager'
import TransactionDetail from './pages/TransactionDetail'
import { ErrorBoundary } from './components/ErrorBoundary'
import PendingDeals from './pages/PendingDeals'
import Contacts from './pages/Contacts'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { CurrentUserProvider, useCurrentUser } from '@/lib/CurrentUserContext.jsx';
import { clearQueryCacheOnLogout } from '@/lib/query-client';
import { PWAProvider } from '@/lib/PWAContext.jsx';
import { AIConversationProvider } from '@/lib/AIConversationContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import RequireAuth from '@/components/auth/RequireAuth';
import AuthGate from '@/components/auth/AuthGate';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated } = useAuth();

  // Clear React Query cache whenever the authenticated user changes or logs out
  const { currentUser } = useCurrentUser() || {};
  const prevUserIdRef = useRef(null);
  useEffect(() => {
    const currentId = currentUser?.id || null;
    if (prevUserIdRef.current && prevUserIdRef.current !== currentId) {
      // User switched or logged out — wipe all cached query data
      clearQueryCacheOnLogout();
    }
    prevUserIdRef.current = currentId;
  }, [currentUser?.id]);

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
    <AuthGate>
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route path="/onboarding/*" element={<Onboarding />} />
      <Route path="/" element={<Landing />} />
      <Route path="/Landing" element={<Landing />} />
      <Route path="/About" element={<About />} />
      <Route path="/Contact" element={<Contact />} />
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
      <Route path="/Integrations" element={
        <RequireAuth>
          <LayoutWrapper currentPageName="Integrations">
            <Integrations />
          </LayoutWrapper>
        </RequireAuth>
      } />
      <Route path="/GmailSetup" element={
        <RequireAuth>
          <LayoutWrapper currentPageName="GmailSetup">
            <GmailSetup />
          </LayoutWrapper>
        </RequireAuth>
      } />
      <Route path="/GoogleCalendarSetup" element={
        <RequireAuth>
          <LayoutWrapper currentPageName="GoogleCalendarSetup">
            <GoogleCalendarSetup />
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
      <Route path="/ApprovalAction" element={<ApprovalAction />} />

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
      <Route path="/diagnostics" element={
        <RequireAuth>
          <LayoutWrapper currentPageName="TransactionDiagnostics">
            <TransactionDiagnostics />
          </LayoutWrapper>
        </RequireAuth>
      } />
      <Route path="/settings/system-diagnostics" element={
        <RequireAuth>
          <LayoutWrapper currentPageName="SystemDiagnostics">
            <SystemDiagnostics />
          </LayoutWrapper>
        </RequireAuth>
      } />
      <Route path="/AgentIntake" element={
        <RequireAuth>
          <LayoutWrapper currentPageName="AgentIntake">
            <AgentIntake />
          </LayoutWrapper>
        </RequireAuth>
      } />
      <Route path="/TemplateManager" element={
        <RequireAuth>
          <LayoutWrapper currentPageName="TemplateManager">
            <TemplateManager />
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
      <Route path="/pending-deals" element={
        <RequireAuth>
          <LayoutWrapper currentPageName="PendingDeals">
            <PendingDeals />
          </LayoutWrapper>
        </RequireAuth>
      } />
      <Route path="/transactions/:id" element={
        <RequireAuth>
          <LayoutWrapper currentPageName="TransactionDetail">
            <ErrorBoundary>
              <TransactionDetail />
            </ErrorBoundary>
          </LayoutWrapper>
        </RequireAuth>
      } />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </AuthGate>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <CurrentUserProvider>
          <PWAProvider>
            <AIConversationProvider>
              <Router>
                <AuthenticatedApp />
              </Router>
              <Toaster />
            </AIConversationProvider>
          </PWAProvider>
        </CurrentUserProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
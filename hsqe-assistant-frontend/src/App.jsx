// src/App.jsx

import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./layout/Layout";
import { GlobalSearchProvider } from "./state/globalSearch";
import Dashboard from "./pages/Dashboard";
import Certificates from "./pages/Certificates";
import Inspections from "./pages/Inspections";
import Tasks from "./pages/Tasks";
import Contacts from "./pages/Contacts";
import Settings from "./pages/Settings";
import RequireTab from "./components/RequireTab";
import { SessionViewProvider } from "./state/sessionView";
import { DraftProvider } from "./state/drafts";

export default function App() {
  return (
    <SessionViewProvider>
      <DraftProvider>
      <GlobalSearchProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route
              path="/"
              element={
                <RequireTab tabKey="dashboard">
                  <Dashboard />
                </RequireTab>
              }
            />

            <Route
              path="/certificates"
              element={
                <RequireTab tabKey="certificates">
                  <Certificates />
                </RequireTab>
              }
            />

            <Route
              path="/inspections"
              element={
                <RequireTab tabKey="inspections">
                  <Inspections />
                </RequireTab>
              }
            />

            <Route
              path="/tasks"
              element={
                <RequireTab tabKey="tasks">
                  <Tasks />
                </RequireTab>
              }
            />

            <Route
              path="/directory"
              element={
                <RequireTab tabKey="directory">
                  <Contacts />
                </RequireTab>
              }
            />

            <Route
              path="/contacts"
              element={<Navigate to="/directory" replace />}
            />

            <Route
              path="/settings"
              element={
                <RequireTab tabKey="settings">
                  <Settings />
                </RequireTab>
              }
            />
          </Route>
        </Routes>
      </GlobalSearchProvider>
      </DraftProvider>
    </SessionViewProvider>
  );
}

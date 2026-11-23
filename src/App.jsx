import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import AppLayout from "./layouts/AppLayout";
import { GuestOnly, PageSpinner, RequireAuth, RequireRole } from "./routes/guards";

const Landing = lazy(() => import("./pages/Landing"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const RequestDetail = lazy(() => import("./pages/RequestDetail"));
const NotFound = lazy(() => import("./pages/NotFound"));
const LoginPage = lazy(() => import("./pages/AuthPages").then((m) => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("./pages/AuthPages").then((m) => ({ default: m.RegisterPage })));
const RequestsPage = lazy(() => import("./pages/RequestPages").then((m) => ({ default: m.RequestsPage })));
const NewRequestPage = lazy(() => import("./pages/RequestPages").then((m) => ({ default: m.NewRequestPage })));
const HistoryPage = lazy(() => import("./pages/RequestPages").then((m) => ({ default: m.HistoryPage })));
const SchedulePage = lazy(() => import("./pages/StaffPages").then((m) => ({ default: m.SchedulePage })));
const TasksPage = lazy(() => import("./pages/StaffPages").then((m) => ({ default: m.TasksPage })));
const ProfilePage = lazy(() => import("./pages/ProfileAndAdmin").then((m) => ({ default: m.ProfilePage })));
const AdminUsersPage = lazy(() => import("./pages/ProfileAndAdmin").then((m) => ({ default: m.AdminUsersPage })));

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Suspense fallback={<PageSpinner />}>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route element={<GuestOnly />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
              </Route>
              <Route element={<RequireAuth />}>
                <Route element={<AppLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/requests" element={<RequestsPage />} />
                  <Route path="/requests/:id" element={<RequestDetail />} />
                  <Route path="/history" element={<HistoryPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route element={<RequireRole roles={["resident"]} />}>
                    <Route path="/requests/new" element={<NewRequestPage />} />
                  </Route>
                  <Route element={<RequireRole roles={["personnel", "admin"]} />}>
                    <Route path="/schedule" element={<SchedulePage />} />
                    <Route path="/tasks" element={<TasksPage />} />
                  </Route>
                  <Route element={<RequireRole roles={["admin"]} />}>
                    <Route path="/admin/users" element={<AdminUsersPage />} />
                  </Route>
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

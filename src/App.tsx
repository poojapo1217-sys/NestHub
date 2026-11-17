import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ToastProvider } from './context/ToastContext.tsx';
import { DashboardLayout, type PageRoute } from './layouts/DashboardLayout.tsx';
import { ComplaintManagementPage } from './pages/ComplaintManagementPage.tsx';
import { ComplaintsPage } from './pages/ComplaintsPage.tsx';
import { FoodMenuPage } from './pages/FoodMenuPage.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { ManagerDashboardPage } from './pages/ManagerDashboardPage.tsx';
import { OwnerFinancialDashboardPage } from './pages/OwnerFinancialDashboardPage.tsx';
import { RentAndElectricityPage } from './pages/RentAndElectricityPage.tsx';
import { TenantDashboardPage } from './pages/TenantDashboardPage.tsx';
import { TenantManagementPage } from './pages/TenantManagementPage.tsx';
import { VacantBedManagementPage } from './pages/VacantBedManagementPage.tsx';
import type { UserRole } from './types/index.ts';

function defaultPageForRole(role: UserRole): PageRoute {
  if (role === 'OWNER') return 'owner-dashboard';
  if (role === 'MANAGER') return 'manager-dashboard';
  return 'tenant-dashboard';
}

const ALLOWED_PAGES: Record<UserRole, PageRoute[]> = {
  TENANT: ['tenant-dashboard', 'tenant-bills', 'tenant-complaints', 'food-menu'],
  MANAGER: ['manager-dashboard', 'manager-complaints', 'manager-tenants', 'owner-beds', 'food-menu'],
  OWNER: ['owner-dashboard', 'owner-beds', 'manager-tenants', 'manager-complaints', 'food-menu'],
};

function AppRouter() {
  const { user, loading } = useAuth();
  const [activePage, setActivePage] = useState<PageRoute>('tenant-dashboard');

  useEffect(() => {
    if (user) {
      const allowed = ALLOWED_PAGES[user.role];
      if (!allowed.includes(activePage)) {
        setActivePage(defaultPageForRole(user.role));
      }
    }
  }, [user, activePage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-2 border-[#0F294A] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600">Loading Comfort Stay PG...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const allowed = ALLOWED_PAGES[user.role];
  const currentPage = allowed.includes(activePage)
    ? activePage
    : defaultPageForRole(user.role);

  return (
    <DashboardLayout activePage={currentPage} onNavigate={setActivePage}>
      {currentPage === 'tenant-dashboard' && <TenantDashboardPage onNavigate={setActivePage} />}
      {currentPage === 'tenant-bills' && <RentAndElectricityPage />}
      {currentPage === 'tenant-complaints' && <ComplaintsPage />}
      {currentPage === 'food-menu' && <FoodMenuPage />}
      {currentPage === 'manager-dashboard' && <ManagerDashboardPage />}
      {currentPage === 'manager-complaints' && <ComplaintManagementPage />}
      {currentPage === 'manager-tenants' && <TenantManagementPage />}
      {currentPage === 'owner-dashboard' && <OwnerFinancialDashboardPage />}
      {currentPage === 'owner-beds' && <VacantBedManagementPage />}
    </DashboardLayout>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ToastProvider>
  );
}

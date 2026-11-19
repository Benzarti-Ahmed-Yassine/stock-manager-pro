import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import Layout from "@/components/layout/Layout";
import DashboardPage from "@/pages/DashboardPage";
import StockPage from "@/pages/StockPage";
import RepairsPage from "@/pages/RepairsPage";
import OrdersPage from "@/pages/OrdersPage";
import SalesPage from "@/pages/SalesPage";
import ClientsPage from "@/pages/ClientsPage";
import SuppliersPage from "@/pages/SuppliersPage";
import FinancePage from "@/pages/FinancePage";
import ResellerPage from "@/pages/ResellerPage";
import RemindersPage from "@/pages/RemindersPage";
import SettingsPage from "@/pages/SettingsPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 1000 * 30 },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/stock" element={<StockPage />} />
            <Route path="/reparations" element={<RepairsPage />} />
            <Route path="/commandes" element={<OrdersPage />} />
            <Route path="/ventes" element={<SalesPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/fournisseurs" element={<SuppliersPage />} />
            <Route path="/revendeurs" element={<ResellerPage />} />
            <Route path="/finances" element={<FinancePage />} />
            <Route path="/rappels" element={<RemindersPage />} />
            <Route path="/parametres" element={<SettingsPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          duration: 3000,
        }}
      />
    </QueryClientProvider>
  );
}


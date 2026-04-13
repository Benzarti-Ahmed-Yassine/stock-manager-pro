import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import StockMovement from "@/pages/StockMovement";
import Clients from "@/pages/Clients";
import ClientSheets from "@/pages/ClientSheets";
import DeliveryNotes from "@/pages/DeliveryNotes";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/stock" element={<StockMovement />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/fiches-materiel" element={<ClientSheets />} />
            <Route path="/bons-livraison" element={<DeliveryNotes />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

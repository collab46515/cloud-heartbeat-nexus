import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Claims from "./pages/Claims";
import Denials from "./pages/Denials";
import Analytics from "./pages/Analytics";
import Patients from "./pages/Patients";
import Batches from "./pages/Batches";
import Scrubbing from "./pages/Scrubbing";
import RTA from "./pages/RTA";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Workloads from "./pages/Workloads";
import Reports from "./pages/Reports";
import PaymentPosting from "./pages/PaymentPosting";
import PayerContracts from "./pages/PayerContracts";
import ChargeCapture from "./pages/ChargeCapture";
import PatientFinancial from "./pages/PatientFinancial";
// New Intelligence Layer
import RevenueIntelligence from "./pages/RevenueIntelligence";
import Compliance from "./pages/Compliance";
import ExceptionTriage from "./pages/ExceptionTriage";
// New Autonomous Layer
import TouchlessProcessing from "./pages/TouchlessProcessing";
import SelfHealing from "./pages/SelfHealing";
// New Security Layer
import BehavioralBiometrics from "./pages/BehavioralBiometrics";
import ZeroTrustSecurity from "./pages/ZeroTrustSecurity";
import DataResidency from "./pages/DataResidency";
// Integration Hub
import IntegrationHub from "./pages/IntegrationHub";
import AnomalyDetection from "./pages/AnomalyDetection";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/" element={<Index />} />
            <Route path="/claims" element={<Claims />} />
            <Route path="/patients" element={<Patients />} />
            <Route path="/scrubbing" element={<Scrubbing />} />
            <Route path="/batches" element={<Batches />} />
            <Route path="/rta" element={<RTA />} />
            <Route path="/denials" element={<Denials />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/workloads" element={<Workloads />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/payment-posting" element={<PaymentPosting />} />
            <Route path="/payer-contracts" element={<PayerContracts />} />
            <Route path="/charge-capture" element={<ChargeCapture />} />
            <Route path="/patient-financial" element={<PatientFinancial />} />
            {/* Intelligence Layer */}
            <Route path="/revenue-intelligence" element={<RevenueIntelligence />} />
            <Route path="/compliance" element={<Compliance />} />
            <Route path="/exception-triage" element={<ExceptionTriage />} />
            {/* Autonomous Layer */}
            <Route path="/touchless-processing" element={<TouchlessProcessing />} />
            <Route path="/self-healing" element={<SelfHealing />} />
            {/* Security Layer */}
            <Route path="/behavioral-biometrics" element={<BehavioralBiometrics />} />
            <Route path="/zero-trust" element={<ZeroTrustSecurity />} />
            <Route path="/data-residency" element={<DataResidency />} />
            {/* Integration Hub */}
            <Route path="/integrations" element={<IntegrationHub />} />
            <Route path="/anomaly-detection" element={<AnomalyDetection />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

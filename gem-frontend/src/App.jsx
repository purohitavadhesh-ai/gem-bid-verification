import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import BidderAnalysis from "./pages/BidderAnalysis";
import SecurityInsights from "./pages/SecurityInsights";
import AuditTrail from "./pages/AuditTrail";
import TendersPage from "./pages/TendersPage";
import BiddersPage from "./pages/BiddersPage";
import VerificationPage from "./pages/VerificationPage";
import RemediationCopilot from "./pages/RemediationCopilot";
import DocumentOCRStudio from "./pages/DocumentOCRStudio";
import BatchBidAnalyzer from "./pages/BatchBidAnalyzer";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Full tenders management page */}
        <Route path="/tenders" element={<TendersPage />} />

        {/* Bidder analysis for a specific tender */}
        <Route path="/tenders/:tenderId" element={<BidderAnalysis />} />

        {/* All bidders overview */}
        <Route path="/bidders" element={<BiddersPage />} />

        {/* AI Verification Pipeline page */}
        <Route path="/verification" element={<VerificationPage />} />

        {/* SIH 2026 Innovation Modules */}
        <Route path="/copilot" element={<RemediationCopilot />} />
        <Route path="/ocr-studio" element={<DocumentOCRStudio />} />
        <Route path="/batch-analyzer" element={<BatchBidAnalyzer />} />

        {/* Security intelligence */}
        <Route path="/security" element={<SecurityInsights />} />

        {/* Audit trail & reports */}
        <Route path="/audit-trail" element={<AuditTrail />} />

        {/* Reports → redirect to audit trail (which has report generation) */}
        <Route path="/reports" element={<Navigate to="/audit-trail" replace />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}


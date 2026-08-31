import { useState, useEffect } from "react";
import TopNav from "../components/TopNav";
import { extractStatutoryDocument } from "../data/mockData";

export default function DocumentOCRStudio() {
  const [selectedPreset, setSelectedPreset] = useState("epf");
  const [analyzing, setAnalyzing] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);

  useEffect(() => {
    handleLoadPreset(selectedPreset);
  }, []);

  async function handleLoadPreset(presetKey) {
    setSelectedPreset(presetKey);
    setUploadedFile(null);
    setAnalyzing(true);
    const res = await extractStatutoryDocument(presetKey);
    setOcrResult(res);
    setAnalyzing(false);
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setSelectedPreset(null);
    setAnalyzing(true);
    const res = await extractStatutoryDocument(file);
    setOcrResult(res);
    setAnalyzing(false);
  }

  return (
    <div className="min-h-screen bg-surface">
      <TopNav />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Banner Header */}
        <div className="mb-8 rounded-2xl bg-gradient-to-r from-navy-950 via-navy-900 to-petrol-900 p-6 text-white shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-petrol-400/30 bg-petrol-500/10 px-3 py-1 text-xs font-semibold text-petrol-300 mb-2">
                <span className="h-2 w-2 rounded-full bg-petrol-400 animate-pulse" />
                PyMuPDF v1.23 + Tesseract OCR Engine Active
              </div>
              <h1 className="text-2xl font-bold text-white">
                Statutory Document OCR &amp; Field Extractor Studio
              </h1>
              <p className="mt-1 text-sm text-white/70 max-w-2xl">
                Real-time computer vision and OCR field parser for Indian procurement certificates (GSTIN, EPFO ECR, MSME Udyam, OEM Authorizations, PAN &amp; Bank Solvency).
              </p>
            </div>

            {/* Quick Demo Preload Buttons for Judges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider text-white/60 font-semibold w-full">
                Quick-Load SIH Benchmark Documents:
              </span>
              <button
                onClick={() => handleLoadPreset("epf")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  selectedPreset === "epf"
                    ? "bg-petrol-500 text-white shadow-md ring-2 ring-white/30"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                ⚠️ Expired EPF Challan
              </button>
              <button
                onClick={() => handleLoadPreset("msme")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  selectedPreset === "msme"
                    ? "bg-petrol-500 text-white shadow-md ring-2 ring-white/30"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                ✓ Valid MSME Udyam
              </button>
              <button
                onClick={() => handleLoadPreset("oem")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  selectedPreset === "oem"
                    ? "bg-petrol-500 text-white shadow-md ring-2 ring-white/30"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                ❌ Unstamped OEM Slip
              </button>
              <button
                onClick={() => handleLoadPreset("gst")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  selectedPreset === "gst"
                    ? "bg-petrol-500 text-white shadow-md ring-2 ring-white/30"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                ✓ Active GSTIN
              </button>
            </div>
          </div>
        </div>

        {/* 2-Column OCR Studio Workspace */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: Upload Dropzone & Document Inspector (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Upload Box */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-navy-950">
                1. Document Ingestion Zone
              </h2>

              <div className="rounded-xl border-2 border-dashed border-border bg-surface p-6 text-center hover:border-petrol-500 transition-colors">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-petrol-500/10 text-petrol-600 text-xl mb-3">
                  📑
                </div>
                <p className="text-xs font-bold text-navy-950">
                  Upload Bidder Certificate PDF or Image
                </p>
                <p className="text-[11px] text-navy-800/50 mt-1">
                  Supports scanned PDF, multi-page TIFF, PNG, JPEG
                </p>

                <div className="mt-4">
                  <input
                    type="file"
                    id="ocr-file-upload"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="ocr-file-upload"
                    className="cursor-pointer inline-flex items-center gap-2 rounded-xl bg-navy-950 px-4 py-2 text-xs font-semibold text-white hover:bg-navy-800 shadow-sm"
                  >
                    <span>📤</span> Choose Local PDF Document
                  </label>
                </div>
              </div>

              {/* Current Active File Info */}
              {ocrResult && (
                <div className="rounded-xl bg-surface p-4 border border-border space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-navy-800/50 font-medium">Loaded Document:</span>
                    <span className="font-bold text-navy-950 font-mono">{ocrResult.document_name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-navy-800/50 font-medium">Document Classification:</span>
                    <span className="font-semibold text-petrol-700">{ocrResult.document_type}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-navy-800/50 font-medium">OCR Pipeline Engine:</span>
                    <span className="font-mono text-navy-950">{ocrResult.ocr_engine}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-navy-800/50 font-medium">Digital Signature Detected:</span>
                    <span className={`font-bold ${ocrResult.digital_signature_detected ? 'text-status-pass' : 'text-status-warn'}`}>
                      {ocrResult.digital_signature_detected ? "✓ Cryptographically Verified" : "⚠️ Physical Seal / Signature Unverified"}
                    </span>
                  </div>
                </div>
              )}

              {/* Raw OCR Text Snippet */}
              {ocrResult && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-navy-800/70 mb-2">
                    Raw Extracted OCR Text Stream
                  </h3>
                  <pre className="rounded-xl border border-border bg-navy-950 p-3.5 text-[11px] font-mono text-petrol-300 leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {ocrResult.raw_snippet}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Extracted Entities & Rule Validation (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
              {/* Header result with Confidence Meter */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
                <div>
                  <h2 className="text-base font-bold text-navy-950">
                    2. Structured Entity Extraction &amp; Validation
                  </h2>
                  <p className="text-xs text-navy-800/60 mt-0.5">
                    Extracted metadata mapped to GeM statutory database registers
                  </p>
                </div>

                {ocrResult && (
                  <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-1.5 border border-border">
                    <span className="text-[11px] font-semibold text-navy-800/60">OCR Confidence:</span>
                    <span className="text-xs font-bold text-petrol-600 font-mono">
                      {ocrResult.confidence_overall}% Certainty
                    </span>
                  </div>
                )}
              </div>

              {/* Rule Engine Compliance Verdict Alert */}
              {ocrResult && (
                <div
                  className={`rounded-xl border p-4 text-xs ${
                    ocrResult.rule_verdict.startsWith("PASS")
                      ? "border-status-pass/40 bg-status-pass-bg text-status-pass"
                      : "border-status-fail/40 bg-status-fail-bg text-status-fail"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm mb-1">
                    <span>{ocrResult.rule_verdict.startsWith("PASS") ? "✓" : "⚠️"}</span>
                    <span>Deterministic Rule Verdict:</span>
                  </div>
                  <p className="leading-relaxed font-medium">
                    {ocrResult.rule_verdict}
                  </p>
                </div>
              )}

              {/* Entity Overview Cards */}
              {ocrResult && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-surface p-3.5 border border-border">
                    <span className="text-[10px] uppercase tracking-wider text-navy-800/50 block font-semibold">
                      Extracted Entity Name
                    </span>
                    <span className="text-sm font-bold text-navy-950 mt-0.5 block">
                      {ocrResult.entity_name}
                    </span>
                  </div>
                  <div className="rounded-xl bg-surface p-3.5 border border-border">
                    <span className="text-[10px] uppercase tracking-wider text-navy-800/50 block font-semibold">
                      Extracted Identifier / Reg No
                    </span>
                    <span className="text-sm font-mono font-bold text-petrol-600 mt-0.5 block">
                      {ocrResult.registration_number}
                    </span>
                  </div>
                </div>
              )}

              {/* Key Value Extracted Fields Grid */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-navy-800/70 mb-3">
                  Extracted Form Fields with Field-Level Confidence
                </h3>

                <div className="space-y-2.5">
                  {ocrResult?.fields.map((f) => (
                    <div
                      key={f.key}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3 transition-all hover:border-petrol-500/50"
                    >
                      <div className="min-w-[180px]">
                        <span className="text-xs font-bold text-navy-950 block">{f.label}</span>
                        <span className="text-xs font-mono text-navy-800/80 mt-0.5 block font-semibold">
                          {f.value}
                        </span>
                        {f.validation_message && (
                          <span className="text-[11px] font-medium text-status-fail mt-0.5 block">
                            ⚠️ {f.validation_message}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs">
                        <span className="font-mono text-[11px] text-navy-800/50 bg-card px-2 py-0.5 rounded border border-border">
                          {f.confidence}% Conf.
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            f.is_valid
                              ? "bg-status-pass-bg text-status-pass"
                              : "bg-status-fail-bg text-status-fail"
                          }`}
                        >
                          {f.is_valid ? "VALID" : "FLAGGED"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

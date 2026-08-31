import { useState } from "react";
import StatusBadge from "./StatusBadge";

export default function VendorCurePortalModal({
  isOpen,
  onClose,
  noticeData,
  bidderName = "Western Fuel Logistics Ltd",
  onSuccessRemediated
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [remediating, setRemediating] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  async function handleSimulateUpload(e) {
    e?.preventDefault();
    setRemediating(true);

    setTimeout(() => {
      setRemediating(false);
      setSuccess(true);
      if (onSuccessRemediated) {
        onSuccessRemediated({
          remediatedItem: "EPF/ESIC Registration",
          newStatus: "PASS",
          note: "Remediated via Cure Notice - Valid 2026-2027 ECR Challan Verified"
        });
      }
    }, 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-2xl rounded-2xl border border-white/15 bg-card shadow-2xl overflow-hidden animate-slideUp">
        {/* Header bar simulating government portal */}
        <div className="bg-navy-950 px-6 py-4 text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-petrol-500 font-bold text-xs text-white">
              GeM
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-widest text-white/50 block">
                Encrypted Vendor Remediation Gateway • SSL 256-bit
              </span>
              <h3 className="text-sm font-semibold text-white">
                Cure Notice Document Upload &amp; Verification Portal
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white text-lg font-bold p-1"
          >
            ✕
          </button>
        </div>

        {/* Portal Body */}
        <div className="p-6 space-y-5">
          {/* Vendor identification bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface p-3.5 border border-border text-xs">
            <div>
              <span className="text-navy-800/50 block font-medium">Authorized Vendor</span>
              <span className="font-bold text-navy-950 text-sm">{bidderName}</span>
            </div>
            <div>
              <span className="text-navy-800/50 block font-medium">Notice Reference</span>
              <span className="font-mono font-semibold text-petrol-600">
                {noticeData?.notice_id || "GEM-CURE-20260831"}
              </span>
            </div>
            <div>
              <span className="text-navy-800/50 block font-medium">Remediation Window</span>
              <span className="inline-flex items-center gap-1 font-semibold text-status-fail bg-status-fail-bg px-2 py-0.5 rounded-full">
                ⏱ {noticeData?.deadline_timestamp || "48 Hours Remaining"}
              </span>
            </div>
          </div>

          {!success ? (
            <div className="space-y-4">
              {/* Flagged defects list */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-navy-800/70 mb-2">
                  Action Required: Rectify Flagged Curable Items
                </h4>
                <div className="space-y-2">
                  {(noticeData?.deficiencies_summary || [
                    "EPF/ESIC Registration: Expired Dec 2025",
                    "OEM Authorization Slip: Missing Manufacturer Stamp"
                  ]).map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2.5 rounded-lg border border-status-warn/40 bg-status-warn-bg/50 p-2.5 text-xs text-navy-950"
                    >
                      <span className="font-bold text-status-warn">⚠️</span>
                      <div className="flex-1">
                        <span className="font-semibold">{item}</span>
                        <p className="text-navy-800/60 mt-0.5 text-[11px]">
                          Upload active, certified PDF replacement document below.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upload Dropzone */}
              <div className="rounded-xl border-2 border-dashed border-petrol-500/40 bg-petrol-500/5 p-5 text-center hover:bg-petrol-500/10 transition-colors">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-petrol-500/20 text-petrol-600 mb-2">
                  📄
                </div>
                <p className="text-xs font-semibold text-navy-950">
                  Drag &amp; drop updated statutory certificate (PDF)
                </p>
                <p className="text-[11px] text-navy-800/50 mt-1">
                  Supports EPFO ECR Challans, OEM Authorization, MSME Certificates (Max 15MB)
                </p>

                <div className="mt-3 flex items-center justify-center gap-2">
                  <input
                    type="file"
                    id="cure-file-input"
                    accept=".pdf,.png,.jpg"
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                    className="hidden"
                  />
                  <label
                    htmlFor="cure-file-input"
                    className="cursor-pointer rounded-lg bg-navy-950 px-3 py-1.5 text-xs font-medium text-white hover:bg-navy-800"
                  >
                    {selectedFile ? selectedFile.name : "Browse File"}
                  </label>
                  <span className="text-xs text-navy-800/40">or</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile({ name: "EPFO_ECR_Challan_FY26-27_WesternFuel.pdf" });
                    }}
                    className="rounded-lg border border-petrol-500 bg-white px-3 py-1.5 text-xs font-medium text-petrol-600 hover:bg-petrol-50 shadow-sm"
                  >
                    ⚡ Auto-Attach Valid 2026 EPF Challan
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-border px-4 py-2 text-xs font-semibold text-navy-800 hover:bg-surface"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={remediating}
                  onClick={handleSimulateUpload}
                  className="rounded-lg bg-petrol-600 px-5 py-2 text-xs font-semibold text-white hover:bg-petrol-700 disabled:opacity-50 shadow-md flex items-center gap-2"
                >
                  {remediating ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Running AI Verification &amp; OCR...
                    </>
                  ) : (
                    "Submit Replacement Document for AI Re-Verification"
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* Success State */
            <div className="text-center py-6 space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-status-pass-bg text-status-pass text-2xl shadow-inner animate-countUp">
                ✓
              </div>
              <div>
                <h4 className="text-base font-bold text-navy-950">
                  Remediation Document Successfully Re-Verified!
                </h4>
                <p className="text-xs text-navy-800/60 mt-1 max-w-md mx-auto">
                  The AI OCR engine successfully extracted active validity for EPF Challan (TRRN: 1012601004921). 
                  Non-compliance verdict has been automatically resolved to <strong>PASS</strong>.
                </p>
              </div>

              <div className="rounded-xl border border-status-pass/30 bg-status-pass-bg/40 p-3 max-w-md mx-auto text-xs text-left space-y-1">
                <div className="flex justify-between">
                  <span className="text-navy-800/60">Updated Status:</span>
                  <StatusBadge status="Compliant" />
                </div>
                <div className="flex justify-between">
                  <span className="text-navy-800/60">New Projected Score:</span>
                  <span className="font-bold text-status-pass">92.0% (+14.0% Gain)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-navy-800/60">Audit Trail Token:</span>
                  <span className="font-mono text-[11px] text-navy-950">AUD-CURE-2026-OK</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="mt-2 rounded-lg bg-navy-950 px-6 py-2.5 text-xs font-semibold text-white hover:bg-navy-800 shadow-md"
              >
                Return to Procurement Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

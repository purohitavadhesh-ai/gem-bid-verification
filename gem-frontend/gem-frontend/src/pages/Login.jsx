import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../data/mockData";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-2">
      {/* Left: brand panel with AI illustration */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-navy-950 p-10 text-white md:flex">
        {/* Background image */}
        <img
          src="/ai-shield.jpg"
          alt="AI Security Shield"
          className="absolute inset-0 h-full w-full object-cover opacity-40 select-none"
          draggable="false"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-navy-950 via-navy-950/60 to-navy-950/30" />

        {/* Content */}
        <div className="relative z-10 animate-fadeIn">
          <p className="text-xs uppercase tracking-widest text-white/60">Ministry of Petroleum &amp; Natural Gas</p>
          <p className="text-xs text-white/50">Government of India &nbsp;•&nbsp; GeM Portal</p>
        </div>

        <div className="relative z-10 animate-slideUp delay-150">
          {/* Badge */}
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-petrol-500/30 bg-petrol-500/10 px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-petrol-400 animate-pulse" />
            <span className="text-xs font-medium text-petrol-400 tracking-wide">AI Verification Active</span>
          </div>

          <h2 className="text-2xl font-bold leading-tight text-white">
            Real-Time GeM Bidder<br />Integrity Verification
          </h2>
          <p className="mt-3 text-sm text-white/60 leading-relaxed max-w-sm">
            Auto-validates corporate documents, technical specs, and financial risk profiles
            using AI models with deterministic rule engine compliance.
          </p>

          {/* Feature pills */}
          <div className="mt-6 flex flex-wrap gap-2">
            {["Document OCR Extraction", "AI Requirement Matching", "Rule Engine Verdicts", "Immutable Audit Trail"].map((feat, i) => (
              <span
                key={feat}
                className="animate-slideUp rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
                style={{ animationDelay: `${200 + i * 75}ms` }}
              >
                ✓ {feat}
              </span>
            ))}
          </div>
        </div>

        <div className="relative z-10 animate-fadeIn delay-300">
          <p className="text-[11px] text-white/30">
            Secured by National Informatics Centre (NIC) &nbsp;•&nbsp; 2026
          </p>
        </div>
      </div>

      {/* Right: login form */}
      <div className="flex flex-col items-center justify-center bg-surface p-8">
        <div className="w-full max-w-sm animate-slideUp">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-navy-950 text-sm font-bold text-white shadow-lg animate-countUp">
              GeM
            </div>
            <h1 className="text-xl font-bold text-navy-950">AI Bid Compliance Verification</h1>
            <p className="mt-1 text-sm text-navy-800/60">
              Intelligent compliance verification for Government procurement
            </p>
          </div>

          <form
            id="login-form"
            onSubmit={handleSubmit}
            className="rounded-2xl border border-border bg-card p-6 shadow-sm"
          >
            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-navy-950" htmlFor="login-email">
                Officer ID / NIC Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="rajesh.kumar@nic.in"
                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none transition-colors focus:border-petrol-500 focus:ring-2 focus:ring-petrol-500/15"
              />
            </div>

            <div className="mb-5">
              <label className="mb-1.5 block text-sm font-medium text-navy-950" htmlFor="login-password">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none transition-colors focus:border-petrol-500 focus:ring-2 focus:ring-petrol-500/15"
              />
            </div>

            {error && (
              <p className="mb-4 rounded-lg bg-status-fail-bg px-3 py-2 text-sm text-status-fail">
                {error}
              </p>
            )}

            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="relative w-full overflow-hidden rounded-lg bg-navy-950 py-2.5 text-sm font-semibold text-white transition-all hover:bg-navy-800 disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Authenticating…
                </span>
              ) : (
                "Login to Platform"
              )}
            </button>
          </form>

          {/* Quick demo credentials */}
          <div className="mt-4 rounded-xl border border-border bg-card/60 px-4 py-3">
            <p className="text-xs font-semibold text-navy-800/60 mb-1.5">Demo Credentials</p>
            <button
              type="button"
              onClick={() => { setEmail("rajesh.kumar@nic.in"); setPassword("demo2026"); }}
              className="text-xs text-petrol-600 hover:underline"
            >
              Use: rajesh.kumar@nic.in / demo2026
            </button>
          </div>

          <p className="mt-4 text-center text-xs text-navy-800/40">
            Secured by NIC &nbsp;•&nbsp; Ministry of Petroleum &amp; Natural Gas &nbsp;•&nbsp; 2026
          </p>
        </div>
      </div>
    </div>
  );
}

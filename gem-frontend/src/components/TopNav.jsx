import { NavLink, useNavigate } from "react-router-dom";
import { currentOfficer, logout } from "../data/mockData";

const LINKS = [
  { to: "/dashboard",    label: "Dashboard" },
  { to: "/tenders",      label: "Tenders" },
  { to: "/bidders",      label: "Bidders" },
  { to: "/batch-analyzer",label: "Batch CSV" },
  { to: "/ocr-studio",   label: "OCR Studio" },
  { to: "/copilot",      label: "AI Copilot" },
  { to: "/verification", label: "Verification" },
  { to: "/security",     label: "Security" },
  { to: "/audit-trail",  label: "Audit Trail" },
];

export default function TopNav() {
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <header className="border-b border-white/10 bg-navy-950 text-white shadow-lg">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-3">
        {/* Brand */}
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-petrol-500 text-sm font-bold shadow-sm">
            GeM
          </div>
          <div className="leading-tight text-left">
            <p className="text-[10px] uppercase tracking-widest text-white/50">
              Ministry of Petroleum &amp; Natural Gas
            </p>
            <p className="text-sm font-semibold">AI Bid Compliance Platform</p>
          </div>
        </button>

        {/* Nav links */}
        <nav className="flex flex-wrap items-center gap-0.5">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-petrol-600 text-white shadow-sm"
                    : "text-white/65 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* User badge & Logout */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-petrol-500/80 text-xs font-bold ring-2 ring-petrol-400/30">
              {currentOfficer.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div className="leading-tight text-right hidden sm:block">
              <p className="text-sm font-medium">{currentOfficer.name}</p>
              <p className="text-[10px] text-white/50">{currentOfficer.role}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Logout of session"
            className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition-all hover:border-red-400/50 hover:bg-red-500/15 hover:text-red-300 cursor-pointer"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}


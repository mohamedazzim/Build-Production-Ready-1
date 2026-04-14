import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Clock, FileSpreadsheet, FileText, LayoutDashboard, LogOut } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: ReactNode }) {
  const [time, setTime] = useState(new Date());
  const [location] = useLocation();
  const { logout } = useAuth();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background font-sans text-foreground">
      <header className="shadow-md" style={{ backgroundColor: "#FFD400" }}>
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3 self-start sm:gap-4">
            <img
              src="/janus-logo.png"
              alt="Janus Imprints & Services"
              className="h-12 w-auto shrink-0 object-contain drop-shadow-sm sm:h-16"
            />
            <div className="min-w-0">
              <h1 className="text-lg font-extrabold leading-tight text-black sm:text-2xl">
                Janus Imprints & Services
              </h1>
              <p className="mt-0.5 text-xs font-semibold text-black/80 sm:text-sm">
                Cartridge World Franchise - Customer Intake System
              </p>
            </div>
          </div>

          <div className="flex items-center self-end md:self-auto">
            <img
              src="/cw-logo.jpg"
              alt="Cartridge World"
              className="rounded-lg object-fill drop-shadow-sm"
              style={{ height: "52px", width: "74px" }}
            />
          </div>
        </div>

        <div
          className="h-1"
          style={{ background: "linear-gradient(90deg, #0B4CC2 33%, #6CFF00 66%, #0B4CC2 100%)" }}
        />
      </header>

      <nav className="sticky top-0 z-10 border-b bg-card shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 py-3 md:h-16 md:flex-row md:items-center md:justify-between md:py-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 md:flex-1 md:gap-4 lg:gap-6">
              <Link
                href="/"
                className={`inline-flex min-h-11 items-center justify-center rounded-md border-b-2 px-2 py-2 text-center text-xs font-semibold transition-colors sm:text-sm ${
                  location === "/"
                    ? "border-[#FFD400] text-[#0B4CC2]"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                <FileText className="mr-2 h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
                <span>New Intake</span>
              </Link>
              <Link
                href="/dashboard"
                className={`inline-flex min-h-11 items-center justify-center rounded-md border-b-2 px-2 py-2 text-center text-xs font-semibold transition-colors sm:text-sm ${
                  location === "/dashboard"
                    ? "border-[#FFD400] text-[#0B4CC2]"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                <LayoutDashboard className="mr-2 h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
                <span>Admin Dashboard</span>
              </Link>
              <Link
                href="/import"
                className={`inline-flex min-h-11 items-center justify-center rounded-md border-b-2 px-2 py-2 text-center text-xs font-semibold transition-colors sm:text-sm ${
                  location === "/import"
                    ? "border-[#FFD400] text-[#0B4CC2]"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
                <span>Import Excel</span>
              </Link>
            </div>

            <div className="flex items-center justify-center md:flex-none md:px-4 lg:px-8">
              <div className="flex items-center justify-center gap-2 rounded-lg border border-black/15 bg-black/10 px-3 py-2 text-lg font-bold text-black sm:gap-3 sm:px-4 sm:text-2xl">
                <Clock className="h-5 w-5 shrink-0 text-black sm:h-6 sm:w-6" />
                <span>{time.toLocaleTimeString("en-IN", { hour12: true })}</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 md:ml-auto md:flex-none md:justify-end">
              <span className="text-xs text-muted-foreground sm:text-sm">admin</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="gap-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto flex-1 w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {children}
      </main>
    </div>
  );
}

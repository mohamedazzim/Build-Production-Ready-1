import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Clock, Eye, EyeOff, LogIn } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    setTimeout(() => {
      const ok = login(username.trim(), password);
      if (ok) {
        navigate("/");
      } else {
        setError("Invalid username or password. Please try again.");
        setLoading(false);
      }
    }, 400);
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
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

          <div className="w-full text-center md:w-auto">
            <div className="flex items-center justify-center gap-2 rounded-lg border border-black/15 bg-black/10 px-3 py-2 text-lg font-bold sm:gap-3 sm:px-4 sm:text-3xl">
              <Clock className="h-5 w-5 text-black sm:h-6 sm:w-6" />
              <span className="text-black">{time.toLocaleTimeString("en-IN", { hour12: true })}</span>
            </div>
            <div className="mt-1 text-[11px] font-semibold text-black/75 sm:text-xs">
              {time.toLocaleDateString("en-IN", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
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

      <div className="flex flex-1 items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-sm">
          <div
            className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
            style={{ borderTop: "4px solid #FFD400" }}
          >
            <div className="border-b border-border bg-[#FFD400]/10 px-6 py-6 text-center sm:px-8">
              <div
                className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full"
                style={{ backgroundColor: "#FFD400", border: "2px solid #0B4CC2" }}
              >
                <LogIn className="h-7 w-7" style={{ color: "#0B4CC2" }} />
              </div>
              <h2 className="text-xl font-bold text-foreground">Staff Login</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Sign in to access the intake system
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6 sm:px-8">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full font-semibold text-white"
                style={{ backgroundColor: "#0B4CC2" }}
                disabled={loading}
              >
                <LogIn className="mr-2 h-4 w-4" />
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

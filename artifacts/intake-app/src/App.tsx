import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/auth-context";
import { setBaseUrl } from "@workspace/api-client-react";
import LoginPage from "@/pages/login";
import IntakeFormPage from "@/pages/intake-form";
import DashboardPage from "@/pages/dashboard";
import EditRecordPage from "@/pages/edit-record";
import ImportRecordsPage from "@/pages/import-records";

const queryClient = new QueryClient();
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:5000" : null);

setBaseUrl(apiBaseUrl);

function ProtectedRouter() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <Switch>
      <Route path="/" component={IntakeFormPage} />
      <Route path="/dashboard" component={DashboardPage} />
      <Route path="/import" component={ImportRecordsPage} />
      <Route path="/edit/:id" component={EditRecordPage} />
      <Route>
        <Redirect to="/" />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <ProtectedRouter />
          </WouterRouter>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

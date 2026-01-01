import { Link, useLocation } from "react-router-dom";
import { Sprout, UserRound, Leaf, Truck, Brain, LogOut, Home, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface FarmerLayoutProps {
  title: string;
  actionLabel?: string;
  actionHref?: string;
  children: React.ReactNode;
}

const navItems = [
  { label: "Dashboard", href: "/farmer", icon: Home },
  { label: "Profile", href: "/farmer/profile", icon: UserRound },
  { label: "Crops", href: "/farmer/crops", icon: Sprout },
  { label: "Transport", href: "/farmer/transport", icon: Truck },
  { label: "AI Advice", href: "/farmer/ai", icon: Brain },
];

export const FarmerLayout = ({ title, actionLabel, actionHref, children }: FarmerLayoutProps) => {
  const { signOut } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/farmer" className="flex items-center gap-2 text-primary font-semibold">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Leaf className="h-5 w-5" />
            </div>
            <div className="flex flex-col leading-tight">
              <span>Agri Mitra</span>
              <span className="text-xs text-muted-foreground">Farmer Web App</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            {actionLabel && actionHref && (
              <Button asChild>
                <Link to={actionHref}>
                  <Plus className="mr-2 h-4 w-4" />
                  {actionLabel}
                </Link>
              </Button>
            )}
            <Button variant="outline" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 lg:flex-row">
        <nav className="w-full space-y-1 rounded-lg border bg-white p-3 lg:w-60">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Farmer Workspace</p>
              <h1 className="text-2xl font-semibold">{title}</h1>
            </div>
          </div>
          <div className="rounded-lg border bg-white p-4 shadow-sm">{children}</div>
        </main>
      </div>
    </div>
  );
};

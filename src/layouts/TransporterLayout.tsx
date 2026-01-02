import { Link, useLocation } from "react-router-dom";
import { Leaf, LogOut, Truck, ClipboardList, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface TransporterLayoutProps {
  title: string;
  children: React.ReactNode;
}

const navItems = [
  { label: "Dashboard", href: "/transporter", icon: Truck },
  { label: "Loads", href: "/transporter/loads", icon: ClipboardList },
  { label: "History", href: "/transporter/history", icon: History },
];

export const TransporterLayout = ({ title, children }: TransporterLayoutProps) => {
  const { signOut } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link to="/transporter" className="flex items-center gap-2 text-primary font-semibold">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Leaf className="h-5 w-5" />
            </div>
            <div className="flex flex-col leading-tight">
              <span>Agri Mitra</span>
              <span className="text-xs text-muted-foreground">Transporter</span>
            </div>
          </Link>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </header>

      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 lg:flex-row">
        <nav className="w-full space-y-1 rounded-lg border bg-white p-3 lg:w-56">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.href || location.pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <main className="flex-1 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Transporter App</p>
            <h1 className="text-2xl font-semibold">{title}</h1>
          </div>
          <div className="rounded-lg border bg-white p-4 shadow-sm">{children}</div>
        </main>
      </div>
    </div>
  );
};

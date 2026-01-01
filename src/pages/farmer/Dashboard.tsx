import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FarmerLayout } from "@/layouts/FarmerLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Sprout, CheckCircle2, Truck } from "lucide-react";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["farmer-dashboard-counts", user?.id],
    queryFn: async () => {
      if (!user) return { crops: 0, ready: 0, transport: 0 };

      const [cropsRes, readyRes, transportRes] = await Promise.all([
        supabase.from("crops").select("id", { count: "exact", head: true }),
        supabase
          .from("crops")
          .select("id", { count: "exact", head: true })
          .eq("status", "READY"),
        supabase
          .from("transport_requests")
          .select("id", { count: "exact", head: true }),
      ]);

      return {
        crops: cropsRes.count ?? 0,
        ready: readyRes.count ?? 0,
        transport: transportRes.count ?? 0,
      };
    },
    enabled: Boolean(user),
  });

  return (
    <FarmerLayout title="Overview" actionLabel="Add Crop" actionHref="/farmer/crops/new">
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading your farm data...
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Crops</CardTitle>
                <Sprout className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data?.crops ?? 0}</div>
                <p className="text-sm text-muted-foreground">Being tracked right now</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ready to Sell</CardTitle>
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data?.ready ?? 0}</div>
                <p className="text-sm text-muted-foreground">Marked as READY</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Transport Requests</CardTitle>
                <Truck className="h-5 w-5 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data?.transport ?? 0}</div>
                <p className="text-sm text-muted-foreground">Active requests created</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Next steps</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild variant="secondary" className="w-full justify-start">
                  <Link to="/farmer/crops/new">Add a new crop</Link>
                </Button>
                <Button asChild variant="secondary" className="w-full justify-start">
                  <Link to="/farmer/transport/new">Request a pickup</Link>
                </Button>
                <Button asChild variant="secondary" className="w-full justify-start">
                  <Link to="/farmer/ai">Get AI advice</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>Keep your profile updated so transport partners know where to pick up.</p>
                <p>Mark crops as READY as soon as they can be collected.</p>
                <p>Use AI advice to plan harvest and storage steps.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </FarmerLayout>
  );
};

export default Dashboard;

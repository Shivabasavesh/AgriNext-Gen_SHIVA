import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TransporterLayout } from "@/layouts/TransporterLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";

const TransporterDashboard = () => {
  const { user } = useAuth();

  const { data: metrics } = useQuery({
    queryKey: ["transporter-metrics"],
    enabled: !!user,
    queryFn: async () => {
      const userId = user?.id;
      const [{ count: newLoads }, { data: activeTrips }, { data: completedTrips }] = await Promise.all([
        supabase.from("transport_requests").select("*", { count: "exact", head: true }).eq("status", "NEW"),
        supabase.from("trips").select("id,status").eq("status", "ACTIVE").eq("transporter_id", userId ?? ""),
        supabase.from("trips").select("id").eq("status", "COMPLETED").eq("transporter_id", userId ?? "").limit(5),
      ]);

      return {
        newLoads: newLoads ?? 0,
        activeTripId: activeTrips?.[0]?.id ?? null,
        recentTrips: completedTrips ?? [],
      };
    },
  });

  return (
    <TransporterLayout title="Transporter Dashboard">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>New loads</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <p className="text-3xl font-bold">{metrics?.newLoads ?? 0}</p>
            <Button asChild>
              <Link to="/transporter/loads">View loads</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active trip</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            {metrics?.activeTripId ? (
              <>
                <p className="text-sm text-muted-foreground">Trip in progress</p>
                <Button asChild>
                  <Link to={`/transporter/trips/${metrics.activeTripId}`}>Open trip</Link>
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No active trip</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Recent trips</CardTitle>
        </CardHeader>
        <CardContent>
          {metrics?.recentTrips?.length ? (
            <ul className="space-y-2 text-sm text-muted-foreground">
              {metrics.recentTrips.map((trip) => (
                <li key={trip.id} className="flex items-center justify-between rounded border p-2">
                  <span>Trip {trip.id.slice(0, 8)}</span>
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/transporter/trips/${trip.id}`}>View</Link>
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No completed trips yet.</p>
          )}
        </CardContent>
      </Card>
    </TransporterLayout>
  );
};

export default TransporterDashboard;

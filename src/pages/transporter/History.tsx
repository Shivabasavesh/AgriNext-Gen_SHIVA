import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TransporterLayout } from "@/layouts/TransporterLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const TransporterHistory = () => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["transporter-history"],
    enabled: !!user,
    queryFn: async () => {
      const [tripsRes, requestsRes] = await Promise.all([
        supabase
          .from("trips")
          .select("id, status, completed_at, created_at")
          .eq("transporter_id", user?.id ?? "")
          .eq("status", "COMPLETED")
          .order("completed_at", { ascending: false })
          .limit(10),
        supabase
          .from("transport_requests")
          .select("id, status, pickup_location_text, drop_location_text, quantity_kg")
          .eq("assigned_transporter_id", user?.id ?? "")
          .eq("status", "DELIVERED")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      return {
        trips: tripsRes.data ?? [],
        delivered: requestsRes.data ?? [],
      };
    },
  });

  return (
    <TransporterLayout title="History">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Completed trips</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : data?.trips.length ? (
              <div className="space-y-2">
                {data.trips.map((trip) => (
                  <div key={trip.id} className="flex items-center justify-between rounded border p-3">
                    <div>
                      <p className="font-medium">Trip {trip.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">
                        Completed: {trip.completed_at ? new Date(trip.completed_at).toLocaleDateString() : "N/A"}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/transporter/trips/${trip.id}`}>View</Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No completed trips yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivered requests</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : data?.delivered.length ? (
              <div className="space-y-2">
                {data.delivered.map((req) => (
                  <div key={req.id} className="rounded border p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">Request {req.id.slice(0, 8)}</p>
                      <Badge variant="outline">{req.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {req.pickup_location_text} → {req.drop_location_text || "Destination"}
                    </p>
                    <p className="text-xs text-muted-foreground">Qty: {req.quantity_kg ?? "N/A"} kg</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No delivered requests yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </TransporterLayout>
  );
};

export default TransporterHistory;

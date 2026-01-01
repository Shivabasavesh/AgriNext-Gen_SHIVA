import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FarmerLayout } from "@/layouts/FarmerLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import type { Database } from "@/integrations/supabase/types";

type TransportRequest = Database["public"]["Tables"]["transport_requests"]["Row"];

const statusColor: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700",
  ASSIGNED: "bg-amber-100 text-amber-800",
  PICKED_UP: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-rose-100 text-rose-800",
};

const TransportPage = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["transport-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transport_requests")
        .select("*, crops(crop_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as (TransportRequest & { crops: { crop_name: string } | null })[];
    },
  });

  return (
    <FarmerLayout title="Transport" actionLabel="New Request" actionHref="/farmer/transport/new">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Pickup requests</CardTitle>
          <Button asChild size="sm">
            <Link to="/farmer/transport/new">Request pickup</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading transport requests...</p>
          ) : data && data.length > 0 ? (
            <div className="space-y-3">
              {data.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-col gap-2 rounded-lg border p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-medium">{request.crops?.crop_name || "Crop"}</p>
                    <p className="text-sm text-muted-foreground">
                      Quantity: {request.quantity_kg ?? "N/A"} kg • Pickup: {request.pickup_date || "Not set"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Location: {request.pickup_location_text || "Not provided"}
                    </p>
                  </div>
                  <Badge className={statusColor[request.status] || "bg-muted text-foreground"}>
                    {request.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No requests yet. Create your first one.</p>
          )}
        </CardContent>
      </Card>
    </FarmerLayout>
  );
};

export default TransportPage;

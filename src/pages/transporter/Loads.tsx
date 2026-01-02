import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TransporterLayout } from "@/layouts/TransporterLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";

type TransportRequest = Database["public"]["Tables"]["transport_requests"]["Row"];

const TransporterLoads = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["transporter-loads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transport_requests")
        .select("*, crops(crop_name)")
        .eq("status", "NEW")
        .order("pickup_date", { ascending: true });
      if (error) throw error;
      return data as (TransportRequest & { crops: { crop_name: string } | null })[];
    },
  });

  const handleAccept = async (request: TransportRequest & { crops: { crop_name: string } | null }) => {
    if (!user) return;
    const userId = user.id;

    const { data: trip, error: tripError } = await supabase
      .from("trips")
      .insert({ transporter_id: userId, status: "ACTIVE" })
      .select()
      .maybeSingle();

    if (tripError || !trip) {
      toast.error("Could not start trip");
      return;
    }

    const { error: stopsError } = await supabase.from("trip_stops").insert([
      {
        trip_id: trip.id,
        transport_request_id: request.id,
        stop_type: "PICKUP",
        sequence: 1,
        status: "PENDING",
        location_text: request.pickup_location_text,
      },
      {
        trip_id: trip.id,
        transport_request_id: request.id,
        stop_type: "DELIVERY",
        sequence: 2,
        status: "PENDING",
        location_text: request.drop_location_text || "Drop location TBD",
      },
    ]);

    if (stopsError) {
      toast.error("Could not create stops");
      return;
    }

    const { error: updateError } = await supabase
      .from("transport_requests")
      .update({
        status: "ASSIGNED",
        assigned_transporter_id: userId,
        trip_id: trip.id,
      })
      .eq("id", request.id);

    if (updateError) {
      toast.error("Could not accept load");
      return;
    }

    toast.success("Load assigned and trip created");
    queryClient.invalidateQueries({ queryKey: ["transporter-loads"] });
    queryClient.invalidateQueries({ queryKey: ["transporter-metrics"] });
  };

  return (
    <TransporterLayout title="Available Loads">
      <Card>
        <CardHeader>
          <CardTitle>New requests</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading loads...</p>
          ) : data && data.length ? (
            <div className="space-y-3">
              {data.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-col gap-2 rounded-lg border p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-medium">{request.crops?.crop_name || "Crop"}</p>
                    <p className="text-sm text-muted-foreground">
                      Qty: {request.quantity_kg ?? "N/A"} kg • Pickup: {request.pickup_date || "TBD"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      From: {request.pickup_location_text || "Not provided"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      To: {request.drop_location_text || "Not provided"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">NEW</Badge>
                    <Button size="sm" onClick={() => handleAccept(request)}>
                      Accept
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No new loads right now.</p>
          )}
        </CardContent>
      </Card>
    </TransporterLayout>
  );
};

export default TransporterLoads;

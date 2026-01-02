import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { CalendarDays, MapPin, Package, Truck, CheckCircle2, XCircle } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type TransportRequest = Database["public"]["Tables"]["transport_requests"]["Row"];

const statusMeta: Record<string, { label: string; color: string }> = {
  NEW: { label: "Requested", color: "bg-blue-100 text-blue-800" },
  ASSIGNED: { label: "Assigned", color: "bg-purple-100 text-purple-800" },
  PICKED_UP: { label: "En Route", color: "bg-amber-100 text-amber-800" },
  DELIVERED: { label: "Delivered", color: "bg-emerald-100 text-emerald-800" },
  CANCELLED: { label: "Cancelled", color: "bg-destructive/10 text-destructive" },
};

const TransportPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<string>("ALL");

  const { data, isLoading } = useQuery({
    queryKey: ["transport-requests", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("transport_requests")
        .select("*, crops(crop_name)")
        .eq("farmer_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as (TransportRequest & { crops: { crop_name: string } | null })[];
    },
    enabled: Boolean(user),
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("transport_requests")
        .update({ status: "CANCELLED" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Request cancelled");
      queryClient.invalidateQueries({ queryKey: ["transport-requests", user?.id] });
    },
    onError: () => toast.error("Could not cancel request"),
  });

  const summary = useMemo(() => {
    const list = data || [];
    const active = list.filter((r) => !["DELIVERED", "CANCELLED"].includes(r.status)).length;
    const completed = list.filter((r) => r.status === "DELIVERED").length;
    const inTransit = list.filter((r) => r.status === "PICKED_UP").length;
    return {
      active,
      completed,
      inTransit,
      total: list.length,
    };
  }, [data]);

  const filters = [
    { value: "ALL", label: "All" },
    { value: "NEW", label: "Pending" },
    { value: "ASSIGNED", label: "Assigned" },
    { value: "PICKED_UP", label: "En Route" },
    { value: "DELIVERED", label: "Delivered" },
  ];

  const filteredRequests =
    data?.filter((request) => (filter === "ALL" ? true : request.status === filter)) || [];

  return (
    <DashboardLayout title="Transport">
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Truck className="h-4 w-4 text-blue-600" />
                Active Requests
              </div>
              <p className="text-2xl font-semibold">{summary.active}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Completed
              </div>
              <p className="text-2xl font-semibold">{summary.completed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Truck className="h-4 w-4 text-amber-600" />
                In Transit
              </div>
              <p className="text-2xl font-semibold">{summary.inTransit}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="h-4 w-4 text-primary" />
                Total Requests
              </div>
              <p className="text-2xl font-semibold">{summary.total}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {filters.map((opt) => (
              <Button
                key={opt.value}
                variant={filter === opt.value ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
          <Button asChild>
            <Link to="/farmer/transport/new">New Request</Link>
          </Button>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Pickup requests</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading transport requests...</p>
            ) : filteredRequests.length > 0 ? (
              <div className="space-y-3">
                {filteredRequests.map((request) => {
                  const meta = statusMeta[request.status] || statusMeta.NEW;
                  return (
                    <div
                      key={request.id}
                      className="flex flex-col gap-2 rounded-lg border p-3 hover:shadow-medium transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold flex items-center gap-2">
                            {request.crops?.crop_name || "General Produce"}
                            <Badge className={meta.color}>{meta.label}</Badge>
                          </p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            <span>{request.quantity_kg ?? "N/A"} kg</span>
                            <div className="flex items-center gap-1">
                              <CalendarDays className="h-4 w-4" />
                              <span>{request.pickup_date || "Not set"}</span>
                            </div>
                          </div>
                        </div>
                        {["NEW", "ASSIGNED"].includes(request.status) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => cancelMutation.mutate(request.id)}
                            disabled={cancelMutation.isLoading}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>{request.pickup_location_text || "Not provided"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No requests yet. Create your first one.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default TransportPage;

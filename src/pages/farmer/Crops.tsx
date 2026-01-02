import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CalendarDays, MapPin, Sprout, Scale, Search, Truck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";

type Crop = Database["public"]["Tables"]["crops"]["Row"];

const cropSchema = z.object({
  crop_name: z.string().min(1, "Crop name is required"),
  expected_harvest_date: z.string().optional(),
  expected_quantity_kg: z
    .string()
    .transform((val) => (val ? Number(val) : null))
    .nullable()
    .optional(),
  district: z.string().optional(),
  status: z.enum(["GROWING", "READY", "SOLD"]),
});

type CropForm = z.infer<typeof cropSchema>;

const CropsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editingCrop, setEditingCrop] = useState<Crop | null>(null);
  const [search, setSearch] = useState("");

  const { data: crops, isLoading } = useQuery({
    queryKey: ["crops", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("crops")
        .select("*")
        .eq("farmer_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Crop[];
    },
    enabled: Boolean(user),
  });

  const editForm = useForm<CropForm>({
    resolver: zodResolver(cropSchema),
    defaultValues: {
      crop_name: "",
      expected_harvest_date: "",
      expected_quantity_kg: undefined,
      district: "",
      status: "GROWING",
    },
  });

  const resetForm = (crop?: Crop) => {
    if (crop) {
      editForm.reset({
        crop_name: crop.crop_name,
        expected_harvest_date: crop.expected_harvest_date ?? "",
        expected_quantity_kg: crop.expected_quantity_kg ?? undefined,
        district: crop.district ?? "",
        status: (crop.status as CropForm["status"]) ?? "GROWING",
      });
      setEditingCrop(crop);
    } else {
      editForm.reset({
        crop_name: "",
        expected_harvest_date: "",
        expected_quantity_kg: undefined,
        district: "",
        status: "GROWING",
      });
      setEditingCrop(null);
    }
  };

  const updateMutation = useMutation({
    mutationFn: async (payload: { id: string; values: CropForm }) => {
      const { error } = await supabase
        .from("crops")
        .update({
          crop_name: payload.values.crop_name,
          expected_harvest_date: payload.values.expected_harvest_date || null,
          expected_quantity_kg: payload.values.expected_quantity_kg ?? null,
          district: payload.values.district || null,
          status: payload.values.status,
        })
        .eq("id", payload.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Crop updated");
      queryClient.invalidateQueries({ queryKey: ["crops", user?.id] });
      resetForm();
    },
    onError: (err) => {
      console.error(err);
      toast.error("Could not update crop");
    },
  });

  const markReadyMutation = useMutation({
    mutationFn: async (cropId: string) => {
      const { error } = await supabase.from("crops").update({ status: "READY" }).eq("id", cropId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Crop marked as READY");
      queryClient.invalidateQueries({ queryKey: ["crops", user?.id] });
    },
    onError: (err) => {
      console.error(err);
      toast.error("Could not update crop status");
    },
  });

  const handleEditSubmit = (values: CropForm) => {
    if (editingCrop) {
      updateMutation.mutate({ id: editingCrop.id, values });
    }
  };

  const readyCount = useMemo(
    () => crops?.filter((c) => (c.status || "").toUpperCase() === "READY").length ?? 0,
    [crops]
  );

  const filteredCrops = useMemo(() => {
    if (!crops) return [];
    return crops.filter((crop) =>
      crop.crop_name.toLowerCase().includes(search.toLowerCase()) ||
      (crop.district || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [crops, search]);

  const statusStyles: Record<string, { label: string; className: string }> = {
    GROWING: { label: "Growing", className: "bg-muted text-muted-foreground" },
    READY: { label: "Ready", className: "bg-emerald-100 text-emerald-700" },
    SOLD: { label: "Harvested", className: "bg-primary/10 text-primary" },
  };

  return (
    <DashboardLayout title="My Crops">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
              Ready: {readyCount}
            </span>
            <span className="rounded-full bg-muted px-3 py-1">
              Total: {crops?.length ?? 0}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search crops or district..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Button asChild variant="default">
              <Link to="/farmer/crops/new">
                <Sprout className="mr-2 h-4 w-4" />
                Add Crop
              </Link>
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Your crops</CardTitle>
              <p className="text-sm text-muted-foreground">
                Track harvest dates, quantities, and request transport when ready.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading crops...</p>
            ) : filteredCrops.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredCrops.map((crop) => {
                  const statusKey = (crop.status || "").toUpperCase();
                  const status = statusStyles[statusKey] || statusStyles.GROWING;

                  return (
                    <div
                      key={crop.id}
                      className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-soft hover:shadow-medium transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold">{crop.crop_name}</p>
                          {crop.district && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              <MapPin className="h-4 w-4" />
                              <span>{crop.district}</span>
                            </div>
                          )}
                        </div>
                        <Badge className={status.className}>{status.label}</Badge>
                      </div>

                      <div className="space-y-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4" />
                          <span>
                            Harvest: {crop.expected_harvest_date || "Not set"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Scale className="h-4 w-4" />
                          <span>
                            {crop.expected_quantity_kg ?? "N/A"} kg
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resetForm(crop)}
                          className="flex-1"
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => markReadyMutation.mutate(crop.id)}
                          disabled={statusKey === "READY" || statusKey === "SOLD"}
                          className="flex-1"
                        >
                          Mark READY
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="flex-1"
                          onClick={() => (window.location.href = "/farmer/transport/new")}
                        >
                          <Truck className="h-4 w-4 mr-1" />
                          Transport
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No crops yet. Add your first crop.</p>
            )}
          </CardContent>
        </Card>

        {editingCrop && (
          <Card>
            <CardHeader>
              <CardTitle>Edit crop</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="grid gap-4 md:grid-cols-2"
                onSubmit={editForm.handleSubmit(handleEditSubmit)}
              >
                <div className="space-y-2">
                  <Label htmlFor="crop_name">Crop name</Label>
                  <Input id="crop_name" {...editForm.register("crop_name")} />
                  {editForm.formState.errors.crop_name && (
                    <p className="text-sm text-destructive">
                      {editForm.formState.errors.crop_name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expected_quantity_kg">Expected quantity (kg)</Label>
                  <Input
                    id="expected_quantity_kg"
                    type="number"
                    step="any"
                    {...editForm.register("expected_quantity_kg")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expected_harvest_date">Expected harvest date</Label>
                  <Input id="expected_harvest_date" type="date" {...editForm.register("expected_harvest_date")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="district">District</Label>
                  <Input id="district" {...editForm.register("district")} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editForm.watch("status")}
                    onValueChange={(value) => editForm.setValue("status", value as CropForm["status"])}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GROWING">GROWING</SelectItem>
                      <SelectItem value="READY">READY</SelectItem>
                      <SelectItem value="SOLD">SOLD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2 flex gap-2">
                  <Button type="submit" disabled={updateMutation.isLoading}>
                    {updateMutation.isLoading ? "Saving..." : "Save changes"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => resetForm()}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CropsPage;

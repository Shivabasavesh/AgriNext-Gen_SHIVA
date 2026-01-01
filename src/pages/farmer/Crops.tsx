import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { FarmerLayout } from "@/layouts/FarmerLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
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
  const queryClient = useQueryClient();
  const [editingCrop, setEditingCrop] = useState<Crop | null>(null);

  const { data: crops, isLoading } = useQuery({
    queryKey: ["crops"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crops")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Crop[];
    },
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
      const { error } = await supabase.from("crops").update({
        crop_name: payload.values.crop_name,
        expected_harvest_date: payload.values.expected_harvest_date || null,
        expected_quantity_kg: payload.values.expected_quantity_kg ?? null,
        district: payload.values.district || null,
        status: payload.values.status,
      }).eq("id", payload.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Crop updated");
      queryClient.invalidateQueries({ queryKey: ["crops"] });
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
      queryClient.invalidateQueries({ queryKey: ["crops"] });
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
    () => crops?.filter((c) => c.status === "READY").length ?? 0,
    [crops]
  );

  return (
    <FarmerLayout title="Crops" actionLabel="Add Crop" actionHref="/farmer/crops/new">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Track your crops and mark them READY when they can be picked up.
          </p>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
              Ready: {readyCount}
            </span>
            <span className="rounded-full bg-muted px-3 py-1">
              Total: {crops?.length ?? 0}
            </span>
          </div>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Your crops</CardTitle>
            <Button asChild size="sm" variant="outline">
              <Link to="/farmer/crops/new">Add crop</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading crops...</p>
            ) : crops && crops.length > 0 ? (
              <div className="space-y-3">
                {crops.map((crop) => (
                  <div
                    key={crop.id}
                    className="flex flex-col gap-2 rounded-lg border p-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-medium">{crop.crop_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Harvest: {crop.expected_harvest_date || "Not set"} • Qty:{" "}
                        {crop.expected_quantity_kg ?? "Not set"} kg • District: {crop.district || "N/A"}
                      </p>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Status: {crop.status}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resetForm(crop)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => markReadyMutation.mutate(crop.id)}
                        disabled={crop.status === "READY" || crop.status === "SOLD"}
                      >
                        Mark READY
                      </Button>
                    </div>
                  </div>
                ))}
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
    </FarmerLayout>
  );
};

export default CropsPage;

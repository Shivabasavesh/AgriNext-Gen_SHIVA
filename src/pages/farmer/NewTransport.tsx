import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";

type Crop = Database["public"]["Tables"]["crops"]["Row"];

const transportSchema = z.object({
  crop_id: z.string().min(1, "Select a crop"),
  quantity_kg: z
    .string()
    .transform((val) => (val ? Number(val) : null))
    .nullable()
    .optional(),
  pickup_date: z.string().optional(),
  pickup_location_text: z.string().min(1, "Pickup location is required"),
});

type TransportForm = z.infer<typeof transportSchema>;

const NewTransportPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: crops } = useQuery({
    queryKey: ["transport-crops"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crops")
        .select("id, crop_name, status, mvp_status")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Pick<Crop, "id" | "crop_name" | "status" | "mvp_status">[];
    },
  });

  const form = useForm<TransportForm>({
    resolver: zodResolver(transportSchema),
    defaultValues: {
      crop_id: "",
      quantity_kg: undefined,
      pickup_date: "",
      pickup_location_text: "",
    },
  });

  const onSubmit = async (values: TransportForm) => {
    if (!user) return;
    const { error } = await supabase.from("transport_requests").insert({
      crop_id: values.crop_id,
      quantity_kg: values.quantity_kg ?? null,
      quantity: values.quantity_kg ?? 0,
      pickup_date: values.pickup_date || null,
      preferred_date: values.pickup_date || null,
      pickup_location: values.pickup_location_text,
      pickup_location_text: values.pickup_location_text,
      status: "pending",
      farmer_id: user.id,
    });

    if (error) {
      console.error(error);
      toast.error("Could not create transport request");
      return;
    }

    toast.success("Transport request created");
    navigate("/farmer/transport");
  };

  return (
    <DashboardLayout title="New transport request">
      <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-2 md:col-span-2">
          <Label>Crop</Label>
          <Select
            value={form.watch("crop_id")}
            onValueChange={(value) => form.setValue("crop_id", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select crop" />
            </SelectTrigger>
            <SelectContent>
              {crops?.map((crop) => (
                <SelectItem key={crop.id} value={crop.id}>
                  {crop.crop_name} ({crop.mvp_status || crop.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.crop_id && (
            <p className="text-sm text-destructive">{form.formState.errors.crop_id.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity_kg">Quantity (kg)</Label>
          <Input id="quantity_kg" type="number" step="any" {...form.register("quantity_kg")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="pickup_date">Pickup date</Label>
          <Input id="pickup_date" type="date" {...form.register("pickup_date")} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="pickup_location_text">Pickup location</Label>
          <Input id="pickup_location_text" {...form.register("pickup_location_text")} />
          {form.formState.errors.pickup_location_text && (
            <p className="text-sm text-destructive">
              {form.formState.errors.pickup_location_text.message}
            </p>
          )}
        </div>

        <div className="md:col-span-2">
          <Button type="submit">Submit request</Button>
        </div>
      </form>
    </DashboardLayout>
  );
};

export default NewTransportPage;

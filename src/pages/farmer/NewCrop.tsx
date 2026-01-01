import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { FarmerLayout } from "@/layouts/FarmerLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const cropSchema = z.object({
  crop_name: z.string().min(1, "Crop name is required"),
  expected_harvest_date: z.string().optional(),
  expected_quantity_kg: z
    .string()
    .transform((val) => (val ? Number(val) : null))
    .nullable()
    .optional(),
  district: z.string().optional(),
  status: z.enum(["GROWING", "READY", "SOLD"]).default("GROWING"),
});

type CropForm = z.infer<typeof cropSchema>;

const NewCropPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const form = useForm<CropForm>({
    resolver: zodResolver(cropSchema),
    defaultValues: {
      crop_name: "",
      expected_harvest_date: "",
      expected_quantity_kg: undefined,
      district: "",
      status: "GROWING",
    },
  });

  const onSubmit = async (values: CropForm) => {
    if (!user) return;
    const { error } = await supabase.from("crops").insert({
      crop_name: values.crop_name,
      expected_harvest_date: values.expected_harvest_date || null,
      expected_quantity_kg: values.expected_quantity_kg ?? null,
      district: values.district || null,
      farmer_id: user.id,
      status: values.status,
    });

    if (error) {
      console.error(error);
      toast.error("Could not add crop");
      return;
    }

    toast.success("Crop added");
    navigate("/farmer/crops");
  };

  return (
    <FarmerLayout title="Add crop">
      <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-2">
          <Label htmlFor="crop_name">Crop name</Label>
          <Input id="crop_name" {...form.register("crop_name")} />
          {form.formState.errors.crop_name && (
            <p className="text-sm text-destructive">{form.formState.errors.crop_name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="expected_quantity_kg">Expected quantity (kg)</Label>
          <Input id="expected_quantity_kg" type="number" step="any" {...form.register("expected_quantity_kg")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="expected_harvest_date">Expected harvest date</Label>
          <Input id="expected_harvest_date" type="date" {...form.register("expected_harvest_date")} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="district">District</Label>
          <Input id="district" {...form.register("district")} />
        </div>

        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={form.watch("status")}
            onValueChange={(value) => form.setValue("status", value as CropForm["status"])}
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

        <div className="md:col-span-2">
          <Button type="submit">Save crop</Button>
        </div>
      </form>
    </FarmerLayout>
  );
};

export default NewCropPage;

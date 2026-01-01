import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FarmerLayout } from "@/layouts/FarmerLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(6, "Phone is required"),
  district: z.string().min(1, "District is required"),
  village: z.string().min(1, "Village is required"),
});

type ProfileForm = z.infer<typeof profileSchema>;

const ProfilePage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: Boolean(user),
  });

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      phone: "",
      district: "",
      village: "",
    },
  });

  useEffect(() => {
    if (data) {
      form.reset({
        name: data.name ?? "",
        phone: data.phone ?? "",
        district: data.district ?? "",
        village: data.village ?? "",
      });
    }
  }, [data, form]);

  const mutation = useMutation({
    mutationFn: async (values: ProfileForm) => {
      const { error } = await supabase
        .from("profiles")
        .update(values)
        .eq("id", user?.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
    onError: (err) => {
      console.error(err);
      toast.error("Could not update profile");
    },
  });

  return (
    <FarmerLayout title="My Profile">
      {isLoading ? (
        <p className="text-muted-foreground">Loading profile...</p>
      ) : (
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...form.register("phone")} />
              {form.formState.errors.phone && (
                <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="district">District</Label>
              <Input id="district" {...form.register("district")} />
              {form.formState.errors.district && (
                <p className="text-sm text-destructive">{form.formState.errors.district.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="village">Village</Label>
              <Input id="village" {...form.register("village")} />
              {form.formState.errors.village && (
                <p className="text-sm text-destructive">{form.formState.errors.village.message}</p>
              )}
            </div>
          </div>
          <Button type="submit" disabled={mutation.isLoading}>
            {mutation.isLoading ? "Saving..." : "Save profile"}
          </Button>
        </form>
      )}
    </FarmerLayout>
  );
};

export default ProfilePage;

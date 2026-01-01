import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Crop = Database["public"]["Tables"]["crops"]["Row"];

interface AdviceResponse {
  summary: string;
  actions: string[];
}

const AIAdvicePage = () => {
  const [selectedCrop, setSelectedCrop] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [advice, setAdvice] = useState<AdviceResponse | null>(null);

  const { data: crops } = useQuery({
    queryKey: ["ai-crops"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crops")
        .select("id, crop_name, status, mvp_status")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Pick<Crop, "id" | "crop_name" | "status" | "mvp_status">[];
    },
  });

  const fetchAdvice = async () => {
    if (!selectedCrop) {
      toast.error("Select a crop first");
      return;
    }

    setLoading(true);
    setAdvice(null);

    const { data, error } = await supabase.functions.invoke("farmer_advice", {
      body: { crop_id: selectedCrop },
    });

    if (error) {
      console.error(error);
      toast.error("Could not fetch advice");
      setLoading(false);
      return;
    }

    setAdvice(data as AdviceResponse);
    setLoading(false);
  };

  return (
    <DashboardLayout title="AI Advice">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Get crop guidance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedCrop} onValueChange={setSelectedCrop}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a crop" />
              </SelectTrigger>
              <SelectContent>
                {crops?.map((crop) => (
                  <SelectItem key={crop.id} value={crop.id}>
                    {crop.crop_name} ({crop.mvp_status || crop.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={fetchAdvice} disabled={loading}>
              {loading ? "Getting advice..." : "Get Advice"}
            </Button>
          </CardContent>
        </Card>

        {advice && (
          <Card>
            <CardHeader>
              <CardTitle>Advice</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">{advice.summary}</p>
              <div className="space-y-2">
                {advice.actions.map((action, idx) => (
                  <div key={idx} className="rounded-md bg-muted p-2 text-sm">
                    {action}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AIAdvicePage;

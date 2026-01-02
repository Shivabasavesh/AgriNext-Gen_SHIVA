import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { Loader2, Sparkles, Lightbulb, ClipboardList } from "lucide-react";

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
        .select("id, crop_name, status")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Pick<Crop, "id" | "crop_name" | "status">[];
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
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              Get crop guidance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Select value={selectedCrop} onValueChange={setSelectedCrop}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a crop" />
                </SelectTrigger>
                <SelectContent>
                  {crops?.map((crop) => (
                    <SelectItem key={crop.id} value={crop.id}>
                      {crop.crop_name} ({crop.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!selectedCrop && crops?.[0]?.id) setSelectedCrop(crops[0].id);
                    fetchAdvice();
                  }}
                >
                  Quick: Harvest plan
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!selectedCrop && crops?.[0]?.id) setSelectedCrop(crops[0].id);
                    fetchAdvice();
                  }}
                >
                  Quick: Disease check
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!selectedCrop && crops?.[0]?.id) setSelectedCrop(crops[0].id);
                    fetchAdvice();
                  }}
                >
                  Quick: Storage tips
                </Button>
              </div>
            </div>
            <Button onClick={fetchAdvice} disabled={loading} className="w-full md:w-auto">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Getting advice...
                </>
              ) : (
                "Get Advice"
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                AI Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {advice ? (
                <p className="text-sm leading-relaxed">{advice.summary}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Select a crop and request advice to see recommendations tailored to your harvest window,
                  inputs, and storage needs.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                Next Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {advice ? (
                advice.actions.map((action, idx) => (
                  <div key={idx} className="rounded-md bg-muted p-2 text-sm">
                    {action}
                  </div>
                ))
              ) : (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• Verify soil moisture and plan irrigation.</p>
                  <p>• Check local weather before spraying.</p>
                  <p>• Prepare storage bags and transport slots.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AIAdvicePage;

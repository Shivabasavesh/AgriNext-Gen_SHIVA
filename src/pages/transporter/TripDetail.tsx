import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TransporterLayout } from "@/layouts/TransporterLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

type TripStop = {
  id: string;
  stop_type: string;
  status: string;
  sequence: number;
  location_text: string | null;
  transport_request_id: string | null;
  transport_requests?: {
    status: string;
    pickup_location_text: string | null;
    drop_location_text: string | null;
  } | null;
};

const TripDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submittingStop, setSubmittingStop] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[] | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["trip-detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("*, trip_stops(*, transport_requests(*))")
        .eq("id", id as string)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const tripStops = (data?.trip_stops as TripStop[] | undefined)?.sort((a, b) => a.sequence - b.sequence) ?? [];

  const completeStop = async (stop: TripStop) => {
    if (!user || !id) return;
    if (!selectedFile) {
      toast.error("Upload a photo proof first");
      return;
    }

    setSubmittingStop(stop.id);

    const filePath = `${user.id}/${id}/${stop.id}/${selectedFile.name}`;
    const { error: uploadError } = await supabase.storage.from("trip-proofs").upload(filePath, selectedFile, {
      upsert: true,
    });

    if (uploadError) {
      toast.error("Upload failed");
      setSubmittingStop(null);
      return;
    }

    const { data: publicUrl } = supabase.storage.from("trip-proofs").getPublicUrl(filePath);

    const { error: proofError } = await supabase.from("proofs").insert({
      trip_stop_id: stop.id,
      proof_type: stop.stop_type,
      photo_url: publicUrl.publicUrl,
      note: note || null,
      created_by: user.id,
    });

    if (proofError) {
      toast.error("Could not save proof");
      setSubmittingStop(null);
      return;
    }

    const now = new Date().toISOString();

    const updates: Promise<any>[] = [
      supabase.from("trip_stops").update({ status: "DONE", completed_at: now }).eq("id", stop.id),
    ];

    if (stop.transport_request_id) {
      const nextStatus = stop.stop_type === "PICKUP" ? "PICKED_UP" : "DELIVERED";
      updates.push(
        supabase
          .from("transport_requests")
          .update({ status: nextStatus })
          .eq("id", stop.transport_request_id)
      );
    }

    const results = await Promise.all(updates);
    const hasError = results.some((r) => "error" in r && r.error);
    if (hasError) {
      toast.error("Could not update stop");
      setSubmittingStop(null);
      return;
    }

    const { data: updatedStops } = await supabase
      .from("trip_stops")
      .select("id,status")
      .eq("trip_id", id);

    const allDone = updatedStops?.every((s) => s.status === "DONE");
    if (allDone) {
      await supabase
        .from("trips")
        .update({ status: "COMPLETED", completed_at: now })
        .eq("id", id);
    }

    toast.success("Stop marked done");
    setNote("");
    setSelectedFile(null);
    setSubmittingStop(null);
    queryClient.invalidateQueries({ queryKey: ["trip-detail", id] });
    queryClient.invalidateQueries({ queryKey: ["transporter-metrics"] });
  };

  const handleReverseLoad = async () => {
    if (!id) return;
    setLoadingSuggestion(true);
    const { data, error } = await supabase.functions.invoke("reverse_load_suggest", {
      body: { trip_id: id },
    });
    if (error) {
      toast.error("Could not fetch suggestions");
      setLoadingSuggestion(false);
      return;
    }
    setSuggestions(data?.bundles || []);
    toast.success("Suggestions ready");
    setLoadingSuggestion(false);
  };

  const updateSuggestionStatus = async (status: "ACCEPTED" | "REJECTED") => {
    if (!user) return;
    const { data: latest } = await supabase
      .from("reverse_load_suggestions")
      .select("id")
      .eq("transporter_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latest?.id) {
      toast.error("No suggestion to update");
      return;
    }

    const { error } = await supabase
      .from("reverse_load_suggestions")
      .update({ status })
      .eq("id", latest.id);
    if (error) {
      toast.error("Could not update suggestion");
      return;
    }
    toast.success(`Suggestion ${status.toLowerCase()}`);
  };

  return (
    <TransporterLayout title={`Trip ${id?.slice(0, 8)}`}>
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge variant="outline">{data?.status}</Badge>
          </div>
          <Button
            onClick={handleReverseLoad}
            disabled={
              loadingSuggestion ||
              !tripStops.some((s) => s.stop_type === "DELIVERY" && s.status === "DONE")
            }
          >
            {loadingSuggestion ? "Requesting..." : "Suggest Return Load"}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading trip...</p>
          ) : (
            <div className="space-y-4">
              {tripStops.map((stop) => (
                <div key={stop.id} className="rounded border p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">
                        {stop.sequence}. {stop.stop_type}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {stop.location_text || "No location provided"}
                      </p>
                    </div>
                    <Badge variant={stop.status === "DONE" ? "default" : "outline"}>{stop.status}</Badge>
                  </div>

                  {stop.status !== "DONE" && (
                    <div className="mt-3 space-y-2">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      />
                      <Textarea
                        placeholder="Add a note (optional)"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                      <Button
                        size="sm"
                        onClick={() => completeStop(stop)}
                        disabled={submittingStop === stop.id}
                      >
                        {submittingStop === stop.id ? "Saving..." : `Complete ${stop.stop_type.toLowerCase()}`}
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {suggestions && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Reverse load suggestions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No suggestions returned.</p>
            ) : (
              suggestions.map((bundle, idx) => (
                <div key={idx} className="rounded border p-3">
                  <p className="font-semibold">{bundle.title}</p>
                  <p className="text-sm text-muted-foreground">To: {bundle.to_location}</p>
                  <p className="text-sm font-medium mt-1">Items:</p>
                  <ul className="list-disc pl-4 text-sm text-muted-foreground">
                    {bundle.items?.map((item: any, i: number) => (
                      <li key={i}>
                        {item.name} - {item.qty}
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm text-muted-foreground mt-1">{bundle.reason}</p>
                </div>
              ))
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => updateSuggestionStatus("REJECTED")}>
                Reject
              </Button>
              <Button onClick={() => updateSuggestionStatus("ACCEPTED")}>Accept</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </TransporterLayout>
  );
};

export default TripDetail;

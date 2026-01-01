import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  useAgentTask,
  useUpdateTaskStatus,
  useCreateVisit,
  useUpdateCropStatus,
} from '@/hooks/useAgentDashboard';
import { format, parseISO } from 'date-fns';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Loader2,
  MapPin,
  Phone,
  Upload,
} from 'lucide-react';

const statusColors: Record<string, string> = {
  OPEN: 'bg-amber-100 text-amber-800',
  DONE: 'bg-green-100 text-green-800',
};

const TaskDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: task, isLoading } = useAgentTask(id);
  const updateStatus = useUpdateTaskStatus();
  const createVisit = useCreateVisit();
  const updateCropStatus = useUpdateCropStatus();

  const [notes, setNotes] = useState('');
  const [geo, setGeo] = useState('');
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [files, setFiles] = useState<FileList | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const uploadPhotos = async (visitId: string, agentId: string) => {
    if (!files || files.length === 0) return [];

    const uploads = Array.from(files).slice(0, 3).map(async (file) => {
      const filePath = `${agentId}/${visitId}/${file.name}`;
      const { error } = await supabase.storage.from('visit-photos').upload(filePath, file);
      if (error) throw error;
      return filePath;
    });

    return Promise.all(uploads);
  };

  const handleVisitSubmit = async () => {
    if (!task) return;
    setIsSubmitting(true);

    try {
      const visitId = crypto.randomUUID();
      const photoPaths = await uploadPhotos(visitId, task.agent_id);

      await createVisit.mutateAsync({
        id: visitId,
        agent_id: task.agent_id,
        farmer_id: task.farmer_id,
        crop_id: task.crop_id,
        task_id: task.id,
        notes,
        geo_text: geo,
        visit_date: visitDate,
        photo_urls: photoPaths,
      });

      toast.success('Visit submitted');
      setNotes('');
      setGeo('');
      setFiles(null);
    } catch (error) {
      console.error(error);
      toast.error('Failed to submit visit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkDone = () => {
    if (!task || task.status === 'DONE') return;
    updateStatus.mutate({ taskId: task.id, status: 'DONE' });
  };

  const handleReadyCrop = () => {
    if (!task?.crop?.id) return;
    updateCropStatus.mutate({ cropId: task.crop.id, status: 'ready' });
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Task Detail">
        <Card>
          <CardContent className="p-6">Loading task...</CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  if (!task) {
    return (
      <DashboardLayout title="Task Detail">
        <Card>
          <CardContent className="p-6">Task not found</CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Task Detail">
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <Card>
          <CardHeader className="flex justify-between flex-row items-start gap-2">
            <div className="space-y-1">
              <CardTitle className="text-xl">{task.farmer?.full_name || 'Farmer Task'}</CardTitle>
              <div className="flex gap-2 items-center text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{task.farmer?.village || 'Unknown village'}</span>
              </div>
              {task.farmer?.phone && (
                <div className="flex gap-2 items-center text-muted-foreground text-sm">
                  <Phone className="h-4 w-4" />
                  <span>{task.farmer.phone}</span>
                </div>
              )}
            </div>
            <Badge className={statusColors[task.status]}>
              {task.status === 'OPEN' ? 'OPEN' : 'DONE'}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Task Type</p>
                <p className="font-semibold">{task.task_type}</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Due Date</p>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <p>{format(parseISO(task.due_date), 'MMM d, yyyy')}</p>
                </div>
              </div>
            </div>

            {task.crop && (
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Crop</p>
                  <p className="font-semibold">{task.crop.crop_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-semibold">{task.crop.status}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Harvest Est.</p>
                  <p className="font-semibold">
                    {task.crop.harvest_estimate
                      ? format(parseISO(task.crop.harvest_estimate), 'MMM d, yyyy')
                      : 'N/A'}
                  </p>
                </div>
              </div>
            )}

            <Separator />

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Notes</p>
              <p className="text-sm whitespace-pre-wrap">{task.notes || 'No notes yet'}</p>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleMarkDone} disabled={task.status === 'DONE' || updateStatus.isPending}>
                {updateStatus.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Mark Done
              </Button>
              {task.crop?.id && (
                <Button variant="outline" onClick={handleReadyCrop} disabled={updateCropStatus.isPending}>
                  {updateCropStatus.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Set Crop READY
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Submit Visit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Visit Date</Label>
                <Input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Location / Geo</Label>
                <Input
                  placeholder="Village, district or coordinates"
                  value={geo}
                  onChange={(e) => setGeo(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Observations, farmer updates, readiness checks..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Photos (optional, up to 3)</Label>
              <Input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setFiles(e.target.files)}
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Upload className="h-3 w-3" />
                Stored securely in Supabase Storage
              </p>
            </div>

            <Button onClick={handleVisitSubmit} disabled={isSubmitting || createVisit.isPending}>
              {isSubmitting || createVisit.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Submit Visit
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default TaskDetail;

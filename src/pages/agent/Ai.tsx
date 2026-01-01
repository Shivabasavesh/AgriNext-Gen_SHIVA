import { useState } from 'react';
import DashboardLayout from '@/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAgentPrioritize, useAgentTasks } from '@/hooks/useAgentDashboard';
import { toast } from 'sonner';
import { Loader2, Sparkles } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const AgentAi = () => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [results, setResults] = useState<{ task_id: string; rank: number; reason: string }[]>([]);
  const prioritize = useAgentPrioritize();
  const { data: tasks } = useAgentTasks();

  const handleRun = async () => {
    try {
      const data = await prioritize.mutateAsync({ date });
      setResults(data.prioritized || []);
      toast.success('Prioritized tasks ready');
    } catch (error) {
      console.error(error);
      toast.error('Failed to prioritize tasks');
    }
  };

  const getTaskInfo = (taskId: string) => tasks?.find((t) => t.id === taskId);

  return (
    <DashboardLayout title="AI Prioritization">
      <div className="space-y-4 max-w-3xl">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Prioritize Today
            </CardTitle>
            <Badge variant="secondary">Edge Function</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Plan for date</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <Button onClick={handleRun} disabled={prioritize.isPending}>
              {prioritize.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Prioritize Tasks
            </Button>
          </CardContent>
        </Card>

        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>AI Ordered Tasks</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {results.map((item) => {
                const task = getTaskInfo(item.task_id);
                return (
                  <div key={item.task_id} className="p-3 rounded-lg border space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">Rank #{item.rank}</p>
                        <p className="text-sm text-muted-foreground">
                          {task?.farmer?.full_name || 'Farmer'} • {task?.farmer?.village || 'Village'}
                        </p>
                      </div>
                      {task?.due_date && (
                        <Badge variant="outline">
                          Due {format(parseISO(task.due_date), 'MMM d')}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm">{item.reason}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AgentAi;

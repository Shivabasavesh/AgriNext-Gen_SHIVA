import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  useTodaysTasks, 
  useAgentPrioritize,
  useAILogs
} from '@/hooks/useAgentDashboard';
import { 
  Sparkles, 
  Route, 
  Loader2, 
  History,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, parseISO } from 'date-fns';

const AIInsightsPanel = () => {
  const [visitPriority, setVisitPriority] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  
  const { data: tasks } = useTodaysTasks();
  const { data: aiLogs } = useAILogs();
  
  const visitPrioritization = useAgentPrioritize();

  const handlePrioritize = async () => {
    if (!tasks || tasks.length === 0) {
      toast.error('No tasks to prioritize');
      return;
    }
    
    try {
      const result = await visitPrioritization.mutateAsync({ date: new Date().toISOString().split('T')[0] });
      const readable = (result.prioritized || []).map((item) => `#${item.rank} - ${item.task_id}: ${item.reason}`).join('\n');
      setVisitPriority(readable);
      toast.success('AI prioritization complete');
    } catch (error) {
      toast.error('Failed to get AI suggestions');
    }
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-purple-600" />
            AI Insights
          </CardTitle>
          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
            Powered by AI
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <Button 
            onClick={handlePrioritize}
            disabled={visitPrioritization.isPending}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            {visitPrioritization.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Route className="h-4 w-4 mr-2" />
            )}
            Prioritize Today's Visits
          </Button>
        </div>

        {/* Visit Priority Results */}
        {visitPriority && (
          <div className="p-4 rounded-lg bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200">
            <h4 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
              <Route className="h-4 w-4" />
              AI Suggested Visit Order
            </h4>
            <ScrollArea className="h-48">
              <div className="text-sm whitespace-pre-wrap text-gray-700">
                {visitPriority}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* AI History Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowHistory(!showHistory)}
          className="w-full text-muted-foreground"
        >
          <History className="h-4 w-4 mr-2" />
          Recent AI Insights
          {showHistory ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
        </Button>

        {/* AI History */}
        {showHistory && aiLogs && aiLogs.length > 0 && (
          <div className="space-y-2">
            {aiLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="p-3 rounded-lg border text-sm">
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="text-xs">
                    {(log.module_type || 'ai_log').replace('_', ' ')}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(parseISO(log.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-muted-foreground line-clamp-2">
                  {log.output_data ? JSON.stringify(log.output_data).substring(0, 100) : 'No output'}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIInsightsPanel;

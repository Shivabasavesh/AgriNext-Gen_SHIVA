import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// Types
export interface AgentTask {
  id: string;
  agent_id: string;
  farmer_id: string;
  crop_id: string | null;
  task_type: 'VISIT' | 'VERIFY' | 'UPDATE';
  status: 'OPEN' | 'DONE';
  due_date: string;
  notes: string | null;
  priority: number;
  created_at: string;
  updated_at: string;
  farmer?: {
    full_name: string | null;
    village: string | null;
    district: string | null;
    phone: string | null;
  };
  crop?: {
    crop_name: string;
    status: string;
    harvest_estimate: string | null;
    estimated_quantity: number | null;
  };
}

export interface AIAgentLog {
  id: string;
  agent_id: string;
  log_type: string;
  input_context: any;
  output_text: string | null;
  created_at: string;
}

// Fetch agent tasks
export const useAgentTasks = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['agent-tasks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data: tasks, error } = await supabase
        .from('agent_tasks')
        .select(`
          *,
          farmer:profiles!agent_tasks_farmer_id_fkey(full_name, village, district, phone),
          crop:crops(crop_name, status, harvest_estimate, estimated_quantity)
        `)
        .eq('agent_id', user.id)
        .order('due_date', { ascending: true })
        .order('priority', { ascending: false });
      
      if (error) throw error;
      return (tasks || []) as AgentTask[];
    },
    enabled: !!user?.id,
  });
};

// Fetch today's tasks
export const useTodaysTasks = () => {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  
  return useQuery({
    queryKey: ['today-tasks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data: tasks, error } = await supabase
        .from('agent_tasks')
        .select(`
          *,
          farmer:profiles!agent_tasks_farmer_id_fkey(full_name, village, district, phone),
          crop:crops(crop_name, status, harvest_estimate, estimated_quantity)
        `)
        .eq('agent_id', user.id)
        .eq('due_date', today)
        .order('priority', { ascending: false });
      
      if (error) throw error;
      return (tasks || []) as AgentTask[];
    },
    enabled: !!user?.id,
  });
};

// Fetch all farmers (for agent to see)
export const useAllFarmers = () => {
  return useQuery({
    queryKey: ['all-farmers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, user_roles!inner(role)')
        .eq('user_roles.role', 'farmer');
      
      if (error) throw error;
      return data;
    },
  });
};

// Fetch all crops (with farmer info)
export const useAllCrops = () => {
  return useQuery({
    queryKey: ['all-crops-agent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crops')
        .select(`
          *,
          farmer:profiles!crops_farmer_id_fkey(full_name, village, district),
          farmland:farmlands(name, village)
        `)
        .order('harvest_estimate', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });
};

// Fetch all transport requests
export const useAllTransportRequests = () => {
  return useQuery({
    queryKey: ['all-transport-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transport_requests')
        .select(`
          *,
          crop:crops(crop_name, farmer_id),
          farmer:profiles!transport_requests_farmer_id_fkey(full_name, village)
        `)
        .order('preferred_date', { ascending: true });
      
      if (error) throw error;
      return data;
    },
  });
};

// Update task status
export const useUpdateTaskStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ taskId, status, notes }: { taskId: string; status: 'OPEN' | 'DONE'; notes?: string }) => {
      const { error } = await supabase
        .from('agent_tasks')
        .update({ 
          status,
          notes: notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['today-tasks'] });
      toast.success('Task updated successfully');
    },
    onError: (error) => {
      toast.error('Failed to update task');
      console.error(error);
    },
  });
};

// Create new task
export const useCreateTask = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (task: { 
      farmer_id: string; 
      crop_id?: string | null; 
      task_type: 'VISIT' | 'VERIFY' | 'UPDATE';
      due_date: string;
      notes?: string;
    }) => {
      const { error } = await supabase
        .from('agent_tasks')
        .insert({
          farmer_id: task.farmer_id,
          crop_id: task.crop_id || null,
          task_type: task.task_type,
          due_date: task.due_date,
          notes: task.notes || null,
          agent_id: user?.id!,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['today-tasks'] });
      toast.success('Task created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create task');
      console.error(error);
    },
  });
};

// Update crop status (agent can update any crop)
export const useUpdateCropStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ cropId, status, quantity, notes }: { 
      cropId: string; 
      status: string; 
      quantity?: number;
      notes?: string;
    }) => {
      const updateData: any = { status };
      if (quantity !== undefined) updateData.estimated_quantity = quantity;
      
      const { error } = await supabase
        .from('crops')
        .update(updateData)
        .eq('id', cropId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-crops-agent'] });
      toast.success('Crop status updated');
    },
    onError: (error) => {
      toast.error('Failed to update crop');
      console.error(error);
    },
  });
};

// Create visit entry
export const useCreateVisit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      id: string;
      agent_id: string;
      farmer_id: string;
      crop_id?: string | null;
      task_id?: string | null;
      notes?: string;
      geo_text?: string;
      visit_date?: string;
      photo_urls?: string[];
    }) => {
      const { error } = await supabase.from('agent_visits').insert({
        id: payload.id,
        agent_id: payload.agent_id,
        farmer_id: payload.farmer_id,
        crop_id: payload.crop_id || null,
        task_id: payload.task_id || null,
        notes: payload.notes || null,
        geo_text: payload.geo_text || null,
        visit_date: payload.visit_date || new Date().toISOString().split('T')[0],
        photo_urls: payload.photo_urls || [],
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['today-tasks'] });
      toast.success('Visit logged');
    },
    onError: (error) => {
      toast.error('Failed to log visit');
      console.error(error);
    },
  });
};

// AI Prioritization (edge function)
export const useAgentPrioritize = () => {
  return useMutation({
    mutationFn: async ({ date }: { date?: string }) => {
      const { data, error } = await supabase.functions.invoke('agent_prioritize', {
        body: { date },
      });

      if (error) throw error;
      const payload = (data as any)?.data ?? data;
      return payload as {
        prioritized: { task_id: string; rank: number; reason: string }[];
      };
    },
  });
};

// Fetch AI logs from shared table
export const useAILogs = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['ai-logs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('ai_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user?.id,
  });
};

// Fetch single task with relations
export const useAgentTask = (taskId?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['agent-task', taskId, user?.id],
    queryFn: async () => {
      if (!taskId || !user?.id) return null;

      const { data, error } = await supabase
        .from('agent_tasks')
        .select(`
          *,
          farmer:profiles!agent_tasks_farmer_id_fkey(full_name, village, district, phone),
          crop:crops(id, crop_name, status, harvest_estimate, estimated_quantity, district)
        `)
        .eq('id', taskId)
        .maybeSingle();

      if (error) throw error;
      return data as AgentTask | null;
    },
    enabled: !!taskId && !!user?.id,
  });
};

// Profile fetching/updating for agents
export const useAgentProfile = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['agent-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
};

export const useUpdateAgentProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { full_name?: string; phone?: string; district?: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: payload.full_name,
          phone: payload.phone,
          district: payload.district,
          updated_at: new Date().toISOString(),
        })
        .eq('id', (await supabase.auth.getUser()).data.user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agent-profile'] });
      toast.success('Profile updated');
    },
    onError: (error) => {
      toast.error('Failed to update profile');
      console.error(error);
    },
  });
};

// Dashboard stats
export const useAgentDashboardStats = () => {
  const { data: tasks } = useAgentTasks();
  const { data: todayTasks } = useTodaysTasks();
  const { data: allCrops } = useAllCrops();
  const { data: transportRequests } = useAllTransportRequests();
  
  const farmers = new Set(tasks?.map(t => t.farmer_id) || []);
  const readyCrops = allCrops?.filter(c => c.status === 'ready' || c.status === 'one_week') || [];
  const pendingTransport = transportRequests?.filter(t => t.status === 'requested') || [];
  const completedToday = todayTasks?.filter(t => t.status === 'DONE').length || 0;
  
  return {
    farmersAssigned: farmers.size,
    activeCrops: allCrops?.filter(c => c.status !== 'harvested').length || 0,
    tasksToday: todayTasks?.length || 0,
    tasksCompleted: completedToday,
    cropsReadyToHarvest: readyCrops.length,
    pendingTransportRequests: pendingTransport.length,
  };
};

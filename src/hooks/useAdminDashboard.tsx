import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface AdminUser {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: 'super_admin' | 'operations_admin';
  assigned_district: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminDashboardSummary {
  totalFarmers: number;
  totalAgents: number;
  totalTransporters: number;
  activeTransporters?: number;
  totalBuyers: number;
  totalCrops: number;
  cropsByStatus: Record<string, number>;
  totalTransportRequests: number;
  totalTransportJobs: number;
  totalMarketplaceListings: number;
  totalOrders: number;
  harvestReady: number;
  oneWeekAway: number;
  pendingTransport: number;
  activeTransport: number;
  pendingOrders: number;
  newOrdersToday: number;
}

export type AdminActivityItem = {
  id: string;
  type: 'order' | 'transport' | 'crop';
  message: string;
  time: string;
};

interface AdminDashboardResponse {
  summary?: Partial<AdminDashboardSummary>;
  recentActivity?: AdminActivityItem[];
}

// Get admin profile
export const useAdminProfile = () => {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['admin-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as AdminUser | null;
    },
    enabled: !!user?.id,
  });
};

// Create admin profile
export const useCreateAdminProfile = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (data: Partial<AdminUser>) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { data: result, error } = await supabase
        .from('admin_users')
        .insert({
          user_id: user.id,
          name: data.name || 'Admin',
          phone: data.phone,
          email: data.email || user.email,
          role: data.role || 'operations_admin',
          assigned_district: data.assigned_district,
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profile'] });
      toast.success('Admin profile created!');
    },
    onError: (error) => {
      toast.error('Failed to create profile: ' + error.message);
    },
  });
};

const useAdminDashboardData = () => {
  return useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<AdminDashboardResponse>('admin-dashboard');
      
      if (error) throw error;

      const transportersCount = data?.summary?.totalTransporters ?? data?.summary?.activeTransporters ?? 0;
      
      const summary: AdminDashboardSummary = {
        totalFarmers: data?.summary?.totalFarmers ?? 0,
        totalAgents: data?.summary?.totalAgents ?? 0,
        totalTransporters: transportersCount,
        activeTransporters: data?.summary?.activeTransporters ?? transportersCount,
        totalBuyers: data?.summary?.totalBuyers ?? 0,
        totalCrops: data?.summary?.totalCrops ?? 0,
        cropsByStatus: data?.summary?.cropsByStatus ?? {},
        totalTransportRequests: data?.summary?.totalTransportRequests ?? 0,
        totalTransportJobs: data?.summary?.totalTransportJobs ?? 0,
        totalMarketplaceListings: data?.summary?.totalMarketplaceListings ?? 0,
        totalOrders: data?.summary?.totalOrders ?? 0,
        harvestReady: data?.summary?.harvestReady ?? 0,
        oneWeekAway: data?.summary?.oneWeekAway ?? 0,
        pendingTransport: data?.summary?.pendingTransport ?? 0,
        activeTransport: data?.summary?.activeTransport ?? 0,
        pendingOrders: data?.summary?.pendingOrders ?? 0,
        newOrdersToday: data?.summary?.newOrdersToday ?? 0,
      };

      return {
        summary,
        recentActivity: data?.recentActivity ?? [],
      };
    },
  });
};

// Dashboard Stats
export const useAdminDashboardStats = () => {
  const query = useAdminDashboardData();
  
  return {
    ...query,
    data: query.data?.summary,
  };
};

// All Farmers
export const useAllFarmers = () => {
  return useQuery({
    queryKey: ['admin-all-farmers'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Enrich with role and crop count
      const enriched = await Promise.all(
        (profiles || []).map(async (profile) => {
          const [roleRes, cropsRes, farmlandsRes] = await Promise.all([
            supabase.from('user_roles').select('role').eq('user_id', profile.id).maybeSingle(),
            supabase.from('crops').select('id', { count: 'exact' }).eq('farmer_id', profile.id),
            supabase.from('farmlands').select('area').eq('farmer_id', profile.id),
          ]);
          
          const totalLand = (farmlandsRes.data || []).reduce((sum, f) => sum + (Number(f.area) || 0), 0);
          
          return {
            ...profile,
            role: roleRes.data?.role || 'unknown',
            cropCount: cropsRes.count || 0,
            totalLand,
          };
        })
      );

      // Filter to only farmers
      return enriched.filter(p => p.role === 'farmer');
    },
  });
};

// All Agents
export const useAllAgents = () => {
  return useQuery({
    queryKey: ['admin-all-agents'],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      const enriched = await Promise.all(
        (profiles || []).map(async (profile) => {
          const [roleRes, tasksRes, agentDataRes] = await Promise.all([
            supabase.from('user_roles').select('role').eq('user_id', profile.id).maybeSingle(),
            supabase.from('agent_tasks').select('id, task_status').eq('agent_id', profile.id),
            supabase.from('agent_data').select('farmer_id').eq('agent_id', profile.id),
          ]);
          
          const tasks = tasksRes.data || [];
          const completedTasks = tasks.filter(t => t.task_status === 'completed').length;
          const farmersHandled = new Set((agentDataRes.data || []).map(d => d.farmer_id)).size;
          
          return {
            ...profile,
            role: roleRes.data?.role || 'unknown',
            totalTasks: tasks.length,
            completedTasks,
            farmersHandled,
          };
        })
      );

      return enriched.filter(p => p.role === 'agent');
    },
  });
};

// All Transporters
export const useAllTransporters = () => {
  return useQuery({
    queryKey: ['admin-all-transporters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transporters')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      const enriched = await Promise.all(
        (data || []).map(async (transporter) => {
          const [vehiclesRes, tripsRes] = await Promise.all([
            supabase.from('vehicles').select('id', { count: 'exact' }).eq('transporter_id', transporter.id),
            supabase.from('transport_requests').select('id, status').eq('transporter_id', transporter.user_id),
          ]);
          
          const trips = tripsRes.data || [];
          
          return {
            ...transporter,
            vehicleCount: vehiclesRes.count || 0,
            activeTrips: trips.filter(t => ['assigned', 'en_route', 'picked_up'].includes(t.status)).length,
            completedTrips: trips.filter(t => t.status === 'delivered').length,
          };
        })
      );

      return enriched;
    },
  });
};

// All Buyers
export const useAllBuyers = () => {
  return useQuery({
    queryKey: ['admin-all-buyers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buyers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      const enriched = await Promise.all(
        (data || []).map(async (buyer) => {
          const ordersRes = await supabase
            .from('market_orders')
            .select('id, status')
            .eq('buyer_id', buyer.id);
          
          const orders = ordersRes.data || [];
          
          return {
            ...buyer,
            totalOrders: orders.length,
            activeOrders: orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length,
          };
        })
      );

      return enriched;
    },
  });
};

// All Crops (Admin view)
export const useAllCrops = () => {
  return useQuery({
    queryKey: ['admin-all-crops'],
    queryFn: async () => {
      const { data: crops, error } = await supabase
        .from('crops')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) throw error;

      const enriched = await Promise.all(
        (crops || []).map(async (crop) => {
          const [farmerRes, landRes] = await Promise.all([
            supabase.from('profiles').select('full_name, village, district').eq('id', crop.farmer_id).maybeSingle(),
            crop.land_id ? supabase.from('farmlands').select('name, village').eq('id', crop.land_id).maybeSingle() : Promise.resolve({ data: null }),
          ]);
          
          return {
            ...crop,
            farmer: farmerRes.data,
            land: landRes.data,
          };
        })
      );

      return enriched;
    },
  });
};

// All Transport Requests (Admin view)
export const useAllTransportRequests = () => {
  return useQuery({
    queryKey: ['admin-all-transport'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transport_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      const enriched = await Promise.all(
        (data || []).map(async (req) => {
          const [farmerRes, cropRes, transporterRes] = await Promise.all([
            supabase.from('profiles').select('full_name, village').eq('id', req.farmer_id).maybeSingle(),
            req.crop_id ? supabase.from('crops').select('crop_name').eq('id', req.crop_id).maybeSingle() : Promise.resolve({ data: null }),
            req.transporter_id ? supabase.from('transporters').select('name, phone').eq('user_id', req.transporter_id).maybeSingle() : Promise.resolve({ data: null }),
          ]);
          
          return {
            ...req,
            farmer: farmerRes.data,
            crop: cropRes.data,
            transporter: transporterRes.data,
          };
        })
      );

      return enriched;
    },
  });
};

// All Market Orders (Admin view)
export const useAllMarketOrders = () => {
  return useQuery({
    queryKey: ['admin-all-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('market_orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      const enriched = await Promise.all(
        (data || []).map(async (order) => {
          const [buyerRes, farmerRes, cropRes] = await Promise.all([
            supabase.from('buyers').select('name, company_name').eq('id', order.buyer_id).maybeSingle(),
            supabase.from('profiles').select('full_name, village').eq('id', order.farmer_id).maybeSingle(),
            order.crop_id ? supabase.from('crops').select('crop_name, variety').eq('id', order.crop_id).maybeSingle() : Promise.resolve({ data: null }),
          ]);
          
          return {
            ...order,
            buyer: buyerRes.data,
            farmer: farmerRes.data,
            crop: cropRes.data,
          };
        })
      );

      return enriched;
    },
  });
};

// Update transport request status
export const useUpdateTransportStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status, transporter_id }: { id: string; status: string; transporter_id?: string }) => {
      const updateData: Record<string, unknown> = { status };
      if (transporter_id !== undefined) {
        updateData.transporter_id = transporter_id;
      }
      
      const { error } = await supabase
        .from('transport_requests')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-transport'] });
      toast.success('Transport request updated!');
    },
    onError: (error) => {
      toast.error('Update failed: ' + error.message);
    },
  });
};

// Update market order status
export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('market_orders')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-orders'] });
      toast.success('Order status updated!');
    },
    onError: (error) => {
      toast.error('Update failed: ' + error.message);
    },
  });
};

// Recent Activity
export const useRecentActivity = () => {
  const query = useAdminDashboardData();
  
  return {
    ...query,
    data: query.data?.recentActivity ?? [],
  };
};

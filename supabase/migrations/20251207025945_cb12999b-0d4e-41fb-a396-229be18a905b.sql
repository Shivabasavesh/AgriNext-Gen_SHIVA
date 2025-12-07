-- Create admin_users table for admin-specific profile data
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'operations_admin' CHECK (role IN ('super_admin', 'operations_admin')),
  assigned_district TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ai_admin_logs table for admin AI analytics
CREATE TABLE public.ai_admin_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  module_type TEXT NOT NULL CHECK (module_type IN ('cluster_health', 'supply_demand', 'price_anomaly', 'efficiency_advisor')),
  input_data JSONB,
  output_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_admin_logs ENABLE ROW LEVEL SECURITY;

-- Admin users policies
CREATE POLICY "Super admins can view all admin users"
  ON public.admin_users FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view own profile"
  ON public.admin_users FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can create own profile"
  ON public.admin_users FOR INSERT
  WITH CHECK (auth.uid() = user_id AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update own profile"
  ON public.admin_users FOR UPDATE
  USING (auth.uid() = user_id);

-- AI admin logs policies
CREATE POLICY "Admins can view AI logs"
  ON public.ai_admin_logs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.id = ai_admin_logs.admin_id 
    AND admin_users.user_id = auth.uid()
  ));

CREATE POLICY "Admins can create AI logs"
  ON public.ai_admin_logs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM admin_users 
    WHERE admin_users.id = ai_admin_logs.admin_id 
    AND admin_users.user_id = auth.uid()
  ));

-- Add updated_at trigger for admin_users
CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add RLS policies for admins to view ecosystem data
CREATE POLICY "Admins can view all crops"
  ON public.crops FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all farmlands"
  ON public.farmlands FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all transport requests"
  ON public.transport_requests FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update transport requests"
  ON public.transport_requests FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all transporters"
  ON public.transporters FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all vehicles"
  ON public.vehicles FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all buyers"
  ON public.buyers FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view all market orders"
  ON public.market_orders FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update market orders"
  ON public.market_orders FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));
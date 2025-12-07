-- Fix 1: Restrict profiles table - Remove public read access
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Create proper owner-scoped policy for profiles
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Allow users to view profiles they have business relationships with (for marketplace)
CREATE POLICY "Users can view profiles with orders relationship" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM market_orders 
    WHERE (market_orders.farmer_id = profiles.id AND market_orders.buyer_id IN (
      SELECT id FROM buyers WHERE user_id = auth.uid()
    ))
    OR (market_orders.buyer_id IN (SELECT id FROM buyers WHERE user_id = profiles.id) AND market_orders.farmer_id = auth.uid())
  )
);

-- Allow agents to view profiles of farmers they're assigned to
CREATE POLICY "Agents can view assigned farmer profiles" 
ON public.profiles 
FOR SELECT 
USING (
  has_role(auth.uid(), 'agent'::app_role) AND
  EXISTS (
    SELECT 1 FROM agent_data 
    WHERE agent_data.farmer_id = profiles.id 
    AND agent_data.agent_id = auth.uid()
  )
);

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: Restrict user_roles insertion to non-admin roles only
DROP POLICY IF EXISTS "Users can insert own role during signup" ON public.user_roles;

CREATE POLICY "Users can insert own role during signup" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND 
  role IN ('farmer'::app_role, 'buyer'::app_role, 'agent'::app_role, 'logistics'::app_role)
);

-- Allow admins to create admin roles for others
CREATE POLICY "Admins can create any role" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
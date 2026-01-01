-- Align agent workflow tables for the Agri Mitra agent dashboard MVP

-- 1) Normalize agent_tasks schema to text-based enums and new status
ALTER TABLE public.agent_tasks
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'OPEN';

-- Backfill existing task statuses
UPDATE public.agent_tasks
SET status = CASE task_status::text
  WHEN 'completed' THEN 'DONE'
  WHEN 'in_progress' THEN 'OPEN'
  ELSE 'OPEN'
END
WHERE status IS NULL;

-- Migrate task_type to uppercase text values
ALTER TABLE public.agent_tasks
  ALTER COLUMN task_type DROP DEFAULT,
  ALTER COLUMN task_type TYPE TEXT USING (
    CASE task_type::text
      WHEN 'visit' THEN 'VISIT'
      WHEN 'verify_crop' THEN 'VERIFY'
      WHEN 'harvest_check' THEN 'UPDATE'
      WHEN 'transport_assist' THEN 'UPDATE'
      ELSE UPPER(task_type::text)
    END
  );

-- Finalize status column
ALTER TABLE public.agent_tasks
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'OPEN';

-- Drop legacy status column and enum types if present
ALTER TABLE public.agent_tasks DROP COLUMN IF EXISTS task_status;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_task_status') THEN
    DROP TYPE public.agent_task_status;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agent_task_type') THEN
    DROP TYPE public.agent_task_type;
  END IF;
END $$;

-- Add foreign keys to profiles/crops to support joins
ALTER TABLE public.agent_tasks DROP CONSTRAINT IF EXISTS agent_tasks_agent_id_fkey;
ALTER TABLE public.agent_tasks DROP CONSTRAINT IF EXISTS agent_tasks_farmer_id_fkey;
ALTER TABLE public.agent_tasks DROP CONSTRAINT IF EXISTS agent_tasks_crop_id_fkey;

ALTER TABLE public.agent_tasks
  ADD CONSTRAINT agent_tasks_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT agent_tasks_farmer_id_fkey FOREIGN KEY (farmer_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT agent_tasks_crop_id_fkey FOREIGN KEY (crop_id) REFERENCES public.crops(id) ON DELETE SET NULL;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent_status_due ON public.agent_tasks(agent_id, status, due_date);

-- Reset RLS policies to new rules
DROP POLICY IF EXISTS "Agents can view own tasks" ON public.agent_tasks;
DROP POLICY IF EXISTS "Agents can create tasks" ON public.agent_tasks;
DROP POLICY IF EXISTS "Agents can update own tasks" ON public.agent_tasks;
DROP POLICY IF EXISTS "Agents can delete own tasks" ON public.agent_tasks;
DROP POLICY IF EXISTS "Admins can view all tasks" ON public.agent_tasks;

CREATE POLICY "Agent can read own tasks"
  ON public.agent_tasks FOR SELECT
  USING (auth.uid() = agent_id);

CREATE POLICY "Agent can insert own tasks"
  ON public.agent_tasks FOR INSERT
  WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agent can update own tasks"
  ON public.agent_tasks FOR UPDATE
  USING (auth.uid() = agent_id);

CREATE POLICY "Agent can delete own tasks"
  ON public.agent_tasks FOR DELETE
  USING (auth.uid() = agent_id);

CREATE POLICY "Admins can view agent tasks"
  ON public.agent_tasks FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 2) Add agent_visits table for field visit logs
CREATE TABLE IF NOT EXISTS public.agent_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  farmer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  crop_id UUID REFERENCES public.crops(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.agent_tasks(id) ON DELETE SET NULL,
  notes TEXT,
  geo_text TEXT,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  photo_urls TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agent can insert visits" ON public.agent_visits
  FOR INSERT WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agent can view own visits" ON public.agent_visits
  FOR SELECT USING (auth.uid() = agent_id);

CREATE POLICY "Agent can update own visits" ON public.agent_visits
  FOR UPDATE USING (auth.uid() = agent_id);

CREATE INDEX IF NOT EXISTS idx_agent_visits_agent_created_at
  ON public.agent_visits(agent_id, created_at DESC);

-- 3) Unified AI logs table for agent prioritization logging
CREATE TABLE IF NOT EXISTS public.ai_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  module_type TEXT NOT NULL,
  input_data JSONB,
  output_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own ai logs" ON public.ai_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert ai logs" ON public.ai_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4) District-aware crop access for agents
ALTER TABLE public.crops ADD COLUMN IF NOT EXISTS district TEXT;

-- Backfill crop district from farmland and profile data where possible
UPDATE public.crops c
SET district = COALESCE(c.district, f.district)
FROM public.farmlands f
WHERE c.land_id = f.id AND c.district IS NULL;

UPDATE public.crops c
SET district = COALESCE(c.district, p.district)
FROM public.profiles p
WHERE c.farmer_id = p.id AND c.district IS NULL;

-- Refresh crop policies for agent access
DROP POLICY IF EXISTS "Agents can view assigned farmer crops" ON public.crops;

CREATE POLICY "Agents can view district crops" ON public.crops
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.district IS NOT NULL
      AND p.district = crops.district
    )
  );

CREATE POLICY "Agents can mark crops ready in district" ON public.crops
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.district = crops.district
    )
  )
  WITH CHECK (
    status = 'ready'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.district = crops.district
    )
  );

-- 5) Storage bucket for visit photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('visit-photos', 'visit-photos', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Agents can upload visit photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'visit-photos'
    AND auth.role() = 'authenticated'
    AND owner = auth.uid()
  );

CREATE POLICY "Agents can view own visit photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'visit-photos'
    AND owner = auth.uid()
  );

CREATE POLICY "Agents can delete own visit photos" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'visit-photos'
    AND owner = auth.uid()
  );

-- 6) Default agent role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, district)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'phone',
    NEW.raw_user_meta_data ->> 'district'
  )
  ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'role', ''), 'agent')::app_role
  )
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Allow buyers to view crops that are ready or one_week status (available for purchase)
CREATE POLICY "Buyers can view available crops"
ON public.crops
FOR SELECT
USING (
  has_role(auth.uid(), 'buyer'::app_role) 
  AND status IN ('ready', 'one_week')
);

-- Allow logistics to view crops for transport context
CREATE POLICY "Logistics can view crops for transport context"
ON public.crops
FOR SELECT
USING (
  has_role(auth.uid(), 'logistics'::app_role)
);
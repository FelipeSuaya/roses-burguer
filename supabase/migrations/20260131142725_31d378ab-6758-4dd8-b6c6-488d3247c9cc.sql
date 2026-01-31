-- Add hora_programada column for scheduled orders
ALTER TABLE public.orders ADD COLUMN hora_programada TEXT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.orders.hora_programada IS 'Scheduled time for the order (e.g., "21:30"). NULL if not scheduled.';
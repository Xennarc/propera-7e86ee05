
-- Trigger: disable module access when membership is deactivated
CREATE OR REPLACE FUNCTION public.trg_deactivate_department_module_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF OLD.is_active = true AND NEW.is_active = false THEN
    UPDATE department_module_access
    SET enabled = false, updated_at = now()
    WHERE user_id = NEW.user_id
      AND department_id = NEW.department_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_membership_deactivate_modules
  AFTER UPDATE OF is_active ON public.department_memberships
  FOR EACH ROW
  WHEN (OLD.is_active = true AND NEW.is_active = false)
  EXECUTE FUNCTION public.trg_deactivate_department_module_access();

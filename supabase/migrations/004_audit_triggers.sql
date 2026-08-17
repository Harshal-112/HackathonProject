-- ==========================================================================
-- SDDS Migration 004: Server-Side Audit Triggers & Immutable Log Policies
-- Description: Server-side database triggers for automated, tamper-resistant audit logging.
-- ==========================================================================

-- 1. Automated Document Audit Trigger --------------------------------------
CREATE OR REPLACE FUNCTION public.trg_document_audit()
RETURNS trigger AS $$
DECLARE
  v_user_id   uuid;
  v_user_name text;
  v_user_role text;
BEGIN
  v_user_id := auth.uid();
  
  -- Get user identity from profiles
  IF v_user_id IS NOT NULL THEN
    SELECT name, role INTO v_user_name, v_user_role
    FROM public.profiles
    WHERE id = v_user_id;
  END IF;

  v_user_name := COALESCE(v_user_name, 'System');
  v_user_role := COALESCE(v_user_role, 'system');

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      user_id, user_name, user_role, action, description,
      document_id, document_title, timestamp
    ) VALUES (
      v_user_id, v_user_name, v_user_role, 'UPLOAD',
      'Uploaded document: ' || NEW.title || ' (' || COALESCE(NEW.document_number, 'Pending No.') || ')',
      NEW.id, NEW.title, now()
    );

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (
      user_id, user_name, user_role, action, description,
      document_id, document_title, timestamp
    ) VALUES (
      v_user_id, v_user_name, v_user_role, 'DELETE',
      'Deleted document: ' || OLD.title || ' (' || COALESCE(OLD.document_number, 'N/A') || ')',
      OLD.id, OLD.title, now()
    );

  ELSIF TG_OP = 'UPDATE' THEN
    -- If status changed outside the RPC function, record it
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.audit_logs (
        user_id, user_name, user_role, action, description,
        document_id, document_title, timestamp
      ) VALUES (
        v_user_id, v_user_name, v_user_role, 'STATUS_CHANGE',
        'Status changed from ' || OLD.status || ' to ' || NEW.status || ' for document: ' || NEW.title,
        NEW.id, NEW.title, now()
      );
    END IF;

    -- If assigned verifier changed
    IF OLD.assigned_verifier_id IS DISTINCT FROM NEW.assigned_verifier_id THEN
      INSERT INTO public.audit_logs (
        user_id, user_name, user_role, action, description,
        document_id, document_title, timestamp
      ) VALUES (
        v_user_id, v_user_name, v_user_role, 'ASSIGN',
        'Assigned verifier updated to ' || COALESCE(NEW.assigned_verifier_name, 'Unassigned') || ' for document: ' || NEW.title,
        NEW.id, NEW.title, now()
      );
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS document_audit_trigger ON public.documents;
CREATE TRIGGER document_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.trg_document_audit();

-- 2. Automated Profile / Suspension Audit Trigger ---------------------------
CREATE OR REPLACE FUNCTION public.trg_profile_audit()
RETURNS trigger AS $$
DECLARE
  v_admin_id   uuid;
  v_admin_name text;
BEGIN
  v_admin_id := auth.uid();
  IF v_admin_id IS NOT NULL THEN
    SELECT name INTO v_admin_name FROM public.profiles WHERE id = v_admin_id;
  END IF;
  v_admin_name := COALESCE(v_admin_name, 'Admin/System');

  IF TG_OP = 'UPDATE' THEN
    -- Status change (e.g. suspension)
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.audit_logs (
        user_id, user_name, user_role, action, description, timestamp
      ) VALUES (
        v_admin_id, v_admin_name, 'admin',
        CASE WHEN NEW.status = 'inactive' THEN 'SUSPEND' ELSE 'STATUS_UPDATE' END,
        'User ' || NEW.name || ' status changed from ' || OLD.status || ' to ' || NEW.status,
        now()
      );
    END IF;

    -- Role change
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      INSERT INTO public.audit_logs (
        user_id, user_name, user_role, action, description, timestamp
      ) VALUES (
        v_admin_id, v_admin_name, 'admin', 'ROLE_CHANGE',
        'User ' || NEW.name || ' role changed from ' || OLD.role || ' to ' || NEW.role,
        now()
      );
    END IF;

    -- Department assignment change
    IF OLD.department IS DISTINCT FROM NEW.department THEN
      INSERT INTO public.audit_logs (
        user_id, user_name, user_role, action, description, timestamp
      ) VALUES (
        v_admin_id, v_admin_name, 'admin', 'DEPARTMENT_CHANGE',
        'User ' || NEW.name || ' assigned department changed from ' || COALESCE(OLD.department, 'none') || ' to ' || NEW.department,
        now()
      );
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS profile_audit_trigger ON public.profiles;
CREATE TRIGGER profile_audit_trigger
AFTER UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.trg_profile_audit();

-- 3. Immutable RLS Policies on Audit Logs ----------------------------------
-- Staff can view audit logs
DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_select_policy"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    ( SELECT role FROM public.profiles WHERE id = auth.uid() ) IN ('admin', 'officer', 'verifier')
  );

-- Authenticated users / triggers can insert custom log entries
DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_policy"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- NO UPDATE policy exists on audit_logs -> Logs are immutable
-- NO DELETE policy exists on audit_logs -> Logs cannot be deleted by standard users

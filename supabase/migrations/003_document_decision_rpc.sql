-- ==========================================================================
-- SDDS Migration 003: Controlled Document Decision RPC
-- Description: Server-side atomic function for verifier approval/rejection/changes actions.
-- ==========================================================================

CREATE OR REPLACE FUNCTION public.process_document_decision(
  p_document_id  uuid,
  p_decision     text,   -- 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES'
  p_remarks      text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id     uuid;
  v_caller_role   text;
  v_caller_status text;
  v_caller_dept   text;
  v_caller_name   text;
  v_doc           documents%ROWTYPE;
  v_new_status    text;
  v_action_label  text;
  v_approval_entry jsonb;
  v_updated_approvals jsonb;
BEGIN
  -- 1. Identify and authenticate caller ------------------------------------
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User is not authenticated';
  END IF;

  SELECT role, status, department, name
  INTO   v_caller_role, v_caller_status, v_caller_dept, v_caller_name
  FROM   profiles
  WHERE  id = v_caller_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized: Profile not found for user %', v_caller_id;
  END IF;

  -- 2. Verify Role & Account Status ----------------------------------------
  IF v_caller_role != 'verifier' THEN
    RAISE EXCEPTION 'Forbidden: Only active verifiers can process document decisions (your role: %)', v_caller_role;
  END IF;

  IF v_caller_status != 'active' THEN
    RAISE EXCEPTION 'Forbidden: Your verifier account is not active (current status: %)', v_caller_status;
  END IF;

  -- 3. Validate Decision Action --------------------------------------------
  IF p_decision NOT IN ('APPROVE', 'REJECT', 'REQUEST_CHANGES') THEN
    RAISE EXCEPTION 'Invalid decision "%". Allowed values: APPROVE, REJECT, REQUEST_CHANGES', p_decision;
  END IF;

  -- 4. Lock document row for atomic verification (FOR UPDATE) --------------
  SELECT * INTO v_doc
  FROM   documents
  WHERE  id = p_document_id
  FOR    UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document % not found', p_document_id;
  END IF;

  -- 5. Strict Document-Level Authorization Checks --------------------------
  IF v_doc.assigned_verifier_id IS NULL THEN
    RAISE EXCEPTION 'Forbidden: This document has not been assigned to any verifier yet';
  END IF;

  -- Authority strictly follows the *current* assigned_verifier_id
  IF v_doc.assigned_verifier_id != v_caller_id THEN
    RAISE EXCEPTION 'Forbidden: You are not the currently assigned verifier for this document';
  END IF;

  IF v_doc.department != v_caller_dept THEN
    RAISE EXCEPTION 'Forbidden: Document department (%) does not match your assigned department (%)',
      v_doc.department, v_caller_dept;
  END IF;

  IF v_doc.status NOT IN ('pending', 're_verification') THEN
    RAISE EXCEPTION 'Invalid document state: Cannot review document with status "%"', v_doc.status;
  END IF;

  -- 6. Map decision to status ----------------------------------------------
  CASE p_decision
    WHEN 'APPROVE'          THEN v_new_status := 'approved';         v_action_label := 'approved';
    WHEN 'REJECT'           THEN v_new_status := 'rejected';         v_action_label := 'rejected';
    WHEN 'REQUEST_CHANGES'  THEN v_new_status := 'changes';          v_action_label := 'changes_requested';
  END CASE;

  -- 7. Construct immutable approval history record -------------------------
  v_approval_entry := jsonb_build_object(
    'id',        'appr_' || gen_random_uuid()::text,
    'action',    v_action_label,
    'userId',    v_caller_id::text,
    'userName',  v_caller_name,
    'comment',   COALESCE(p_remarks, p_decision),
    'timestamp', now()::text
  );

  v_updated_approvals := COALESCE(v_doc.approvals, '[]'::jsonb) || v_approval_entry;

  -- 8. Atomic Update: ONLY decision fields (no arbitrary metadata tampering)
  UPDATE documents
  SET
    status     = v_new_status,
    approvals  = v_updated_approvals,
    updated_at = now()
  WHERE id = p_document_id;

  -- 9. Server-Side Audit Log Entry -----------------------------------------
  INSERT INTO audit_logs (
    user_id, user_name, user_role,
    action, description,
    document_id, document_title,
    user_agent, timestamp
  ) VALUES (
    v_caller_id, v_caller_name, v_caller_role,
    p_decision,
    v_caller_name || ' ' || lower(replace(p_decision, '_', ' ')) || 'd document: ' || v_doc.title,
    p_document_id, v_doc.title,
    'server-rpc/process_document_decision', now()
  );

  RETURN jsonb_build_object(
    'success',    true,
    'documentId', p_document_id,
    'decision',   p_decision,
    'newStatus',  v_new_status
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$$;

-- Grant EXECUTE to authenticated users only
REVOKE ALL ON FUNCTION public.process_document_decision(uuid, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_document_decision(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.process_document_decision(uuid, text, text) TO authenticated;

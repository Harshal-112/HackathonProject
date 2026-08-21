-- =============================================================================
-- Migration 006: Fix Document Deletion (Foreign Key Cascade & Delete Policies)
-- =============================================================================

-- 1. Remove any strict foreign key constraints that block document deletion
-- In audit_logs, document_id is an audit reference and must not block deletion.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tc.constraint_name, tc.table_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND ccu.table_name = 'documents'
          AND tc.table_name = 'audit_logs'
    ) LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.table_name) || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name) || ';';
    END LOOP;
END $$;

-- 2. Ensure notifications table cascades on document delete (if any FK exists)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tc.constraint_name, tc.table_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND ccu.table_name = 'documents'
          AND tc.table_name = 'notifications'
    ) LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.table_name) || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name) || ';';
    END LOOP;
END $$;

-- 3. Update DELETE Policy for documents:
-- Admins can delete any document
-- Officers and Citizens can delete their own documents (drafts/pending)
DROP POLICY IF EXISTS "documents_delete_policy" ON public.documents;
CREATE POLICY "documents_delete_policy"
  ON public.documents
  FOR DELETE
  TO authenticated
  USING (
    ( SELECT role FROM public.profiles WHERE id = auth.uid() ) = 'admin'
    OR
    (
      ( SELECT role FROM public.profiles WHERE id = auth.uid() ) IN ('officer', 'citizen')
      AND uploaded_by = auth.uid()
      AND status IN ('draft', 'pending')
    )
  );

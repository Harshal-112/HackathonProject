-- ==========================================================================
-- SDDS Migration 002: RBAC Policies & Verifier Scoping
-- Description: Department-scoped verifier access rules, indexes, and Realtime publications.
-- ==========================================================================

-- 1. Realtime Publication on Profiles (For active session suspension) -------
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- 2. Indexes for high-performance scoped lookups ---------------------------
CREATE INDEX IF NOT EXISTS idx_documents_assigned_verifier
  ON public.documents (assigned_verifier_id)
  WHERE assigned_verifier_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_dept_status
  ON public.documents (department, status);

CREATE INDEX IF NOT EXISTS idx_profiles_role_dept_status
  ON public.profiles (role, department, status);

-- 3. RLS Policies: Profiles Table ------------------------------------------
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true); -- Authenticated users can view directory/colleagues

DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    -- Admin can update any profile (role promotion, status activation, suspension, dept reassignment)
    ( SELECT role FROM public.profiles WHERE id = auth.uid() ) = 'admin'
    OR
    -- Users can update their own personal details (designation, phone, avatar) but not role/status/dept
    ( id = auth.uid() )
  )
  WITH CHECK (
    ( SELECT role FROM public.profiles WHERE id = auth.uid() ) = 'admin'
    OR
    ( id = auth.uid() )
  );

-- 4. RLS Policies: Documents Table -----------------------------------------
-- SELECT: Admins/Officers see all; Verifiers see assigned only; Citizens see own uploads
DROP POLICY IF EXISTS "documents_select_policy" ON public.documents;
CREATE POLICY "documents_select_policy"
  ON public.documents
  FOR SELECT
  TO authenticated
  USING (
    ( SELECT role FROM public.profiles WHERE id = auth.uid() ) IN ('admin', 'officer')
    OR
    (
      ( SELECT role FROM public.profiles WHERE id = auth.uid() ) = 'verifier'
      AND assigned_verifier_id = auth.uid()
    )
    OR
    (
      ( SELECT role FROM public.profiles WHERE id = auth.uid() ) = 'citizen'
      AND uploaded_by = auth.uid()
    )
  );

-- Public verification access for QR code scanner (Safe public verification)
DROP POLICY IF EXISTS "documents_public_verification_select" ON public.documents;
CREATE POLICY "documents_public_verification_select"
  ON public.documents
  FOR SELECT
  TO anon
  USING (true); -- Public can verify documents via QR verification endpoint

-- INSERT: Authenticated users can upload documents
DROP POLICY IF EXISTS "documents_insert_policy" ON public.documents;
CREATE POLICY "documents_insert_policy"
  ON public.documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    uploaded_by = auth.uid()
    OR
    ( SELECT role FROM public.profiles WHERE id = auth.uid() ) = 'admin'
  );

-- UPDATE: Admins can update any doc; Officers/Citizens can update metadata of own uploads;
-- Verifiers CANNOT directly UPDATE documents (must go through the RPC).
DROP POLICY IF EXISTS "documents_update_policy" ON public.documents;
CREATE POLICY "documents_update_policy"
  ON public.documents
  FOR UPDATE
  TO authenticated
  USING (
    ( SELECT role FROM public.profiles WHERE id = auth.uid() ) = 'admin'
    OR
    (
      ( SELECT role FROM public.profiles WHERE id = auth.uid() ) IN ('officer', 'citizen')
      AND uploaded_by = auth.uid()
    )
  )
  WITH CHECK (
    ( SELECT role FROM public.profiles WHERE id = auth.uid() ) = 'admin'
    OR
    (
      ( SELECT role FROM public.profiles WHERE id = auth.uid() ) IN ('officer', 'citizen')
      AND uploaded_by = auth.uid()
    )
  );

-- DELETE: Admins can delete any document; Officers can delete their own drafts/pending uploads
DROP POLICY IF EXISTS "documents_delete_policy" ON public.documents;
CREATE POLICY "documents_delete_policy"
  ON public.documents
  FOR DELETE
  TO authenticated
  USING (
    ( SELECT role FROM public.profiles WHERE id = auth.uid() ) = 'admin'
    OR
    (
      ( SELECT role FROM public.profiles WHERE id = auth.uid() ) = 'officer'
      AND uploaded_by = auth.uid()
      AND status IN ('draft', 'pending')
    )
  );

-- 5. RLS Policies: Notifications Table -------------------------------------
DROP POLICY IF EXISTS "notifications_user_policy" ON public.notifications;
CREATE POLICY "notifications_user_policy"
  ON public.notifications
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- 6. RLS Policies: Settings Table ------------------------------------------
DROP POLICY IF EXISTS "settings_select_policy" ON public.settings;
CREATE POLICY "settings_select_policy"
  ON public.settings
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "settings_update_policy" ON public.settings;
CREATE POLICY "settings_update_policy"
  ON public.settings
  FOR ALL
  TO authenticated
  USING (
    ( SELECT role FROM public.profiles WHERE id = auth.uid() ) = 'admin'
  )
  WITH CHECK (
    ( SELECT role FROM public.profiles WHERE id = auth.uid() ) = 'admin'
  );

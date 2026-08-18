-- =============================================================================
-- Migration 005: Security, RLS Tightening, Storage & Server-Side Validation
-- =============================================================================

-- 1. Tighten profiles table RLS (Prevent citizens from scraping staff PII)
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;

-- Citizen can only view their own profile
CREATE POLICY "profiles_select_self"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Staff (Admin, Officer) can view all profiles for management & workflow
CREATE POLICY "profiles_select_staff"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'officer')
);

-- Verifiers can view colleagues in their own department + Admins
CREATE POLICY "profiles_select_verifier_dept"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'verifier'
  AND (
    department = (SELECT department FROM public.profiles WHERE id = auth.uid())
    OR role = 'admin'
  )
);

-- 2. Restrict public verification on documents table
-- Remove direct table access for anon users
DROP POLICY IF EXISTS "documents_public_verification_select" ON public.documents;

-- Create a secure PostgreSQL function for public QR verification
-- Exposes ONLY non-sensitive metadata, preventing raw OCR / PII / internal remarks leak
CREATE OR REPLACE FUNCTION public.get_public_document_verification(p_document_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  status text,
  document_number text,
  department text,
  category text,
  created_at timestamptz,
  updated_at timestamptz,
  is_authentic boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.title,
    d.status,
    d.document_number,
    d.department,
    d.category,
    d.created_at,
    d.updated_at,
    (d.status = 'approved') AS is_authentic
  FROM public.documents d
  WHERE d.id = p_document_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_document_verification(uuid) TO anon, authenticated;

-- Create public view for QR verification queries
CREATE OR REPLACE VIEW public.public_document_verifications AS
SELECT 
  d.id,
  d.title,
  d.status,
  d.document_number,
  d.department,
  d.category,
  d.created_at,
  d.updated_at,
  (d.status = 'approved') AS is_authentic
FROM public.documents d;

GRANT SELECT ON public.public_document_verifications TO anon, authenticated;

-- 3. Add file_url column and server-side upload validation constraints
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS file_url text;

-- Add server-side file size and format constraints (if not already existing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_document_file_size'
  ) THEN
    ALTER TABLE public.documents 
    ADD CONSTRAINT check_document_file_size 
    CHECK (file_size IS NULL OR (file_size > 0 AND file_size <= 10485760));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_document_file_type'
  ) THEN
    ALTER TABLE public.documents 
    ADD CONSTRAINT check_document_file_type 
    CHECK (file_type IS NULL OR file_type IN ('pdf', 'jpg', 'jpeg', 'png', 'docx', 'webp'));
  END IF;
END $$;

-- 4. Supabase Storage bucket setup (for persistent original document files)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for document uploads
CREATE POLICY "Authenticated users can upload original documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Users can view uploaded documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

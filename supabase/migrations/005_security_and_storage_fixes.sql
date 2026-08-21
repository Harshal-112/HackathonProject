-- =============================================================================
-- Migration 005: Security, RLS Tightening, Private Storage & Server-Side Validation
-- =============================================================================

-- 1. Tighten profiles table RLS (Prevent citizens from scraping staff PII)
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_staff" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_verifier_dept" ON public.profiles;

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

-- 4. Supabase Storage bucket setup (Private bucket with Role-Based Access Control)
-- Bucket is private (public = false) so files cannot be viewed via direct URLs
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Clean up old storage policies if existing
DROP POLICY IF EXISTS "Authenticated users can upload original documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view uploaded documents" ON storage.objects;
DROP POLICY IF EXISTS "storage_documents_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_documents_admin_select" ON storage.objects;
DROP POLICY IF EXISTS "storage_documents_verifier_select" ON storage.objects;
DROP POLICY IF EXISTS "storage_documents_owner_select" ON storage.objects;

-- Policy 1: Authenticated users can upload to the documents bucket
CREATE POLICY "storage_documents_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- Policy 2: Admin can view/download ALL document files
CREATE POLICY "storage_documents_admin_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Policy 3: Verifier can only view/download documents belonging to their department
-- Path convention: {department}/{uploader_id}/{filename}
CREATE POLICY "storage_documents_verifier_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'verifier'
  AND (
    (storage.foldername(name))[1] = (SELECT department FROM public.profiles WHERE id = auth.uid())
    OR (storage.foldername(name))[1] = 'general'
  )
);

-- Policy 4: Citizens and Officers can ONLY view/download their own uploaded documents
CREATE POLICY "storage_documents_owner_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    owner = auth.uid()
    OR (storage.foldername(name))[2] = auth.uid()::text
  )
);

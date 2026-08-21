-- =============================================================================
-- Migration 006: Make documents storage bucket private + tighten RLS
-- =============================================================================
--
-- Problem: 005_security_and_storage_fixes.sql created the 'documents' bucket
-- with `public = true`, meaning any file URL could be opened without auth —
-- exposing Aadhaar/PAN scans publicly.
--
-- Fix:
--   1. Flip the bucket to private (public = false).
--      We UPDATE rather than DROP/INSERT so existing stored objects are untouched.
--   2. Tighten the SELECT policy on storage.objects so only the file owner,
--      officers, and admins can generate signed URLs for a file.
--   3. The INSERT (upload) policy from 005 is preserved as-is.
-- =============================================================================

-- 1. Make the documents bucket private
UPDATE storage.buckets
SET    public = false
WHERE  id = 'documents';

-- 2. Drop the overly-permissive SELECT policy added in 005
--    (it allowed ANY authenticated user to read ANY file in the bucket)
DROP POLICY IF EXISTS "Users can view uploaded documents" ON storage.objects;

-- 3. Replace with a narrower policy:
--    - The uploading user can read their own files   (path starts with their user-id/)
--    - Admins and officers can read any file in the bucket
CREATE POLICY "Document owners, officers and admins can access files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    -- File belongs to the requesting user (path prefix = user-id)
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- User is an officer or admin
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('officer', 'admin')
  )
);

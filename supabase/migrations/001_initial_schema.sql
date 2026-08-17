-- ==========================================================================
-- SDDS Migration 001: Initial Schema & Sequences
-- Description: Core tables, sequences, document numbering generator, and RLS enablement.
-- ==========================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Document Numbering Sequence & Generator --------------------------------
CREATE SEQUENCE IF NOT EXISTS public.document_number_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.generate_document_number(p_department text)
RETURNS text AS $$
DECLARE
  v_dept_code text;
  v_seq bigint;
  v_year text;
BEGIN
  v_year := to_char(now(), 'YYYY');
  v_seq := nextval('public.document_number_seq');

  CASE lower(COALESCE(p_department, 'gen'))
    WHEN 'revenue'   THEN v_dept_code := 'REV';
    WHEN 'rto'       THEN v_dept_code := 'RTO';
    WHEN 'municipal' THEN v_dept_code := 'MUN';
    WHEN 'panchayat' THEN v_dept_code := 'PAN';
    WHEN 'collector' THEN v_dept_code := 'COL';
    WHEN 'health'    THEN v_dept_code := 'HLT';
    WHEN 'education' THEN v_dept_code := 'EDU';
    WHEN 'agri'      THEN v_dept_code := 'AGR';
    ELSE                  v_dept_code := 'GEN';
  END CASE;

  RETURN 'SDDS-' || v_dept_code || '-' || v_year || '-' || lpad(v_seq::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- 2. Profiles Table --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  email       text NOT NULL,
  role        text NOT NULL DEFAULT 'citizen' CHECK (role IN ('admin', 'officer', 'verifier', 'citizen')),
  department  text DEFAULT 'panchayat',
  designation text,
  phone       text,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'inactive', 'pending')),
  avatar      text,
  created_at  timestamptz DEFAULT now(),
  last_login  timestamptz
);

-- 3. Documents Table -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title                   text NOT NULL,
  file_name               text NOT NULL,
  file_type               text NOT NULL,
  file_size               bigint NOT NULL DEFAULT 0,
  category                text,
  department              text NOT NULL,
  priority                text,
  status                  text NOT NULL DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'changes', 're_verification', 'archived')),
  uploaded_by             uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploaded_by_name        text,
  document_number         text UNIQUE,
  page_count              int DEFAULT 1,
  language                text DEFAULT 'English',
  ocr_text                text,
  ocr_confidence          numeric,
  metadata                jsonb DEFAULT '{}'::jsonb,
  versions                jsonb DEFAULT '[]'::jsonb,
  approvals               jsonb DEFAULT '[]'::jsonb,
  assigned_verifier_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_verifier_name  text,
  assigned_at             timestamptz,
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

-- Auto-generate document_number if not provided on INSERT
CREATE OR REPLACE FUNCTION public.trg_set_document_number()
RETURNS trigger AS $$
BEGIN
  IF NEW.document_number IS NULL OR NEW.document_number = '' THEN
    NEW.document_number := public.generate_document_number(NEW.department);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_document_number_trigger ON public.documents;
CREATE TRIGGER set_document_number_trigger
BEFORE INSERT ON public.documents
FOR EACH ROW
EXECUTE FUNCTION public.trg_set_document_number();

-- 4. Audit Logs Table ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name      text DEFAULT 'System',
  user_role      text DEFAULT 'system',
  action         text NOT NULL,
  description    text NOT NULL,
  document_id    uuid,
  document_title text,
  ip_address     text,
  user_agent     text,
  timestamp      timestamptz DEFAULT now()
);

-- 5. Notifications Table ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type       text NOT NULL,
  title      text NOT NULL,
  message    text NOT NULL,
  read       boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 6. Settings Table --------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.settings (
  id         int PRIMARY KEY DEFAULT 1,
  data       jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

-- Insert default settings row if empty
INSERT INTO public.settings (id, data)
VALUES (1, '{
  "ai": { "autoClassify": true, "autoSummarize": true, "autoTag": true, "confidenceThreshold": 75, "xaiEnabled": true, "xaiVerbosity": "detailed" },
  "ocr": { "language": "eng+mar+hin", "autoRun": true, "enhanceImage": true, "extractTables": true },
  "notifications": { "approvals": true, "uploads": true, "system": true, "email": false },
  "privacy": { "localOnly": false, "piiMasking": { "aadhaar": true, "pan": true, "phone": true, "email": true, "gst": true }, "dataRetention": "90 days", "auditLog": true }
}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 7. Enable Row Level Security (RLS) on all tables -------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

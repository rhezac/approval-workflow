-- =============================================================================
-- SCRIPT 01: CREATE DATABASE
-- =============================================================================

-- 1. Create database approval_workflow_db
-- Menggunakan default template / collation bawaan PostgreSQL sistem Anda
CREATE DATABASE approval_workflow_db
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8';

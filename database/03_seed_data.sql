-- =============================================================================
-- SCRIPT 03: SEED INITIAL DATA (USERS & DEFAULT APPROVAL WORKFLOW)
-- Password untuk semua akun default: Admin@123
-- Hash Bcrypt: $2a$10$DElxzmXOE9CWeQbw8btfruTdjMXrnWPJsKLripmXoOIxhZHC697h.
-- =============================================================================

-- 1. Insert Initial Users
INSERT INTO "public"."users" ("id", "username", "fullName", "password", "division", "role", "isActive") VALUES
    ('a0000000-0000-0000-0000-000000000001', 'admin', 'Administrator IT', '$2a$10$DElxzmXOE9CWeQbw8btfruTdjMXrnWPJsKLripmXoOIxhZHC697h.', 'IT', 'Admin', true),
    ('a0000000-0000-0000-0000-000000000002', 'direktur', 'Bambang Direktur Utama', '$2a$10$DElxzmXOE9CWeQbw8btfruTdjMXrnWPJsKLripmXoOIxhZHC697h.', 'Business', 'Direktur', true),
    ('a0000000-0000-0000-0000-000000000003', 'manager_it', 'Irwan Manager IT', '$2a$10$DElxzmXOE9CWeQbw8btfruTdjMXrnWPJsKLripmXoOIxhZHC697h.', 'IT', 'Manager', true),
    ('a0000000-0000-0000-0000-000000000004', 'manager_fin', 'Farida Manager Finance', '$2a$10$DElxzmXOE9CWeQbw8btfruTdjMXrnWPJsKLripmXoOIxhZHC697h.', 'Finance', 'Manager', true),
    ('a0000000-0000-0000-0000-000000000005', 'manager_biz', 'Budi Manager Business', '$2a$10$DElxzmXOE9CWeQbw8btfruTdjMXrnWPJsKLripmXoOIxhZHC697h.', 'Business', 'Manager', true),
    ('a0000000-0000-0000-0000-000000000006', 'staff_it', 'Surya Staff IT', '$2a$10$DElxzmXOE9CWeQbw8btfruTdjMXrnWPJsKLripmXoOIxhZHC697h.', 'IT', 'Staff', true),
    ('a0000000-0000-0000-0000-000000000007', 'staff_fin', 'Siti Staff Finance', '$2a$10$DElxzmXOE9CWeQbw8btfruTdjMXrnWPJsKLripmXoOIxhZHC697h.', 'Finance', 'Staff', true),
    ('a0000000-0000-0000-0000-000000000008', 'staff_biz', 'Bayu Staff Business', '$2a$10$DElxzmXOE9CWeQbw8btfruTdjMXrnWPJsKLripmXoOIxhZHC697h.', 'Business', 'Staff', true)
ON CONFLICT ("username") DO UPDATE SET "fullName" = EXCLUDED."fullName";

-- 2. Insert Default Multi-Level Approval Workflow
INSERT INTO "public"."approval_workflows" ("id", "name", "description", "version", "isActive", "steps", "created_by_id") VALUES
    (
        'b0000000-0000-0000-0000-000000000001',
        'Standard Corporate Multi-Level (Staff -> Manager -> Direktur)',
        'Standard multi-step approval workflow with department isolation and director sign-off',
        1,
        true,
        '[
            {
                "stepOrder": 1,
                "name": "Manager Approval (Division)",
                "roleRequired": "Manager",
                "divisionRequired": "SAME_AS_REQUESTER",
                "logic": "ANY"
            },
            {
                "stepOrder": 2,
                "name": "Board / Direktur Approval",
                "roleRequired": "Direktur",
                "divisionRequired": "ANY",
                "logic": "ANY"
            }
        ]'::jsonb,
        'a0000000-0000-0000-0000-000000000001'
    )
ON CONFLICT ("id") DO NOTHING;

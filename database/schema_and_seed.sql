-- =============================================================================
-- ALL-IN-ONE INITIALIZATION SCRIPT FOR APPROVAL WORKFLOW DATABASE
-- Jalankan file ini langsung di database 'approval_workflow_db'
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUMS
DO $$ BEGIN
    CREATE TYPE "public"."users_division_enum" AS ENUM('IT', 'Finance', 'Business', 'Operation', 'HR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."users_role_enum" AS ENUM('Admin', 'Direktur', 'Head of Division', 'Manager', 'Leader', 'Staff');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."tasks_priority_enum" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."tasks_status_enum" AS ENUM('pending', 'in progress', 'approved', 'rejected', 'canceled', 'revision');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."tasks_division_enum" AS ENUM('IT', 'Finance', 'Business', 'Operation', 'HR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."task_histories_action_enum" AS ENUM('CREATED', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED', 'REVISION_SUBMITTED', 'DELEGATED', 'REASSIGNED', 'CANCELED', 'UPDATED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- TABLES
CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "username" character varying(100) NOT NULL,
    "fullName" character varying(150),
    "password" character varying NOT NULL,
    "division" "public"."users_division_enum" NOT NULL DEFAULT 'IT',
    "role" "public"."users_role_enum" NOT NULL DEFAULT 'Staff',
    "isActive" boolean NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT "UQ_users_username" UNIQUE ("username"),
    CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "public"."approval_workflows" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "name" character varying(150) NOT NULL,
    "description" text,
    "version" integer NOT NULL DEFAULT 1,
    "isActive" boolean NOT NULL DEFAULT true,
    "steps" jsonb NOT NULL,
    "created_by_id" uuid,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT "PK_approval_workflows_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_approval_workflows_user" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "title" character varying(255) NOT NULL,
    "description" text NOT NULL,
    "priority" "public"."tasks_priority_enum" NOT NULL DEFAULT 'MEDIUM',
    "status" "public"."tasks_status_enum" NOT NULL DEFAULT 'pending',
    "division" "public"."tasks_division_enum" NOT NULL,
    "workflowVersion" integer NOT NULL DEFAULT 1,
    "snapshotWorkflowSteps" jsonb,
    "currentStepOrder" integer NOT NULL DEFAULT 1,
    "notes" text,
    "attachments" jsonb DEFAULT '[]'::jsonb,
    "creator_id" uuid,
    "workflow_id" uuid,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT "PK_tasks_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_tasks_creator" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "FK_tasks_workflow" FOREIGN KEY ("workflow_id") REFERENCES "public"."approval_workflows"("id") ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "public"."task_approvals" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "stepOrder" integer NOT NULL,
    "stepName" character varying(100) NOT NULL,
    "action" "public"."task_approvals_action_enum" NOT NULL DEFAULT 'PENDING',
    "notes" text,
    "actionAt" TIMESTAMP WITH TIME ZONE,
    "isDelegated" boolean NOT NULL DEFAULT false,
    "isReassigned" boolean NOT NULL DEFAULT false,
    "task_id" uuid,
    "assigned_approver_id" uuid,
    "actual_approver_id" uuid,
    "delegated_by_id" uuid,
    "reassigned_by_id" uuid,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT "PK_task_approvals_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_task_approvals_task" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "FK_task_approvals_assigned" FOREIGN KEY ("assigned_approver_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT "FK_task_approvals_actual" FOREIGN KEY ("actual_approver_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT "FK_task_approvals_delegated_by" FOREIGN KEY ("delegated_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT "FK_task_approvals_reassigned_by" FOREIGN KEY ("reassigned_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "public"."task_histories" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "action" "public"."task_histories_action_enum" NOT NULL,
    "stepOrder" integer,
    "stepName" character varying(150),
    "notes" text,
    "task_id" uuid,
    "actor_id" uuid,
    "target_user_id" uuid,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT "PK_task_histories_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_task_histories_task" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "FK_task_histories_actor" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION,
    CONSTRAINT "FK_task_histories_target" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE TABLE IF NOT EXISTS "public"."approval_delegations" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "startDate" date NOT NULL,
    "endDate" date NOT NULL,
    "reason" text,
    "isActive" boolean NOT NULL DEFAULT true,
    "delegator_id" uuid,
    "delegatee_id" uuid,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT "PK_approval_delegations_id" PRIMARY KEY ("id"),
    CONSTRAINT "FK_approval_delegations_delegator" FOREIGN KEY ("delegator_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "FK_approval_delegations_delegatee" FOREIGN KEY ("delegatee_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
);

-- SEED DATA
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

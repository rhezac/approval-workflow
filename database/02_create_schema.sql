-- =============================================================================
-- SCRIPT 02: CREATE ENUMS, TABLES & CONSTRAINTS
-- Jalankan script ini di dalam database 'approval_workflow_db'
-- =============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Custom ENUM Types
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

-- -----------------------------------------------------------------------------
-- Table: users
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- Table: approval_workflows
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- Table: tasks
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- Table: task_approvals
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- Table: approval_delegations
-- -----------------------------------------------------------------------------
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

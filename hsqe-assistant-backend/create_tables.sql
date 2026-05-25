-- SQL script to create or update tables for Certificate, Contact, Inspection, Task, and InspectionReport entities

-- Certificate Entity
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'certificate_entity') THEN
        CREATE TABLE certificate_entity (
            id SERIAL PRIMARY KEY,
            vessel VARCHAR(255) NOT NULL,
            code VARCHAR(255),
            certificate_type VARCHAR(255) NOT NULL,
            certificate_name VARCHAR(255) NOT NULL,
            from_date DATE,
            to_date DATE NOT NULL,
            notes TEXT
        );
    END IF;
    -- Add columns if missing
    ALTER TABLE certificate_entity ADD COLUMN IF NOT EXISTS id SERIAL PRIMARY KEY;
    ALTER TABLE certificate_entity ADD COLUMN IF NOT EXISTS vessel VARCHAR(255) NOT NULL;
    ALTER TABLE certificate_entity ADD COLUMN IF NOT EXISTS code VARCHAR(255);
    ALTER TABLE certificate_entity ADD COLUMN IF NOT EXISTS certificate_type VARCHAR(255) NOT NULL;
    ALTER TABLE certificate_entity ADD COLUMN IF NOT EXISTS certificate_name VARCHAR(255) NOT NULL;
    ALTER TABLE certificate_entity ADD COLUMN IF NOT EXISTS from_date DATE;
    ALTER TABLE certificate_entity ADD COLUMN IF NOT EXISTS to_date DATE NOT NULL;
    ALTER TABLE certificate_entity ADD COLUMN IF NOT EXISTS notes TEXT;
END $$;

-- Contact Entity
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contact_entity') THEN
        CREATE TABLE contact_entity (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            short_identifier VARCHAR(255),
            department VARCHAR(255),
            business_phone VARCHAR(255),
            personal_phone VARCHAR(255),
            extension VARCHAR(255)
        );
    END IF;
    ALTER TABLE contact_entity ADD COLUMN IF NOT EXISTS id SERIAL PRIMARY KEY;
    ALTER TABLE contact_entity ADD COLUMN IF NOT EXISTS name VARCHAR(255) NOT NULL;
    ALTER TABLE contact_entity ADD COLUMN IF NOT EXISTS short_identifier VARCHAR(255);
    ALTER TABLE contact_entity ADD COLUMN IF NOT EXISTS department VARCHAR(255);
    ALTER TABLE contact_entity ADD COLUMN IF NOT EXISTS business_phone VARCHAR(255);
    ALTER TABLE contact_entity ADD COLUMN IF NOT EXISTS personal_phone VARCHAR(255);
    ALTER TABLE contact_entity ADD COLUMN IF NOT EXISTS extension VARCHAR(255);
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contact_entity_assigned_vessels') THEN
        CREATE TABLE contact_entity_assigned_vessels (
            contact_entity_id BIGINT NOT NULL REFERENCES contact_entity(id) ON DELETE CASCADE,
            assigned_vessels VARCHAR(255)
        );
    END IF;
    ALTER TABLE contact_entity_assigned_vessels ADD COLUMN IF NOT EXISTS contact_entity_id BIGINT NOT NULL REFERENCES contact_entity(id) ON DELETE CASCADE;
    ALTER TABLE contact_entity_assigned_vessels ADD COLUMN IF NOT EXISTS assigned_vessels VARCHAR(255);
END $$;

-- Inspection Entity
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inspection_entity') THEN
        CREATE TABLE inspection_entity (
            id SERIAL PRIMARY KEY,
            inspection_date DATE,
            vessel VARCHAR(255) NOT NULL,
            inspection_type VARCHAR(255) NOT NULL,
            place_of_inspection VARCHAR(255),
            cpa VARCHAR(255),
            code VARCHAR(255),
            finding_type VARCHAR(255) NOT NULL,
            master VARCHAR(255),
            chief_engineer VARCHAR(255),
            description TEXT NOT NULL,
            corrective_action TEXT,
            preventive_action TEXT,
            notes TEXT,
            psc_authority VARCHAR(255),
            flag_state VARCHAR(255),
            inspector_name VARCHAR(255)
        );
    END IF;
    ALTER TABLE inspection_entity ADD COLUMN IF NOT EXISTS id SERIAL PRIMARY KEY;
    ALTER TABLE inspection_entity ADD COLUMN IF NOT EXISTS inspection_date DATE;
    ALTER TABLE inspection_entity ADD COLUMN IF NOT EXISTS vessel VARCHAR(255) NOT NULL;
    ALTER TABLE inspection_entity ADD COLUMN IF NOT EXISTS inspection_type VARCHAR(255) NOT NULL;
    ALTER TABLE inspection_entity ADD COLUMN IF NOT EXISTS place_of_inspection VARCHAR(255);
    ALTER TABLE inspection_entity ADD COLUMN IF NOT EXISTS cpa VARCHAR(255);
    ALTER TABLE inspection_entity ADD COLUMN IF NOT EXISTS code VARCHAR(255);
    ALTER TABLE inspection_entity ADD COLUMN IF NOT EXISTS finding_type VARCHAR(255) NOT NULL;
    ALTER TABLE inspection_entity ADD COLUMN IF NOT EXISTS master VARCHAR(255);
    ALTER TABLE inspection_entity ADD COLUMN IF NOT EXISTS chief_engineer VARCHAR(255);
    ALTER TABLE inspection_entity ADD COLUMN IF NOT EXISTS description TEXT NOT NULL;
    ALTER TABLE inspection_entity ADD COLUMN IF NOT EXISTS corrective_action TEXT;
    ALTER TABLE inspection_entity ADD COLUMN IF NOT EXISTS preventive_action TEXT;
    ALTER TABLE inspection_entity ADD COLUMN IF NOT EXISTS notes TEXT;
    ALTER TABLE inspection_entity ADD COLUMN IF NOT EXISTS psc_authority VARCHAR(255);
    ALTER TABLE inspection_entity ADD COLUMN IF NOT EXISTS flag_state VARCHAR(255);
    ALTER TABLE inspection_entity ADD COLUMN IF NOT EXISTS inspector_name VARCHAR(255);
END $$;

-- Task Entity
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_entity') THEN
        CREATE TABLE task_entity (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            add_to_my_day_switch BOOLEAN DEFAULT FALSE,
            important_switch BOOLEAN DEFAULT FALSE,
            vessel VARCHAR(255),
            assigned_to VARCHAR(255),
            due_date DATE,
            reminder TIMESTAMP,
            notes TEXT
        );
    END IF;
    ALTER TABLE task_entity ADD COLUMN IF NOT EXISTS id SERIAL PRIMARY KEY;
    ALTER TABLE task_entity ADD COLUMN IF NOT EXISTS title VARCHAR(255) NOT NULL;
    ALTER TABLE task_entity ADD COLUMN IF NOT EXISTS add_to_my_day_switch BOOLEAN DEFAULT FALSE;
    ALTER TABLE task_entity ADD COLUMN IF NOT EXISTS important_switch BOOLEAN DEFAULT FALSE;
    ALTER TABLE task_entity ADD COLUMN IF NOT EXISTS vessel VARCHAR(255);
    ALTER TABLE task_entity ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(255);
    ALTER TABLE task_entity ADD COLUMN IF NOT EXISTS due_date DATE;
    ALTER TABLE task_entity ADD COLUMN IF NOT EXISTS reminder TIMESTAMP;
    ALTER TABLE task_entity ADD COLUMN IF NOT EXISTS notes TEXT;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_entity_steps') THEN
        CREATE TABLE task_entity_steps (
            task_entity_id BIGINT NOT NULL REFERENCES task_entity(id) ON DELETE CASCADE,
            steps VARCHAR(255)
        );
    END IF;
    ALTER TABLE task_entity_steps ADD COLUMN IF NOT EXISTS task_entity_id BIGINT NOT NULL REFERENCES task_entity(id) ON DELETE CASCADE;
    ALTER TABLE task_entity_steps ADD COLUMN IF NOT EXISTS steps VARCHAR(255);
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'task_entity_attachments') THEN
        CREATE TABLE task_entity_attachments (
            task_entity_id BIGINT NOT NULL REFERENCES task_entity(id) ON DELETE CASCADE,
            attachments VARCHAR(255)
        );
    END IF;
    ALTER TABLE task_entity_attachments ADD COLUMN IF NOT EXISTS task_entity_id BIGINT NOT NULL REFERENCES task_entity(id) ON DELETE CASCADE;
    ALTER TABLE task_entity_attachments ADD COLUMN IF NOT EXISTS attachments VARCHAR(255);
END $$;

-- InspectionReportEntity
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inspection_report_entity') THEN
        CREATE TABLE inspection_report_entity (
            id SERIAL PRIMARY KEY,
            date DATE NOT NULL,
            vessel VARCHAR(255) NOT NULL,
            type_of_inspection VARCHAR(255) NOT NULL,
            place_of_inspection VARCHAR(255),
            notes TEXT,
            psc_authority VARCHAR(255),
            detention BOOLEAN DEFAULT FALSE,
            cost NUMERIC(12,2),
            flag_state VARCHAR(255),
            validity INTEGER,
            inspector_name VARCHAR(255)
        );
    END IF;
    ALTER TABLE inspection_report_entity ADD COLUMN IF NOT EXISTS id SERIAL PRIMARY KEY;
    ALTER TABLE inspection_report_entity ADD COLUMN IF NOT EXISTS date DATE NOT NULL;
    ALTER TABLE inspection_report_entity ADD COLUMN IF NOT EXISTS vessel VARCHAR(255) NOT NULL;
    ALTER TABLE inspection_report_entity ADD COLUMN IF NOT EXISTS type_of_inspection VARCHAR(255) NOT NULL;
    ALTER TABLE inspection_report_entity ADD COLUMN IF NOT EXISTS place_of_inspection VARCHAR(255);
    ALTER TABLE inspection_report_entity ADD COLUMN IF NOT EXISTS notes TEXT;
    ALTER TABLE inspection_report_entity ADD COLUMN IF NOT EXISTS psc_authority VARCHAR(255);
    ALTER TABLE inspection_report_entity ADD COLUMN IF NOT EXISTS detention BOOLEAN DEFAULT FALSE;
    ALTER TABLE inspection_report_entity ADD COLUMN IF NOT EXISTS cost NUMERIC(12,2);
    ALTER TABLE inspection_report_entity ADD COLUMN IF NOT EXISTS flag_state VARCHAR(255);
    ALTER TABLE inspection_report_entity ADD COLUMN IF NOT EXISTS validity INTEGER;
    ALTER TABLE inspection_report_entity ADD COLUMN IF NOT EXISTS inspector_name VARCHAR(255);
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inspection_report_entity_attachments') THEN
        CREATE TABLE inspection_report_entity_attachments (
            inspection_report_entity_id BIGINT NOT NULL REFERENCES inspection_report_entity(id) ON DELETE CASCADE,
            attachments VARCHAR(255)
        );
    END IF;
    ALTER TABLE inspection_report_entity_attachments ADD COLUMN IF NOT EXISTS inspection_report_entity_id BIGINT NOT NULL REFERENCES inspection_report_entity(id) ON DELETE CASCADE;
    ALTER TABLE inspection_report_entity_attachments ADD COLUMN IF NOT EXISTS attachments VARCHAR(255);
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inspection_report_entity_counts') THEN
        CREATE TABLE inspection_report_entity_counts (
            inspection_report_entity_id BIGINT NOT NULL REFERENCES inspection_report_entity(id) ON DELETE CASCADE,
            count_key VARCHAR(255),
            count_value INTEGER
        );
    END IF;
    ALTER TABLE inspection_report_entity_counts ADD COLUMN IF NOT EXISTS inspection_report_entity_id BIGINT NOT NULL REFERENCES inspection_report_entity(id) ON DELETE CASCADE;
    ALTER TABLE inspection_report_entity_counts ADD COLUMN IF NOT EXISTS count_key VARCHAR(255);
    ALTER TABLE inspection_report_entity_counts ADD COLUMN IF NOT EXISTS count_value INTEGER;
END $$;

-- Notes Entity
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notes_entity') THEN
        CREATE TABLE notes_entity (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255),
            notes TEXT,
            vessel VARCHAR(255),
            reminder DATE,
            pin BOOLEAN,
            color VARCHAR(255)
        );
    END IF;
    ALTER TABLE notes_entity ADD COLUMN IF NOT EXISTS id SERIAL PRIMARY KEY;
    ALTER TABLE notes_entity ADD COLUMN IF NOT EXISTS title VARCHAR(255);
    ALTER TABLE notes_entity ADD COLUMN IF NOT EXISTS notes TEXT;
    ALTER TABLE notes_entity ADD COLUMN IF NOT EXISTS vessel VARCHAR(255);
    ALTER TABLE notes_entity ADD COLUMN IF NOT EXISTS reminder DATE;
    ALTER TABLE notes_entity ADD COLUMN IF NOT EXISTS pin BOOLEAN;
    ALTER TABLE notes_entity ADD COLUMN IF NOT EXISTS color VARCHAR(255);
END $$;

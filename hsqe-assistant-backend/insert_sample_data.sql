-- Insert sample data into certificate_entity
INSERT INTO certificate_entity (vessel, code, certificate_type, certificate_name, from_date, to_date, notes)
VALUES ('Vessel A', 'CERT-001', 'Safety', 'Safety Certificate', '2026-01-01', '2027-01-01', 'Initial safety certificate.');

-- Insert sample data into contact_entity
INSERT INTO contact_entity (name, short_identifier, department, business_phone, personal_phone, extension)
VALUES ('John Doe', 'JD', 'Operations', '123-456-7890', '987-654-3210', '101');

-- Assign a vessel to the contact
INSERT INTO contact_entity_assigned_vessels (contact_entity_id, assigned_vessels)
VALUES (1, 'Vessel A');

-- Insert sample data into inspection_entity
INSERT INTO inspection_entity (inspection_date, vessel, inspection_type, place_of_inspection, cpa, code, finding_type, master, chief_engineer, description, corrective_action, preventive_action, notes)
VALUES ('2026-01-15', 'Vessel A', 'Annual', 'Port of Piraeus', 'CPA-001', 'INSP-001', 'Major', 'Captain Smith', 'Engineer Brown', 'Routine annual inspection.', 'Fixed fire extinguisher', 'Scheduled monthly checks', 'All good.');

-- Insert sample data into task_entity
INSERT INTO task_entity (title, add_to_my_day_switch, important_switch, vessel, assigned_to, due_date, reminder, notes)
VALUES ('Check Lifeboats', true, false, 'Vessel A', 'John Doe', '2026-02-01', '2026-01-31 09:00:00', 'Monthly safety check.');

-- Add steps to the task
INSERT INTO task_entity_steps (task_entity_id, steps)
VALUES (1, 'Inspect left lifeboat'),
       (1, 'Inspect right lifeboat');

-- Add attachments to the task
INSERT INTO task_entity_attachments (task_entity_id, attachments)
VALUES (1, 'lifeboat_photo1.png'),
       (1, 'lifeboat_photo2.png');

-- Insert sample data into inspection_report_entity
INSERT INTO inspection_report_entity (date, vessel, type_of_inspection, place_of_inspection, notes)
VALUES ('2026-01-20', 'Vessel A', 'Port State Control', 'Port of Rotterdam', 'PSC inspection report notes.');

-- Add attachments to the inspection report
INSERT INTO inspection_report_entity_attachments (inspection_report_entity_id, attachments)
VALUES (1, 'report_photo1.png'),
       (1, 'report_photo2.png');

-- Add counts to the inspection report (example: key-value pairs)
INSERT INTO inspection_report_entity_counts (inspection_report_entity_id, count_key, count_value)
VALUES (1, 'Fire Extinguishers', 5),
       (1, 'Lifeboats', 2);

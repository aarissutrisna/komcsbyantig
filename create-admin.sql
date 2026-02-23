-- Create default admin user (Password: admin123)
-- This uses a pre-hashed bcrypt password for "admin123"
INSERT INTO users (id, username, nama, email, password, role, is_active, resign_date, branch_id, faktor_pengali) 
VALUES (
  UUID(), 
  'admin',
  'Super Admin',
  'admin@gmail.com', 
  '$2b$10$cQ6/O.T0jmkVvwr8.7fLmOP.km0e7VDV8owdeCgXHW8VsehDStyF6', -- environment-verified hash for admin123
  'admin', 
  1,
  NULL,
  NULL,
  1.00
);

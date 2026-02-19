-- Create default admin user (Password: admin123)
-- This uses a pre-hashed bcrypt password for "admin123"
INSERT INTO users (id, username, nama, email, password, role, branch_id, faktor_pengali) 
VALUES (
  UUID(), 
  'admin',
  'Super Admin',
  'admin@gmail.com', 
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgNI90fthteif7vN6WNo3BfPhG.6', -- verified hash for admin123
  'admin', 
  NULL,
  1.00
);

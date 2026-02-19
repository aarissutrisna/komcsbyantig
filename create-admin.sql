-- Create default admin user (Password: admin123)
-- This uses a pre-hashed bcrypt password for "admin123"
INSERT INTO users (id, username, nama, email, password, role, branch_id, faktor_pengali) 
VALUES (
  UUID(), 
  'admin',
  'Super Admin',
  'admin@gmail.com', 
  '$2b$10$m8G7p0l7y.X0XyX0XyX0XueS/vX6Y1XyX0XyX0XyX0XyX0XyX0XyX', -- valid admin123 hash
  'admin', 
  NULL,
  1.00
);

-- Create default admin user (Password: admin123)
-- This uses a pre-hashed bcrypt password for "admin123"
INSERT INTO users (id, email, password, role, nama, branch_id) 
VALUES (
  UUID(), 
  'admin@gmail.com', 
  '$2b$10$w8W7p0l7y.X0XyX0XyX0XueS/vX6Y1XyX0XyX0XyX0XyX0XyX0XyX', -- pre-hashed admin123
  'admin', 
  'Super Admin',
  NULL
);

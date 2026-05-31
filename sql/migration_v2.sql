-- Run this migration on the production database
ALTER TABLE users ADD COLUMN IF NOT EXISTS cargo TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_points_goal INT NOT NULL DEFAULT 26;

-- Update known team members with their roles
UPDATE users SET cargo = 'Diretor de Arte'   WHERE name = 'samuel';
UPDATE users SET cargo = 'Storymaker'        WHERE name = 'malu';
UPDATE users SET cargo = 'Publisher / UGC'   WHERE name = 'zion';
UPDATE users SET cargo = 'Editor / Audiovisual' WHERE name = 'klenio';
UPDATE users SET cargo = 'Editor / Audiovisual' WHERE name = 'thiago';
UPDATE users SET cargo = 'Estagiária LP & IA'   WHERE name = 'bia';
UPDATE users SET cargo = 'Social Media'      WHERE name = 'maria clara';

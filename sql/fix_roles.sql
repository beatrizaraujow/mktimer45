-- Corrige roles: apenas bia e maria clara são admin
UPDATE users SET role = 'member' WHERE name IN ('samuel', 'malu', 'zion', 'klenio', 'thiago');
UPDATE users SET role = 'admin'  WHERE name IN ('bia', 'maria clara');

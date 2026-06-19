-- Metas semanais por colaborador — Regras do Sistema (PDF PainelMKT_Planejamento_Template)
-- daily_points_goal × 5 = meta semanal 100%
--
-- Grupo Pontos:
--   Samuel : meta 100% = 130 pts/sem → 26/dia  | 120% = 156 pts/sem
--   Thiago : meta 100% =  80 pts/sem → 16/dia  | 120% =  96 pts/sem
--   Klenio : meta 100% =  80 pts/sem → 16/dia  | 120% =  96 pts/sem
--   Bia    : meta 100% =  50 pts/sem → 10/dia  | 120% =  60 pts/sem
--   Anny   : meta 100% =  60 pts/sem → 12/dia  | 120% =  70 pts/sem
--
-- Grupo Pontos (fixo):
--   Gustavo : meta 100% = 55 pts/sem → 11/dia  | 120% = 66 pts/sem
--
-- Grupo Rotinas (isRoutineBased — meta = soma dos pontos esperados das rotinas ativas na semana):
--   Malu    : Storymaker — meta dinâmica por rotinas preenchidas
--   Zion    : Publisher/UGC — meta dinâmica por rotinas preenchidas
--   (daily_points_goal = 0 sinaliza "meta vem das rotinas"; pts = routine_completions.points)

UPDATE users SET daily_points_goal = 26, weekly_pts_120 = 156 WHERE LOWER(name) LIKE '%samuel%';
UPDATE users SET daily_points_goal = 16, weekly_pts_120 =  96 WHERE LOWER(name) LIKE '%thiago%';
UPDATE users SET daily_points_goal = 16, weekly_pts_120 =  96 WHERE LOWER(name) LIKE '%klenio%';
UPDATE users SET daily_points_goal = 10, weekly_pts_120 =  60 WHERE LOWER(name) LIKE '%bia%';
UPDATE users SET daily_points_goal = 12, weekly_pts_120 =  70 WHERE LOWER(name) LIKE '%anny%';
UPDATE users SET daily_points_goal =  0, weekly_pts_120 =   0 WHERE LOWER(name) LIKE '%malu%' OR LOWER(name) LIKE '%luiza%';
UPDATE users SET daily_points_goal =  0, weekly_pts_120 =   0 WHERE LOWER(name) LIKE '%zion%';
UPDATE users SET daily_points_goal = 11, weekly_pts_120 =  66 WHERE LOWER(name) LIKE '%gustavo%';

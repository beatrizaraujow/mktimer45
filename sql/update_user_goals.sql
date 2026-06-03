-- Metas semanais por colaborador — Regras do Sistema (PDF PainelMKT_Planejamento_Template)
-- daily_points_goal × 5 = meta semanal 100%
--
-- Grupo Pontos:
--   Samuel : meta 100% = 130 pts/sem → 26/dia
--   Thiago : meta 100% =  80 pts/sem → 16/dia
--   Klenio : meta 100% =  80 pts/sem → 16/dia
--   Bia    : meta 100% =  30 pts/sem →  6/dia  (120% = 50 pts/sem)
--
-- Grupo Conclusão (isCompletionBased — sem componente de pontos no coef):
--   Malu   : Storymaker — meta por conclusão de tasks/rotina
--   Zion   : Publisher/UGC — meta por conclusão de tasks/rotina
--   (daily_points_goal = 0 para não poluir cálculos; fórmula tem guard weeklyGoal > 0)

UPDATE users SET daily_points_goal = 26 WHERE LOWER(name) LIKE '%samuel%';
UPDATE users SET daily_points_goal = 16 WHERE LOWER(name) LIKE '%thiago%';
UPDATE users SET daily_points_goal = 16 WHERE LOWER(name) LIKE '%klenio%';
UPDATE users SET daily_points_goal =  6 WHERE LOWER(name) LIKE '%bia%';
UPDATE users SET daily_points_goal =  0 WHERE LOWER(name) LIKE '%malu%' OR LOWER(name) LIKE '%luiza%';
UPDATE users SET daily_points_goal =  0 WHERE LOWER(name) LIKE '%zion%';

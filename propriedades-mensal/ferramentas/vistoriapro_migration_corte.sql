-- =====================================================================
-- History cutoff excludes records from every indicator.
-- NC histórica = date_constatation < data de corte; vistoria histórica = date < data de corte.
-- Empty cutoff = nothing excluded. Only calculations change; no rows are touched.
-- Same JSON/columns as before. Idempotent.
-- =====================================================================

-- Cutoff date helper (NULL = no cutoff). Runs with the caller's rights.
CREATE OR REPLACE FUNCTION public.indicadores_data_corte()
 RETURNS date
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $$ SELECT (SELECT NULLIF(value #>> '{}', '')::date FROM public.alert_settings WHERE key = 'history_cutoff_date') $$;
REVOKE ALL ON FUNCTION public.indicadores_data_corte() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.indicadores_data_corte() TO authenticated, service_role;

CREATE OR REPLACE VIEW public.indicadores_base_nc WITH (security_invoker = true) AS
WITH cfg AS (
  SELECT
    COALESCE((SELECT NULLIF(value #>> '{}', '')::int FROM public.alert_settings WHERE key = 'nc_sla_days'), 30) AS sla_dias,
    (SELECT NULLIF(value #>> '{}', '')::date FROM public.alert_settings WHERE key = 'history_cutoff_date') AS data_corte
)
SELECT
  nc.id AS nc_id,
  nc.property_id AS imovel_id,
  p.name AS imovel,
  COALESCE(i.client_id, p.client_id) AS cliente_id,
  c.name AS cliente,
  nc.discipline AS disciplina,
  a.name AS area,
  nc.location AS local,
  nc.priority::text AS prioridade,
  nc.status::text AS status,
  nc.date_constatation AS data_constatacao,
  COALESCE(nc.deadline, GREATEST(nc.date_constatation, COALESCE(cfg.data_corte, nc.date_constatation)) + cfg.sla_dias) AS prazo,
  nc.date_resolution AS data_resolucao,
  (COALESCE(nc.date_resolution, current_date) - nc.date_constatation) AS idade_dias,
  CASE WHEN nc.status = 'Pendente' THEN
    CASE
      WHEN current_date - nc.date_constatation <= 30 THEN '0-30'
      WHEN current_date - nc.date_constatation <= 60 THEN '31-60'
      WHEN current_date - nc.date_constatation <= 90 THEN '61-90'
      WHEN current_date - nc.date_constatation <= 180 THEN '91-180'
      ELSE '>180'
    END
  END AS faixa_idade,
  CASE nc.priority::text WHEN 'Alta' THEN 5 WHEN 'Média' THEN 3 ELSE 1 END AS peso_prioridade,
  (cfg.data_corte IS NOT NULL AND nc.date_constatation < cfg.data_corte) AS historico
FROM public.non_conformities nc
JOIN public.properties p ON p.id = nc.property_id
LEFT JOIN public.inspections i ON i.id = nc.inspection_id
LEFT JOIN public.clients c ON c.id = COALESCE(i.client_id, p.client_id)
LEFT JOIN public.property_areas a ON a.id = nc.area_id
CROSS JOIN cfg
WHERE cfg.data_corte IS NULL OR nc.date_constatation >= cfg.data_corte;

-- Detail per NC, with the derived flags (sheet "NCs")
CREATE OR REPLACE VIEW public.indicadores_ncs WITH (security_invoker = true) AS
SELECT
  b.nc_id, b.imovel, b.cliente, b.disciplina, b.area, b.local, b.prioridade, b.status,
  b.data_constatacao, b.prazo, b.data_resolucao, b.idade_dias, b.faixa_idade,
  (b.status = 'Pendente' AND current_date > b.prazo) AS vencida,
  CASE WHEN b.status = 'Pendente' AND current_date > b.prazo THEN current_date - b.prazo ELSE 0 END AS dias_vencida,
  CASE WHEN b.status = 'Resolvida' THEN b.data_resolucao <= b.prazo END AS resolvida_no_prazo,
  b.historico
FROM public.indicadores_base_nc b;

-- ---------------------------------------------------------------------
-- Per property (sheet "Imóveis"): backlog, overdue, health score 0-100
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.indicadores_imoveis WITH (security_invoker = true) AS
WITH proxima AS (
  SELECT p.id AS imovel_id,
         LEAST(p.next_inspection_date, (SELECT min(d.next_visit_date) FROM public.property_client_details d WHERE d.property_id = p.id)) AS proxima_vistoria
  FROM public.properties p
),
ultima AS (
  SELECT i.property_id AS imovel_id, max(i.date) AS ultima_vistoria
  FROM public.inspections i WHERE i.status = 'concluida' AND i.date >= COALESCE(public.indicadores_data_corte(), '-infinity'::date)
  GROUP BY i.property_id
),
ncs AS (
  SELECT
    imovel_id,
    count(*) AS ncs_total,
    count(*) FILTER (WHERE status = 'Pendente') AS ncs_abertas,
    count(*) FILTER (WHERE status = 'Resolvida') AS ncs_resolvidas,
    count(*) FILTER (WHERE vencida) AS ncs_vencidas,
    count(*) FILTER (WHERE vencida AND prioridade = 'Alta') AS ncs_alta_vencidas,
    max(idade_dias) FILTER (WHERE status = 'Pendente') AS idade_max_dias,
    COALESCE(sum(peso * (1 + dias_vencida / 30.0)) FILTER (WHERE status = 'Pendente'), 0) AS pontos_risco
  FROM (
    SELECT b.imovel_id, b.status, b.prioridade, b.idade_dias, b.peso_prioridade AS peso,
           (b.status = 'Pendente' AND current_date > b.prazo) AS vencida,
           GREATEST(current_date - b.prazo, 0) AS dias_vencida
    FROM public.indicadores_base_nc b
  ) x
  GROUP BY imovel_id
),
scored AS (
  SELECT
    p.id AS imovel_id,
    p.name AS imovel,
    c.name AS cliente,
    COALESCE(n.ncs_total, 0) AS ncs_total,
    COALESCE(n.ncs_abertas, 0) AS ncs_abertas,
    COALESCE(n.ncs_vencidas, 0) AS ncs_vencidas,
    COALESCE(n.ncs_alta_vencidas, 0) AS ncs_alta_vencidas,
    n.idade_max_dias,
    CASE WHEN COALESCE(n.ncs_total, 0) > 0 THEN round(100.0 * n.ncs_resolvidas / n.ncs_total, 1) END AS pct_resolvido,
    u.ultima_vistoria,
    pr.proxima_vistoria,
    COALESCE(pr.proxima_vistoria < current_date, false) AS vistoria_atrasada,
    GREATEST(0, 100 - LEAST(100, COALESCE(n.pontos_risco, 0)
      + CASE WHEN pr.proxima_vistoria < current_date THEN 10 ELSE 0 END))::int AS indice_saude
  FROM public.properties p
  LEFT JOIN public.clients c ON c.id = p.client_id
  LEFT JOIN ncs n ON n.imovel_id = p.id
  LEFT JOIN ultima u ON u.imovel_id = p.id
  LEFT JOIN proxima pr ON pr.imovel_id = p.id
  WHERE p.active
)
SELECT
  scored.*,
  CASE WHEN indice_saude >= 80 THEN 'Verde' WHEN indice_saude >= 60 THEN 'Amarelo' ELSE 'Vermelho' END AS faixa_saude,
  rank() OVER (ORDER BY indice_saude, ncs_alta_vencidas DESC, idade_max_dias DESC NULLS LAST) AS ranking_criticidade
FROM scored;

-- ---------------------------------------------------------------------
-- Per discipline (sheet "Disciplinas")
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.indicadores_disciplinas WITH (security_invoker = true) AS
SELECT
  COALESCE(disciplina, 'Geral') AS disciplina,
  count(*) FILTER (WHERE status = 'Pendente') AS ncs_abertas,
  count(*) FILTER (WHERE status = 'Pendente' AND current_date > prazo) AS ncs_vencidas,
  count(*) FILTER (WHERE status = 'Resolvida' AND data_resolucao > current_date - 90) AS resolvidas_90d,
  round(avg(idade_dias) FILTER (WHERE status = 'Resolvida' AND data_resolucao > current_date - 90), 1) AS mttr_dias_90d,
  round(100.0 * avg(CASE WHEN data_resolucao <= prazo THEN 1 ELSE 0 END)
    FILTER (WHERE status = 'Resolvida' AND data_resolucao > current_date - 90), 1) AS pct_no_prazo_90d
FROM public.indicadores_base_nc
GROUP BY COALESCE(disciplina, 'Geral');

-- ---------------------------------------------------------------------
-- Monthly trend, last 12 months (sheet "Mensal")
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.indicadores_mensal WITH (security_invoker = true) AS
WITH meses AS (
  SELECT generate_series(date_trunc('month', current_date) - interval '11 months',
                         date_trunc('month', current_date), interval '1 month')::date AS mes
),
ativos AS (SELECT count(*) AS n FROM public.properties WHERE active)
SELECT
  to_char(m.mes, 'YYYY-MM') AS mes,
  (SELECT count(*) FROM public.indicadores_base_nc b
    WHERE b.data_constatacao >= m.mes AND b.data_constatacao < m.mes + interval '1 month') AS ncs_abertas_no_mes,
  (SELECT count(*) FROM public.indicadores_base_nc b
    WHERE b.data_resolucao >= m.mes AND b.data_resolucao < m.mes + interval '1 month') AS ncs_resolvidas_no_mes,
  (SELECT count(*) FROM public.indicadores_base_nc b
    WHERE b.data_constatacao < m.mes + interval '1 month'
      AND (b.data_resolucao IS NULL OR b.data_resolucao >= m.mes + interval '1 month')) AS backlog_fim_do_mes,
  (SELECT round(100.0 * avg(CASE WHEN b.data_resolucao <= b.prazo THEN 1 ELSE 0 END), 1) FROM public.indicadores_base_nc b
    WHERE b.data_resolucao >= m.mes AND b.data_resolucao < m.mes + interval '1 month') AS pct_resolvidas_no_prazo,
  (SELECT round(avg(b.data_resolucao - b.data_constatacao), 1) FROM public.indicadores_base_nc b
    WHERE b.data_resolucao >= m.mes AND b.data_resolucao < m.mes + interval '1 month') AS mttr_dias,
  (SELECT count(DISTINCT i.property_id) FROM public.inspections i
    WHERE i.type = 'Visita Mensal' AND i.status = 'concluida' AND i.date >= COALESCE(public.indicadores_data_corte(), '-infinity'::date)
      AND i.date >= m.mes AND i.date < m.mes + interval '1 month') AS imoveis_visitados,
  ativos.n AS imoveis_ativos,
  CASE WHEN ativos.n > 0 THEN round(100.0 * (SELECT count(DISTINCT i.property_id) FROM public.inspections i
    WHERE i.type = 'Visita Mensal' AND i.status = 'concluida' AND i.date >= COALESCE(public.indicadores_data_corte(), '-infinity'::date)
      AND i.date >= m.mes AND i.date < m.mes + interval '1 month') / ativos.n, 1) END AS pct_cobertura_visitas
FROM meses m CROSS JOIN ativos
ORDER BY m.mes;

-- ---------------------------------------------------------------------
-- Inspector productivity, last 12 months (sheet "Vistoriadores")
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.indicadores_vistoriadores WITH (security_invoker = true) AS
WITH insp AS (
  SELECT i.id, date_trunc('month', i.date)::date AS mes, COALESCE(ins.name, i.inspector) AS vistoriador, i.status, i.type
  FROM public.inspections i
  LEFT JOIN public.inspectors ins ON ins.id = i.inspector_id
  WHERE i.date >= date_trunc('month', current_date) - interval '11 months'
    AND i.date <= current_date
    AND i.date >= COALESCE(public.indicadores_data_corte(), '-infinity'::date)
),
-- NCs registered in the month, credited to the inspector of the inspection they belong to
ncs AS (
  SELECT date_trunc('month', nc.date_constatation)::date AS mes, insp.vistoriador, count(*) AS n
  FROM public.non_conformities nc
  JOIN insp ON insp.id = nc.inspection_id
  GROUP BY 1, 2
)
SELECT
  to_char(insp.mes, 'YYYY-MM') AS mes,
  insp.vistoriador,
  count(*) FILTER (WHERE insp.status = 'concluida') AS vistorias_concluidas,
  count(*) FILTER (WHERE insp.status = 'concluida' AND insp.type = 'Vistoria Anual') AS vistorias_anuais,
  count(*) FILTER (WHERE insp.status = 'concluida' AND insp.type = 'Visita Mensal') AS visitas_mensais,
  COALESCE(max(ncs.n), 0) AS ncs_registradas
FROM insp
LEFT JOIN ncs ON ncs.mes = insp.mes AND ncs.vistoriador = insp.vistoriador
GROUP BY insp.mes, insp.vistoriador
ORDER BY 1, 2;

-- ---------------------------------------------------------------------
-- Portfolio snapshot, one row (sheet "Resumo")
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW public.indicadores_resumo WITH (security_invoker = true) AS
WITH b AS (SELECT * FROM public.indicadores_base_nc),
ativos AS (SELECT id FROM public.properties WHERE active),
res90 AS (SELECT * FROM b WHERE status = 'Resolvida' AND data_resolucao > current_date - 90)
SELECT
  now() AS atualizado_em,
  (SELECT count(*) FROM ativos) AS imoveis_ativos,
  (SELECT count(DISTINCT p.client_id) FROM public.properties p WHERE p.active) AS clientes_ativos,
  (SELECT count(*) FROM b WHERE status = 'Pendente') AS ncs_abertas,
  (SELECT count(*) FROM b WHERE status = 'Pendente' AND prioridade = 'Alta') AS ncs_abertas_alta,
  (SELECT count(*) FROM b WHERE status = 'Pendente' AND prioridade = 'Média') AS ncs_abertas_media,
  (SELECT count(*) FROM b WHERE status = 'Pendente' AND prioridade = 'Baixa') AS ncs_abertas_baixa,
  (SELECT count(*) FROM b WHERE status = 'Pendente' AND current_date > prazo) AS ncs_vencidas,
  (SELECT round(100.0 * count(*) FILTER (WHERE current_date > prazo) / NULLIF(count(*), 0), 1) FROM b WHERE status = 'Pendente') AS pct_vencidas,
  (SELECT count(*) FROM b WHERE faixa_idade = '0-30') AS idade_0_30,
  (SELECT count(*) FROM b WHERE faixa_idade = '31-60') AS idade_31_60,
  (SELECT count(*) FROM b WHERE faixa_idade = '61-90') AS idade_61_90,
  (SELECT count(*) FROM b WHERE faixa_idade = '91-180') AS idade_91_180,
  (SELECT count(*) FROM b WHERE faixa_idade = '>180') AS idade_mais_180,
  (SELECT count(*) FROM res90) AS resolvidas_90d,
  (SELECT round(avg(idade_dias), 1) FROM res90) AS mttr_dias_90d,
  (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY idade_dias) FROM res90) AS mttr_mediana_90d,
  (SELECT round(100.0 * avg(CASE WHEN data_resolucao <= prazo THEN 1 ELSE 0 END), 1) FROM res90) AS pct_no_prazo_90d,
  (SELECT round(100.0 * count(DISTINCT i.property_id) / NULLIF((SELECT count(*) FROM ativos), 0), 1)
    FROM public.inspections i JOIN ativos a ON a.id = i.property_id
    WHERE i.type = 'Visita Mensal' AND i.status = 'concluida' AND i.date >= COALESCE(public.indicadores_data_corte(), '-infinity'::date)
      AND i.date >= date_trunc('month', current_date)) AS pct_cobertura_visitas_mes,
  (SELECT round(100.0 * count(DISTINCT i.property_id) / NULLIF((SELECT count(*) FROM ativos), 0), 1)
    FROM public.inspections i JOIN ativos a ON a.id = i.property_id
    WHERE i.type = 'Vistoria Anual' AND i.status = 'concluida' AND i.date >= COALESCE(public.indicadores_data_corte(), '-infinity'::date)
      AND i.date > current_date - 365) AS pct_vistoria_anual_em_dia,
  (SELECT count(*) FROM public.indicadores_imoveis WHERE vistoria_atrasada) AS imoveis_vistoria_atrasada,
  (SELECT round(avg(indice_saude), 1) FROM public.indicadores_imoveis) AS indice_saude_medio,
  (SELECT count(*) FROM public.indicadores_imoveis WHERE faixa_saude = 'Vermelho') AS imoveis_criticos;

-- ---------------------------------------------------------------------
-- Access: no anonymous access; app users read through their own RLS
-- ---------------------------------------------------------------------
DO $$
DECLARE v text;
BEGIN
  FOREACH v IN ARRAY ARRAY[
    'indicadores_base_nc', 'indicadores_ncs', 'indicadores_imoveis', 'indicadores_disciplinas',
    'indicadores_mensal', 'indicadores_vistoriadores', 'indicadores_resumo'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', v);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated, service_role', v);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.indicadores_mes(p_ref date)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
WITH cfg AS (
  SELECT
    COALESCE((SELECT NULLIF(value #>> '{}', '')::int FROM alert_settings WHERE key = 'nc_sla_days'), 30) AS sla_dias,
    (SELECT NULLIF(value #>> '{}', '')::date FROM alert_settings WHERE key = 'history_cutoff_date') AS data_corte
),
per AS (
  SELECT date_trunc('month', p_ref)::date AS ini,
         (date_trunc('month', p_ref) + interval '1 month - 1 day')::date AS fim,
         (date_trunc('month', p_ref) - interval '1 month')::date AS ini_ant,
         (date_trunc('month', p_ref) - interval '1 day')::date AS fim_ant
),
periodos AS (
  SELECT 'atual' AS k, ini, fim FROM per
  UNION ALL
  SELECT 'anterior', ini_ant, fim_ant FROM per
),
-- Inspections dated before the cutoff are historical and never count
insp AS (
  SELECT i.* FROM inspections i
  JOIN properties p ON p.id = i.property_id AND p.active
  CROSS JOIN cfg
  WHERE cfg.data_corte IS NULL OR i.date >= cfg.data_corte
),
-- NCs constated before the cutoff are historical and never count
nc AS (
  SELECT
    n.id, n.property_id, p.name AS imovel, n.discipline AS disciplina, n.priority::text AS prioridade,
    n.status::text AS status, n.date_constatation AS constatacao,
    CASE WHEN n.status = 'Resolvida' THEN COALESCE(n.date_resolution, n.date_constatation) END AS resolucao,
    COALESCE(n.deadline, n.date_constatation + cfg.sla_dias) AS prazo,
    CASE n.priority::text WHEN 'Alta' THEN 5 WHEN 'Média' THEN 3 ELSE 1 END AS peso
  FROM non_conformities n
  JOIN properties p ON p.id = n.property_id
  CROSS JOIN cfg
  WHERE p.active
    AND (cfg.data_corte IS NULL OR n.date_constatation >= cfg.data_corte)
),
metricas AS (
  SELECT
    pr.k,
    to_char(pr.ini, 'YYYY-MM') AS mes,
    (SELECT count(*) FROM insp i WHERE i.type = 'Vistoria Anual' AND i.status = 'concluida' AND i.date BETWEEN pr.ini AND pr.fim) AS vistorias_periodicas,
    (SELECT count(*) FROM insp i WHERE i.type = 'Visita Mensal' AND i.status = 'concluida' AND i.date BETWEEN pr.ini AND pr.fim) AS visitas_mensais,
    (SELECT count(*) FROM insp i WHERE i.type = 'Visita Mensal' AND i.date BETWEEN pr.ini AND pr.fim) AS visitas_programadas,
    (SELECT count(DISTINCT i.property_id) FROM insp i WHERE i.type = 'Visita Mensal' AND i.status = 'concluida' AND i.date BETWEEN pr.ini AND pr.fim) AS imoveis_visitados,
    (SELECT count(*) FROM properties WHERE active) AS imoveis_ativos,
    (SELECT count(*) FROM nc WHERE constatacao BETWEEN pr.ini AND pr.fim) AS ncs_abertas_no_mes,
    (SELECT count(*) FROM nc WHERE resolucao BETWEEN pr.ini AND pr.fim) AS ncs_resolvidas_no_mes,
    (SELECT count(*) FROM nc WHERE constatacao <= pr.fim AND (resolucao IS NULL OR resolucao > pr.fim)) AS ncs_em_aberto,
    (SELECT count(*) FROM nc WHERE constatacao <= pr.fim AND (resolucao IS NULL OR resolucao > pr.fim) AND pr.fim > prazo) AS ncs_vencidas,
    (SELECT count(*) FROM nc WHERE constatacao <= pr.fim AND (resolucao IS NULL OR resolucao > pr.fim) AND pr.fim > prazo
      AND prioridade = 'Alta') AS ncs_alta_vencidas,
    (SELECT round(avg(resolucao - constatacao), 1) FROM nc WHERE resolucao BETWEEN pr.ini AND pr.fim) AS mttr_dias,
    (SELECT round(100.0 * avg(CASE WHEN resolucao <= prazo THEN 1 ELSE 0 END), 1)
      FROM nc WHERE resolucao BETWEEN pr.ini AND pr.fim) AS pct_resolvidas_no_prazo
  FROM periodos pr
),
abertas_fim AS (
  SELECT nc.*, per.fim, (per.fim - nc.constatacao) AS idade, GREATEST(per.fim - nc.prazo, 0) AS dias_vencida
  FROM nc CROSS JOIN per
  WHERE nc.constatacao <= per.fim AND (nc.resolucao IS NULL OR nc.resolucao > per.fim)
),
imoveis AS (
  SELECT
    imovel,
    count(*) AS em_aberto,
    count(*) FILTER (WHERE dias_vencida > 0) AS vencidas,
    count(*) FILTER (WHERE dias_vencida > 0 AND prioridade = 'Alta') AS alta_vencidas,
    max(idade) AS idade_max_dias,
    GREATEST(0, 100 - LEAST(100, sum(peso * (1 + dias_vencida / 30.0))))::int AS indice_saude
  FROM abertas_fim
  GROUP BY imovel
),
disciplinas AS (
  SELECT
    COALESCE(d.disciplina, 'Geral') AS disciplina,
    count(*) FILTER (WHERE d.aberta) AS em_aberto,
    count(*) FILTER (WHERE d.aberta AND d.vencida) AS vencidas,
    count(*) FILTER (WHERE d.resolvida_no_mes) AS resolvidas_no_mes
  FROM (
    SELECT nc.disciplina,
           (nc.constatacao <= per.fim AND (nc.resolucao IS NULL OR nc.resolucao > per.fim)) AS aberta,
           (per.fim > nc.prazo) AS vencida,
           (nc.resolucao BETWEEN per.ini AND per.fim) AS resolvida_no_mes
    FROM nc CROSS JOIN per
  ) d
  GROUP BY COALESCE(d.disciplina, 'Geral')
  HAVING count(*) FILTER (WHERE d.aberta OR d.resolvida_no_mes) > 0
)
SELECT jsonb_build_object(
  'mes', (SELECT to_char(ini, 'YYYY-MM') FROM per),
  'posicao_em', (SELECT fim FROM per),
  'data_corte', (SELECT data_corte FROM cfg),
  'atual', (SELECT to_jsonb(m) - 'k' FROM metricas m WHERE k = 'atual'),
  'anterior', (SELECT to_jsonb(m) - 'k' FROM metricas m WHERE k = 'anterior'),
  'idade', (SELECT jsonb_build_object(
      '0-30',   count(*) FILTER (WHERE idade <= 30),
      '31-60',  count(*) FILTER (WHERE idade BETWEEN 31 AND 60),
      '61-90',  count(*) FILTER (WHERE idade BETWEEN 61 AND 90),
      '91-180', count(*) FILTER (WHERE idade BETWEEN 91 AND 180),
      '>180',   count(*) FILTER (WHERE idade > 180)) FROM abertas_fim),
  'imoveis', COALESCE((SELECT jsonb_agg(to_jsonb(i) ORDER BY i.indice_saude, i.alta_vencidas DESC, i.idade_max_dias DESC)
                       FROM imoveis i), '[]'::jsonb),
  'disciplinas', COALESCE((SELECT jsonb_agg(to_jsonb(d) ORDER BY d.em_aberto DESC, d.disciplina)
                           FROM disciplinas d), '[]'::jsonb)
);
$function$;

REVOKE ALL ON FUNCTION public.indicadores_mes(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.indicadores_mes(date) TO service_role;

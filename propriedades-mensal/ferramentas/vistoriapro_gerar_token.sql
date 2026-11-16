-- Gera o token da integração (rodar DEPOIS das migrations, no SQL Editor do app).
-- O token aparece UMA vez, na coluna copie_este_token. O banco guarda só o hash.
-- Guardar em: Apps Script > Configurações do projeto > Propriedades do script > VISTORIAS_API_TOKEN
-- Nunca no código nem no git.
WITH t AS (SELECT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '') AS token),
ins AS (INSERT INTO public.integration_tokens (name, token_hash)
        SELECT 'Apresentação Mensal de Propriedades', encode(sha256(convert_to(token, 'UTF8')), 'hex') FROM t RETURNING id)
SELECT t.token AS copie_este_token FROM t, ins;

-- Revogar (se precisar):
-- UPDATE integration_tokens SET revoked_at = now() WHERE name = 'Apresentação Mensal de Propriedades';

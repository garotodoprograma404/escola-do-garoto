-- Extensão para buscar "contém" (ILIKE '%texto%') usando índice, em vez de varrer a tabela inteira.
-- No Postgres 13+ a pg_trgm é "confiável": o dono do banco consegue criar sem ser superusuário.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

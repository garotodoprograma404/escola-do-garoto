-- Gatilhos que mantêm dados derivados (a regra de negócio fica nos services, não no banco).
-- search_path fixo em todas as funções (regra de segurança do projeto).

-- updated_at automático em toda tabela que tem a coluna.
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DO $$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables tb
      ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name AND tb.table_type = 'BASE TABLE'
    WHERE c.table_schema = 'public' AND c.column_name = 'updated_at'
  LOOP
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      'trg_' || t.table_name || '_updated_at', t.table_name);
  END LOOP;
END $$;
--> statement-breakpoint

-- Blog: contadores de curtidas e visualizações.
CREATE OR REPLACE FUNCTION public.update_post_likes_count() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE blog_posts SET total_likes = total_likes + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE blog_posts SET total_likes = GREATEST(total_likes - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER trigger_update_post_likes_insert AFTER INSERT ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_post_likes_count();
--> statement-breakpoint
CREATE TRIGGER trigger_update_post_likes_delete AFTER DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.update_post_likes_count();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.update_post_views_count() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  UPDATE blog_posts
  SET total_views = (SELECT COUNT(*) FROM post_views WHERE post_id = NEW.post_id)
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER trigger_update_post_views AFTER INSERT ON public.post_views
  FOR EACH ROW EXECUTE FUNCTION public.update_post_views_count();
--> statement-breakpoint

-- Suporte: nova mensagem "mexe" no chamado (ordenação por atividade recente).
CREATE OR REPLACE FUNCTION public.update_ticket_on_message() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  UPDATE support_tickets SET updated_at = NOW() WHERE id = NEW.ticket_id;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER update_ticket_on_new_message AFTER INSERT ON public.ticket_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_ticket_on_message();

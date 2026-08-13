-- Share → Decide schema + SECURITY DEFINER RPCs (applied on hosted Supabase).
-- Clients must not SELECT/DML these tables (voter_key privacy); use RPCs only.
-- Table grants: service_role only (see docs/db/api-table-grants.sql).

CREATE TABLE IF NOT EXISTS public.list_decide_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  lock_token text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'locked')),
  winner_restaurant_id uuid REFERENCES public.restaurants(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS list_decide_sessions_list_id_idx
  ON public.list_decide_sessions (list_id);
CREATE INDEX IF NOT EXISTS list_decide_sessions_list_open_idx
  ON public.list_decide_sessions (list_id)
  WHERE status = 'open';

CREATE TABLE IF NOT EXISTS public.list_decide_votes (
  session_id uuid NOT NULL REFERENCES public.list_decide_sessions(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  voter_key text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  vote smallint NOT NULL CHECK (vote IN (-1, 1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, voter_key, restaurant_id)
);

CREATE INDEX IF NOT EXISTS list_decide_votes_session_idx
  ON public.list_decide_votes (session_id);

ALTER TABLE public.list_decide_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_decide_votes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.list_decide_sessions FROM anon, authenticated;
REVOKE ALL ON TABLE public.list_decide_votes FROM anon, authenticated;
GRANT ALL ON TABLE public.list_decide_sessions TO service_role;
GRANT ALL ON TABLE public.list_decide_votes TO service_role;

-- RPC bodies live in the hosted DB (create / get / cast / lock). Re-apply from
-- Supabase MCP / SQL editor if rebuilding an environment; keep EXECUTE:
--   create_list_decide_session → authenticated
--   get_list_decide_session, cast_list_decide_vote, lock_list_decide_session → anon + authenticated

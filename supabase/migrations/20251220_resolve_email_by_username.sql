-- RPC to resolve email by username for username-only login
CREATE OR REPLACE FUNCTION public.resolve_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email INTO v_email
  FROM public.profiles
  WHERE username = p_username
  LIMIT 1;
  RETURN v_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_email_by_username(TEXT) TO anon, authenticated;


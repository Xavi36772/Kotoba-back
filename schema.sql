-- Usuarios
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  age INTEGER,
  country TEXT,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Obras (Works)
CREATE TABLE works (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  synopsis TEXT,
  genre TEXT,
  cover_url TEXT,
  author_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'ongoing', 'completed', 'hiatus')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Capítulos (Chapters)
CREATE TABLE chapters (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  work_id UUID REFERENCES works(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  order_number INTEGER NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seguidores
CREATE TABLE followers (
  follower_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (follower_id, following_id)
);

-- Comentarios
CREATE TABLE comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  work_id UUID REFERENCES works(id) ON DELETE CASCADE NOT NULL,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices para mejorar rendimiento de consultas comunes
CREATE INDEX idx_works_author_id ON works(author_id);
CREATE INDEX idx_chapters_work_id ON chapters(work_id);
CREATE INDEX idx_comments_work_id ON comments(work_id);
CREATE INDEX idx_comments_chapter_id ON comments(chapter_id);
CREATE INDEX idx_followers_follower_id ON followers(follower_id);
CREATE INDEX idx_followers_following_id ON followers(following_id);

-- Trigger: crea perfil automáticamente al registrarse un usuario en Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, username, age, country)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    (NEW.raw_user_meta_data->>'age')::INTEGER,
    NEW.raw_user_meta_data->>'country'
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ── RLS Policies ──────────────────────────────────────────────────────────
-- Enable RLS en tablas principales
ALTER TABLE works ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Works
CREATE POLICY "Works son públicos para lectura"
  ON works FOR SELECT
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear obras"
  ON works FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autores pueden actualizar sus obras"
  ON works FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Autores pueden eliminar sus obras"
  ON works FOR DELETE
  USING (auth.uid() = author_id);

-- Chapters
CREATE POLICY "Chapters son públicos para lectura"
  ON chapters FOR SELECT
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear capítulos"
  ON chapters FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autores pueden actualizar sus capítulos (vía work_id)"
  ON chapters FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM works
      WHERE works.id = chapters.work_id
        AND works.author_id = auth.uid()
    )
  );

CREATE POLICY "Autores pueden eliminar sus capítulos"
  ON chapters FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM works
      WHERE works.id = chapters.work_id
        AND works.author_id = auth.uid()
    )
  );

-- Followers
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Seguidores son públicos para lectura"
  ON followers FOR SELECT
  USING (true);

CREATE POLICY "Usuarios autenticados pueden seguir"
  ON followers FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Usuarios pueden dejar de seguir"
  ON followers FOR DELETE
  USING (auth.uid() = follower_id);

-- Comments
CREATE POLICY "Comments son públicos para lectura"
  ON comments FOR SELECT
  USING (true);

CREATE POLICY "Usuarios autenticados pueden comentar"
  ON comments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios pueden actualizar sus comentarios"
  ON comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden eliminar sus comentarios"
  ON comments FOR DELETE
  USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- VOTOS y FAVORITOS
-- ══════════════════════════════════════════════════════════════════════════════

-- view_count en works (para conteo de lecturas)
ALTER TABLE works ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Función para incrementar view_count atómicamente
CREATE OR REPLACE FUNCTION public.increment_view_count(row_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.works SET view_count = COALESCE(view_count, 0) + 1 WHERE id = row_id;
END;
$$;

-- Vista única de usuario a obra (evita conteo múltiple)
CREATE TABLE IF NOT EXISTS work_views (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  work_id UUID REFERENCES works(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, work_id)
);
CREATE INDEX IF NOT EXISTS idx_work_views_work_id ON work_views(work_id);

-- Votos de usuarios a obras
CREATE TABLE IF NOT EXISTS work_votes (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  work_id UUID REFERENCES works(id) ON DELETE CASCADE NOT NULL,
  vote SMALLINT NOT NULL CHECK (vote IN (1, -1)),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, work_id)
);

-- Favoritos / Bookmarks
CREATE TABLE IF NOT EXISTS bookmarks (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  work_id UUID REFERENCES works(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (user_id, work_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_work_votes_work_id ON work_votes(work_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);

-- RLS: Work Votes
ALTER TABLE work_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Votos son públicos para lectura"
  ON work_votes FOR SELECT
  USING (true);

CREATE POLICY "Usuarios autenticados pueden votar"
  ON work_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden actualizar sus votos"
  ON work_votes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden eliminar sus votos"
  ON work_votes FOR DELETE
  USING (auth.uid() = user_id);

-- RLS: Bookmarks
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven sus propios bookmarks"
  ON bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios autenticados pueden crear bookmarks"
  ON bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden eliminar sus bookmarks"
  ON bookmarks FOR DELETE
  USING (auth.uid() = user_id);

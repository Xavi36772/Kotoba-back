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
  status TEXT DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'completed', 'hiatus')),
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

-- Comentarios
CREATE TABLE comments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices para mejorar rendimiento de consultas comunes
CREATE INDEX idx_works_author_id ON works(author_id);
CREATE INDEX idx_chapters_work_id ON chapters(work_id);
CREATE INDEX idx_comments_chapter_id ON comments(chapter_id);

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

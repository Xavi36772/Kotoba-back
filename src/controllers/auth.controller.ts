import { Request, Response } from 'express';
import { supabase, supabaseAdmin } from '../config/supabase';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, username, age, country } = req.body;

    const metadata: Record<string, any> = {};
    if (username) metadata.username = username;
    if (age) metadata.age = age;
    if (country) metadata.country = country;

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });

    if (authError) throw authError;
    if (!authData.user) {
      res.status(400).json({ error: 'No se pudo crear el usuario. Intenta de nuevo.' });
      return;
    }

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error: any) {
    console.error('Register error type:', typeof error, 'value:', JSON.stringify(error));
    const rawMsg =
      (typeof error === 'string' ? error : '') ||
      error?.message ||
      error?.error_description ||
      error?.msg ||
      '';
    const cleanMsg = rawMsg.replace(/[{}[\]()]/g, '').trim();
    const msg = cleanMsg || 'Error al registrar usuario. Verifica tus datos o que el email no esté registrado.';
    res.status(400).json({ error: msg });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    // Return the session so Postman can use the token
    res.json({ session: data.session, user: data.user });
  } catch (error: any) {
    res.status(401).json({ error: error.message || 'Error logging in' });
  }
};

export const syncDiscordUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: 'No authorization header' });
      return;
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const metadata = user.user_metadata || {};
    const username = metadata['username'] || metadata['full_name'] || `user_${user.id.substring(0, 8)}`;
    const avatarUrl = metadata['avatar_url'] || null;
    const age = metadata['age'] ? parseInt(metadata['age'], 10) : null;
    const country = metadata['country'] || null;

    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (!existing) {
      const { error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          username,
          avatar_url: avatarUrl,
          age,
          country,
        });

      if (insertError) {
        res.status(500).json({ error: 'Error creating user profile' });
        return;
      }
    }

    res.json({ message: 'User synced successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error syncing Discord user' });
  }
};

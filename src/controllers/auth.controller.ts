import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

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

    res.status(201).json({ message: 'User registered successfully', user: authData.user });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Error registering user' });
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

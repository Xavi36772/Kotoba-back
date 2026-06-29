import { supabase, supabaseAdmin } from '../config/supabase';

export class WorkModel {
  static async findAll(filters?: Record<string, string>) {
    let query = supabase
      .from('works')
      .select('*, users!works_author_id_fkey(username)');
    if (filters?.author_id) {
      query = query.eq('author_id', filters.author_id);
    } else {
      query = query.neq('status', 'draft');
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map((w: any) => ({
      ...w,
      author_name: w.users?.username || '',
      users: undefined,
    }));
  }

  static async findById(id: string) {
    const { data, error } = await supabase
      .from('works')
      .select('*, users!works_author_id_fkey(username)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return {
      ...data,
      author_name: (data as any)?.users?.username || '',
      users: undefined,
    };
  }

  static async create(workData: any) {
    const { data, error } = await supabaseAdmin
      .from('works')
      .insert([workData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async update(id: string, workData: any) {
    const { data, error } = await supabaseAdmin
      .from('works')
      .update(workData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async delete(id: string) {
    const { data, error } = await supabaseAdmin
      .from('works')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  static async countByAuthor(authorId: string) {
    const { count, error } = await supabase
      .from('works')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', authorId);

    if (error) throw error;
    return count || 0;
  }

  static async findByAuthor(authorId: string) {
    const { data, error } = await supabase
      .from('works')
      .select('*, users!works_author_id_fkey(username)')
      .eq('author_id', authorId);

    if (error) throw error;
    return (data || []).map((w: any) => ({
      ...w,
      author_name: w.users?.username || '',
      users: undefined,
    }));
  }
}

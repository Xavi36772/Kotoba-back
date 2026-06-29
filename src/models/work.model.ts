import { supabase, supabaseAdmin } from '../config/supabase';

const WORK_SELECT = `
  *,
  users!works_author_id_fkey(username),
  chapters:chapters(count)
`;

function mapWork(w: any) {
  return {
    ...w,
    author_name: w.users?.username || '',
    chapter_count: w.chapters?.[0]?.count ?? 0,
    users: undefined,
    chapters: undefined,
  };
}

export class WorkModel {
  static async findAll(filters?: Record<string, string>) {
    let query = supabase
      .from('works')
      .select(WORK_SELECT);
    if (filters?.author_id) {
      query = query.eq('author_id', filters.author_id);
    } else {
      query = query.neq('status', 'draft');
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapWork);
  }

  static async findById(id: string) {
    const { data, error } = await supabase
      .from('works')
      .select(WORK_SELECT)
      .eq('id', id)
      .single();

    if (error) throw error;
    return mapWork(data);
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
      .select(WORK_SELECT)
      .eq('author_id', authorId);

    if (error) throw error;
    return (data || []).map(mapWork);
  }

  static async incrementViewCount(workId: string) {
    const { error } = await supabaseAdmin.rpc('increment_view_count', { row_id: workId });
    if (error) throw error;
  }
}

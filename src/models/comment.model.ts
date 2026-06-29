import { supabase, supabaseAdmin } from '../config/supabase';

export class CommentModel {
  static async findByWorkId(workId: string) {
    const { data, error } = await supabase
      .from('comments')
      .select('*, users(username, avatar_url)')
      .eq('work_id', workId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  }

  static async findByChapterId(chapterId: string) {
    const { data, error } = await supabase
      .from('comments')
      .select('*, users(username, avatar_url)')
      .eq('chapter_id', chapterId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  }

  static async create(commentData: any) {
    const { data, error } = await supabaseAdmin
      .from('comments')
      .insert([commentData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async delete(id: string) {
    const { error } = await supabaseAdmin
      .from('comments')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }

  static async findAll() {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}

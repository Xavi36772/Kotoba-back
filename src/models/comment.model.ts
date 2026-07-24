import { supabase, supabaseAdmin } from '../config/supabase';

export class CommentModel {
  static async findByWorkId(workId: string) {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('work_id', workId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  }

  static async findByChapterId(chapterId: string) {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
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

  static async incrementLikeCount(commentId: string) {
    const { error } = await supabaseAdmin.rpc('increment_comment_like_count', {
      comment_id: commentId,
    });
    if (error) throw error;
  }

  static async decrementLikeCount(commentId: string) {
    const { error } = await supabaseAdmin.rpc('decrement_comment_like_count', {
      comment_id: commentId,
    });
    if (error) throw error;
  }
}

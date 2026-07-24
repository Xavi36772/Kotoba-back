import { supabase, supabaseAdmin } from '../config/supabase';

export class CommentLikeModel {
  static async findByUserAndComment(userId: string, commentId: string) {
    const { data, error } = await supabase
      .from('comment_likes')
      .select('*')
      .eq('user_id', userId)
      .eq('comment_id', commentId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async create(userId: string, commentId: string) {
    const { data, error } = await supabaseAdmin
      .from('comment_likes')
      .insert([{ user_id: userId, comment_id: commentId }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async delete(userId: string, commentId: string) {
    const { error } = await supabaseAdmin
      .from('comment_likes')
      .delete()
      .eq('user_id', userId)
      .eq('comment_id', commentId);

    if (error) throw error;
    return true;
  }

  static async countByComment(commentId: string) {
    const { count, error } = await supabase
      .from('comment_likes')
      .select('*', { count: 'exact', head: true })
      .eq('comment_id', commentId);

    if (error) throw error;
    return count || 0;
  }

  static async isLikedByUser(userId: string, commentId: string) {
    const like = await this.findByUserAndComment(userId, commentId);
    return like !== null;
  }

  static async getLikedCommentIds(userId: string, commentIds: string[]) {
    if (commentIds.length === 0) return [];
    const { data, error } = await supabase
      .from('comment_likes')
      .select('comment_id')
      .eq('user_id', userId)
      .in('comment_id', commentIds);

    if (error) throw error;
    return (data || []).map((l: any) => l.comment_id as string);
  }
}

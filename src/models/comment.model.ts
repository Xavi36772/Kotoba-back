import { supabase, supabaseAdmin } from '../config/supabase';

export class CommentModel {
  static async findByWorkId(workId: string) {
    const { data, error } = await supabase
      .from('comments')
      .select('*, users!user_id(username, avatar_url)')
      .eq('work_id', workId)
      .is('chapter_id', null)
      .is('parent_id', null)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  }

  static async findByChapterId(chapterId: string) {
    const { data, error } = await supabase
      .from('comments')
      .select('*, users!user_id(username, avatar_url)')
      .eq('chapter_id', chapterId)
      .is('parent_id', null)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  }

  static async findById(id: string) {
    const { data, error } = await supabase
      .from('comments')
      .select('*, users!user_id(username, avatar_url)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  static async findReplies(parentId: string) {
    const { data, error } = await supabase
      .from('comments')
      .select('*, users!user_id(username, avatar_url)')
      .eq('parent_id', parentId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data;
  }

  static async findRepliesWithLikes(parentId: string, userId: string) {
    const replies = await this.findReplies(parentId);
    if (replies.length === 0) return replies;

    const replyIds = replies.map((r: any) => r.id);
    const { CommentLikeModel } = await import('./comment_like.model');
    const likedIds = await CommentLikeModel.getLikedCommentIds(userId, replyIds);
    const likedSet = new Set(likedIds);

    return replies.map((r: any) => ({
      ...r,
      is_liked: likedSet.has(r.id),
    }));
  }

  static async countReplies(parentId: string) {
    const { count, error } = await supabase
      .from('comments')
      .select('*', { count: 'exact', head: true })
      .eq('parent_id', parentId);

    if (error) throw error;
    return count || 0;
  }

  static async create(commentData: any) {
    const { data, error } = await supabaseAdmin
      .from('comments')
      .insert([commentData])
      .select('*, users!user_id(username, avatar_url)')
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

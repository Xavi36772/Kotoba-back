import { supabase, supabaseAdmin } from '../config/supabase';

export class FollowModel {
  static async follow(followerId: string, followingId: string) {
    const { data, error } = await supabaseAdmin
      .from('followers')
      .insert([{ follower_id: followerId, following_id: followingId }])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async unfollow(followerId: string, followingId: string) {
    const { error } = await supabaseAdmin
      .from('followers')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);
    if (error) throw error;
    return true;
  }

  static async isFollowing(followerId: string, followingId: string) {
    const { data, error } = await supabase
      .from('followers')
      .select('*')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();
    if (error) throw error;
    return !!data;
  }

  static async getFollowersCount(userId: string) {
    const { count, error } = await supabase
      .from('followers')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', userId);
    if (error) throw error;
    return count || 0;
  }

  static async getFollowingCount(userId: string) {
    const { count, error } = await supabase
      .from('followers')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId);
    if (error) throw error;
    return count || 0;
  }

  static async getFollowers(userId: string) {
    const { data, error } = await supabase
      .from('followers')
      .select('follower_id, users!followers_follower_id_fkey(id, username, avatar_url)')
      .eq('following_id', userId);
    if (error) throw error;
    return data;
  }

  static async getFollowing(userId: string) {
    const { data, error } = await supabase
      .from('followers')
      .select('following_id, users!followers_following_id_fkey(id, username, avatar_url)')
      .eq('follower_id', userId);
    if (error) throw error;
    return data;
  }
}

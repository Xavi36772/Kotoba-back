import { supabaseAdmin } from '../config/supabase';

export class WorkVoteModel {
  static async findByUserAndWork(userId: string, workId: string) {
    const { data, error } = await supabaseAdmin
      .from('work_votes')
      .select('vote')
      .eq('user_id', userId)
      .eq('work_id', workId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async upsert(userId: string, workId: string, vote: number) {
    const { data, error } = await supabaseAdmin
      .from('work_votes')
      .upsert({ user_id: userId, work_id: workId, vote }, { onConflict: 'user_id,work_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async remove(userId: string, workId: string) {
    const { error } = await supabaseAdmin
      .from('work_votes')
      .delete()
      .eq('user_id', userId)
      .eq('work_id', workId);

    if (error) throw error;
    return true;
  }

  static async getWorkStats(workId: string) {
    const { data, error } = await supabaseAdmin
      .from('work_votes')
      .select('vote');

    if (error) throw error;
    const votes = (data || []) as { vote: number }[];
    const total = votes.reduce((sum, v) => sum + v.vote, 0);
    return {
      rating: votes.length > 0 ? Math.max(0, total / votes.length) : 0,
      rating_count: votes.length,
    };
  }
}

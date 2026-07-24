import { supabaseAdmin } from '../config/supabase';

export class FcmTokenModel {
  static async save(userId: string, token: string, platform: string = 'android') {
    const { data, error } = await supabaseAdmin
      .from('user_fcm_tokens')
      .upsert(
        { user_id: userId, token, platform, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,token' }
      )
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  static async getTokensByUser(userId: string) {
    const { data, error } = await supabaseAdmin
      .from('user_fcm_tokens')
      .select('token')
      .eq('user_id', userId);
    if (error) throw error;
    return (data || []).map((row: any) => row.token);
  }

  static async removeByToken(token: string) {
    const { error } = await supabaseAdmin
      .from('user_fcm_tokens')
      .delete()
      .eq('token', token);
    if (error) throw error;
  }
}

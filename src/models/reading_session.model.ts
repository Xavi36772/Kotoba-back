import { supabaseAdmin } from '../config/supabase';

export class ReadingSessionModel {
  static async create(data: {
    user_id: string;
    work_id: string;
    chapter_id: string;
    device_type?: string;
    platform?: string;
  }) {
    const { data: session, error } = await supabaseAdmin
      .from('reading_sessions')
      .insert({
        user_id: data.user_id,
        work_id: data.work_id,
        chapter_id: data.chapter_id,
        device_type: data.device_type || 'unknown',
        platform: data.platform || 'unknown',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return session;
  }

  static async endSession(sessionId: string, durationSeconds: number) {
    const { error } = await supabaseAdmin
      .from('reading_sessions')
      .update({
        ended_at: new Date().toISOString(),
        duration_seconds: durationSeconds,
      })
      .eq('id', sessionId);

    if (error) throw error;
  }

  static async getSessionsByAuthor(authorId: string, limit = 100) {
    const { data, error } = await supabaseAdmin
      .from('reading_sessions')
      .select('*, chapters!inner(title, order_number), works!inner(title)')
      .in('work_id',
        (await supabaseAdmin.from('works').select('id').eq('author_id', authorId)).data?.map((w: any) => w.id) || []
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  }

  static async getHourlyDistribution(authorId: string) {
    const workIds = (await supabaseAdmin.from('works').select('id').eq('author_id', authorId)).data?.map((w: any) => w.id) || [];
    if (workIds.length === 0) return [];

    const { data, error } = await supabaseAdmin
      .from('reading_sessions')
      .select('started_at')
      .in('work_id', workIds);

    if (error) throw error;

    const hours: Record<number, number> = {};
    for (let i = 0; i < 24; i++) hours[i] = 0;
    (data || []).forEach((s: any) => {
      const h = new Date(s.started_at).getHours();
      hours[h] = (hours[h] || 0) + 1;
    });

    return Object.entries(hours).map(([hour, count]) => ({ hour: Number(hour), count }));
  }

  static async getDailyDistribution(authorId: string) {
    const workIds = (await supabaseAdmin.from('works').select('id').eq('author_id', authorId)).data?.map((w: any) => w.id) || [];
    if (workIds.length === 0) return [];

    const { data, error } = await supabaseAdmin
      .from('reading_sessions')
      .select('started_at')
      .in('work_id', workIds);

    if (error) throw error;

    const days: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    (data || []).forEach((s: any) => {
      const d = new Date(s.started_at).getDay();
      days[d] = (days[d] || 0) + 1;
    });

    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return Object.entries(days).map(([day, count]) => ({ day: dayNames[Number(day)], count }));
  }

  static async getDeviceBreakdown(authorId: string) {
    const workIds = (await supabaseAdmin.from('works').select('id').eq('author_id', authorId)).data?.map((w: any) => w.id) || [];
    if (workIds.length === 0) return [];

    const { data, error } = await supabaseAdmin
      .from('reading_sessions')
      .select('device_type')
      .in('work_id', workIds);

    if (error) throw error;

    const devices: Record<string, number> = {};
    (data || []).forEach((s: any) => {
      const d = s.device_type || 'unknown';
      devices[d] = (devices[d] || 0) + 1;
    });

    return Object.entries(devices).map(([device, count]) => ({ device, count }));
  }

  static async getAvgSessionDuration(authorId: string) {
    const workIds = (await supabaseAdmin.from('works').select('id').eq('author_id', authorId)).data?.map((w: any) => w.id) || [];
    if (workIds.length === 0) return 0;

    const { data, error } = await supabaseAdmin
      .from('reading_sessions')
      .select('duration_seconds')
      .in('work_id', workIds)
      .gt('duration_seconds', 0);

    if (error || !data || data.length === 0) return 0;

    const total = data.reduce((sum: number, s: any) => sum + (s.duration_seconds || 0), 0);
    return Math.round(total / data.length);
  }
}

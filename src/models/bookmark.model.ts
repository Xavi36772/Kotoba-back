import { supabase, supabaseAdmin } from '../config/supabase';

export class BookmarkModel {
  static async findByUser(userId: string) {
    const { data, error } = await supabaseAdmin
      .from('bookmarks')
      .select('*, works(*, users!works_author_id_fkey(username), chapters:chapters(count))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((b: any) => ({
      ...b,
      work: b.works
        ? {
            ...b.works,
            author_name: b.works.users?.username || '',
            chapter_count: b.works.chapters?.[0]?.count ?? 0,
            users: undefined,
            chapters: undefined,
          }
        : null,
      works: undefined,
    }));
  }

  static async findByUserAndWork(userId: string, workId: string) {
    const { data, error } = await supabaseAdmin
      .from('bookmarks')
      .select('*')
      .eq('user_id', userId)
      .eq('work_id', workId)
      .maybeSingle();

    if (error) throw error;
    return data;
  }

  static async create(userId: string, workId: string) {
    const { data, error } = await supabaseAdmin
      .from('bookmarks')
      .insert({ user_id: userId, work_id: workId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async remove(userId: string, workId: string) {
    const { error } = await supabaseAdmin
      .from('bookmarks')
      .delete()
      .eq('user_id', userId)
      .eq('work_id', workId);

    if (error) throw error;
    return true;
  }
}

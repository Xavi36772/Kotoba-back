import { supabase, supabaseAdmin } from '../config/supabase';

export class ChapterModel {
  static async findAll() {
    const { data, error } = await supabase
      .from('chapters')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  static async findByWorkId(workId: string) {
    const { data, error } = await supabase
      .from('chapters')
      .select('*')
      .eq('work_id', workId)
      .order('order_number', { ascending: true });
    
    if (error) throw error;
    return data;
  }

  static async findById(id: string) {
    const { data, error } = await supabase
      .from('chapters')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  }

  static async create(chapterData: any) {
    if (chapterData.order_number === undefined) {
      const { data: maxData } = await supabaseAdmin
        .from('chapters')
        .select('order_number')
        .eq('work_id', chapterData.work_id)
        .order('order_number', { ascending: false })
        .limit(1);
      chapterData.order_number = (maxData?.[0]?.order_number ?? 0) + 1;
    }
    const { data, error } = await supabaseAdmin
      .from('chapters')
      .insert([chapterData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async update(id: string, chapterData: any) {
    const { data, error } = await supabaseAdmin
      .from('chapters')
      .update(chapterData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  static async delete(id: string) {
    const { error } = await supabaseAdmin
      .from('chapters')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
}

import { supabase, supabaseAdmin } from '../config/supabase';

export class UserModel {
  static async findAll() {
    const { data, error } = await supabase
      .from('users')
      .select('*');
    if (error) throw error;
    return data;
  }

  static async findById(id: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  static async upsert(id: string, data: any) {
    const { data: result, error } = await supabaseAdmin
      .from('users')
      .upsert({ id, ...data })
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  static async update(id: string, data: any) {
    const { data: updated, error } = await supabaseAdmin
      .from('users')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return updated;
  }
}

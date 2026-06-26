import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';

const BUCKET = 'covers';

export const uploadCover = async (req: Request, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No se envió ningún archivo' });
      return;
    }

    const fileName = `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`;

    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) throw error;

    const { data: publicUrlData } = supabaseAdmin.storage
      .from(BUCKET)
      .getPublicUrl(data.path);

    res.json({ url: publicUrlData.publicUrl });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al subir la imagen' });
  }
};

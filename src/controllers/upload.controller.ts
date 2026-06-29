import { Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserModel } from '../models/user.model';

const COVERS_BUCKET = 'covers';
const AVATARS_BUCKET = 'avatars';

async function ensureBucket(bucketName: string) {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const exists = buckets?.some((b: any) => b.name === bucketName);
  if (!exists) {
    await supabaseAdmin.storage.createBucket(bucketName, {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      fileSizeLimit: 5 * 1024 * 1024, // 5 MB
    });
  }
}

export const uploadCover = async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureBucket(COVERS_BUCKET);

    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No se envió ningún archivo' });
      return;
    }

    const fileName = `${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`;

    const { data, error } = await supabaseAdmin.storage
      .from(COVERS_BUCKET)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) throw error;

    const { data: publicUrlData } = supabaseAdmin.storage
      .from(COVERS_BUCKET)
      .getPublicUrl(data.path);

    res.json({ url: publicUrlData.publicUrl });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al subir la imagen' });
  }
};

export const uploadAvatar = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ensureBucket(AVATARS_BUCKET);

    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No se envió ningún archivo' });
      return;
    }

    const userId = req.user!.id;
    const ext = file.originalname.split('.').pop() || 'jpg';
    const fileName = `avatar_${userId}.${ext}`;

    const { data, error } = await supabaseAdmin.storage
      .from(AVATARS_BUCKET)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) throw error;

    const { data: publicUrlData } = supabaseAdmin.storage
      .from(AVATARS_BUCKET)
      .getPublicUrl(data.path);

    const avatarUrl = publicUrlData.publicUrl;

    // Update user profile with new avatar URL
    const updated = await UserModel.update(userId, { avatar_url: avatarUrl });

    res.json({ url: avatarUrl, user: updated });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al subir el avatar' });
  }
};

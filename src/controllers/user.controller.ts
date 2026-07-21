import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserModel } from '../models/user.model';
import { WorkModel } from '../models/work.model';
import { FollowModel } from '../models/follow.model';

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await UserModel.findAll();
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getUserById = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await UserModel.findById(req.params.id as string);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const authUser = req.user;
    if (!authUser) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }
    const user = await UserModel.findById(authUser.id);
    if (!user) {
      res.status(404).json({ error: 'Perfil no encontrado' });
      return;
    }
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const updateMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const authUser = req.user;
    if (!authUser) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }

    const allowedFields = ['bio', 'avatar_url', 'banner_url', 'username', 'age', 'country', 'paypal_email'];
    const cleanData: Record<string, any> = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) cleanData[key] = req.body[key];
    }

    if (Object.keys(cleanData).length === 0) {
      res.status(400).json({ error: 'No hay campos para actualizar' });
      return;
    }

    const updated = await UserModel.update(authUser.id, cleanData);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getPublicProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.id as string;
    const user = await UserModel.findById(userId);
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    const works = await WorkModel.findByAuthor(userId);
    const publishedWorks = works?.filter((w: any) => w.status !== 'draft').length || 0;
    const totalReads = works?.reduce((sum: number, w: any) => sum + (w.view_count || 0), 0) || 0;

    // Follow stats — wrapped in try/catch in case followers table doesn't exist yet
    let followersCount = 0;
    let followingCount = 0;
    let isFollowedByMe = false;
    try {
      followersCount = await FollowModel.getFollowersCount(userId);
      followingCount = await FollowModel.getFollowingCount(userId);
      if ((req as AuthRequest).user) {
        isFollowedByMe = await FollowModel.isFollowing(
          (req as AuthRequest).user!.id,
          userId
        );
      }
    } catch (_) {
      // Followers table or queries not available yet
    }

    const worksWithAuthor = (works || []).map((w: any) => ({
      ...w,
      author_name: user.username,
    }));

    res.json({
      ...user,
      followers_count: followersCount,
      following_count: followingCount,
      published_works: publishedWorks,
      total_reads: totalReads,
      is_followed_by_me: isFollowedByMe,
      works: worksWithAuthor,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const followUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const followerId = req.user!.id;
    const followingId = req.params.id as string;

    if (followerId === followingId) {
      res.status(400).json({ error: 'No puedes seguirte a ti mismo' });
      return;
    }

    const targetUser = await UserModel.findById(followingId);
    if (!targetUser) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }

    const alreadyFollowing = await FollowModel.isFollowing(followerId, followingId);
    if (alreadyFollowing) {
      res.status(409).json({ error: 'Ya sigues a este usuario' });
      return;
    }

    await FollowModel.follow(followerId, followingId);
    res.status(201).json({ message: 'Ahora sigues a este usuario' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const unfollowUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const followerId = req.user!.id;
    const followingId = req.params.id as string;

    if (followerId === followingId) {
      res.status(400).json({ error: 'No puedes dejarte de seguir a ti mismo' });
      return;
    }

    await FollowModel.unfollow(followerId, followingId);
    res.json({ message: 'Has dejado de seguir a este usuario' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getFollowingAuthors = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const following = await FollowModel.getFollowing(userId) || [];

    const authorsWithWorks = await Promise.all(
      following.map(async (f: any) => {
        const followedUser = f.users || {};
        const works = await WorkModel.findByAuthor(followedUser.id) || [];
        const worksWithAuthor = works.map((w: any) => ({
          ...w,
          author_name: followedUser.username || '',
        }));
        return {
          user: followedUser,
          works: worksWithAuthor,
        };
      })
    );

    res.json(authorsWithWorks);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getAuthorStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const authorId = req.params.authorId as string;
    const works = await WorkModel.findByAuthor(authorId);
    const publishedWorks = works?.filter((w: any) => w.status !== 'draft').length || 0;
    const totalReads = works?.reduce((sum: number, w: any) => sum + (w.view_count || 0), 0) || 0;

    const engagementData = works && works.length > 0
      ? works.slice(-30).map((w: any) => ({
          date: w.updated_at || w.created_at,
          value: w.view_count || Math.floor(Math.random() * 100) + 10,
        }))
      : Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (30 - i) * 86400000).toISOString(),
          value: Math.floor(Math.random() * 50) + 5,
        }));

    let followersCount = 0;
    try {
      followersCount = await FollowModel.getFollowersCount(authorId);
    } catch (_) {}

    res.json({
      activeReaders: totalReads > 0 ? Math.max(1, Math.floor(totalReads / 100)) : Math.floor(Math.random() * 20) + 1,
      totalReads,
      publishedWorks,
      followers: followersCount,
      engagementData,
      nextPublicationDeadline: null,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

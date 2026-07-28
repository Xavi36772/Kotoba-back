import { Router } from 'express';
import { getWorks, getWorkById, createWork, updateWork, deleteWork, incrementWorkView, reindexWorks, getGenres } from '../controllers/work.controller';
import { getChaptersByWorkId } from '../controllers/chapter.controller';
import { getCommentsByWorkId, createWorkComment, getCommentsWithUserLikes } from '../controllers/comment.controller';
import { voteWork, unvoteWork, getWorkVoteAndBookmarkStatus } from '../controllers/vote.controller';
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();

router.get('/', getWorks);
router.get('/genres', getGenres);
router.post('/reindex', verifyToken, reindexWorks);
router.get('/:id', getWorkById);
router.get('/:workId/chapters', getChaptersByWorkId);
router.get('/:workId/comments', getCommentsByWorkId);
router.get('/:workId/comments/with-likes', verifyToken, getCommentsWithUserLikes);
router.post('/:workId/comments', verifyToken, createWorkComment);
router.post('/:workId/view', verifyToken, incrementWorkView);
router.post('/:workId/vote', verifyToken, voteWork);
router.delete('/:workId/vote', verifyToken, unvoteWork);
router.get('/:workId/vote', verifyToken, getWorkVoteAndBookmarkStatus);
router.post('/', verifyToken, createWork);
router.put('/:id', verifyToken, updateWork);
router.delete('/:id', verifyToken, deleteWork);

export default router;

import { Router } from 'express';
import multer from 'multer';
import { uploadCover } from '../controllers/upload.controller';

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.post('/cover', upload.single('image'), uploadCover);

export default router;

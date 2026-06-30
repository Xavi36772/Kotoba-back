import { Router } from 'express';
import { searchWorks } from '../controllers/search.controller';

const router = Router();

router.get('/', searchWorks);

export default router;

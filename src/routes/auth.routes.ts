import { Router } from 'express';
import { register, login, syncDiscordUser } from '../controllers/auth.controller';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/discord', syncDiscordUser);

export default router;

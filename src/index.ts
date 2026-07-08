import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import routes from './routes';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors());
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas peticiones. Intenta de nuevo en 15 minutos.' },
});
app.use('/api', limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', routes);

// Health Check Endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Kotoba API is running' });
});

// Páginas de confirmación de email
app.get('/', (req: Request, res: Response) => {
  res.send(`
    <html><body style="font-family:sans-serif;text-align:center;padding:50px">
      <h1>Kotoba API</h1>
      <p>Servidor funcionando correctamente.</p>
    </body></html>
  `);
});

app.get('/confirmed', (req: Request, res: Response) => {
  res.send(`
    <html><body style="font-family:sans-serif;text-align:center;padding:50px">
      <h1>Email confirmado ✅</h1>
      <p>Tu cuenta ha sido verificada correctamente. Ya puedes iniciar sesión.</p>
    </body></html>
  `);
});

// Start Server
app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});

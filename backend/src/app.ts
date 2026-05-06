import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import authRoutes from './routes/auth.js';
import checklistItemRoutes from './routes/checklist-items.js';
import commAutomationRoutes from './routes/comm-automations.js';
import complianceReportRoutes from './routes/compliance-reports.js';
import deadlineRoutes from './routes/deadlines.js';
import documentRoutes from './routes/documents.js';
import emailRoutes from './routes/emails.js';
import portalRoutes from './routes/portal.js';
import signatureRequestRoutes from './routes/signature-requests.js';
import taskRoutes from './routes/tasks.js';
import transactionRoutes from './routes/transactions.js';
import uploadRoutes from './routes/uploads.js';
import userRoutes from './routes/users.js';

export const app = express();

app.set('trust proxy', 1);
app.use(
  cors({
    origin: env.CORS_ORIGIN.split(',').map((value) => value.trim()),
    credentials: false,
  })
);
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_request, response) => {
  response.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/users', userRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/deadlines', deadlineRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/checklist-items', checklistItemRoutes);
app.use('/api/compliance-reports', complianceReportRoutes);
app.use('/api/signature-requests', signatureRequestRoutes);
app.use('/api/comm-automations', commAutomationRoutes);
app.use('/api/portal', portalRoutes);
app.use('/api/emails', emailRoutes);

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  if (error instanceof Error) {
    return response.status(400).json({ error: error.message });
  }

  return response.status(500).json({ error: 'Internal server error' });
});
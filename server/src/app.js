import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { ConflictError, NotFoundError } from './repository.js';
import { createAuth } from './auth.js';
import {
  ValidationError,
  validateBill,
  validatePayday,
  validateTransaction,
} from './validation.js';

const resources = {
  transactions: { type: 'transaction', validate: validateTransaction },
  bills: { type: 'bill', validate: validateBill },
  paydays: { type: 'payday', validate: validatePayday },
};

function resourceRouter(repo, { type, validate }) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    res.json(await repo.list(type, req.user.id));
  });

  router.post('/', async (req, res) => {
    res.status(201).json(await repo.create(type, req.user.id, validate(req.body)));
  });

  router.put('/:id', async (req, res) => {
    res.json(await repo.update(type, req.user.id, req.params.id, validate(req.body)));
  });

  router.delete('/:id', async (req, res) => {
    await repo.remove(type, req.user.id, req.params.id);
    res.status(204).end();
  });

  return router;
}

export function createApp(repo, { jwtSecret, staticDirectory }) {
  const app = express();
  const auth = createAuth(repo, jwtSecret);
  app.use(cors());
  app.use(express.json({ limit: '16kb' }));
  app.use(auth.initialize);
  app.use('/api/budgeteer/auth', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  }, auth.router);

  app.get('/api/budgeteer/health', (_req, res) => res.json({ status: 'ok' }));

  for (const [path, resource] of Object.entries(resources)) {
    app.use(`/api/budgeteer/${path}`, auth.requireUser, resourceRouter(repo, resource));
  }

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  if (staticDirectory) {
    app.use(express.static(staticDirectory));
    app.get('/{*path}', (_req, res) => {
      res.sendFile(path.join(staticDirectory, 'index.html'));
    });
  }

  app.use((err, _req, res, _next) => {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    if (err instanceof NotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    if (err instanceof ConflictError) {
      return res.status(409).json({ error: err.message });
    }
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Request body is too large' });
    }
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

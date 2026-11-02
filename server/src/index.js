import { loadConfig } from './config.js';
import { createApp } from './app.js';
import { MongoRepository } from './repository.js';
import { fileURLToPath } from 'node:url';

const config = loadConfig();
const repo = await MongoRepository.connect(config.mongo);

const staticDirectory = process.env.NODE_ENV === 'production'
  ? fileURLToPath(new URL('../../client/dist/', import.meta.url))
  : undefined;

const server = createApp(repo, { ...config, staticDirectory }).listen(config.port, () => {
  console.log(`Budgeteer API listening on http://localhost:${config.port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    server.close(async () => {
      await repo.close();
    });
  });
}

export function loadConfig(env = process.env) {
  if (!env.JWT_SECRET || Buffer.byteLength(env.JWT_SECRET) < 32) {
    throw new Error('JWT_SECRET must be set to a random secret of at least 32 bytes');
  }

  const port = Number(env.PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  return {
    port,
    jwtSecret: env.JWT_SECRET,
    mongo: {
      url: env.MONGODB_URL || 'mongodb://10.0.0.244/',
      database: env.MONGODB_DATABASE || 'budgeteer',
    },
  };
}

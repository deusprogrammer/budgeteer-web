import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Passport } from 'passport';
import passportLocal from 'passport-local';
import passportJwt from 'passport-jwt';
import jwt from 'jsonwebtoken';
import { rateLimit } from 'express-rate-limit';
import express from 'express';
import { ValidationError } from './validation.js';

const scrypt = promisify(scryptCallback);
const issuer = 'budgeteer-api';
const audience = 'budgeteer-web';

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64);
  return `${salt}:${key.toString('hex')}`;
}

export async function verifyPassword(password, hash) {
  const [salt, stored] = hash.split(':');
  const key = await scrypt(password, salt, 64);
  const expected = Buffer.from(stored, 'hex');
  return key.length === expected.length && timingSafeEqual(key, expected);
}

function credentials(body, registration = false) {
  const { username, password } = body ?? {};
  if (typeof username !== 'string' || !/^[a-zA-Z0-9_.-]{3,64}$/.test(username.trim())) {
    throw new ValidationError('username must be 3-64 letters, numbers, dots, underscores or hyphens');
  }
  if (typeof password !== 'string' || password.length < (registration ? 12 : 1)
      || Buffer.byteLength(password) > 1024) {
    throw new ValidationError(
      registration ? 'password must be at least 12 characters and at most 1024 bytes' : 'Invalid password',
    );
  }
  return { username: username.trim().toLowerCase(), password };
}

export function createAuth(repo, secret) {
  if (typeof secret !== 'string' || Buffer.byteLength(secret) < 32) {
    throw new Error('JWT secret must be at least 32 bytes');
  }
  const passport = new Passport();
  // Unknown accounts still perform a password hash to reduce username timing leakage.
  const dummyHash = hashPassword(randomBytes(32).toString('hex'));

  passport.use('login', new passportLocal.Strategy(async (username, password, done) => {
    try {
      const user = await repo.findUserByUsername(username.trim().toLowerCase());
      const valid = await verifyPassword(password, user?.passwordHash ?? await dummyHash);
      done(null, valid && user ? user : false);
    } catch (error) {
      done(error);
    }
  }));
  passport.use(new passportJwt.Strategy({
    jwtFromRequest: passportJwt.ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: secret,
    algorithms: ['HS256'],
    issuer,
    audience,
  }, async (payload, done) => {
    try {
      if (typeof payload.sub !== 'string') return done(null, false);
      const user = await repo.findUserById(payload.sub);
      done(null, user || false);
    } catch (error) {
      done(error);
    }
  }));

  const publicUser = ({ id, username }) => ({ id, username });
  const session = (user) => ({
    user: publicUser(user),
    token: jwt.sign({}, secret, {
      algorithm: 'HS256', subject: user.id, expiresIn: '1h', issuer, audience,
    }),
  });
  const requireUser = (req, res, next) => {
    passport.authenticate('jwt', { session: false }, (error, user) => {
      if (error) return next(error);
      if (!user) return res.status(401).json({ error: 'Please sign in again' });
      req.user = user;
      next();
    })(req, res, next);
  };
  const router = express.Router();
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts; try again in 15 minutes' },
  });

  router.post('/register', limiter, async (req, res) => {
    const { username, password } = credentials(req.body, true);
    const user = await repo.createUser(username, await hashPassword(password));
    res.status(201).json(session(user));
  });
  router.post('/login', limiter, (req, res, next) => {
    credentials(req.body);
    passport.authenticate('login', { session: false }, (error, user) => {
      if (error) return next(error);
      if (!user) return res.status(401).json({ error: 'Invalid username or password' });
      res.json(session(user));
    })(req, res, next);
  });
  router.get('/me', requireUser, (req, res) => res.json(publicUser(req.user)));
  return { initialize: passport.initialize(), requireUser, router };
}

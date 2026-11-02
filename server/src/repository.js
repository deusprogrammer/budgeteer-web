import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';

export class NotFoundError extends Error {}
export class ConflictError extends Error {}

function publicDocument({ _id, type: _type, userId: _userId, ...data }) {
  return { id: _id, ...data };
}

export class MongoRepository {
  constructor(client, database) {
    this.client = client;
    this.documents = client.db(database).collection('documents');
    this.users = client.db(database).collection('users');
  }

  static async connect({ url, database }) {
    const client = new MongoClient(url, { serverSelectionTimeoutMS: 5000 });
    try {
      await client.connect();
      const repo = new MongoRepository(client, database);
      await repo.documents.createIndex({ userId: 1, type: 1 });
      await repo.users.createIndex({ username: 1 }, { unique: true });
      return repo;
    } catch (error) {
      await client.close();
      throw error;
    }
  }

  async close() {
    await this.client.close();
  }

  async list(type, userId) {
    const documents = await this.documents.find({ type, userId }).toArray();
    return documents.map(publicDocument);
  }

  async create(type, userId, data) {
    const document = { ...data, _id: `${type}::${randomUUID()}`, type, userId };
    await this.documents.insertOne(document);
    return publicDocument(document);
  }

  async update(type, userId, id, data) {
    const document = { ...data, _id: id, type, userId };
    const result = await this.documents.replaceOne({ _id: id, type, userId }, document);
    if (!result.matchedCount) throw new NotFoundError(`${type} ${id} not found`);
    return publicDocument(document);
  }

  async remove(type, userId, id) {
    const result = await this.documents.deleteOne({ _id: id, type, userId });
    if (!result.deletedCount) throw new NotFoundError(`${type} ${id} not found`);
  }

  async createUser(username, passwordHash) {
    const user = { _id: randomUUID(), username, passwordHash };
    try {
      await this.users.insertOne(user);
    } catch (error) {
      if (error.code === 11000) throw new ConflictError('Username is already registered');
      throw error;
    }
    return { id: user._id, username, passwordHash };
  }

  async findUser(filter) {
    const user = await this.users.findOne(filter);
    return user && { id: user._id, username: user.username, passwordHash: user.passwordHash };
  }

  async findUserByUsername(username) {
    return this.findUser({ username });
  }

  async findUserById(id) {
    return this.findUser({ _id: id });
  }
}

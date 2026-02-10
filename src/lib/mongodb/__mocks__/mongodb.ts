/**
 * Mock implementation of mongodb for testing
 */

export class MongoClient {
  constructor() {}
  connect = jest.fn().mockResolvedValue(undefined);
  close = jest.fn().mockResolvedValue(undefined);
  db = jest.fn();
}

export class Db {}
export class Collection {}

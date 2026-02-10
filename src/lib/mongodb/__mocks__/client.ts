/**
 * Mock implementation of MongoDB client for testing
 */

let mockDb: any = null;

export const setMockDb = (db: any) => {
  mockDb = db;
};

export const getMongoClient = jest.fn(async () => {
  if (!mockDb) {
    throw new Error('Mock DB not set. Call setMockDb() in your test setup.');
  }
  return mockDb;
});

export const closeMongoClient = jest.fn(async () => {
  mockDb = null;
});

export const resetMongoClient = jest.fn(() => {
  mockDb = null;
});

export const isMongoConnected = jest.fn(() => {
  return mockDb !== null;
});

export const pingMongo = jest.fn(async () => {
  return mockDb !== null;
});

export default getMongoClient;

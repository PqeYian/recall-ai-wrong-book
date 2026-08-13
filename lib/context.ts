import { AsyncLocalStorage } from "node:async_hooks";

const storage = new AsyncLocalStorage<string | null>();

export function withUserId<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  return storage.run(userId, fn);
}

export function getCurrentUserId(): string {
  return storage.getStore() ?? "demo-user";
}

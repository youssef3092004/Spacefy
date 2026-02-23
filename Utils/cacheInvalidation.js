import { redisClient } from "../configs/redis.js";

export const invalidateCacheByPattern = async (pattern) => {
  const stream = redisClient.scanIterator({
    MATCH: pattern,
    COUNT: 100,
  });

  for await (const keys of stream) {
    if (Array.isArray(keys)) {
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
      continue;
    }

    if (keys) {
      await redisClient.del(keys);
    }
  }
};

import { redisClient } from "../configs/redis.js";
import process from "process";

export const cacheMiddleware = (keyBuilder, type) => {
  return async (req, res, next) => {
    try {
      const key = keyBuilder(req);
      const cachedData = await redisClient.get(key);

      if (cachedData) {
        return res.status(200).json({
          ...JSON.parse(cachedData),
          source: "cache",
        });
      }

      const originalJson = res.json.bind(res);

      res.json = (body) => {
        // Get TTL from env dynamically
        const ttlEnvKey = `TTL_${type}`;
        const ttl = parseInt(process.env[ttlEnvKey]);

        if (ttl) {
          redisClient.setEx(key, ttl, JSON.stringify(body));
        } else {
          redisClient.set(key, JSON.stringify(body)); // no TTL
        }

        return originalJson(body);
      };

      next();
    } catch (err) {
      next(err);
    }
  };
};

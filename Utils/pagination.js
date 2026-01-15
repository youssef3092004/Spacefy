export const pagination = (req) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 10, 100);
  const skip = (page - 1) * limit;
  const sort = req.query.sort || "createdAt";
  const order = (req.query.order || "desc").toLowerCase();
  return { page, limit, skip, sort, order };
};

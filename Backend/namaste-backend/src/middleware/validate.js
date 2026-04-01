function validate(schema, source = "body") {
  return (req, res, next) => {
    const parsed = schema.safeParse(req[source]);
    if (!parsed.success) {
      const firstMessage = parsed.error.issues?.[0]?.message || "Validation failed";
      if ((req.originalUrl || "").startsWith("/api/v1/auth")) {
        return res.status(400).send(firstMessage);
      }
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message
        }))
      });
    }

    req[source] = parsed.data;
    next();
  };
}

module.exports = validate;

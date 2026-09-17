import rateLimit from 'express-rate-limit';

const jsonMessage = { error: 'Too many requests. Please slow down and try again shortly.' };

export const generalLimiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage,
});

export const searchLimiter = rateLimit({
  windowMs: 60_000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage,
});

export const webhookTestLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage,
});

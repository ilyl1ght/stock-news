import { Router } from 'express';
import { getAllStatuses } from '../providers';
import { getDiscordStatus } from '../alerts/discord';
import { config } from '../config';

export const statusRouter = Router();

statusRouter.get('/', (_req, res) => {
  res.json({
    providers: [...getAllStatuses(), getDiscordStatus()],
    monitorIntervalMinutes: config.monitorIntervalMinutes,
    serverTime: Date.now(),
  });
});

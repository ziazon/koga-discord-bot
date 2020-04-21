import { Benchlogga } from 'benchlogga';
import { Client } from 'discord.js';
import { EntityManager } from 'typeorm';

import { Config } from '../config';
import { LatestKillEvents } from './latest-kill-events';

export async function handleBackgroundProcesses(
  client: Client,
  manager: EntityManager,
  config: Config,
  logger: Benchlogga
) {
  (async function monitorForEvents() {
    const proccess = new LatestKillEvents(client, manager, config, logger);
    try {
      await proccess.execute();
      setTimeout(monitorForEvents, 30 * 1000);
    } catch (error) {
      logger.error(error);
    }
  })();
}

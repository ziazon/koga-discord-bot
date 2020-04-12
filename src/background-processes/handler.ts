import { Benchlogga } from 'benchlogga';
import { Client } from 'discord.js';
import { EntityManager } from 'typeorm';

import { Config } from '../config';

export async function handleBackgroundProcesses(
  client: Client,
  manager: EntityManager,
  config: Config,
  logger: Benchlogga
) {
  // TODO: do stuff with this.
  client;
  manager;
  config;
  logger;
}

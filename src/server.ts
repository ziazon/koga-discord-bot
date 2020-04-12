import 'reflect-metadata';

import { Benchlogga } from 'benchlogga';
import { Client } from 'discord.js';
import { createConnection } from 'typeorm';

import { handleBackgroundProcesses } from './background-processes/handler';
import { handleMessage } from './commands/handler';
import { Config } from './config';
import { DBConfigService } from './db/config';
import { Admin } from './db/entity/admin';

const logger = new Benchlogga('Service');

(async () => {
  const config = new Config();
  const client = new Client();
  const dbConfig = new DBConfigService(config);

  try {
    const connection = await createConnection(dbConfig.config);
    const manager = connection.createEntityManager();
    try {
      await client.login(config.get('DISCORD_TOKEN'));
    } catch (err) {
      logger.error(err);
    }

    client.on('guildCreate', async (guild) => {
      logger.log(`${client.user.username} has joined with user id ${client.user.id} to ${guild.name}`);
      const admin = manager.create(Admin);

      admin.userId = guild.ownerID;
      admin.serverId = guild.id;

      await manager.save(admin);
      logger.log(`${guild.owner.user.username} has been set as bot admin on the server ${guild.name}`);
    });

    client.on('guildDelete', async (guild) => {
      logger.log(`${client.user.username} has left the server ${guild.name}`);
      await manager.delete(Admin, { userId: guild.ownerID });
      logger.log(`${guild.owner.user.username} has been removed as bot admin on the server ${guild.name}`);
    });

    client.on('ready', async () => {
      await client.user.setActivity(config.get('DISCORD_PLAYING_GAME'));
      logger.log(`${client.user.username} has connected with user id ${client.user.id}`);
    });

    client.on('message', (message) => {
      if (message.mentions.users.get(client.user.id)) handleMessage(config, manager, client, message, logger);
    });

    await handleBackgroundProcesses(client, manager, config, logger);
  } catch (err) {
    logger.error(err);
  }
})();

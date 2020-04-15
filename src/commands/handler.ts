import { Benchlogga } from 'benchlogga';
import { Client, Message, TextChannel } from 'discord.js';
import { EntityManager } from 'typeorm';

import { Config } from '../config';
import { BotUsage } from './bot-usage';
import { ClearChannel } from './channel-clear';
import { ServerStatus } from './servers-status';
import { Command } from './types';

export function handleMessage(
  config: Config,
  manager: EntityManager,
  client: Client,
  message: Message,
  logger: Benchlogga
) {
  const channel = message.channel as TextChannel;
  const commandString = message.cleanContent.slice(client.user.username.length + 1).trim();

  const commands: Command[] = [
    new ClearChannel(manager, channel, message, logger),
    new ServerStatus(config, channel, message, logger)
  ];

  const command = commands.find((command) => commandString.match(command.regex));

  if (!command) return new BotUsage(commands, channel, message, logger).exec();

  try {
    command.exec(commandString);
  } catch (error) {
    message.reply(`'${commandString}' didn't work.`);
    logger.error(error);
  }
}

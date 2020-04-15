import { Benchlogga } from 'benchlogga';
import { Message, TextChannel } from 'discord.js';
import { EntityManager } from 'typeorm';

import { Config } from '../config';
import { Command } from './types';
import { adminCheck } from './utils/admin-check';

export async function channelClear(
  isAdmin: boolean,
  config: Config,
  channel: TextChannel,
  message: Message,
  logger: Benchlogga
) {
  logger.log(`${message.author.username} asked to clear the channel '${channel.name}'.`);

  if (!isAdmin) return await message.reply('You need permissions to do that.');

  const messages = await channel.messages.fetch();

  try {
    await channel.bulkDelete(messages);
  } catch (error) {
    logger.error(error.message);
    message.reply(`Sorry! ${error.message}.`);
  }
}

export class ClearChannel implements Command {
  public regex = new RegExp(/^channel clear$/);
  public signature = 'channel clear';
  public description = 'Admin Only. Clear all messages from this channel.';

  constructor(
    private manager: EntityManager,
    private channel: TextChannel,
    private message: Message,
    private logger: Benchlogga
  ) {}

  async exec() {
    this.logger.log(`${this.message.author.username} asked to clear the channel '${this.channel.name}'.`);

    const isAdmin = await adminCheck(this.manager, this.channel.guild.id, this.message.author.id);

    if (!isAdmin) {
      await this.message.reply('You need permissions to do that.');
      return;
    }

    await this.clearAllMessages();
    this.logger.log(`${this.channel.name} cleared.`);
  }

  private async clearAllMessages() {
    const messages = await this.channel.messages.fetch({ limit: 100 });
    if (messages.size) {
      try {
        await this.channel.bulkDelete(messages);
        this.logger.log(`Cleared messages: ${messages.size}`);
        await this.clearAllMessages();
      } catch (error) {
        this.logger.error(error.message);
        this.message.reply(`Sorry! ${error.message}.`);
      }
    }
  }
}

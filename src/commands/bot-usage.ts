import { Benchlogga } from 'benchlogga';
import { Message, MessageEmbed, TextChannel } from 'discord.js';

import { Command } from './types';

export class BotUsage implements Command {
  public regex = new RegExp(/^usage$/);
  public signature = 'usage';
  public description = 'Get the usage guide for this bot (this message).';

  constructor(
    private commands: Command[],
    private channel: TextChannel,
    private message: Message,
    private logger: Benchlogga
  ) {}

  async exec() {
    this.logger.log(`${this.message.author.username} asked for the bot usage guide.`);
    const fields = this.commands.map((command) => ({
      name: command.signature,
      value: command.description
    }));
    const response = new MessageEmbed()
      .setTitle('Usage')
      .setDescription('Use the following commands to use this bot.  All commands should be prefixed with my username.')
      .addFields({ name: '\u200B', value: '\u200B' }, { name: this.signature, value: this.description }, ...fields)
      .setTimestamp();

    this.channel.send(response);
  }
}

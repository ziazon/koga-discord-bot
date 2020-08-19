import { Benchlogga } from 'benchlogga';
import { EmbedFieldData, Message, MessageEmbed, TextChannel } from 'discord.js';

import { AlbionClient } from '../../clients/albion-api';
import { Config } from '../../config';
import { Command } from '../types';

export class AlbionServerStatus implements Command {
  public regex = new RegExp(/^albion servers status$/);
  public signature = 'albion servers status';
  public description = 'Get the Albion Online servers status.';

  constructor(
    private config: Config,
    private channel: TextChannel,
    private message: Message,
    private logger: Benchlogga
  ) {}

  async exec() {
    this.logger.log(`${this.message.author.username} asked for the Albion Servers status.`);

    const client = new AlbionClient(this.config.get('ALBION_API_BASE'), this.config.get('ALBION_SERVER_STATUS_URLS'));
    const statuses = await client.getServerStatus();

    const statusesFields = statuses.map<EmbedFieldData>((row) => ({
      name: row.server,
      value: `Status: ${row.status}\nMessage: ${row.message}`
    }));

    const response = new MessageEmbed()
      .setTitle('Albion Servers Status')
      .addFields({ name: '\u200B', value: '\u200B' }, ...statusesFields)
      .setTimestamp();

    this.channel.send(response);
  }
}

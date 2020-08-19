import { Benchlogga } from 'benchlogga';
import { Message, TextChannel } from 'discord.js';
import * as Jimp from 'jimp';

import { AlbionClient } from '../../clients/albion-api';
import { Command } from '../../commands/types';
import { Config } from '../../config';
import { KillDetails } from './utils/compile-kill-message';

export class AlbionEventReport implements Command {
  public regex = new RegExp(/^albion event report (win|loss) (.+)$/);
  public signature = 'albion event report [win|loss] [eventId]';
  public description = 'Get details for a specific Albion Online event by the id';

  constructor(
    private config: Config,
    private channel: TextChannel,
    private message: Message,
    private logger: Benchlogga
  ) {}

  async exec(commandString: string) {
    const matches = commandString.match(this.regex);
    const victory = matches[1] === 'win';
    const eventId = matches[2];

    this.logger.log(
      `${this.message.author.username} asked to get details on the last kill of ${eventId} in the channel ${this.channel.name}.`
    );

    const client = new AlbionClient(this.config.get('ALBION_API_BASE'), this.config.get('ALBION_SERVER_STATUS_URLS'));
    const event = await client.getEventById(+eventId);

    if (!event) {
      this.message.reply(`No Event found with the id ${event}.`);
      return;
    }

    const textFont = await Jimp.loadFont(this.config.get('FONT_PATH') || Jimp.FONT_SANS_32_BLACK);
    const countFont = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);

    const killDetails = new KillDetails(this.config, client, this.logger, victory, event, textFont, countFont);

    const messages = await killDetails.getMessages();

    for (let index = 0; index < messages.length; index++) {
      const message = messages[index];
      await this.channel.send(message);
    }
    await this.message.delete();
    this.logger.log('killboard detail command done executing');
  }
}

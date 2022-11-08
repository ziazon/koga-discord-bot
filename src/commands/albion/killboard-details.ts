import { Benchlogga } from 'benchlogga';
import { Message, TextChannel } from 'discord.js';
import * as Jimp from 'jimp';

import { AlbionClient } from '../../clients/albion-api';
import { Command } from '../../commands/types';
import { Config } from '../../config';
import { KillDetails } from './utils/compile-kill-message';

export class AlbionKillboardDetails implements Command {
  public regex = new RegExp(/^albion killboard details (.+)$/);
  public signature = 'albion killboard details [player]';
  public description = 'Get last death details for a player in Albion Online.';

  constructor(
    private config: Config,
    private channel: TextChannel,
    private message: Message,
    private logger: Benchlogga
  ) {}

  async exec(commandString: string) {
    const matches = commandString.match(this.regex);
    const playerName = matches[1];

    this.logger.log(
      `${this.message.author.username} asked to get details on the last kill of ${playerName} in the channel ${this.channel.name}.`
    );

    const client = new AlbionClient(this.config.get('ALBION_API_BASE'), this.config.get('ALBION_SERVER_STATUS_URLS'));
    const player = await client.getPlayerSummary(playerName);

    if (!player) {
      this.message.reply('Player not found.');
      return;
    }
    const [latestDeath] = await client.getRecentDeaths(player.Id);
    if (!latestDeath) {
      this.message.reply(`${player.Name} has never been killed!`);
      return;
    }
    const victory = playerName.toLowerCase() === latestDeath.Killer.Name.toLowerCase();
    const textFont = await Jimp.loadFont(this.config.get('FONT_PATH') || Jimp.FONT_SANS_32_BLACK);
    const countFont = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);

    const killDetails = new KillDetails(this.config, client, this.logger, victory, latestDeath, textFont, countFont);

    const messages = await killDetails.getMessages();

    // for (let index = 0; index < messages.length; index++) {
    //   const message = messages[index];
    //   await this.channel.send(message);
    // }
    this.logger.log('killboard detail command done executing');
  }
}

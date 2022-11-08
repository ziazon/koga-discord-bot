import { Benchlogga } from 'benchlogga';
import { Message, TextChannel } from 'discord.js';
import { EntityManager } from 'typeorm';

import { AlbionClient } from '../../clients/albion-api';
import { Command } from '../../commands/types';
import { adminCheck } from '../../commands/utils/admin-check';
import { Config } from '../../config';
import { Monitor } from '../../db/entity/monitor';
import { AlbionMonitorType } from '../../types';

export class AlbionKillboardMonitor implements Command {
  private client: AlbionClient;
  public regex = new RegExp(/^albion killboard monitor (start|stop) (player|guild) (.+)$/);
  public signature = 'albion killboard monitor [start,stop] [player,guild] [targetName]';
  public description = 'Admin Only. Subscribe to Albion Online player, or guild kills and deaths in this channel.';

  constructor(
    private config: Config,
    private manager: EntityManager,
    private channel: TextChannel,
    private message: Message,
    private logger: Benchlogga
  ) {
    this.client = new AlbionClient(config.get('ALBION_API_BASE'), config.get('ALBION_SERVER_STATUS_URLS'));
  }

  async exec(commandString: string) {
    this.logger.log(`${this.message.author.username} asked to subscribe to kills in the channel ${this.channel.name}.`);
    const isAdmin = await adminCheck(this.manager, this.channel.guild.id, this.message.author.id);

    if (!isAdmin) {
      this.logger.log(`${this.message.author.username} doesn't have permissions to use this command.`);
      await this.message.reply('You need permissions to do that.');
      return;
    }

    const [fullCommand, action, monitorType, monitorValue] = commandString.match(this.regex);

    this.logger.log(`${this.message.author.username} ran '${fullCommand}' in ${this.channel.name}.`);

    const monitorId = await this.getMonitorId(monitorType, monitorValue);

    if (action === 'start') {
      1;
      const existingMonitorRecords = await this.getExistingMonitorRecordsCount(
        this.channel.guild.id,
        this.channel.id,
        monitorType,
        monitorId
      );

      if (existingMonitorRecords) {
        await this.channel.send(
          `I am already monitoring events for the ${monitorType} ${monitorValue} in this channel.`
        );
        return;
      }

      const monitor = this.manager.create(Monitor);
      monitor.serverId = parseInt(this.channel.guild.id);
      monitor.channelId = parseInt(this.channel.id);
      monitor.monitorType = monitorType as AlbionMonitorType;
      monitor.monitorId = monitorId;
      await this.manager.save(monitor);
      await this.channel.send(
        `I will monitor for events for the ${monitorType} ${monitorValue} and post them to this channel.`
      );
    } else if (action === 'stop') {
      await this.manager.delete(Monitor, {
        serverId: this.channel.guild.id,
        channelId: this.channel.id,
        monitorType,
        monitorValue
      });
      await this.channel.send(
        `I will no longer be posting events for the ${monitorType} ${monitorValue} to this channel.`
      );
    }
  }

  private async getExistingMonitorRecordsCount(serverId, channelId, monitorType, monitorId) {
    return await this.manager
      .createQueryBuilder(Monitor, 'monitor')
      .where(
        'monitor.server_id = :serverId and monitor.channel_id = :channelId and monitor_type = :monitorType and monitor_id = :monitorId',
        {
          serverId,
          channelId,
          monitorType,
          monitorId
        }
      )
      .getCount();
  }

  private async getMonitorId(monitorType: string, monitorValue: string) {
    if (monitorType === 'player') {
      const { Id } = await this.client.getPlayerSummary(monitorValue);
      return Id;
    } else if (monitorType === 'guild') {
      const { Id } = await this.client.getGuildSummary(monitorValue);
      return Id;
    }
  }
}

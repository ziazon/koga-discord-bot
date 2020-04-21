import { Benchlogga } from 'benchlogga';
import { Client, MessageOptions, TextChannel } from 'discord.js';
import * as Jimp from 'jimp';
import { EntityManager } from 'typeorm';

import { AlbionClient, Event } from '../clients/albion-api';
import { KillDetails } from '../commands/utils/compile-kill-message';
import { Config } from '../config';
import { Monitor } from '../db/entity/monitor';

import moment = require('moment');

export class LatestKillEvents {
  private albionClient: AlbionClient;
  constructor(
    private discordClient: Client,
    private manager: EntityManager,
    private config: Config,
    private logger: Benchlogga
  ) {
    this.albionClient = new AlbionClient(config.get('ALBION_API_BASE'), config.get('ALBION_SERVER_STATUS_URLS'));
  }

  async execute() {
    const monitors = await this.manager.find(Monitor);
    const textFont = await Jimp.loadFont(this.config.get('FONT_PATH') || Jimp.FONT_SANS_32_BLACK);
    const countFont = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);

    let messages: MessageOptions[] = [];

    for (let mi = 0; mi < monitors.length; mi++) {
      const monitor = monitors[mi];
      const channel = (await this.discordClient.channels.fetch(monitor.channelId)) as TextChannel;
      const rawEvents = await this.getAllEvents(+monitor.lastEventId);
      const latestEventId = rawEvents[0]?.EventId;
      const events = rawEvents.reverse();

      this.logger.log(`fetched ${events.length} events for processing.`);

      for (let ei = 0; ei < events.length; ei++) {
        const event = events[ei];
        if (this.shouldProcessEvent(monitor, event)) {
          const victory = monitor.monitorId === event.Killer.GuildId;
          const killDetails = new KillDetails(
            this.config,
            this.albionClient,
            this.logger,
            victory,
            event,
            textFont,
            countFont
          );
          try {
            const killMessages = await killDetails.getMessages();
            messages = messages.concat(killMessages);
          } catch (error) {
            this.logger.error(error);
          }
        }
      }
      // TODO: refactor this to move it outside of this for loop.
      try {
        await this.manager.findOneOrFail(Monitor, monitor.id);
        for (let index = 0; index < messages.length; index++) {
          const message = messages[index];
          await channel.send(message);
        }
        if (rawEvents.length) {
          monitor.lastEventId = `${latestEventId}`;
          monitor.lastMessageAt = moment();
          this.manager.save(monitor);
        }
      } catch (error) {
        this.logger.error(error);
      }
    }
  }

  private shouldProcessEvent(monitor: Monitor, event: Event) {
    if (monitor.monitorType === 'guild') {
      return event.Killer.GuildId === monitor.monitorId || event.Victim.GuildId === monitor.monitorId;
    } else if (monitor.monitorType === 'player') {
      return event.Killer.Id === monitor.monitorId || event.Victim.Id === monitor.monitorId;
    } else {
      return false;
    }
  }

  private async getAllEvents(lastEventId: number, offset: number = 0, limit: number = 51) {
    let events: Event[] = [];
    try {
      const rawEvents = await this.albionClient.getRecentKills({
        limit,
        offset
      });
      if (rawEvents.length == 0) return [];
      let markerEventId = 0;
      rawEvents.forEach((event) => {
        if (lastEventId < event.EventId) {
          events.push(event);
          markerEventId = event.EventId;
        } else {
          markerEventId = lastEventId;
        }
      });

      if (lastEventId !== 0 && lastEventId < markerEventId && offset < 1000) {
        const moreEvents = await this.getAllEvents(lastEventId, offset + limit - 1);
        events = [...events, ...moreEvents];
      }
    } catch (error) {
      this.logger.error(error);
      if (offset <= 1000) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const moreEvents = await this.getAllEvents(lastEventId, offset, limit);
        events = [...events, ...moreEvents];
      }
    }
    return events;
  }
}

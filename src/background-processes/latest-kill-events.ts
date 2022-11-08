import { Benchlogga } from 'benchlogga';
import { Client, TextChannel } from 'discord.js';
import * as Jimp from 'jimp';
import { EntityManager } from 'typeorm';

import { Font } from '@jimp/plugin-print';

import { AlbionClient, Event } from '../clients/albion-api';
import { KillDetails } from '../commands/albion/utils/compile-kill-message';
import { Config } from '../config';
import { LastEvent } from '../db/entity/last-event';
import { Monitor } from '../db/entity/monitor';
import { AlbionMonitorType } from '../types';

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
    const lastEvent = await this.manager.findOne(LastEvent, {});
    const textFont = await Jimp.loadFont(this.config.get('FONT_PATH') || Jimp.FONT_SANS_32_BLACK);
    const countFont = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);

    const rawEvents = await this.getAllEvents(+lastEvent.lastEventId);
    const latestEventId = rawEvents[0]?.EventId;
    const events = rawEvents.reverse();

    this.logger.log(`fetched ${events.length} events for processing.`);

    for (let ei = 0; ei < events.length; ei++) {
      const event = events[ei];
      const monitorsForEvent = this.getMonitorsForEvent(monitors, event);
      await this.sendEventForMonitors(monitorsForEvent, event, textFont, countFont);
    }

    if (latestEventId) {
      lastEvent.lastEventId = `${latestEventId}`;
      lastEvent.lastMessageAt = moment();
      this.manager.save(lastEvent);
    }
  }

  private async sendEventForMonitors(monitors: Monitor[], event: Event, textFont: Font, countFont: Font) {
    // let messages: MessageOptions[] = [];

    for (let i = 0; i < monitors.length; i++) {
      const monitor = monitors[i];
      const channel = (await this.discordClient.channels.fetch(`${monitor.channelId}`)) as TextChannel;
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
        // messages = messages.concat(killMessages);
      } catch (error) {
        this.logger.error(error);
      }

      // for (let index = 0; index < messages.length; index++) {
      //   const message = messages[index];
      //   await channel.send(message);
      // }
    }
  }

  private getMonitorsForEvent(monitors: Monitor[], event: Event) {
    return monitors.filter((monitor) => {
      const isGuildEvent =
        monitor.monitorType === AlbionMonitorType.GUILD &&
        (event.Killer.GuildId === monitor.monitorId || event.Victim.GuildId === monitor.monitorId);
      const isPlayerEvent =
        monitor.monitorType === AlbionMonitorType.PLAYER &&
        (event.Killer.Id === monitor.monitorId || event.Victim.Id === monitor.monitorId);

      if (isGuildEvent || isPlayerEvent) return true;
    });
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

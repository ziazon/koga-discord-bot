import { Interaction, SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder } from 'discord.js';
import { EntityManager } from 'typeorm';

export enum AlbionMonitorType {
  PLAYER = 'player',
  GUILD = 'guild',
  ALLIANCE = 'alliance'
}

export enum NewWorldDay {
  Daybreak = 'daybreak',
  Nightfall = 'nightfall'
}

export enum NewWorldDayPeriodAction {
  SetTime = 'set',
  GetTime = 'get'
}

export interface KogaCommand {
  data: SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder;
  execute: (manager: EntityManager, interaction: Interaction) => Promise<void>;
}

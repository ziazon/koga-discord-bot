import {
  ActionRowBuilder,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle
} from 'discord.js';
import * as moment from 'moment';
import { EntityManager } from 'typeorm';

import { Config } from '../../config';
import { KogaCommand, NewWorldDay, NewWorldDayPeriodAction } from '../../types';
import { addDayPeriodCommand, getTimetable, getTimetableCommand } from './day-period';

class NewWorld implements KogaCommand {
  data = new SlashCommandBuilder()
    .setName('new-world-day')
    .setDescription('Provides commands for New World.')
    .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)
    .setDMPermission(false)
    .addSubcommand(getTimetableCommand)
    .addSubcommand(addDayPeriodCommand(NewWorldDay.Daybreak))
    .addSubcommand(addDayPeriodCommand(NewWorldDay.Nightfall));
  async execute(manager: EntityManager, config: Config, interaction) {
    const subCommand = interaction.options.getSubcommand();
    if (subCommand === NewWorldDayPeriodAction.GetTime) {
      const timetableMessage = await getTimetable(config, manager, interaction.guildId);
      await interaction.reply(timetableMessage);
    } else if ([NewWorldDay.Daybreak, NewWorldDay.Nightfall].includes(subCommand)) {
      const now = moment().format('HH:mm');
      const modal = new ModalBuilder()
        .setCustomId('set-new-world-time-modal')
        .setTitle(`${NewWorldDayPeriodAction.SetTime} Modal`);
      const periodInput = new TextInputBuilder()
        .setCustomId('new-world-period-input')
        .setLabel('Do not modify this field.')
        .setValue(subCommand)
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
      const timeInput = new TextInputBuilder()
        .setCustomId('new-world-period-time-input')
        .setLabel(`What time did ${subCommand} occur?`)
        .setValue(now)
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const timeInputRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(timeInput);
      const periodInputRow = new ActionRowBuilder<ModalActionRowComponentBuilder>().addComponents(periodInput);
      modal.addComponents(timeInputRow, periodInputRow);

      await interaction.showModal(modal);
    }
  }
}

export default new NewWorld();

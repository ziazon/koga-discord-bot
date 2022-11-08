import { EmbedBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import * as Moment from 'moment';
import { extendMoment } from 'moment-range';
import { EntityManager } from 'typeorm';

import { NewWorldCircadianRhythm } from '../../db/entity/new-world-circadian-rhythm';
import { NewWorldDay } from '../../types';

const moment = extendMoment(Moment);

export const getTimetableCommand = (subcommand: SlashCommandSubcommandBuilder) =>
  subcommand
    .setName('get')
    .setDescription(
      `Provides a method to fetch the New World ${NewWorldDay.Daybreak} and ${NewWorldDay.Nightfall} times`
    );

export const addDayPeriodCommand = (command: NewWorldDay) => (subcommand: SlashCommandSubcommandBuilder) =>
  subcommand
    .setName(command)
    .setDescription(
      `Provides method to set the New World ${NewWorldDay.Daybreak} and ${NewWorldDay.Nightfall} times using a single ${command} time.`
    );

export const getTimetable = async (manager: EntityManager, serverId: string) => {
  const record = await manager.findOneByOrFail(NewWorldCircadianRhythm, { serverId });

  const cycleMinutes = {
    [NewWorldDay.Daybreak]: 60,
    [NewWorldDay.Nightfall]: 30
  };

  const daybreak =
    record.stage === NewWorldDay.Daybreak
      ? moment(record.time, 'kk:mm:ss')
      : moment(record.time, 'kk:mm:ss').add(cycleMinutes[NewWorldDay.Nightfall], 'minutes');

  const nightfall =
    record.stage === NewWorldDay.Nightfall
      ? moment(record.time, 'kk:mm:ss')
      : moment(record.time, 'kk:mm:ss').add(cycleMinutes[NewWorldDay.Daybreak], 'minutes');

  const tomorrowDaybreak = moment(daybreak).add(1, 'day');
  const tomorrowNightfall = moment(nightfall).add(1, 'day');

  const daybreakRange = Array.from(
    moment.range(daybreak, tomorrowDaybreak).by('minute', { step: 90, excludeEnd: true })
  );
  const nightfallRange = Array.from(
    moment.range(nightfall, tomorrowNightfall).by('minute', { step: 90, excludeEnd: true })
  );

  const embed1 = new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle('New World Daybreak Times')
    .setDescription('This bot was created to allow our members to easily lookup the Daybreak and Nightfall times.')
    .setAuthor({
      name: 'Like this bot? donate!',
      url: 'https://www.patreon.com/jubeizon'
    })
    .addFields(
      daybreakRange.map((date) => ({ name: date.format('hh:mm a'), value: date.format('hh:mm a'), inline: true }))
    )
    .setTimestamp();

  const embed2 = new EmbedBuilder()
    .setColor(0x0099ff)
    .setTitle('New World Nightfall Times')
    .setDescription('This bot was created to allow our members to easily lookup the Daybreak and Nightfall times.')
    .setAuthor({
      name: 'Like this bot? donate!',
      url: 'https://www.patreon.com/jubeizon'
    })
    .addFields(
      nightfallRange.map((date) => ({ name: date.format('hh:mm a'), value: date.format('hh:mm a'), inline: true }))
    )
    .setTimestamp();

  return { embeds: [embed1, embed2] };
};

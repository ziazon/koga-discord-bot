import { AttachmentBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import * as Jimp from 'jimp';
import * as Moment from 'moment';
import { extendMoment } from 'moment-range';
import { EntityManager } from 'typeorm';

import { Font } from '@jimp/plugin-print';

import { Config } from '../../config';
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

export const getTimetable = async (config: Config, manager: EntityManager, serverId: string) => {
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

  // const embed1 = new EmbedBuilder()
  //   .setColor(0x0099ff)
  //   .setTitle('New World Daybreak Times')
  //   .setDescription('This bot was created to allow our members to easily lookup the Daybreak and Nightfall times.')
  //   .setAuthor({
  //     name: 'Like this bot? donate!',
  //     url: 'https://www.patreon.com/jubeizon'
  //   })
  //   .addFields(
  //     daybreakRange.map((date) => ({ name: date.format('hh:mm a'), value: date.format('hh:mm a'), inline: true }))
  //   )
  //   .setTimestamp();

  // const embed2 = new EmbedBuilder()
  //   .setColor(0x0099ff)
  //   .setTitle('New World Nightfall Times')
  //   .setDescription('This bot was created to allow our members to easily lookup the Daybreak and Nightfall times.')
  //   .setAuthor({
  //     name: 'Like this bot? donate!',
  //     url: 'https://www.patreon.com/jubeizon'
  //   })
  //   .addFields(
  //     nightfallRange.map((date) => ({ name: date.format('hh:mm a'), value: date.format('hh:mm a'), inline: true }))
  //   )
  //   .setTimestamp();
  const details = await buildImage(config, daybreakRange, nightfallRange);
  const name = `new-world-time-table-${moment().format()}.png`;
  const file = new AttachmentBuilder(details, { name });

  // const embed = new EmbedBuilder().setTitle('New world Cycle').setImage(`attachment://${name}`);

  // return { embeds: [embed], files: [file] };

  return {
    files: [file],
    embed: {
      image: {
        url: `attachment://${name}`
      }
    }
  };
};

const buildImage = async (
  config: Config,
  daybreakRange: Array<Moment.Moment>,
  nightfallRange: Array<Moment.Moment>
) => {
  const font = await Jimp.loadFont(config.get('FONT_PATH') || Jimp.FONT_SANS_32_WHITE);
  const creditFont = await Jimp.loadFont(config.get('FONT_PATH') || Jimp.FONT_SANS_16_WHITE);
  try {
    const image = await Jimp.read(`${config.get('PWD')}/assets/timetable-background.jpg`);
    const lineHeight = 35;
    const dx = lineHeight;
    let dy = 20;
    const nx = lineHeight + 200;
    let ny = 20;
    const daybreakTitle = buildCenteredText(font, 'Daybreak');
    const nightfallTitle = buildCenteredText(font, 'Nightfall');
    const credit = buildCenteredText(creditFont, 'Provided by Jubei', 5);
    const textCanvasWidth = image.getWidth() - image.getWidth() * 0.4;
    const textCanvasHeight = image.getHeight();
    const textCanvas = new Jimp(textCanvasWidth, textCanvasHeight, '#000000').opacity(0.6);

    textCanvas.composite(daybreakTitle, dx, dy);
    dy = dy + lineHeight;

    textCanvas.composite(nightfallTitle, nx, ny);
    ny = ny + lineHeight;

    const cx = 20;
    const cy = textCanvas.getHeight() - credit.getHeight();
    textCanvas.composite(credit, cx, cy);

    for (const key in daybreakRange) {
      const time = daybreakRange[key].format('hh:mm a');
      const timeImage = buildCenteredText(font, time);
      textCanvas.composite(timeImage, dx, dy);
      dy = dy + lineHeight;
    }
    for (const key in nightfallRange) {
      const time = nightfallRange[key].format('hh:mm a');
      const timeImage = buildCenteredText(font, time);
      textCanvas.composite(timeImage, nx, ny);
      ny = ny + lineHeight;
    }
    image.composite(textCanvas, 0, 0);
    return await image.getBufferAsync(Jimp.MIME_PNG);
  } catch (error) {
    console.log(error);
  }
};

const buildCenteredText = (font: Font, text: string, heightBuffer = 4) => {
  const width = Jimp.measureText(font, text);
  const height = font.info.size + heightBuffer;
  const image = new Jimp(width, height);

  return image.print(font, 0, 0, text, width, height);
};

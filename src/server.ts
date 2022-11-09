import 'reflect-metadata';

import { Benchlogga } from 'benchlogga';
import { validateOrReject } from 'class-validator';
import { Client, Events, GatewayIntentBits, REST, Routes } from 'discord.js';
import { DataSource } from 'typeorm';

import { commands } from './commands';
import { getTimetable } from './commands/new-world/day-period';
import { Config } from './config';
import { DBConfigService } from './db/config';
import { Admin } from './db/entity/admin';
import { NewWorldCircadianRhythm } from './db/entity/new-world-circadian-rhythm';
import { NewWorldTimeModalInput } from './new-world-time-modal-input.dto';
import { NewWorldDay } from './types';

const logger = new Benchlogga('Service');

const registerCommands = async (clientId: string, token: string) => {
  const body = commands.map((command) => command.data.toJSON());
  const rest = new REST({ version: '10' }).setToken(token);

  try {
    logger.log(`Started refreshing ${body.length} application (/) commands.`);

    const data = (await rest.put(Routes.applicationCommands(clientId), { body })) as unknown[];

    logger.log(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    logger.error(error);
  }
};

(async () => {
  const config = new Config();
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildBans,
      GatewayIntentBits.GuildEmojisAndStickers,
      GatewayIntentBits.GuildIntegrations,
      GatewayIntentBits.GuildWebhooks,
      GatewayIntentBits.GuildInvites,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildMessageTyping,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.DirectMessageReactions,
      GatewayIntentBits.DirectMessageTyping,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildScheduledEvents
    ]
  });

  const dbConfig = new DBConfigService(config);
  const appDataSource = new DataSource(dbConfig.config);

  client.once(Events.ClientReady, (c) => {
    logger.log(`Ready! Logged in as ${c.user.tag}`);
  });

  try {
    const clientId = config.get('DISCORD_CLIENT_ID');
    const token = config.get('DISCORD_TOKEN');
    const playing = config.get('DISCORD_PLAYING_GAME');

    await registerCommands(clientId, token);

    const connection = await appDataSource.initialize();
    const manager = connection.createEntityManager();
    try {
      await client.login(token);
    } catch (err) {
      logger.error(err);
    }

    client.on(Events.GuildCreate, async (guild) => {
      logger.log(`${client.user.username} has joined with user id ${client.user.id} to ${guild.name}`);
      const admin = manager.create(Admin);

      admin.userId = guild.ownerId;
      admin.serverId = guild.id;

      await manager.save(admin);
      const owner = await guild.fetchOwner();
      logger.log(`${owner.user.username} has been set as bot admin on the server ${guild.name}`);
    });

    client.on(Events.GuildDelete, async (guild) => {
      logger.log(`${client.user.username} has left the server ${guild.name}`);
      await manager.delete(Admin, { userId: guild.ownerId });
      const owner = await guild.fetchOwner();
      logger.log(`${owner.user.username} has been removed as bot admin on the server ${guild.name}`);
    });

    client.on(Events.ClientReady, async () => {
      client.user.setActivity(playing);
      logger.log(`${client.user.username} has connected with user id ${client.user.id}`);
    });

    client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      const command = commands.get(interaction.commandName);
      logger.log(interaction.commandName);
      if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
      }

      try {
        await command.execute(manager, config, interaction);
      } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
      }
    });

    client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isModalSubmit()) return;
      if (interaction.customId === 'set-new-world-time-modal') {
        const data = new NewWorldTimeModalInput();
        const userId = interaction.user.id;
        const serverId = interaction.guildId;
        data.stage = interaction.fields.getTextInputValue('new-world-period-input') as NewWorldDay;
        data.time = interaction.fields.getTextInputValue('new-world-period-time-input');
        data.userId = userId;
        data.serverId = serverId;

        try {
          await validateOrReject(data, { skipMissingProperties: true });
          const existing = await manager.findOneBy(NewWorldCircadianRhythm, { serverId });
          if (existing) data.id = existing.id;
          await manager.save(NewWorldCircadianRhythm, data);
          const timetableMessage = await getTimetable(config, manager, serverId);
          await interaction.reply(timetableMessage);
        } catch (errors) {
          await interaction.reply(`Validation Failed. Errors: ${errors}`);
        }
      }
    });

    // client.on('messageCreate', async (message) => {
    //   // if (message.mentions.users.get(client.user.id)) {
    //   //   const role = await message.guild.roles.fetch('1019007608901865592');
    //   //   const members = await message.guild.members.list({ limit: 1000 });
    //   //   await Promise.all(
    //   //     members.map(
    //   //       async (member) => (
    //   //         await member.roles.add(role),
    //   //         message.reply(`Added the ${role.name} role.  User: ${member.user.username}.`)
    //   //       )
    //   //     )
    //   //   );
    //   // }
    //   // handleMessage(config, manager, client, message, logger);
    // });
  } catch (err) {
    logger.error(err);
  }
})();

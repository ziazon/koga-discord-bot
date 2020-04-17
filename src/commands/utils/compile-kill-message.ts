import { Benchlogga } from 'benchlogga';
import { MessageAttachment, MessageOptions } from 'discord.js';
import * as Jimp from 'jimp';

import { Font } from '@jimp/plugin-print';

import { AlbionClient, Equipment, Event, Player } from '../../clients/albion-api';
import { Config } from '../../config';

import moment = require('moment');

export class KillDetails {
  private totalDamageDone = 0;
  constructor(
    private config: Config,
    private client: AlbionClient,
    private logger: Benchlogga,
    private victory: boolean,
    private event: Event,
    private textFont: Font,
    private countFont: Font
  ) {
    this.totalDamageDone = event.Participants.reduce((sum, player) => sum + player.DamageDone, 0);
  }

  async getMessages() {
    const details = await this.getKillImages();
    const inventory = await this.getInventoryImage();
    this.logger.log(`Kill Images ${this.event.EventId} Image Compiled`);

    const detailsFileName = `${this.event.EventId}-event-details.png`;
    const inventoryFileName = `${this.event.EventId}-event-inventory.png`;

    const detailsFile = new MessageAttachment(details, detailsFileName);
    const inventoryFile = new MessageAttachment(inventory, inventoryFileName);

    const messages: MessageOptions[] = [
      {
        files: [detailsFile],
        embed: {
          ...this.getBaselineEmbed(`${this.event.Killer.Name} killed ${this.event.Victim.Name}`),
          image: {
            url: `attachment://${detailsFileName}`
          }
        }
      },
      {
        files: [inventoryFile],
        embed: {
          ...this.getBaselineEmbed(`${this.event.Victim.Name}'s Inventory`),
          image: {
            url: `attachment://${inventoryFileName}`
          }
        }
      },
      ...this.event.Participants.map((participant) => ({
        embed: {
          ...this.getBaselineEmbed(`Kill Participant: ${participant.Name} (${this.getDamageDone(participant)}%)`),
          thumbnail: {
            url: participant?.Equipment?.MainHand?.Type
              ? this.client.getItemImageUrl(participant.Equipment.MainHand)
              : 'https://albiononline.com/assets/images/killboard/kill__date.png'
          },
          fields: [
            {
              name: 'Guild',
              value:
                (participant.AllianceName ? '[' + participant.AllianceName + ']' : '') +
                (participant.GuildName ? participant.GuildName : '<none>')
            },
            {
              name: 'Average Item Power',
              value: participant.AverageItemPower.toFixed(2),
              inline: true
            },
            {
              name: 'Damage Done',
              value: participant.DamageDone,
              inline: true
            },
            {
              name: 'Support Healing Done',
              value: participant.SupportHealingDone,
              inline: true
            }
          ]
        }
      }))
    ];

    return messages;
  }

  getDamageDone(player: Player) {
    return ((player.DamageDone / this.totalDamageDone) * 100).toFixed(2);
  }

  getBaselineEmbed(title: string) {
    return {
      color: this.victory ? 0x008000 : 0x800000,
      timestamp: moment(this.event.TimeStamp).toDate(),
      author: {
        name: title,
        iconURL: 'https://albiononline.com/assets/images/killboard/kill__date.png',
        url: `https://albiononline.com/en/killboard/kill/${this.event.EventId}`
      },
      footer: {
        text: 'Kill #' + this.event.EventId
      }
    };
  }

  async getKillImages() {
    const killerImage = await this.buildPlayerEquipmentImage(this.event.Killer);
    const victimImage = await this.buildPlayerEquipmentImage(this.event.Victim);

    const canvasWidth = killerImage.getWidth() + victimImage.getWidth();
    const canvasHeight = Math.max(killerImage.getHeight(), victimImage.getHeight());
    const image = new Jimp(canvasWidth, canvasHeight);

    image.composite(killerImage, 0, 0);
    image.composite(victimImage, killerImage.getWidth(), 0);

    return await image.getBufferAsync(Jimp.MIME_PNG);
  }

  async getInventoryImage() {
    const image = await this.getVictimInventory();
    return await image.getBufferAsync(Jimp.MIME_PNG);
  }

  async getPlayerTitle(player: Player) {
    const name = `${player.Name} (IP: ${player.AverageItemPower.toFixed(2)})`;
    const alliance = player.AllianceName ? `[${player.AllianceName}]` : '';
    const guild = player.GuildName ? `${alliance}${player.GuildName}` : '';
    const playerName = this.buildCenteredText(name);
    const playerGuild = this.buildCenteredText(guild);
    const topSpacer = 10;
    const playerNameWidth = playerName.getWidth();
    const playerNameHeight = playerName.getHeight();
    const playerNameCenter = Math.floor(playerNameWidth / 2);
    const playerGuildWidth = playerGuild.getWidth();
    const playerGuildHeight = playerGuild.getHeight();
    const playerGuildCenter = Math.floor(playerGuildWidth / 2);

    const canvasWidth = Math.max(playerNameWidth, playerGuildWidth);
    const canvasHeight = playerNameHeight + playerGuildHeight;
    const canvasCenter = Math.floor(canvasWidth / 2);
    const image = new Jimp(canvasWidth, canvasHeight);

    image.composite(playerName, canvasCenter - playerNameCenter, topSpacer);
    image.composite(playerGuild, canvasCenter - playerGuildCenter, playerNameHeight + topSpacer);

    return image;
  }

  async getEquipmentImage(equipment: Equipment) {
    const coords = {
      MainHand: {
        x: 7,
        y: 180
      },
      OffHand: {
        x: 355,
        y: 180
      },
      Head: {
        x: 180,
        y: 5
      },
      Armor: {
        x: 182,
        y: 163
      },
      Shoes: {
        x: 182,
        y: 315
      },
      Bag: {
        x: 7,
        y: 22
      },
      Cape: {
        x: 355,
        y: 22
      },
      Mount: {
        x: 180,
        y: 470
      },
      Potion: {
        x: 355,
        y: 338
      },
      Food: {
        x: 7,
        y: 338
      }
    };
    try {
      const image = await Jimp.read(`${this.config.get('PWD')}/assets/gear.png`);
      for (const key in equipment) {
        const item = equipment[key];
        if (item) {
          const imageBuffer = await this.client.getItemImage(item);
          const itemImage = await Jimp.read(imageBuffer);

          this.placeCountOnItem(itemImage, item.Count);
          itemImage.resize(162, 162);

          if (key === 'MainHand' && item.Type.includes('_2H_')) {
            const offhand = itemImage.clone();
            offhand.opacity(0.6);
            image.composite(offhand, coords.OffHand.x, coords.OffHand.y);
          }

          image.composite(itemImage, coords[key].x, coords[key].y);
        }
      }
      return image;
    } catch (error) {
      this.logger.error(error.message);
    }
  }

  placeCountOnItem(image: Jimp, count: number) {
    const countOffset = count.toString().length * 8;
    const x = 163 - countOffset;
    const y = 142;
    return image.print(this.countFont, x, y, count);
  }

  // config, logger, client, event.Victim.Inventory
  async getVictimInventory(gridSize = 6) {
    const cellImage = await Jimp.read(`${this.config.get('PWD')}/assets/inventory-cell.png`);
    const cellLength = 160;
    const cleanItems = this.event.Victim.Inventory.filter((item) => item);

    const cellCount = cleanItems.length;
    const imageWidth = cellLength * gridSize;
    const imageHeight = cellCount ? Math.ceil(cellCount / gridSize) * cellLength : cellLength;
    let lastXMarker = 0;
    let lastYMarker = 0;

    const image = new Jimp(imageWidth, imageHeight);

    this.logger.log(`creating inventory image for ${cellCount} items`);
    for (let index = 0; index < cleanItems.length; index++) {
      const item = cleanItems[index];
      const imageBuffer = await this.client.getItemImage(item);
      const itemImage = await Jimp.read(imageBuffer);
      const itemCellImage = cellImage.clone();

      this.placeCountOnItem(itemImage, item.Count);
      itemImage.resize(162, 162);
      itemCellImage.composite(itemImage, 5, 5);
      const x = (index % gridSize) * cellLength;
      const y = Math.floor(index / gridSize) * cellLength;
      image.composite(itemCellImage, x, y);
      lastXMarker = x + cellLength;
      lastYMarker = y;
    }

    if (cellCount < gridSize || !Number.isInteger(cellCount / gridSize)) {
      let counter = cellCount;
      while (counter === 0 || !Number.isInteger(counter / gridSize)) {
        const emptyCellImage = cellImage.clone();
        image.composite(emptyCellImage, lastXMarker, lastYMarker);
        lastXMarker = lastXMarker + cellLength;
        counter++;
      }
    }
    return image;
  }

  async buildPlayerEquipmentImage(player: Player) {
    const equipment = await this.getEquipmentImage(player.Equipment);
    const playerTitle = await this.getPlayerTitle(player);
    const backgroundColor = equipment.getPixelColor(1, 1);

    try {
      const playerTitleWidth = playerTitle.getWidth();
      const playerTitleHeight = playerTitle.getHeight();
      const playerTitleCenter = playerTitleWidth / 2;
      const equipmentWidth = equipment.getWidth();
      const equipmentHeight = equipment.getHeight();
      const equipmentCenter = equipmentWidth / 2;
      const canvasWidth = Math.max(playerTitleWidth, equipmentWidth);
      const canvasHeight = playerTitleHeight + equipmentHeight;
      const canvasCenter = canvasWidth / 2;

      const image = new Jimp(canvasWidth, canvasHeight, backgroundColor);

      image.composite(playerTitle, canvasCenter - playerTitleCenter, 0);
      image.composite(equipment, canvasCenter - equipmentCenter, playerTitleHeight);

      return image;
    } catch (error) {
      this.logger.error(error.message);
    }
  }

  buildCenteredText(text: string) {
    const width = Jimp.measureText(this.textFont, text);
    const height = this.textFont.info.size;
    const image = new Jimp(width, height);

    return image.print(this.textFont, 0, 0, text, width, height);
  }
}

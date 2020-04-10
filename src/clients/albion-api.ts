import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { Benchlogga } from 'benchlogga';

export interface SearchResult {
  guilds: GuildSearchRecord[];
  players: PlayerSearchRecord[];
}

export interface GuildSearchRecord {
  Id: string;
  Name: string;
  AllianceId: string;
  AllianceName: string;
  KillFame: null;
  DeathFame: number;
}

export interface PlayerSearchRecord {
  Id: string;
  Name: string;
  GuildId: string;
  GuildName: null | string;
  AllianceId: string;
  AllianceName: string;
  Avatar: string;
  AvatarRing: string;
  KillFame: number;
  DeathFame: number;
  FameRatio: number;
  totalKills: null;
  gvgKills: null;
  gvgWon: null;
}

export interface Event {
  groupMemberCount: number;
  numberOfParticipants: number;
  EventId: number;
  TimeStamp: string;
  Version: number;
  Killer: Player;
  Victim: Player;
  TotalVictimKillFame: number;
  Location: null;
  Participants: Player[];
  GroupMembers: Player[];
  GvGMatch: null;
  BattleId: number;
  KillArea: null;
  Type: string;
}

export interface Player {
  AverageItemPower: number;
  Equipment: Equipment;
  Inventory: Array<Item | null>;
  Name: string;
  Id: string;
  GuildName: string;
  GuildId: string;
  AllianceName: string;
  AllianceId: string;
  AllianceTag: string;
  Avatar: string;
  AvatarRing: string;
  DeathFame: number;
  KillFame: number;
  FameRatio: number;
  LifetimeStatistics: LifetimeStatistics;
  DamageDone?: number;
  SupportHealingDone?: number;
}

export interface Equipment {
  MainHand: Item | null;
  OffHand: Item | null;
  Head: Item | null;
  Armor: Item | null;
  Shoes: Item | null;
  Bag: Item | null;
  Cape: Item | null;
  Mount: Item | null;
  Potion: Item | null;
  Food: Item | null;
}

export interface Item {
  Type: string;
  Count: number;
  Quality: number;
  ActiveSpells: string[];
  PassiveSpells: string[];
}

export interface LifetimeStatistics {
  PvE: Crafting;
  Gathering: Gathering;
  Crafting: Crafting;
  CrystalLeague: number;
  Timestamp: null;
}

export interface Crafting {
  Total: number;
  Royal: number;
  Outlands: number;
  Hellgate?: number;
}

export interface Gathering {
  Fiber: Crafting;
  Hide: Crafting;
  Ore: Crafting;
  Rock: Crafting;
  Wood: Crafting;
  All: Crafting;
}

export class AlbionClient {
  private http: AxiosInstance;
  private logger: Benchlogga;
  constructor(private baseURL: string, private statusUrls: string[]) {
    this.logger = new Benchlogga('Albion Client');
    this.http = axios.create({
      baseURL
    });
  }

  private async makeRequest<T>(url: string, options: AxiosRequestConfig = {}) {
    try {
      const paramsLogText = options ? ` with the query string of ${JSON.stringify(options)}` : '';
      this.logger.log(`making request to ${url} made${paramsLogText}`);
      const request = await this.http.get<T>(url, options);
      this.logger.log(`request to ${url} complete`);
      return request;
    } catch (error) {
      this.logger.error(error);
    }
  }

  public async getServerStatus() {
    try {
      const requests = await axios.all(this.statusUrls.map((statusUrl) => axios.get(statusUrl)));
      this.logger.log('request to servers status made');
      return requests.map((res) => ({
        server: new URL(res.config.url)?.host,
        ...JSON.parse(res.data.trim())
      }));
    } catch (error) {
      this.logger.error(error);
    }
  }

  private async makeItemImageRequest(item: Item) {
    return await this.makeRequest<Buffer>(`/items/${item.Type}.png`, {
      responseType: 'arraybuffer',
      params: {
        count: item.Count,
        quality: item.Quality
      }
    });
  }

  public getItemImageUrl(item: Item) {
    return `${this.baseURL}/items/${item.Type}.png?count=${item.Count}&quality=${item.Quality}`;
  }

  public async getItemImage(item: Item) {
    const { data } = await this.makeItemImageRequest(item);
    return data;
  }

  public async getItemImages(items: Item[]) {
    try {
      const requests = await axios.all(items.map((item) => this.makeItemImageRequest(item)));
      return requests.map((res) => res.data);
    } catch (error) {
      this.logger.error(error);
    }
  }

  public async searchPlayersAndGuilds(q: string) {
    const { data } = await this.makeRequest<SearchResult>('/search', { params: { q } });
    return data;
  }

  public async getPlayerSummary(name: string) {
    const results = await this.searchPlayersAndGuilds(name);
    return results.players.find((player) => player.Name.toLowerCase() === name.toLowerCase());
  }

  public async getGuildSummary(name: string) {
    const results = await this.searchPlayersAndGuilds(name);
    return results.guilds.find((guild) => guild.Name.toLowerCase() === name.toLowerCase());
  }

  public async getRecentDeaths(playerId: string) {
    const { data } = await this.makeRequest<Event[]>(`/players/${playerId}/deaths`);
    return data;
  }

  public async getRecentKills(params) {
    const { data } = await this.makeRequest<Event[]>('/events', {
      params
    });
    return data;
  }

  public async getEventById(killId: number) {
    const { data } = await this.makeRequest<Event>(`/events/${killId}`);
    return data;
  }
}

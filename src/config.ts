import * as Joi from '@hapi/joi';

export interface ValidConfig {
  ALBION_API_BASE: string;
  ALBION_SERVER_STATUS_URLS: string[];
  DISCORD_TOKEN: string;
  DISCORD_CLIENT_ID: string;
  DISCORD_PLAYING_GAME: string;
  NODE_ENV: string;
  DB_HOST: string;
  DB_PORT: number;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  DB_SYNCHRONIZE: boolean;
  PWD: string;
  FONT_PATH: string;
  npm_package_name: string;
  npm_package_gitHead: string;
  npm_package_version: string;
}

export type RawConfig = Record<string, string>;

export interface CustomValidator extends Joi.Root {
  stringArray: () => Joi.ArraySchema;
}

const validator: CustomValidator = Joi.extend((joi) => ({
  type: 'stringArray',
  base: joi.array(),
  messages: {
    'stringArray.base': '"{{#label}}" must be a string'
  },
  coerce: (value) => ({ value: value.split(',') })
}));

export class Config {
  private readonly config: ValidConfig;
  private schema: Joi.ObjectSchema = validator
    .object({
      ALBION_API_BASE: validator.string().uri().default('https://gameinfo.albiononline.com/api/gameinfo'),
      ALBION_SERVER_STATUS_URLS: validator
        .stringArray()
        .items(validator.string().uri())
        .default(['http://live.albiononline.com/status.txt', 'http://staging.albiononline.com/status.txt']),
      DISCORD_TOKEN: validator.string(),
      DISCORD_CLIENT_ID: validator.string(),
      DISCORD_PLAYING_GAME: validator.string().default('with the Koga Clan'),
      FONT_PATH: validator.string().default(''),
      NODE_ENV: Joi.string().default('local'),
      PWD: validator.string(),
      DB_HOST: Joi.string().default('127.0.0.1'),
      DB_PORT: Joi.number().default(5432),
      DB_USER: Joi.string(),
      DB_PASSWORD: Joi.string().allow(''),
      DB_NAME: Joi.string(),
      DB_SYNCHRONIZE: Joi.boolean().default(true),
      npm_package_name: validator.string(),
      npm_package_gitHead: validator.string(),
      npm_package_version: validator.string()
    })
    .options({ stripUnknown: true, convert: true });

  constructor(rawConfig: RawConfig = process.env) {
    this.config = this.validate(rawConfig);
  }

  private validate(config: RawConfig): ValidConfig {
    const { error, value } = this.schema.validate(config);

    if (error) {
      throw new Error(`Config validation error: ${error.message}`);
    }

    return value;
  }

  public get<K extends keyof ValidConfig>(key: K): ValidConfig[K] {
    return this.config[key];
  }
}

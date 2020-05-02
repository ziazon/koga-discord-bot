import { ConnectionOptions } from 'typeorm';

import { Config } from '../config';
import { Admin } from './entity/admin';
import { LastEvent } from './entity/last-event';
import { Monitor } from './entity/monitor';
import { DBNamingStrategy } from './naming-strategy';

export const entities: Function[] = [Admin, Monitor, LastEvent];

export class DBConfigService {
  constructor(private readonly serviceConfig: Config) {}

  get config() {
    return {
      type: 'postgres',
      logging: this.serviceConfig.get('NODE_ENV') === 'production' ? ['error', 'schema', 'warn'] : 'all',
      host: this.serviceConfig.get('DB_HOST'),
      port: this.serviceConfig.get('DB_PORT'),
      username: this.serviceConfig.get('DB_USER'),
      password: this.serviceConfig.get('DB_PASSWORD'),
      database: this.serviceConfig.get('DB_NAME'),
      synchronize: this.serviceConfig.get('DB_SYNCHRONIZE'),
      migrationsRun: this.serviceConfig.get('DB_SYNCHRONIZE'),
      namingStrategy: new DBNamingStrategy(),
      entities,
      migrations: [`${__dirname}/migrations/*{.js,.ts}`],
      cli: {
        entitiesDir: 'src/db/entities',
        migrationsDir: 'src/db/migrations',
        subscribersDir: 'src/db/subscribers'
      }
    } as ConnectionOptions;
  }
}

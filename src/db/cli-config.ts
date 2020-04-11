import { Config } from '../config';
import { DBConfigService } from './config';

const dbConfigService = new DBConfigService(new Config());

export = dbConfigService.config;

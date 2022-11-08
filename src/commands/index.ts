import { Collection } from 'discord.js';

import { KogaCommand } from '../types';
import NewWorld from './new-world';

export const commands = new Collection<unknown, KogaCommand>();

commands.set(NewWorld.data.name, NewWorld);

import { EntityManager } from 'typeorm';

import { Admin } from '../../db/entity/admin';

export async function adminCheck(query: EntityManager, serverId: string, userId: string) {
  const adminCount = await query.count(Admin, { where: { serverId, userId } });

  return !!adminCount;
}

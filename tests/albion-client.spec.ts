import { expect } from 'chai';

import { AlbionClient } from '../src/clients/albion-api';
import { Config } from '../src/config';

describe('Tests Albion Client and Live API', () => {
  const config = new Config();
  const client = new AlbionClient(config.get('ALBION_API_BASE'), config.get('ALBION_SERVER_STATUS_URLS'));
  it('return list of properly formed status objects', async () => {
    const serverStatuses = await client.getServerStatus();
    expect(serverStatuses).to.be.an('array').that.is.not.empty;

    serverStatuses.forEach((row) => {
      expect(row).to.have.property('server');
      expect(row).to.have.property('status');
      expect(row).to.have.property('message');
    });
  });
});

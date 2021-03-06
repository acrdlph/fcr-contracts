/* eslint-env mocha */
/* global assert contract */
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('./conf/config.json'));
const utils = require('../../utils.js')

contract('Registry', (accounts) => {
  describe('Function: Registry (constructor)', () => {
    let token;
    let parameterizer;
    let registry;

    before(async () => {
      const {
        paramProxy, registryProxy, tokenInstance,
      } = await utils.getProxies();
      parameterizer = paramProxy;
      registry = registryProxy;
      token = tokenInstance;

      await utils.approveProxies(accounts, token, false, parameterizer, registry);
    });

    it('should instantiate storage variables with the values in the config file', async () => {
      assert.strictEqual((await registry.token.call()), token.address, 'The token storage ' +
        'variable is improperly initialized');
      assert.strictEqual(
        (await registry.parameterizer.call()), parameterizer.address,
        'The parameterizer storage variable is improperly initialized',
      );
      assert.strictEqual(
        (await registry.name.call()), config.name,
        'The name storage variable is improperly initialized',
      );
    });
  });
});

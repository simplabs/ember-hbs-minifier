/* eslint-env node */
'use strict';

const hashObj = require('hash-obj');

module.exports = {
  name: 'ember-hbs-minifier',

  setupPreprocessorRegistry(type, registry) {
    if (type === 'parent') {
      let options = this.app.options || {};
      let config = options['ember-hbs-minifier'] || {};

      let HbsMinifierPlugin = require('./hbs-minifier-plugin').createRegistryPlugin(config);
      registry.add('htmlbars-ast-plugin', {
        name: 'hbs-minifier-plugin',
        plugin: HbsMinifierPlugin,
        baseDir() { return __dirname; },
        cacheKey() { return cacheKeyForConfig(config); }
      });
    }
  }
};

function cacheKeyForConfig(config) {
  let configHash = hashObj(config, {
    encoding: 'base64',
    algorithm: 'md5',
  });

  return `ember-hbs-minifier-${configHash}`;
}

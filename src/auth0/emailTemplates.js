const _ = require('lodash');
const Promise = require('bluebird');

const utils = require('../utils');
const constants = require('../constants');
const apiCall = require('./apiCall');

/**
 * Get an email template object from the files object.
 */
const getEmailTemplateObject = function(files, name, mappings) {
  var tpl;
  const file = files[name];
  if (!file) {
    return null;
  }

  // Default to enabled:false since we need metadata!
  tpl = {
    template: name,
    body: file.htmlFile,
    enabled: false
  };

  if (file.metadata) {
    const metadata = utils.parseJsonFile(name, file.metadataFile, mappings);
    // 'template' and 'body' are set above and cannot be overridden with metadata
    tpl = _.assign(tpl, _.omit(metadata, [ 'body', 'template' ]));
  }

  return tpl;
};

const updateEmailTemplateByName = function(progress, client, files, name) {
  const tpl = getEmailTemplateObject(files, name, progress.mappings);
  if (!tpl) {
    return Promise.resolve(true);
  }

  progress.log('Updating email template "' + name + '"...');
  return apiCall(client, client.emailTemplates.update, [ { name: name }, tpl ])
    .then(() => true)
    .catch((result) => {
      if (result.statusCode === 404) {
        progress.log('Email template ' + name + ' doesn\'t exist, creating it...');
        return apiCall(client, client.emailTemplates.create, [ tpl ]);
      }
      return Promise.reject(result);
    });
};

const updateAllEmailTemplates = function(progress, client, files) {
  progress.log('Updating email templates...');

  const promises = constants.EMAIL_TEMPLATE_NAMES.map(name =>
    updateEmailTemplateByName(progress, client, files, name)
  );

  return Promise.all(promises);
};

module.exports = {
  getEmailTemplateObject: getEmailTemplateObject,
  updateEmailTemplateByName: updateEmailTemplateByName,
  updateAllEmailTemplates: updateAllEmailTemplates
};

/*!
 * git-user-name <https://github.com/jonschlinkert/git-user-name>
 *
 * Copyright (c) 2014-2017, Jon Schlinkert.
 * Released under the MIT License.
 */

const gitconfig = require('./git-config-path');
const parse = require('./parse-git-config');

module.exports = function (options) {
    const gc = gitconfig({ type: 'global', ...options && options.gitconfig });
    options = { ...{ cwd: '/', path: gc }, ...options };
    const config = parse.sync(options) || {};
    return config.user ? config.user.name : null;
};
const action = require('./action');
const selectExistingFlag = require('./selectExistingFlag');
const enterNewFlagName = require('./enterNewFlagName');
const getEnvironmentStates = require('./getEnvironmentStates');

module.exports = {
    action,
    enterNewFlagName,
    getEnvironmentStates,
    selectExistingFlag,
}
const inquirer = require('inquirer');
const { ACTIONS } = require('../constants');

module.exports = async function actionPrompt() {
    const { action } = await inquirer.prompt({
        name: 'action',
        type: 'list',
        message: 'What do you want to do?',
        choices: [ACTIONS.ADD_FLAG, ACTIONS.EDIT_FLAG, ACTIONS.REMOVE_FLAG],
        default: ACTIONS.EDIT_FLAG,
    });

    return action;
}
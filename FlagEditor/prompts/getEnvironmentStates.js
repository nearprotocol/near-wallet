const inquirer = require('inquirer');
const { ENVIRONMENTS } = require('../constants');

module.exports = async function getEnvironmentStates({ flagEntry }) {
    let choices = [];

    Object.values(ENVIRONMENTS)
        .forEach((name) => {
            choices.push({
                name,
                checked: (flagEntry && flagEntry[name] && !!flagEntry[name].enabled) || false
            });
        });

    const { flagStateByEnvironment } = await inquirer.prompt({
        name: 'flagStateByEnvironment',
        type: 'checkbox',
        message: 'Select the environments you want this flag enabled in',
        choices,
    });

    return flagStateByEnvironment;
}
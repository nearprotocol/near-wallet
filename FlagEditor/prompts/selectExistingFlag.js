const inquirer = require('inquirer');

module.exports = async function selectExistingFlag(flagNames) {
    const { flagName } = await inquirer.prompt({
        type: 'list',
        name: 'flagName',
        message: 'Select the flag you wish to modify',
        choices: flagNames,
    })

    return flagName;
}
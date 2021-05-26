const inquirer = require('inquirer');

module.exports = async function newFlagName(existingFlagNames) {
    const { flagName } = await inquirer.prompt({
        name: 'flagName',
        type: 'input',
        message: 'Enter the name of the new flag',
        validate: (value) => {
            if (existingFlagNames.includes(value)) {
                throw new Error(`${value} already exists!`);
            }
            return true;
        }
    });

    return flagName
}
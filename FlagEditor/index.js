const FlagEditor = require('./FlagEditor');
const prompts = require('./prompts');
const { ENVIRONMENTS } = require('./constants');

const editorInstance = new FlagEditor({ prompts, environments: ENVIRONMENTS })

async function engage() {
    await editorInstance.init();
}

engage();
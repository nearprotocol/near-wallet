const fsx = require('fs-extra');
const path = require('path');

const getGitUsername = require('./gitTools/git-user-name');

const { ACTIONS, ENVIRONMENTS } = require('./constants');

const FLAGS_FILENAME = 'NEARFlags.json';
const DEBUG_LOGGING = false;

class FlagEditor {
    constructor({ prompts, environments }) {
        this.prompts = prompts;
        this.environments = environments;
        this._flagsFilepath = null;
        this._flagsState = null;
    }

    log(...args) {
        DEBUG_LOGGING && console.log(...args);
    }

    async init() {
        const userEditing = await getGitUsername();
        this.log({ userEditing });

        await this.searchForFlags({ basePath: path.parse(__dirname) });
        await this.loadFlags(this._flagsFilepath);

        const flagNames = Object.keys(this._flagsState)

        const action = await this.prompts.action();
        this.log({ action })

        let flagName;

        if (action === ACTIONS.REMOVE_FLAG) {
            flagName = await this.prompts.selectExistingFlag(flagNames)
            delete this._flagsState[flagName]
        } else {
            let flagEntry;

            if (action === ACTIONS.EDIT_FLAG) {
                flagName = await this.prompts.selectExistingFlag(flagNames)
            } else {
                flagName = await this.prompts.enterNewFlagName(flagNames);
            }
            this.log({ flagName });

            flagEntry = this._flagsState[flagName];
            const environmentsEnabledIn = await this.prompts.getEnvironmentStates({ flagEntry });

            this._flagsState = {
                ...this._flagsState,
                [flagName]: this.flagEntry({ environmentsEnabledIn, flagEntry, userEditing })
            }
        }

        await this.saveFlags();
    }

    flagEntry({ environmentsEnabledIn, flagEntry, userEditing }) {
        this.log({ userEditing });

        const perEnvEntries = {};
        Object.values(ENVIRONMENTS).forEach((name) => {
            const perEnvEntry = (flagEntry && flagEntry[name]) || {};

            const enabled = environmentsEnabledIn.includes(name);
            let isEditing = (enabled !== perEnvEntry.enabled);

            perEnvEntries[name] = {
                ...perEnvEntry,
                enabled,
                lastEditedBy: !isEditing ? perEnvEntry.lastEditedBy : userEditing,
                lastEditedAt: !isEditing ? perEnvEntry.lastEditedAt : new Date().toISOString(),
            }
        })

        return {
            createdBy: flagEntry ? flagEntry.createdBy : userEditing,
            createdAt: flagEntry ? flagEntry.createdAt : new Date().toISOString(),
            ...perEnvEntries,
        }
    }

    async searchForFlags({ basePath }) {
        const { dir, root } = basePath;
        let fileFound = false;
        let currPath = dir;

        while (!fileFound && currPath && currPath !== root) {
            fileFound = await fsx.exists(path.join(currPath, FLAGS_FILENAME));

            if (!fileFound) {
                currPath = currPath
                    .split(path.sep)
                    .slice(0, -1)
                    .join(path.sep);
            }
        }

        if (!fileFound) {
            throw new Error(`Could not find a ${FLAGS_FILENAME} in CWD or any parent dir. Run this tool from a NEAR repo!`)
        }

        this._flagsFilepath = path.join(currPath, FLAGS_FILENAME);
    }

    async loadFlags() {
        try {
            this._flagsState = await fsx.readJson(this._flagsFilepath)
        } catch (e) {
            console.log(e);
            throw new Error(`Failed to load JSON from ${this._flagsFilepath}. Probably not valid JSON!`)
        }
    }

    async saveFlags() {
        this.log("writing file", { filepath: this._flagsFilepath, state: this._flagsState });
        return fsx.writeJson(this._flagsFilepath, this._flagsState, { spaces: 2 });
    }
}

module.exports = FlagEditor;
const ACTIONS = {
    ADD_FLAG: 'add',
    REMOVE_FLAG: 'delete',
    EDIT_FLAG: 'edit'
}

// TODO: Load from `near-api-js` config or similar?
const ENVIRONMENTS = {
    DEVELOPMENT: 'development',
    TESTNET_STAGING: 'testnet_STAGING',
    TESTNET: 'testnet',
    MAINNET: 'mainnet_STAGING',
    MAINNET_STAGING: 'mainnet'
}

module.exports = {
    ACTIONS,
    ENVIRONMENTS
}
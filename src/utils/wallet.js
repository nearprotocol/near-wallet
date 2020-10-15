import * as nearApiJs from 'near-api-js'
import { KeyPair } from 'near-api-js'
import sendJson from 'fetch-send-json'
import { parseSeedPhrase } from 'near-seed-phrase'
import { PublicKey } from 'near-api-js/lib/utils'
import { KeyType } from 'near-api-js/lib/utils/key_pair'

import { getAccountIds } from './helper-api'
import { generateSeedPhrase } from 'near-seed-phrase';
import { WalletError } from './walletError'
import { setAccountConfirmed, getAccountConfirmed, removeAccountConfirmed} from './localStorage'

import { store } from '..'
import { setSignTransactionStatus, setLedgerTxSigned, showLedgerModal, redirectToApp, redirectTo, refreshAccount } from '../actions/account'

import { TwoFactor } from './twoFactor'
import { Staking } from './staking'
import { decorateWithLockup } from './account-with-lockup'

export const WALLET_CREATE_NEW_ACCOUNT_URL = 'create'
export const WALLET_CREATE_NEW_ACCOUNT_FLOW_URLS = ['create', 'set-recovery', 'setup-seed-phrase', 'recover-account', 'recover-seed-phrase', 'sign-in-ledger']
export const WALLET_LOGIN_URL = 'login'
export const WALLET_SIGN_URL = 'sign'
export const ACCOUNT_HELPER_URL = process.env.REACT_APP_ACCOUNT_HELPER_URL || 'https://near-contract-helper.onrender.com'
export const EXPLORER_URL = process.env.EXPLORER_URL || 'https://explorer.testnet.near.org';
export const IS_MAINNET = process.env.REACT_APP_IS_MAINNET === 'true' || process.env.REACT_APP_IS_MAINNET === 'yes'
export const DISABLE_CREATE_ACCOUNT = process.env.DISABLE_CREATE_ACCOUNT === 'true' || process.env.DISABLE_CREATE_ACCOUNT === 'yes'
export const DISABLE_SEND_MONEY = process.env.DISABLE_SEND_MONEY === 'true' || process.env.DISABLE_SEND_MONEY === 'yes'
export const ACCOUNT_ID_SUFFIX = process.env.REACT_APP_ACCOUNT_ID_SUFFIX || 'testnet'
export const MULTISIG_MIN_AMOUNT = process.env.REACT_APP_MULTISIG_MIN_AMOUNT || '40'
export const LOCKUP_ACCOUNT_ID_SUFFIX = process.env.LOCKUP_ACCOUNT_ID_SUFFIX || 'lockup.near'
export const ACCESS_KEY_FUNDING_AMOUNT = process.env.REACT_APP_ACCESS_KEY_FUNDING_AMOUNT || nearApiJs.utils.format.parseNearAmount('0.01')
export const LINKDROP_GAS = process.env.LINKDROP_GAS || '100000000000000'
export const ENABLE_FULL_ACCESS_KEYS = process.env.ENABLE_FULL_ACCESS_KEYS === 'yes'
export const HIDE_SIGN_IN_WITH_LEDGER_ENTER_ACCOUNT_ID_MODAL = process.env.HIDE_SIGN_IN_WITH_LEDGER_ENTER_ACCOUNT_ID_MODAL

const NETWORK_ID = process.env.REACT_APP_NETWORK_ID || 'default'
const CONTRACT_CREATE_ACCOUNT_URL = `${ACCOUNT_HELPER_URL}/account`
export const NODE_URL = process.env.REACT_APP_NODE_URL || 'https://rpc.nearprotocol.com'

const KEY_UNIQUE_PREFIX = '_4:'
const KEY_WALLET_ACCOUNTS = KEY_UNIQUE_PREFIX + 'wallet:accounts_v2'
const KEY_ACTIVE_ACCOUNT_ID = KEY_UNIQUE_PREFIX + 'wallet:active_account_id_v2'
const ACCOUNT_ID_REGEX = /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/

export const keyAccountConfirmed = (accountId) => `wallet.account:${accountId}:${NETWORK_ID}:confirmed`

const WALLET_METADATA_METHOD = '__wallet__metadata'

export const ACCOUNT_CHECK_TIMEOUT = 500
export const TRANSACTIONS_REFRESH_INTERVAL = 10000

export const convertPKForContract = (pk) => {
    if (typeof pk !== 'string') {
        pk = pk.toString()
    }
    return pk.replace('ed25519:', '')
}
export const toPK = (pk) => nearApiJs.utils.PublicKey.from(pk)

async function setKeyMeta(publicKey, meta) {
    localStorage.setItem(`keyMeta:${publicKey}`, JSON.stringify(meta))
}

async function getKeyMeta(publicKey) {
    try {
        return JSON.parse(localStorage.getItem(`keyMeta:${publicKey}`)) || {};
    } catch (e) {
        return {};
    }
}

class Wallet {
    constructor() {
        this.keyStore = new nearApiJs.keyStores.BrowserLocalStorageKeyStore(window.localStorage, 'nearlib:keystore:')
        this.inMemorySigner = new nearApiJs.InMemorySigner(this.keyStore)

        const inMemorySigner = this.inMemorySigner
        const wallet = this
        this.signer = {
            async getPublicKey(accountId, networkId) {
                return (await wallet.getLedgerKey(accountId)) || (await inMemorySigner.getPublicKey(accountId, networkId))
            },
            async signMessage(message, accountId, networkId) {
                if (await wallet.getLedgerKey(accountId)) {
                    wallet.dispatchShowLedgerModal(true)
                    const { createLedgerU2FClient } = await import('./ledger.js')
                    const client = await createLedgerU2FClient()
                    const signature = await client.sign(message)
                    await store.dispatch(setLedgerTxSigned(true, accountId))
                    const publicKey = await this.getPublicKey(accountId, networkId)
                    return {
                        signature,
                        publicKey
                    }
                }

                return inMemorySigner.signMessage(message, accountId, networkId)
            }
        }
        this.connection = nearApiJs.Connection.fromConfig({
            networkId: NETWORK_ID,
            provider: { type: 'JsonRpcProvider', args: { url: NODE_URL + '/' } },
            signer: this.signer
        })
        this.accounts = JSON.parse(
            localStorage.getItem(KEY_WALLET_ACCOUNTS) || '{}'
        )
        this.accountId = localStorage.getItem(KEY_ACTIVE_ACCOUNT_ID) || ''

        this.twoFactor = new TwoFactor(this)
        this.staking = new Staking(this)

    }

    async getLocalAccessKey(accountId, accessKeys) {
        const localPublicKey = await this.inMemorySigner.getPublicKey(accountId, NETWORK_ID)
        return localPublicKey && accessKeys.find(({ public_key }) => public_key === localPublicKey.toString())
    }

    async getLedgerKey(accountId) {
        // TODO: All callers should specify accountId explicitly
        accountId = accountId || this.accountId
        // TODO: Refactor so that every account just stores a flag if it's on Ledger?

        const accessKeys = await this.getAccessKeys(accountId)
        if (accessKeys) {
            const localKey = await this.getLocalAccessKey(accountId, accessKeys)
            const ledgerKey = accessKeys.find(accessKey => accessKey.meta.type === 'ledger')
            if (ledgerKey && (!localKey || localKey.permission !== 'FullAccess')) {
                return PublicKey.from(ledgerKey.public_key)
            }
        }
        return null
    }

    save() {
        localStorage.setItem(KEY_ACTIVE_ACCOUNT_ID, this.accountId)
        localStorage.setItem(KEY_WALLET_ACCOUNTS, JSON.stringify(this.accounts))
    }

    selectAccount(accountId) {
        if (!(accountId in this.accounts)) {
            return false
        }
        this.accountId = accountId
        this.save()
    }

    isLegitAccountId(accountId) {
        return ACCOUNT_ID_REGEX.test(accountId)
    }

    async sendMoney(receiverId, amount) {
        await this.getAccount(this.accountId).sendMoney(receiverId, amount)
    }

    isEmpty() {
        return !this.accounts || !Object.keys(this.accounts).length
    }

    async refreshAccount() {
        try {
            const account = await this.loadAccount()
            setAccountConfirmed(this.accountId, true)
            return account
        } catch (error) {
            console.log('Error loading account:', error.message)

            if (error.toString().indexOf(`ccount ${this.accountId} does not exist while viewing`) !== -1) {
                const accountId = this.accountId
                const accountIdNotConfirmed = !getAccountConfirmed(accountId)

                // Try to find existing account and switch to it
                let nextAccountId = ''
                for (let curAccountId of Object.keys(this.accounts)) {
                    if (await this.accountExists(curAccountId)) {
                        nextAccountId = curAccountId
                        break
                    }   
                }
                this.selectAccount(nextAccountId)

                // TODO: Make sure "problem creating" only shows for actual creation
                return {
                    resetAccount: {
                        reset: true,
                        preventClear: accountIdNotConfirmed,
                        accountIdNotConfirmed: accountIdNotConfirmed ? accountId : ''
                    },
                    globalAlertPreventClear: accountIdNotConfirmed || this.isEmpty(),
                    globalAlert: {
                        success: false,
                        messageCode: 'account.create.errorAccountNotExist'
                    },
                    ...(!this.isEmpty() && !accountIdNotConfirmed && await this.loadAccount())
                }
            }

            throw error
        }
    }

    async loadAccount() {
        if (!this.isEmpty()) {
            const accessKeys = await this.getAccessKeys() || []
            const ledgerKey = accessKeys.find(key => key.meta.type === 'ledger')
            const state = await this.getAccount(this.accountId).state()
            this.twoFactor = new TwoFactor(this)
            const has2fa = this.has2fa = await this.twoFactor.isEnabled()

            // TODO: Just use accountExists to check if lockup exists?
            let lockupInfo
            try {
                lockupInfo = await this.staking.getLockup();
            } catch (error) {
                if (error.toString().includes('does not exist while viewing')) {
                    console.warn('Account has no lockup')
                } else {
                    throw error
                }
            }

            return {
                ...state,
                has2fa,
                hasLockup: !!lockupInfo,
                balance: await this.getBalance(),
                accountId: this.accountId,
                accounts: this.accounts,
                accessKeys,
                authorizedApps: accessKeys.filter(it => (
                    it.access_key
                    && it.access_key.permission.FunctionCall
                    && it.access_key.permission.FunctionCall.receiver_id !== this.accountId
                )),
                fullAccessKeys: accessKeys.filter(it => (
                    it.access_key
                     && it.access_key.permission === 'FullAccess'
                )),
                ledger: {
                    ledgerKey,
                    hasLedger: !!ledgerKey
                }
            }
        }
    }

    // TODO: Figure out whether wallet should work with any account or current one. Maybe make wallet account specific and switch whole Wallet?
    async getAccessKeys(accountId) {
        accountId = accountId || this.accountId
        if (!accountId) return null

        const accessKeys = await this.getAccount(accountId).getAccessKeys()
        return Promise.all(accessKeys.map(async (accessKey) => ({
            ...accessKey,
            meta: await getKeyMeta(accessKey.public_key)
        })))
    }

    async removeAccessKey(publicKey) {
        return await this.getAccount(this.accountId).deleteKey(publicKey)
    }

    async removeNonLedgerAccessKeys() {
        const accessKeys =  await this.getAccessKeys()
        const localAccessKey = await this.getLocalAccessKey(this.accountId, accessKeys)
        const account = this.getAccount(this.accountId)
        const keysToRemove = accessKeys.filter(({
            public_key,
            access_key: { permission },
            meta: { type }
        }) => permission === 'FullAccess' && type !== 'ledger' && !(localAccessKey && public_key === localAccessKey.public_key))

        const WALLET_METADATA_METHOD = '__wallet__metadata'
        let newLocalKeyPair
        if (!localAccessKey || (!localAccessKey.access_key.permission.FunctionCall ||
            !localAccessKey.access_key.permission.FunctionCall.method_names.includes(WALLET_METADATA_METHOD))) {
            // NOTE: This key isn't used to call actual contract method, just used to verify connection with account in private DB
            newLocalKeyPair = KeyPair.fromRandom('ed25519')
            await account.addKey(newLocalKeyPair.getPublicKey(), this.accountId, WALLET_METADATA_METHOD, '0')
        }

        for (const { public_key } of keysToRemove) {
            await account.deleteKey(public_key)
        }

        if (newLocalKeyPair) {
            if (localAccessKey) {
                await account.deleteKey(localAccessKey.public_key)
            }
            await this.keyStore.setKey(NETWORK_ID, this.accountId, newLocalKeyPair)
        }

        const { data: recoveryMethods } = await this.getRecoveryMethods();
        const methodsToRemove = recoveryMethods.filter(method => method.kind !== 'ledger')
        for (const recoveryMethod of methodsToRemove) {
            await this.deleteRecoveryMethod(recoveryMethod)
        }
    }

    async checkAccountAvailable(accountId) {
        if (!this.isLegitAccountId(accountId)) {
            throw new Error('Invalid username.')
        }
        if (accountId !== this.accountId) {
            return await this.getAccount(accountId).state()
        } else {
            throw new Error('You are logged into account ' + accountId + ' .')
        }
    }

    // TODO: Rename to make it clear that this is used to check if account can be created and that it throws. requireAccountNotExists?
    async checkNewAccount(accountId) {
        if (!this.isLegitAccountId(accountId)) {
            throw new Error('Invalid username.')
        }

        // TODO: This check doesn't seem up to date on what are current account name requirements
        // TODO: Is it even needed or is checked already both upstream/downstream?
        if (accountId.match(/.*[.@].*/)) {
            if (!accountId.endsWith(`.${ACCOUNT_ID_SUFFIX}`)) {
                throw new Error('Characters `.` and `@` have special meaning and cannot be used as part of normal account name.');
            }
        }

        if (await this.accountExists(accountId)) {
            throw new Error('Account ' + accountId + ' already exists.')
        }

        return true
    }

    async checkIsNew(accountId) {
        return !(await this.accountExists(accountId))
    }

    async createNewAccount(accountId, fundingContract, fundingKey, publicKey) {
        await this.checkNewAccount(accountId);

        let useLedger = publicKey ? false : true

        if (useLedger) {
            publicKey = await this.getLedgerPublicKey()
            await setKeyMeta(publicKey, { type: 'ledger' })
        }

        // no new accounts are 2fa
        this.has2fa = false

        if (fundingContract && fundingKey) {
            await this.createNewAccountLinkdrop(accountId, fundingContract, fundingKey, publicKey)
            await this.keyStore.removeKey(NETWORK_ID, fundingContract)
        } else {
            await sendJson('POST', CONTRACT_CREATE_ACCOUNT_URL, {
                newAccountId: accountId,
                newAccountPublicKey: publicKey.toString()
            })
        }

        if (useLedger) {
            await this.addLedgerAccountId(accountId)
        }

        await this.saveAndSelectAccount(accountId);

        if (useLedger) {
            await this.postSignedJson('/account/ledgerKeyAdded', { accountId, publicKey: publicKey.toString() })
        }
    }

    async checkNearDropBalance(fundingContract, fundingKey) {
        const account = this.getAccount(fundingContract)

        const contract = new nearApiJs.Contract(account, fundingContract, {
            viewMethods: ['get_key_balance'],
            sender: fundingContract
        });

        const key = KeyPair.fromString(fundingKey).publicKey.toString()

        return await contract.get_key_balance({ key })
    }

    async createNewAccountLinkdrop(accountId, fundingContract, fundingKey, publicKey) {
        const account = this.getAccount(fundingContract);
        await this.keyStore.setKey(NETWORK_ID, fundingContract, KeyPair.fromString(fundingKey))

        const contract = new nearApiJs.Contract(account, fundingContract, {
            changeMethods: ['create_account_and_claim', 'claim'],
            sender: fundingContract
        });

        await contract.create_account_and_claim({
            new_account_id: accountId,
            new_public_key: publicKey.toString().replace('ed25519:', '')
        }, LINKDROP_GAS);
    }

    async saveAndSelectAccount(accountId, keyPair) {
        await this.saveAccount(accountId, keyPair)
        this.accountId = accountId
        this.save()
        // TODO: What does setAccountConfirmed do?
        setAccountConfirmed(this.accountId, false)
    }

    async saveAccount(accountId, keyPair) {
        await this.setKey(accountId, keyPair)
        this.accounts[accountId] = true
    }

    async setKey(accountId, keyPair) {
        if (keyPair) {
            await this.keyStore.setKey(NETWORK_ID, accountId, keyPair)
        }
    }

    /********************************
    recovering a second account attempts to call this method with the currently logged in account and not the tempKeyStore
    ********************************/
    // TODO: Why is fullAccess needed? Everything without contractId should be full access.
    async addAccessKey(accountId, contractId, publicKey, fullAccess = false, methodNames) {
        const account = this.getAccount(accountId)
        console.log('account instance', account)
        // update has2fa now after we have the right Account instance for temp recovery
        this.has2fa = await this.twoFactor.isEnabled()
        console.log('this.has2fa', this.has2fa)
        try {
            if (fullAccess || (!this.has2fa && accountId === contractId)) {
                console.log('adding full access key', publicKey.toString())
                return await account.addKey(publicKey)
            } else {
                let methodNames = methodNames ? methodNames : ''
                
                // TODO: fix account.addKey to accept multiple method names, kludge fix here for adding multisig LAK
                if (this.has2fa && !methodNames.length && accountId === contractId) {
                    const { MULTISIG_CHANGE_METHODS, MULTISIG_ALLOWANCE } = nearApiJs.multisig
                    methodNames = MULTISIG_CHANGE_METHODS
                    console.log('adding limited access key', publicKey.toString(), methodNames)
                    const { addKey, functionCallAccessKey } = nearApiJs.transactions
                    const actions = [
                        addKey(publicKey, functionCallAccessKey(accountId, methodNames, MULTISIG_ALLOWANCE))
                    ]
                    return await account.signAndSendTransaction(accountId, actions)
                }
                
                return await account.addKey(
                    publicKey.toString(),
                    contractId,
                    methodNames,
                    ACCESS_KEY_FUNDING_AMOUNT
                )
            }
        } catch (e) {
            if (e.type === 'AddKeyAlreadyExists') {
                return true;
            }
            throw e;
        }
    }

    async addLedgerAccessKey(accountId) {
        const ledgerPublicKey = await this.getLedgerPublicKey()
        await setKeyMeta(ledgerPublicKey, { type: 'ledger' })
        await this.getAccount(accountId).addKey(ledgerPublicKey)
        await this.postSignedJson('/account/ledgerKeyAdded', { accountId, publicKey: ledgerPublicKey.toString() })
    }

    async connectLedger(ledgerPublicKey) {
        const accessKeys =  await this.getAccessKeys()
        const ledgerKeyConfirmed = accessKeys.map(key => key.public_key).includes(ledgerPublicKey.toString())

        if (ledgerKeyConfirmed) {
            await setKeyMeta(ledgerPublicKey, { type: 'ledger' })
        }

    }

    async disableLedger() {
        const account = this.getAccount(this.accountId)
        const keyPair = KeyPair.fromRandom('ed25519')
        await account.addKey(keyPair.publicKey)
        await this.keyStore.setKey(NETWORK_ID, this.accountId, keyPair)

        const publicKey = await this.getLedgerPublicKey()
        await this.removeAccessKey(publicKey)
        await this.getAccessKeys(this.accountId)

        await this.deleteRecoveryMethod({ kind: 'ledger', publicKey: publicKey.toString() })

    }

    async addWalletMetadataAccessKeyIfNeeded(accountId, localAccessKey) {
        if (!localAccessKey || (!localAccessKey.access_key.permission.FunctionCall ||
                !localAccessKey.access_key.permission.FunctionCall.method_names.includes(WALLET_METADATA_METHOD))) {
            // NOTE: This key isn't used to call actual contract method, just used to verify connection with account in private DB
            const newLocalKeyPair = KeyPair.fromRandom('ed25519')
            const account = this.getAccount(accountId)
            try {
                await account.addKey(newLocalKeyPair.getPublicKey(), accountId, WALLET_METADATA_METHOD, '0')
            } catch (error) {
                if (error.type === 'KeyNotFound') {
                    throw new WalletError('No accounts were found.', 'signInLedger.getLedgerAccountIds.noAccounts')
                }
                throw error
            }
            return newLocalKeyPair
        }

        return null
    }

    async getLedgerAccountIds() {
        const publicKey = await this.getLedgerPublicKey()
        await store.dispatch(setLedgerTxSigned(true))
        // TODO: getXXX methods shouldn't be modifying the state
        await setKeyMeta(publicKey, { type: 'ledger' })

        let accountIds
        try {
            accountIds = await getAccountIds(publicKey)
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new WalletError('Fetch aborted.', 'signInLedger.getLedgerAccountIds.aborted')
            }
            throw error
        }

        const checkedAccountIds = (await Promise.all(
            accountIds
                .map(async (accountId) => {
                    const accountKeys = await this.getAccount(accountId).getAccessKeys();
                    return accountKeys.find(({ public_key }) => public_key === publicKey.toString()) ? accountId : null
                })
            )
        )
        .filter(accountId => accountId)

        if (!checkedAccountIds.length) {
            throw new WalletError('No accounts were found.', 'signInLedger.getLedgerAccountIds.noAccounts')
        }

        return checkedAccountIds
    }

    async addLedgerAccountId(accountId) {
        const accessKeys =  await this.getAccessKeys(accountId)
        const localAccessKey = await this.getLocalAccessKey(accountId, accessKeys)

        const newKeyPair = await this.addWalletMetadataAccessKeyIfNeeded(accountId, localAccessKey)
        await this.setKey(accountId, newKeyPair)
    }

    async saveAndSelectLedgerAccounts(accounts) {
        const accountIds = Object.keys(accounts)

        for (let i = 0; i < accountIds.length; i++) {
            const accountId = accountIds[i]
            if (i === accountIds.length - 1) {
                await this.saveAndSelectAccount(accountId)
            } else {
                await this.saveAccount(accountId)
            }
        }

        return {
            numberOfAccounts: accountIds.length
        }
    }

    async getLedgerPublicKey() {
        const { createLedgerU2FClient } = await import('./ledger.js')
        const client = await createLedgerU2FClient()
        this.dispatchShowLedgerModal(true)
        const rawPublicKey = await client.getPublicKey()
        return new PublicKey({ keyType: KeyType.ED25519, data: rawPublicKey })
    }

    async getAvailableKeys() {
        const availableKeys = [(await this.keyStore.getKey(NETWORK_ID, this.accountId)).publicKey]
        const ledgerKey = await this.getLedgerKey(this.accountId)
        if (ledgerKey) {
            availableKeys.push(ledgerKey.toString())
        }
        return availableKeys
    }

    getAccount(accountId) {
        let account
        if (accountId === this.accountId && this.has2fa) {
            account = this.twoFactor
        } else {
            account = new nearApiJs.Account(this.connection, accountId)
        }

        // TODO: Check if lockup needed somehow? Should be changed to async? Should just check in wrapper?
        return decorateWithLockup(account);
    }

    async getBalance(accountId) {
        accountId = accountId || this.accountId

        const account = this.getAccount(accountId)
        return await account.getAccountBalance()
    }

    async signatureFor(account) {
        const { accountId } = account
        const blockNumber = String((await account.connection.provider.status()).sync_info.latest_block_height);
        const signer = account.inMemorySigner || account.connection.signer
        const signed = await signer.signMessage(Buffer.from(blockNumber), accountId, NETWORK_ID);
        const blockNumberSignature = Buffer.from(signed.signature).toString('base64');
        return { blockNumber, blockNumberSignature };
    }

    async postSignedJson(path, options) {
        return await sendJson('POST', ACCOUNT_HELPER_URL + path, {
            ...options,
            ...(await this.signatureFor(this))
        });
    }

    async initializeRecoveryMethod(accountId, method) {
        const { seedPhrase } = generateSeedPhrase()
        const isNew = await this.checkIsNew(accountId)
        const body = {
            accountId,
            method,
            seedPhrase
        }
        if (isNew) {
            await sendJson('POST', ACCOUNT_HELPER_URL + '/account/initializeRecoveryMethodForTempAccount', body);
        } else {
            await this.postSignedJson('/account/initializeRecoveryMethod', body);
        }
        return seedPhrase;
    }

    async validateSecurityCode(accountId, method, securityCode) {
        const isNew = await this.checkIsNew(accountId)
        const body = {
            accountId,
            method,
            securityCode
        }

        try {
            if (isNew) {
                await sendJson('POST', ACCOUNT_HELPER_URL + '/account/validateSecurityCodeForTempAccount', body);
            } else {
                await this.postSignedJson('/account/validateSecurityCode', body);
            }
        } catch(e) {
            throw new WalletError('Invalid code', 'account.setupRecoveryMessage.error')
        }
    }

    async getRecoveryMethods(account) {
        const accountId = account ? account.accountId : this.accountId
        return {
            accountId,
            data: await this.postSignedJson('/account/recoveryMethods', { accountId }, account)
        }
    }

    async setupRecoveryMessageNewAccount(accountId, method, securityCode, fundingContract, fundingKey, recoverySeedPhrase) {
        const { secretKey } = parseSeedPhrase(recoverySeedPhrase)
        const recoveryKeyPair = KeyPair.fromString(secretKey)
        await this.validateSecurityCode(accountId, method, securityCode);
        await this.saveAccount(accountId, recoveryKeyPair);
        await this.createNewAccount(accountId, fundingContract, fundingKey, recoveryKeyPair.publicKey)
        const newKeyPair = KeyPair.fromRandom('ed25519')
        const newPublicKey = newKeyPair.publicKey
        await this.addNewAccessKeyToAccount(accountId, newPublicKey)
        await this.saveAccount(accountId, newKeyPair)
        const account = await store.dispatch(refreshAccount())
        const promptTwoFactor = await this.twoFactor.checkCanEnableTwoFactor(account)

        if (promptTwoFactor && fundingContract) {
            store.dispatch(redirectTo('/enable-two-factor'))
        } else {
            store.dispatch(redirectToApp('/profile'))
        }
    }

    async setupRecoveryMessage(accountId, method, securityCode, recoverySeedPhrase) {
        const { secretKey } = parseSeedPhrase(recoverySeedPhrase)
        const recoveryKeyPair = KeyPair.fromString(secretKey)
        await this.validateSecurityCode(accountId, method, securityCode);
        const newPublicKey = recoveryKeyPair.publicKey
        await this.addNewAccessKeyToAccount(accountId, newPublicKey)
        await store.dispatch(redirectTo('/profile'))
    }

    async addNewAccessKeyToAccount(accountId, newPublicKey) {
        const account = this.getAccount(accountId)
        const accountKeys = await account.getAccessKeys();

        if (!accountKeys.some(it => it.public_key.endsWith(newPublicKey))) {
            await this.addAccessKey(accountId, accountId, convertPKForContract(newPublicKey))
        }
    }

    async deleteRecoveryMethod({ kind, publicKey }, deleteAllowed = true) {
        const accessKeys =  await this.getAccessKeys()
        const pubKeys = accessKeys.map(key => key.public_key)

        if (deleteAllowed) {
            if (pubKeys.includes(publicKey)) {
                await this.removeAccessKey(publicKey)
            }
            await this.postSignedJson('/account/deleteRecoveryMethod', {
                accountId: this.accountId,
                kind,
                publicKey
            })
        } else {
            throw new WalletError('Cannot delete last recovery method', 'errors.recoveryMethods.lastMethod')
        }
    }

    async accountExists(accountId) {
        try {
            await this.getAccount(accountId).state();
            return true;
        } catch (error) {
            if (error.toString().indexOf('does not exist while viewing') !== -1) {
                return false;
            }
            throw error;
        }
    }

    async recoverAccountSeedPhrase(seedPhrase, accountId, fromSeedPhraseRecovery = true) {
        const { publicKey, secretKey } = parseSeedPhrase(seedPhrase)

        const tempKeyStore = new nearApiJs.keyStores.InMemoryKeyStore()
        let accountIds = [accountId]
        if (!accountId) {
            accountIds = await getAccountIds(publicKey)
            const implicitAccountId = Buffer.from(PublicKey.fromString(publicKey).data).toString('hex')
            if (await this.accountExists(implicitAccountId)) {
                accountIds.push(implicitAccountId)
            }
        }

        if (!accountIds.length) {
            throw new WalletError('Cannot find matching public key', 'account.recoverAccount.errorInvalidSeedPhrase', { publicKey })
        }

        const connection = nearApiJs.Connection.fromConfig({
            networkId: NETWORK_ID,
            provider: { type: 'JsonRpcProvider', args: { url: NODE_URL + '/' } },
            signer: new nearApiJs.InMemorySigner(tempKeyStore)
        })
        await Promise.all(accountIds.map(async (accountId, i) => {
            if (!accountId || !accountId.length) return

            // temp account
            this.connection = connection
            this.accountId = accountId
            this.twoFactor = new TwoFactor(this)
            this.twoFactor.accountId = accountId
            this.has2fa = await this.twoFactor.isEnabled()
            let account = this.getAccount(accountId)
            // check if recover access key is FAK and if so add key without 2FA
            if (this.has2fa) {
                const accessKeys = await account.getAccessKeys()
                const recoveryAccessKey = accessKeys.find(({ public_key }) => public_key === publicKey)
                if (recoveryAccessKey.access_key.permission && recoveryAccessKey.access_key.permission === 'FullAccess') {
                    console.log('using FAK and regular Account instance to recover')
                    this.has2fa = false
                    fromSeedPhraseRecovery = false
                }
            }

            const keyPair = KeyPair.fromString(secretKey)
            await tempKeyStore.setKey(NETWORK_ID, accountId, keyPair)
            account.keyStore = tempKeyStore
            account.inMemorySigner = new nearApiJs.InMemorySigner(tempKeyStore)
            const newKeyPair = KeyPair.fromRandom('ed25519')

            await this.addAccessKey(accountId, accountId, newKeyPair.publicKey, fromSeedPhraseRecovery)
            if (i === accountIds.length - 1) {
                await this.saveAndSelectAccount(accountId, newKeyPair)
            } else {
                await this.saveAccount(accountId, newKeyPair)
            }
        }))

        return {
            numberOfAccounts: accountIds.length,
            accountList: accountIds.flatMap((accountId) => accountId.account_id).join(', '),
        }
    }

    async signAndSendTransactions(transactions, accountId) {
        if (this.has2fa) {
            return await this.twoFactor.signAndSendTransactions(transactions)
        }
        store.dispatch(setSignTransactionStatus('in-progress'))
        for (let { receiverId, nonce, blockHash, actions } of transactions) {
            const [, signedTransaction] = await nearApiJs.transactions.signTransaction(receiverId, nonce, actions, blockHash, this.connection.signer, accountId, NETWORK_ID)
            let { status, transaction } = await this.connection.provider.sendTransaction(signedTransaction)

            if (status.Failure !== undefined) {
                throw new Error(`Transaction failure for transaction hash: ${transaction.hash}, receiver_id: ${transaction.receiver_id} .`)
            }
        }
    }

    dispatchShowLedgerModal(show) {
        const [ action ] = store.getState().account.actionsPending.slice(-1)
        store.dispatch(showLedgerModal({show, action}))
    }
}

export const wallet = new Wallet()

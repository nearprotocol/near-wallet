import * as nearApiJs from 'near-api-js'
import sendJson from 'fetch-send-json'
import { findSeedPhraseKey } from 'near-seed-phrase'
import { createClient } from 'near-ledger-js'
import { PublicKey } from 'near-api-js/lib/utils'
import { KeyType } from 'near-api-js/lib/utils/key_pair'
import { store } from '..'
import { getAccessKeys } from '../actions/account'
import { generateSeedPhrase } from 'near-seed-phrase';

export const WALLET_CREATE_NEW_ACCOUNT_URL = 'create'
export const WALLET_CREATE_NEW_ACCOUNT_FLOW_URLS = ['create', 'set-recovery', 'setup-seed-phrase', 'recover-account', 'recover-seed-phrase']
export const WALLET_LOGIN_URL = 'login'
export const WALLET_SIGN_URL = 'sign'
export const ACCOUNT_HELPER_URL = process.env.REACT_APP_ACCOUNT_HELPER_URL || 'https://near-contract-helper.onrender.com'
export const EXPLORER_URL = process.env.EXPLORER_URL || 'https://explorer.testnet.near.org';
export const IS_MAINNET = process.env.REACT_APP_IS_MAINNET === 'true' || process.env.REACT_APP_IS_MAINNET === 'yes'
export const ACCOUNT_ID_SUFFIX = process.env.REACT_APP_ACCOUNT_ID_SUFFIX || 'testnet'

const NETWORK_ID = process.env.REACT_APP_NETWORK_ID || 'default'
const CONTRACT_CREATE_ACCOUNT_URL = `${ACCOUNT_HELPER_URL}/account`
export const NODE_URL = process.env.REACT_APP_NODE_URL || 'https://rpc.nearprotocol.com'

const KEY_UNIQUE_PREFIX = '_4:'
const KEY_WALLET_ACCOUNTS = KEY_UNIQUE_PREFIX + 'wallet:accounts_v2'
const KEY_ACTIVE_ACCOUNT_ID = KEY_UNIQUE_PREFIX + 'wallet:active_account_id_v2'
const ACCESS_KEY_FUNDING_AMOUNT = process.env.REACT_APP_ACCESS_KEY_FUNDING_AMOUNT || '100000000'
const ACCOUNT_ID_REGEX = /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/

export const ACCOUNT_CHECK_TIMEOUT = 500
export const TRANSACTIONS_REFRESH_INTERVAL = 10000

// TODO: Use similar check for in-app views on iOS to offer opening in Safari?
export const IS_MOBILE_APP = window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.signer;

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
        const inMemorySigner = new nearApiJs.InMemorySigner(this.keyStore)

        async function getLedgerKey(accountId) {
            let state = store.getState()
            if (!state.account.fullAccessKeys) {
                await store.dispatch(getAccessKeys(accountId))
                state = store.getState()
            }
            const accessKeys = state.account.fullAccessKeys
            if (accessKeys && state.account.accountId === accountId) {
                // TODO: Only use Ledger when it's the only available signer for given tx
                // TODO: Use network ID
                const ledgerKey = accessKeys.find(accessKey => accessKey.meta.type === 'ledger')
                if (ledgerKey) {
                    return PublicKey.from(ledgerKey.public_key)
                }
            }
            return null
        }

        this.signer = {
            async getPublicKey(accountId, networkId) {
                return (await getLedgerKey(accountId)) || (await inMemorySigner.getPublicKey(accountId, networkId))
            },
            async signMessage(message, accountId, networkId) {
                if (await getLedgerKey(accountId)) {
                    // TODO: Use network ID
                    const client = await createClient()
                    const signature = await client.sign(message)
                    return {
                        signature,
                        publicKey: await this.getPublicKey(accountId, networkId)
                    }
                }

                return inMemorySigner.signMessage(message, accountId, networkId)
            }
        }

        if (IS_MOBILE_APP) {
            const { MobileSigner } = require('./mobile-signer');
            this.signer = new MobileSigner();
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
    }

    save() {
        localStorage.setItem(KEY_ACTIVE_ACCOUNT_ID, this.accountId)
        localStorage.setItem(KEY_WALLET_ACCOUNTS, JSON.stringify(this.accounts))
    }

    getAccountId() {
        return this.accountId
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

    redirectToCreateAccount(options = {}, history) {
        const param = {
            next_url: window.location.search
        }
        if (options.reset_accounts) {
            param.reset_accounts = true
        }
        //  let url = WALLET_CREATE_NEW_ACCOUNT_URL + "?" + $.param(param)
        let url =
            '/' +
            WALLET_CREATE_NEW_ACCOUNT_URL +
            '/?' +
            Object.keys(param).map(
                (p, i) =>
                    `${i ? '&' : ''}${encodeURIComponent(p)}=${encodeURIComponent(
                        param[p]
                    )}`
            )
        history ? history.push(url) : window.location.replace(url)
    }

    isEmpty() {
        return !this.accounts || !Object.keys(this.accounts).length
    }

    redirectIfEmpty(history) {
        if (this.isEmpty()) {
            this.redirectToCreateAccount({}, history)
        }
    }

    async loadAccount() {
        if (this.isEmpty()) {
            throw new Error('No account.')
        }
        return {
            ...await this.getAccount(this.accountId).state(),
            balance: await this.getBalance(),
            accountId: this.accountId,
            accounts: this.accounts
        }
    }

    // TODO: Figure out whether wallet should work with any account or current one. Maybe make wallet account specific and switch whole Wallet?
    async getAccessKeys() {
        if (!this.accountId) return null

        const accessKeys =  await this.getAccount(this.accountId).getAccessKeys()
        return Promise.all(accessKeys.map(async (accessKey) => ({
            ...accessKey,
            meta: await getKeyMeta(accessKey.public_key)
        })))
    }

    async removeAccessKey(publicKey) {
        return await this.getAccount(this.accountId).deleteKey(publicKey)
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

    async checkNewAccount(accountId) {
        if (!this.isLegitAccountId(accountId)) {
            throw new Error('Invalid username.')
        }
        if (accountId.match(/.*[.@].*/)) {
            if (!accountId.endsWith(`.${ACCOUNT_ID_SUFFIX}`)) {
                throw new Error('Characters `.` and `@` have special meaning and cannot be used as part of normal account name.');
            }
        }
        if (accountId in this.accounts) {
            throw new Error('Account ' + accountId + ' already exists.')
        }
        let remoteAccount = null
        try {
            remoteAccount = await this.getAccount(accountId).state()
        } catch (e) {
            return true
        }
        if (!!remoteAccount) {
            throw new Error('Account ' + accountId + ' already exists.')
        }
    }

    async createNewAccount(accountId, fundingKey, fundingContract) {
        this.checkNewAccount(accountId);

        const publicKey = await this.signer.createKey(accountId, NETWORK_ID);
        if (fundingKey && fundingContract) {
            await this.createNewAccountLinkdrop(accountId, fundingKey, fundingContract, publicKey);
            await this.keyStore.removeKey(NETWORK_ID, fundingContract)
        } else {
            await sendJson('POST', CONTRACT_CREATE_ACCOUNT_URL, {
                newAccountId: accountId,
                newAccountPublicKey: publicKey.toString()
            })
        }

        await this.saveAndSelectAccount(accountId);
    }

    async createNewAccountLinkdrop(accountId, fundingKey, fundingContract, publicKey) {
        const account = this.getAccount(fundingContract);

        await this.keyStore.setKey(
            NETWORK_ID, fundingContract,
            nearApiJs.KeyPair.fromString(fundingKey)
        )

        const contract = new nearApiJs.Contract(account, fundingContract, {
            changeMethods: ['create_account_and_claim', 'claim'],
            sender: fundingContract
        });
        await contract.create_account_and_claim({
            new_account_id: accountId,
            new_public_key: publicKey.toString().replace('ed25519:', '')
        });
    }

    async saveAndSelectAccount(accountId) {
        this.accounts[accountId] = true
        this.accountId = accountId
        this.save()
    }

    async addAccessKey(accountId, contractId, publicKey) {
        try {
            return await this.getAccount(accountId).addKey(
                publicKey,
                contractId,
                '', // methodName
                ACCESS_KEY_FUNDING_AMOUNT
            )
        } catch (e) {
            if (e.type === 'AddKeyAlreadyExists') {
                return true;
            }
            throw e;
        }
    }

    async addLedgerAccessKey(accountId) {
        const client = await createClient()
        const rawPublicKey = await client.getPublicKey()
        const publicKey = new PublicKey({ keyType: KeyType.ED25519, data: rawPublicKey })
        await setKeyMeta(publicKey, { type: 'ledger' })
        return await this.getAccount(accountId).addKey(publicKey)
    }

    async getAvailableKeys() {
        // TODO: Return additional keys (e.g. Ledger)
        return [(await this.keyStore.getKey(NETWORK_ID, this.accountId)).publicKey]
    }

    clearState() {
        this.accounts = {}
        this.accountId = ''
        this.save()
    }

    getAccount(accountId) {
        return new nearApiJs.Account(this.connection, accountId)
    }

    async getBalance(accountId) {
        let userAccountId = this.accountId;
        if (accountId) {
            userAccountId = accountId;
        }
        return await this.getAccount(userAccountId).getAccountBalance()
    }

    async signatureFor(accountId) {
        const blockNumber = String((await this.connection.provider.status()).sync_info.latest_block_height);
        const signed = await this.signer.signMessage(Buffer.from(blockNumber), accountId, NETWORK_ID);
        const blockNumberSignature = Buffer.from(signed.signature).toString('base64');
        return { blockNumber, blockNumberSignature };
    }

    async initializeRecoveryMethod(accountId, method) {
        await sendJson('POST', `${ACCOUNT_HELPER_URL}/account/initializeRecoveryMethod`, {
            accountId,
            method,
            ...(await wallet.signatureFor(accountId))
        });
    }

    async validateSecurityCode(accountId, method, securityCode) {
        await sendJson('POST', `${ACCOUNT_HELPER_URL}/account/validateSecurityCode`, {
            accountId,
            method,
            securityCode,
            ...(await wallet.signatureFor(accountId))
        });
    }

    async getRecoveryMethods() {
        return {
            accountId: wallet.accountId,
            data: await sendJson('POST', `${ACCOUNT_HELPER_URL}/account/recoveryMethods`, {
                accountId: wallet.accountId,
                ...(await wallet.signatureFor(wallet.accountId))
        })}
    }

    async setupRecoveryMessage(accountId, method, securityCode) {
        await this.validateSecurityCode(accountId, method, securityCode);

        const { seedPhrase, publicKey } = generateSeedPhrase();

        const account = this.getAccount(accountId)
        const accountKeys = await account.getAccessKeys();
        if (!accountKeys.some(it => it.public_key.endsWith(publicKey))) {
            await account.addKey(publicKey);
        }

        return sendJson('POST', `${ACCOUNT_HELPER_URL}/account/sendRecoveryMessage`, {
            accountId,
            method,
            seedPhrase
        });
    }

    async replaceAccessKey(oldKey, newKey) {
        const accountId = this.accountId;
        await this.getAccount(accountId).addKey(newKey)
        await this.removeAccessKey(oldKey)
    }

    async sendNewRecoveryLink(method) {
        const accountId = this.accountId;
        const { seedPhrase, publicKey } = generateSeedPhrase();

        await sendJson('POST', `${ACCOUNT_HELPER_URL}/account/resendRecoveryLink`, {
            accountId,
            method,
            seedPhrase,
            publicKey,
            ...(await wallet.signatureFor(accountId))
        });
        await this.replaceAccessKey(method.publicKey, publicKey);
    }

    async deleteRecoveryMethod(method) {
        await sendJson('POST', `${ACCOUNT_HELPER_URL}/account/deleteRecoveryMethod`, {
            accountId: wallet.accountId,
            kind: method.kind,
            publicKey: method.publicKey,
            ...(await wallet.signatureFor(wallet.accountId))
        })
        await this.removeAccessKey(method.publicKey)
    }

    async recoverAccountSeedPhrase(seedPhrase, accountId) {
        const tempKeyStore = new nearApiJs.keyStores.InMemoryKeyStore()

        const connection = nearApiJs.Connection.fromConfig({
            networkId: NETWORK_ID,
            provider: { type: 'JsonRpcProvider', args: { url: NODE_URL + '/' } },
            signer: new nearApiJs.InMemorySigner(tempKeyStore)
        })

        const account = new nearApiJs.Account(connection, accountId)

        const accessKeys = await account.getAccessKeys()
        const publicKeys = accessKeys.map(it => it.public_key)
        const { secretKey } = findSeedPhraseKey(seedPhrase, publicKeys)
        if (!secretKey) {
            throw new Error(`Cannot find matching public key for account ${accountId}`);
        }

        const keyPair = nearApiJs.KeyPair.fromString(secretKey)
        await tempKeyStore.setKey(NETWORK_ID, accountId, keyPair)

        // generate new keypair for this browser
        const publicKey = await this.signer.createKey(accountId, NETWORK_ID);
        await account.addKey(publicKey)

        await this.saveAndSelectAccount(accountId)
    }

    async signAndSendTransactions(transactions, accountId) {
        for (let { receiverId, nonce, blockHash, actions } of transactions) {
            const [, signedTransaction] = await nearApiJs.transactions.signTransaction(receiverId, nonce, actions, blockHash, this.connection.signer, accountId, NETWORK_ID)
            await this.connection.provider.sendTransaction(signedTransaction)
        }
    }
}

export const wallet = new Wallet()

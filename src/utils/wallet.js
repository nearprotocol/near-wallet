import * as nearApiJs from 'near-api-js';
import { KeyPair } from 'near-api-js';
import { MULTISIG_CHANGE_METHODS } from 'near-api-js/lib/account_multisig';
import { PublicKey } from 'near-api-js/lib/utils';
import { KeyType } from 'near-api-js/lib/utils/key_pair';
import { parseSeedPhrase } from 'near-seed-phrase';
import { generateSeedPhrase } from 'near-seed-phrase';

import { store } from '..';
import {
    setSignTransactionStatus,
    setLedgerTxSigned,
    showLedgerModal,
    redirectTo,
    finishAccountSetup,
    selectAccount
} from '../actions/account';
import FungibleTokens from '../services/FungibleTokens';
import sendJson from '../tmp_fetch_send_json';
import { decorateWithLockup } from './account-with-lockup';
import { getAccountIds } from './helper-api';
import { setAccountConfirmed, getAccountConfirmed, setAccountIsInactive, getAccountIsInactive } from './localStorage';
import { TwoFactor } from './twoFactor';
import { WalletError } from './walletError';


export const WALLET_CREATE_NEW_ACCOUNT_URL = 'create';
export const WALLET_CREATE_NEW_ACCOUNT_FLOW_URLS = ['create', 'set-recovery', 'setup-seed-phrase', 'recover-account', 'recover-seed-phrase', 'sign-in-ledger', 'fund-create-account'];
export const WALLET_LOGIN_URL = 'login';
export const WALLET_SIGN_URL = 'sign';
export const WALLET_LINKDROP_URL = 'linkdrop';
export const WALLET_RECOVER_ACCOUNT_URL = 'recover-account';
export const ACCOUNT_HELPER_URL = process.env.REACT_APP_ACCOUNT_HELPER_URL || 'https://near-contract-helper.onrender.com';
export const EXPLORER_URL = process.env.EXPLORER_URL || 'https://explorer.testnet.near.org';
export const IS_MAINNET = process.env.REACT_APP_IS_MAINNET === 'true' || process.env.REACT_APP_IS_MAINNET === 'yes';
export const SHOW_PRERELEASE_WARNING = process.env.SHOW_PRERELEASE_WARNING === 'true' || process.env.SHOW_PRERELEASE_WARNING === 'yes';
export const SHOW_NETWORK_BANNER = !IS_MAINNET || SHOW_PRERELEASE_WARNING;
export const DISABLE_CREATE_ACCOUNT = process.env.DISABLE_CREATE_ACCOUNT === 'true' || process.env.DISABLE_CREATE_ACCOUNT === 'yes';
export const DISABLE_SEND_MONEY = process.env.DISABLE_SEND_MONEY === 'true' || process.env.DISABLE_SEND_MONEY === 'yes';
export const ACCOUNT_ID_SUFFIX = process.env.REACT_APP_ACCOUNT_ID_SUFFIX || 'testnet';
export const MULTISIG_MIN_AMOUNT = process.env.REACT_APP_MULTISIG_MIN_AMOUNT || '4';
export const MULTISIG_MIN_PROMPT_AMOUNT = process.env.REACT_APP_MULTISIG_MIN_PROMPT_AMOUNT || '200';
export const LOCKUP_ACCOUNT_ID_SUFFIX = process.env.LOCKUP_ACCOUNT_ID_SUFFIX || 'lockup.near';
export const MIN_BALANCE_FOR_GAS = process.env.REACT_APP_MIN_BALANCE_FOR_GAS || nearApiJs.utils.format.parseNearAmount('0.1');
export const ACCESS_KEY_FUNDING_AMOUNT = process.env.REACT_APP_ACCESS_KEY_FUNDING_AMOUNT || nearApiJs.utils.format.parseNearAmount('0.25');
export const LINKDROP_GAS = process.env.LINKDROP_GAS || '100000000000000';
export const ENABLE_FULL_ACCESS_KEYS = process.env.ENABLE_FULL_ACCESS_KEYS === 'yes';
export const HIDE_SIGN_IN_WITH_LEDGER_ENTER_ACCOUNT_ID_MODAL = process.env.HIDE_SIGN_IN_WITH_LEDGER_ENTER_ACCOUNT_ID_MODAL;
export const SMS_BLACKLIST = process.env.SMS_BLACKLIST || 'CN';
export const EXPLORE_APPS_URL = process.env.EXPLORE_APPS_URL || 'https://awesomenear.com/trending/';
export const MIN_BALANCE_TO_CREATE = process.env.MIN_BALANCE_TO_CREATE || nearApiJs.utils.format.parseNearAmount('0.2');
export const NETWORK_ID = process.env.REACT_APP_NETWORK_ID || 'default';
const CONTRACT_CREATE_ACCOUNT_URL = `${ACCOUNT_HELPER_URL}/account`;
const FUNDED_ACCOUNT_CREATE_URL = `${ACCOUNT_HELPER_URL}/fundedAccount`;
export const NODE_URL = process.env.REACT_APP_NODE_URL || 'https://rpc.nearprotocol.com';
export const WALLET_APP_MIN_AMOUNT = process.env.WALLET_APP_MIN_AMOUNT || '0.2';

const KEY_UNIQUE_PREFIX = '_4:';
const KEY_WALLET_ACCOUNTS = KEY_UNIQUE_PREFIX + 'wallet:accounts_v2';
export const KEY_ACTIVE_ACCOUNT_ID = KEY_UNIQUE_PREFIX + 'wallet:active_account_id_v2';
const ACCOUNT_ID_REGEX = /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/;

export const keyAccountConfirmed = (accountId) => `wallet.account:${accountId}:${NETWORK_ID}:confirmed`;
export const keyStakingAccountSelected = () => `wallet.account:${wallet.accountId}:${NETWORK_ID}:stakingAccount`;
export const keyAccountInactive = (accountId) => `wallet.account:${accountId}:${NETWORK_ID}:inactive`;

const WALLET_METADATA_METHOD = '__wallet__metadata';

export const ACCOUNT_CHECK_TIMEOUT = 500;
export const TRANSACTIONS_REFRESH_INTERVAL = 10000;

export const convertPKForContract = (pk) => {
    if (typeof pk !== 'string') {
        pk = pk.toString();
    }
    return pk.replace('ed25519:', '');
};
export const toPK = (pk) => nearApiJs.utils.PublicKey.from(pk);

export async function setKeyMeta(publicKey, meta) {
    localStorage.setItem(`keyMeta:${publicKey}`, JSON.stringify(meta));
}

export async function getKeyMeta(publicKey) {
    try {
        return JSON.parse(localStorage.getItem(`keyMeta:${publicKey}`)) || {};
    } catch (e) {
        return {};
    }
}

class Wallet {
    constructor() {
        this.keyStore = new nearApiJs.keyStores.BrowserLocalStorageKeyStore(window.localStorage, 'nearlib:keystore:');
        this.inMemorySigner = new nearApiJs.InMemorySigner(this.keyStore);

        const inMemorySigner = this.inMemorySigner;
        const wallet = this;
        this.signer = {
            async getPublicKey(accountId, networkId) {
                return (await wallet.getLedgerKey(accountId)) || (await inMemorySigner.getPublicKey(accountId, networkId));
            },
            async signMessage(message, accountId, networkId) {
                if (await wallet.getLedgerKey(accountId)) {
                    wallet.dispatchShowLedgerModal(true);
                    const path = await localStorage.getItem(`ledgerHdPath:${accountId}`);
                    const { createLedgerU2FClient } = await import('./ledger.js');
                    const client = await createLedgerU2FClient();
                    const signature = await client.sign(message, path);
                    await store.dispatch(setLedgerTxSigned(true, accountId));
                    const publicKey = await this.getPublicKey(accountId, networkId);
                    return {
                        signature,
                        publicKey
                    };
                }

                return inMemorySigner.signMessage(message, accountId, networkId);
            }
        };
        this.connection = nearApiJs.Connection.fromConfig({
            networkId: NETWORK_ID,
            provider: { type: 'JsonRpcProvider', args: { url: NODE_URL + '/' } },
            signer: this.signer
        });
        this.accounts = JSON.parse(
            localStorage.getItem(KEY_WALLET_ACCOUNTS) || '{}'
        );
        this.accountId = localStorage.getItem(KEY_ACTIVE_ACCOUNT_ID) || '';
        this.createFungibleTokensInstance();
    }

    createFungibleTokensInstance() {
        this.fungibleTokens = this.accountId && new FungibleTokens(this.getAccountBasic(this.accountId));
    }

    async getLocalAccessKey(accountId, accessKeys) {
        const localPublicKey = await this.inMemorySigner.getPublicKey(accountId, NETWORK_ID);
        return localPublicKey && accessKeys.find(({ public_key }) => public_key === localPublicKey.toString());
    }

    async getLedgerKey(accountId) {
        // TODO: All callers should specify accountId explicitly
        accountId = accountId || this.accountId;
        // TODO: Refactor so that every account just stores a flag if it's on Ledger?

        // special handing for fixing issue #1919
        if (accountId === ACCOUNT_ID_SUFFIX) {
            return null;
        }

        const accessKeys = await this.getAccessKeys(accountId);
        if (accessKeys) {
            const localKey = await this.getLocalAccessKey(accountId, accessKeys);
            const ledgerKey = accessKeys.find(accessKey => accessKey.meta.type === 'ledger');
            if (ledgerKey && (!localKey || localKey.permission !== 'FullAccess')) {
                return PublicKey.from(ledgerKey.public_key);
            }
        }
        return null;
    }

    save() {
        localStorage.setItem(KEY_ACTIVE_ACCOUNT_ID, this.accountId);
        localStorage.setItem(KEY_WALLET_ACCOUNTS, JSON.stringify(this.accounts));
    }

    isLegitAccountId(accountId) {
        return ACCOUNT_ID_REGEX.test(accountId);
    }

    async sendMoney(receiverId, amount) {
        await (await this.getAccount(this.accountId)).sendMoney(receiverId, amount);
    }

    isEmpty() {
        return !this.accounts || !Object.keys(this.accounts).length;
    }

    async refreshAccount(limitedAccountData = false) {
        try {
            const account = await this.loadAccount(limitedAccountData);
            setAccountConfirmed(this.accountId, true);
            return account;
        } catch (error) {
            console.log('Error loading account:', error.message);

            if (error.toString().indexOf(`ccount ${this.accountId} does not exist while viewing`) !== -1) {
                const accountId = this.accountId;
                const accountIdNotConfirmed = !getAccountConfirmed(accountId);

                // Try to find existing account and switch to it
                let nextAccountId = '';
                for (let curAccountId of Object.keys(this.accounts)) {
                    if (await this.accountExists(curAccountId)) {
                        nextAccountId = curAccountId;
                        break;
                    }
                }
                store.dispatch(selectAccount(nextAccountId));

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
                };
            }

            throw error;
        }
    }

    async loadAccount(limitedAccountData = false) {
        if (!this.isEmpty()) {
            const accessKeys = limitedAccountData
                ? []
                : await this.getAccessKeys() || [];
            const ledgerKey = accessKeys.find(key => key.meta.type === 'ledger');
            const account = await this.getAccount(this.accountId);
            const state = await account.state();

            return {
                ...state,
                has2fa: await TwoFactor.has2faEnabled(account),
                balance: {
                    available: ''
                },
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
            };
        }
    }

    // TODO: Figure out whether wallet should work with any account or current one. Maybe make wallet account specific and switch whole Wallet?
    async getAccessKeys(accountId) {
        accountId = accountId || this.accountId;
        if (!accountId) {
            return null;
        }

        const accessKeys = await (await this.getAccount(accountId)).getAccessKeys();
        return Promise.all(accessKeys.map(async (accessKey) => ({
            ...accessKey,
            meta: await getKeyMeta(accessKey.public_key)
        })));
    }

    async removeAccessKey(publicKey) {
        return await (await this.getAccount(this.accountId)).deleteKey(publicKey);
    }

    async removeNonLedgerAccessKeys() {
        const accessKeys = await this.getAccessKeys();
        const localAccessKey = await this.getLocalAccessKey(this.accountId, accessKeys);
        const account = await this.getAccount(this.accountId);
        const keysToRemove = accessKeys.filter(({
            public_key,
            access_key: { permission },
            meta: { type }
        }) => permission === 'FullAccess' && type !== 'ledger' && !(localAccessKey && public_key === localAccessKey.public_key));

        const WALLET_METADATA_METHOD = '__wallet__metadata';
        let newLocalKeyPair;
        if (!localAccessKey || (!localAccessKey.access_key.permission.FunctionCall ||
            !localAccessKey.access_key.permission.FunctionCall.method_names.includes(WALLET_METADATA_METHOD))) {
            // NOTE: This key isn't used to call actual contract method, just used to verify connection with account in private DB
            newLocalKeyPair = KeyPair.fromRandom('ed25519');
            await account.addKey(newLocalKeyPair.getPublicKey(), this.accountId, WALLET_METADATA_METHOD, '0');
        }

        for (const { public_key } of keysToRemove) {
            await account.deleteKey(public_key);
        }

        if (newLocalKeyPair) {
            if (localAccessKey) {
                await account.deleteKey(localAccessKey.public_key);
            }
            await this.keyStore.setKey(NETWORK_ID, this.accountId, newLocalKeyPair);
        }

        const { data: recoveryMethods } = await this.getRecoveryMethods();
        const methodsToRemove = recoveryMethods.filter(method => method.kind !== 'ledger');
        for (const recoveryMethod of methodsToRemove) {
            await this.deleteRecoveryMethod(recoveryMethod);
        }
    }

    async checkAccountAvailable(accountId) {
        if (!this.isLegitAccountId(accountId)) {
            throw new Error('Invalid username.');
        }
        if (accountId !== this.accountId) {
            return await (await this.getAccount(accountId)).state();
        } else {
            throw new Error('You are logged into account ' + accountId + ' .');
        }
    }

    // TODO: Rename to make it clear that this is used to check if account can be created and that it throws. requireAccountNotExists?
    async checkNewAccount(accountId) {
        if (!this.isLegitAccountId(accountId)) {
            throw new Error('Invalid username.');
        }

        // TODO: This check doesn't seem up to date on what are current account name requirements
        // TODO: Is it even needed or is checked already both upstream/downstream?
        if (accountId.match(/.*[.@].*/)) {
            if (!accountId.endsWith(`.${ACCOUNT_ID_SUFFIX}`)) {
                throw new Error('Characters `.` and `@` have special meaning and cannot be used as part of normal account name.');
            }
        }

        if (await this.accountExists(accountId)) {
            throw new Error('Account ' + accountId + ' already exists.');
        }

        return true;
    }

    async checkIsNew(accountId) {
        return !(await this.accountExists(accountId));
    }

    async createNewAccount(accountId, fundingOptions, recoveryMethod, publicKey, previousAccountId, recaptchaToken) {
        await this.checkNewAccount(accountId);

        const { fundingContract, fundingKey, fundingAccountId, fundingAmount } = fundingOptions || {};
        if (fundingContract && fundingKey) {
            await this.createNewAccountLinkdrop(accountId, fundingContract, fundingKey, publicKey);
            await this.keyStore.removeKey(NETWORK_ID, fundingContract);
            if (fundingAmount) {
                await localStorage.setItem('linkdropAmount', fundingAmount);
            }
        } else if (fundingAccountId) {
            await this.createNewAccountFromAnother(accountId, fundingAccountId, publicKey);
        } else if (process.env.RECAPTCHA_CHALLENGE_API_KEY && recaptchaToken) {
            await sendJson('POST', FUNDED_ACCOUNT_CREATE_URL, {
                newAccountId: accountId,
                newAccountPublicKey: publicKey.toString(),
                recaptchaCode: recaptchaToken
            });
        } else {
            await sendJson('POST', CONTRACT_CREATE_ACCOUNT_URL, {
                newAccountId: accountId,
                newAccountPublicKey: publicKey.toString(),
            });
        }

        await this.saveAndSelectAccount(accountId);
        await this.addLocalKeyAndFinishSetup(accountId, recoveryMethod, publicKey, previousAccountId);
    }

    async createNewAccountFromAnother(accountId, fundingAccountId, publicKey) {
        const account = await this.getAccount(fundingAccountId);
        const { status: { SuccessValue: createResultBase64 }, transaction: { hash: transactionHash } } =
            await account.functionCall(ACCOUNT_ID_SUFFIX, 'create_account', {
                new_account_id: accountId,
                new_public_key: publicKey.toString().replace(/^ed25519:/, '')
                // TODO: Adjust gas if necessary
            }, LINKDROP_GAS, MIN_BALANCE_FOR_GAS);
        const createResult = JSON.parse(Buffer.from(createResultBase64, 'base64'));
        if (!createResult) {
            throw new WalletError('Creating account has failed', 'createAccount.returnedFalse', { transactionHash });
        }

        if (this.accounts[fundingAccountId] || fundingAccountId.length !== 64) {
            return;
        }

        // Check if account has any non-implicit keys (meaning account cannot be safely deleted)
        const accessKeys = await account.getAccessKeys();
        if (accessKeys.length !== 1) {
            return;
        }
        const [{ access_key: { permission }, public_key }] = accessKeys;
        const implicitPublicKey = new PublicKey({
            keyType: KeyType.ED25519,
            data: Buffer.from(fundingAccountId, 'hex')
        });
        if (permission !== 'FullAccess' || implicitPublicKey.toString() !== public_key) {
            return;
        }

        // TODO: Send transfer action as well to fail for sure if destination account doesn't exist?
        // Temporary implicit account used for funding – move whole balance by deleting it
        await account.deleteAccount(accountId);
    }

    async checkNearDropBalance(fundingContract, fundingKey) {
        const account = await this.getAccount(fundingContract);

        const contract = new nearApiJs.Contract(account, fundingContract, {
            viewMethods: ['get_key_balance'],
            sender: fundingContract
        });

        const key = KeyPair.fromString(fundingKey).publicKey.toString();

        return await contract.get_key_balance({ key });
    }

    async createNewAccountLinkdrop(accountId, fundingContract, fundingKey, publicKey) {
        const account = await this.getAccount(fundingContract);
        await this.keyStore.setKey(NETWORK_ID, fundingContract, KeyPair.fromString(fundingKey));

        const contract = new nearApiJs.Contract(account, fundingContract, {
            changeMethods: ['create_account_and_claim', 'claim'],
            sender: fundingContract
        });

        await contract.create_account_and_claim({
            new_account_id: accountId,
            new_public_key: publicKey.toString().replace('ed25519:', '')
        }, LINKDROP_GAS);
    }

    async claimLinkdropToAccount(fundingContract, fundingKey) {
        await this.keyStore.setKey(NETWORK_ID, fundingContract, KeyPair.fromString(fundingKey));
        const account = await this.getAccount(fundingContract);
        const accountId = this.accountId;

        const contract = new nearApiJs.Contract(account, fundingContract, {
            changeMethods: ['claim'],
            sender: fundingContract
        });

        await contract.claim({ account_id: accountId }, LINKDROP_GAS);
    }

    async saveAccount(accountId, keyPair) {
        await this.setKey(accountId, keyPair);
        this.accounts[accountId] = true;
    }

    selectAccount(accountId) {
        if (!(accountId in this.accounts)) {
            return false;
        }
        this.accountId = accountId;
        this.createFungibleTokensInstance();
        this.save();
    }

    async saveAndSelectAccount(accountId, keyPair) {
        await this.saveAccount(accountId, keyPair);
        this.selectAccount(accountId);
        // TODO: What does setAccountConfirmed do?
        setAccountConfirmed(this.accountId, false);
    }

    async setKey(accountId, keyPair) {
        if (keyPair) {
            await this.keyStore.setKey(NETWORK_ID, accountId, keyPair);
        }
    }

    /********************************
     recovering a second account attempts to call this method with the currently logged in account and not the tempKeyStore
     ********************************/
    // TODO: Why is fullAccess needed? Everything without contractId should be full access.
    async addAccessKey(accountId, contractId, publicKey, fullAccess = false, methodNames = '', recoveryKeyIsFAK) {
        const account = recoveryKeyIsFAK ? new nearApiJs.Account(this.connection, accountId) : await this.getAccount(accountId);
        const has2fa = await TwoFactor.has2faEnabled(account);
        console.log('key being added to 2fa account ?', has2fa, account);
        try {
            // TODO: Why not always pass `fullAccess` explicitly when it's desired?
            // TODO: Alternatively require passing MULTISIG_CHANGE_METHODS from caller as `methodNames`
            if (fullAccess || (!has2fa && accountId === contractId && !methodNames.length)) {
                console.log('adding full access key', publicKey.toString());
                return await account.addKey(publicKey);
            } else {
                return await account.addKey(
                    publicKey.toString(),
                    contractId,
                    (has2fa && !methodNames.length && accountId === contractId) ? MULTISIG_CHANGE_METHODS : methodNames,
                    ACCESS_KEY_FUNDING_AMOUNT
                );
            }
        } catch (e) {
            if (e.type === 'AddKeyAlreadyExists') {
                return true;
            }
            throw e;
        }
    }

    async addLedgerAccessKey() {
        const accountId = this.accountId;
        const ledgerPublicKey = await this.getLedgerPublicKey();
        const accessKeys = await this.getAccessKeys();
        const accountHasLedgerKey = accessKeys.map(key => key.public_key).includes(ledgerPublicKey.toString());
        await setKeyMeta(ledgerPublicKey, { type: 'ledger' });

        const account = await this.getAccount(accountId);
        if (!accountHasLedgerKey) {
            await account.addKey(ledgerPublicKey);
            await this.postSignedJson('/account/ledgerKeyAdded', { accountId, publicKey: ledgerPublicKey.toString() });
        }
    }

    async disableLedger() {
        const account = await this.getAccount(this.accountId);
        const keyPair = KeyPair.fromRandom('ed25519');
        await account.addKey(keyPair.publicKey);
        await this.keyStore.setKey(NETWORK_ID, this.accountId, keyPair);

        const path = await localStorage.getItem(`ledgerHdPath:${this.accountId}`);
        const publicKey = await this.getLedgerPublicKey(path);
        await this.removeAccessKey(publicKey);
        await this.getAccessKeys(this.accountId);

        await this.deleteRecoveryMethod({ kind: 'ledger', publicKey: publicKey.toString() });
        await localStorage.removeItem(`ledgerHdPath:${this.accountId}`);
    }

    async addWalletMetadataAccessKeyIfNeeded(accountId, localAccessKey) {
        if (!localAccessKey || (!localAccessKey.access_key.permission.FunctionCall ||
            !localAccessKey.access_key.permission.FunctionCall.method_names.includes(WALLET_METADATA_METHOD))) {
            // NOTE: This key isn't used to call actual contract method, just used to verify connection with account in private DB
            const newLocalKeyPair = KeyPair.fromRandom('ed25519');
            const account = await this.getAccount(accountId);
            try {
                await account.addKey(newLocalKeyPair.getPublicKey(), accountId, WALLET_METADATA_METHOD, '0');
            } catch (error) {
                if (error.type === 'KeyNotFound') {
                    throw new WalletError('No accounts were found.', 'getLedgerAccountIds.noAccounts');
                }
                throw error;
            }
            return newLocalKeyPair;
        }

        return null;
    }

    async getLedgerAccountIds(path) {
        const publicKey = await this.getLedgerPublicKey(path);

        await store.dispatch(setLedgerTxSigned(true));
        // TODO: getXXX methods shouldn't be modifying the state
        await setKeyMeta(publicKey, { type: 'ledger' });

        let accountIds;
        try {
            accountIds = await getAccountIds(publicKey);
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new WalletError('Fetch aborted.', 'getLedgerAccountIds.aborted');
            }
            throw error;
        }

        const checkedAccountIds = (await Promise.all(
                accountIds
                    .map(async (accountId) => {
                        try {
                            const accountKeys = await (await this.getAccount(accountId)).getAccessKeys();
                            return accountKeys.find(({ public_key }) => public_key === publicKey.toString()) ? accountId : null;
                        } catch (error) {
                            if (error.toString().indexOf('does not exist while viewing') !== -1) {
                                return null;
                            }
                            throw error;
                        }
                    })
            )
        )
            .filter(accountId => accountId);

        if (!checkedAccountIds.length) {
            throw new WalletError('No accounts were found.', 'getLedgerAccountIds.noAccounts');
        }

        return checkedAccountIds;
    }

    async addLedgerAccountId(accountId) {
        try {
            const accessKeys = await this.getAccessKeys(accountId);
            const localAccessKey = await this.getLocalAccessKey(accountId, accessKeys);

            const newKeyPair = await this.addWalletMetadataAccessKeyIfNeeded(accountId, localAccessKey);
            await this.setKey(accountId, newKeyPair);
        } catch (error) {
            if (error.name !== 'TransportStatusError') {
                throw new WalletError(error.message, 'addLedgerAccountId.errorRpc');
            }
            throw error;
        }
    }

    async saveAndSelectLedgerAccounts(accounts) {
        const accountIds = Object.keys(accounts).filter(accountId => accounts[accountId].status === 'success');

        if (!accountIds.length) {
            throw new WalletError('No accounts were accepted.', 'getLedgerAccountIds.noAccountsAccepted');
        }

        await Promise.all(accountIds.map(async (accountId) => {
            await this.saveAccount(accountId);
        }));

        store.dispatch(selectAccount(accountIds[accountIds.length - 1]));

        return {
            numberOfAccounts: accountIds.length
        };
    }

    async getLedgerPublicKey(path) {
        const { createLedgerU2FClient } = await import('./ledger.js');
        const client = await createLedgerU2FClient();
        this.dispatchShowLedgerModal(true);
        const rawPublicKey = await client.getPublicKey(path);
        return new PublicKey({ keyType: KeyType.ED25519, data: rawPublicKey });
    }

    async getAvailableKeys() {
        const availableKeys = [(await this.keyStore.getKey(NETWORK_ID, this.accountId)).publicKey];
        const ledgerKey = await this.getLedgerKey(this.accountId);
        if (ledgerKey) {
            availableKeys.push(ledgerKey.toString());
        }
        return availableKeys;
    }

    getAccountBasic(accountId) {
        return new nearApiJs.Account(this.connection, accountId);
    }

    async getAccount(accountId) {
        let account = new nearApiJs.Account(this.connection, accountId);
        if (await TwoFactor.has2faEnabled(account)) {
            account = new TwoFactor(this, accountId);
        }
        // TODO: Check if lockup needed somehow? Should be changed to async? Should just check in wrapper?
        return decorateWithLockup(account);
    }

    async getBalance(accountId, limitedAccountData = false) {
        accountId = accountId || this.accountId;
        const account = await this.getAccount(accountId);
        return await account.getAccountBalance(limitedAccountData);
    }

    async signatureFor(account) {
        const { accountId } = account;
        const block = await account.connection.provider.block({ finality: 'final' });
        const blockNumber = block.header.height.toString();
        const signer = account.inMemorySigner || account.connection.signer;
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

    async getAccountHelperWalletState(accountId) {
        const state = await sendJson('GET', ACCOUNT_HELPER_URL + `/account/walletState/${accountId}`);
        if (state.fundedAccountNeedsDeposit && !getAccountIsInactive(accountId)) {
            setAccountIsInactive(accountId);
        }
        return state;
    }

    async clearFundedAccountNeedsDeposit(accountId) {
        await sendJson('POST', ACCOUNT_HELPER_URL + `/fundedAccount/clearNeedsDeposit`, {
            accountId
        });
    }

    async initializeRecoveryMethod(accountId, method) {
        const { seedPhrase } = generateSeedPhrase();
        const isNew = await this.checkIsNew(accountId);
        const body = {
            accountId,
            method,
            seedPhrase
        };
        if (isNew) {
            await sendJson('POST', ACCOUNT_HELPER_URL + '/account/initializeRecoveryMethodForTempAccount', body);
        } else {
            await this.postSignedJson('/account/initializeRecoveryMethod', body);
        }
        return seedPhrase;
    }

    async validateSecurityCode(accountId, method, securityCode) {
        const isNew = await this.checkIsNew(accountId);
        const body = {
            accountId,
            method,
            securityCode
        };

        try {
            if (isNew) {
                await sendJson('POST', ACCOUNT_HELPER_URL + '/account/validateSecurityCodeForTempAccount', body);
            } else {
                await this.postSignedJson('/account/validateSecurityCode', body);
            }
        } catch (e) {
            throw new WalletError('Invalid code', 'setupRecoveryMessageNewAccount.invalidCode');
        }
    }

    async getRecoveryMethods(account) {
        const accountId = account ? account.accountId : this.accountId;
        let recoveryMethods = await this.postSignedJson('/account/recoveryMethods', { accountId }, account);
        const accessKeys = await this.getAccessKeys();
        const publicKeys = accessKeys.map(key => key.public_key);
        const publicKeyMethods = recoveryMethods.filter(({ publicKey }) => publicKeys.includes(publicKey));
        const twoFactorMethods = recoveryMethods.filter(({ kind }) => kind.indexOf('2fa-') === 0);
        const allMethods = [...publicKeyMethods, ...twoFactorMethods];

        return {
            accountId,
            data: allMethods
        };
    }

    async addLocalKeyAndFinishSetup(accountId, recoveryMethod, publicKey, previousAccountId) {
        if (recoveryMethod === 'ledger') {
            await this.addLedgerAccountId(accountId);
            await this.postSignedJson('/account/ledgerKeyAdded', { accountId, publicKey: publicKey.toString() });
        } else {
            const newKeyPair = KeyPair.fromRandom('ed25519');
            const newPublicKey = newKeyPair.publicKey;
            if (recoveryMethod !== 'seed') {
                await this.addNewAccessKeyToAccount(accountId, newPublicKey);
                await this.saveAccount(accountId, newKeyPair);
            } else {
                const contractName = null;
                const fullAccess = true;
                await wallet.postSignedJson('/account/seedPhraseAdded', { accountId, publicKey: publicKey.toString() });
                try {
                    await wallet.addAccessKey(accountId, contractName, newPublicKey, fullAccess);
                    await this.saveAccount(accountId, newKeyPair);
                } catch (error) {
                    if (previousAccountId) {
                        await wallet.saveAndSelectAccount(previousAccountId);
                    }
                    throw new WalletError(error, 'addAccessKey.error');
                }
            }
        }

        await store.dispatch(finishAccountSetup());
    }

    async setupRecoveryMessage(accountId, method, securityCode, recoverySeedPhrase) {
        const { publicKey } = parseSeedPhrase(recoverySeedPhrase);
        await this.validateSecurityCode(accountId, method, securityCode);
        try {
            await this.addNewAccessKeyToAccount(accountId, publicKey);
        } catch (e) {
            console.error(e);
            throw new WalletError(e.message, 'recoveryMethods.setupMethod');
        } finally {
            await store.dispatch(redirectTo('/profile', { globalAlertPreventClear: true }));
        }
    }

    async addNewAccessKeyToAccount(accountId, newPublicKey) {
        const account = await this.getAccount(accountId);
        const accountKeys = await account.getAccessKeys();

        if (!accountKeys.some(it => it.public_key.endsWith(newPublicKey))) {
            await this.addAccessKey(accountId, accountId, convertPKForContract(newPublicKey));
        }
    }

    async deleteRecoveryMethod({ kind, publicKey }, deleteAllowed = true) {
        const accessKeys = await this.getAccessKeys();
        const pubKeys = accessKeys.map(key => key.public_key);

        if (deleteAllowed) {
            if (pubKeys.includes(publicKey)) {
                await this.removeAccessKey(publicKey);
            }
            await this.postSignedJson('/account/deleteRecoveryMethod', {
                accountId: this.accountId,
                kind,
                publicKey
            });
        } else {
            throw new WalletError('Cannot delete last recovery method', 'recoveryMethods.lastMethod');
        }
    }

    async accountExists(accountId) {
        try {
            await (await this.getAccount(accountId)).state();
            return true;
        } catch (error) {
            if (error.toString().indexOf('does not exist while viewing') !== -1) {
                return false;
            }
            throw error;
        }
    }

    async recoverAccountSeedPhrase(seedPhrase, accountId, fromSeedPhraseRecovery = true) {
        const { publicKey, secretKey } = parseSeedPhrase(seedPhrase);

        const tempKeyStore = new nearApiJs.keyStores.InMemoryKeyStore();
        const implicitAccountId = Buffer.from(PublicKey.fromString(publicKey).data).toString('hex');
        let accountIds = [accountId];
        if (!accountId) {
            accountIds = await getAccountIds(publicKey);
        }
        accountIds.push(implicitAccountId);

        // remove duplicate and non-existing accounts
        const accountsSet = new Set(accountIds);
        for (const accountId of accountsSet) {
            if (!(await this.accountExists(accountId))) {
                accountsSet.delete(accountId);
            }
        }
        accountIds = [...accountsSet];

        if (!accountIds.length) {
            throw new WalletError('Cannot find matching public key', 'recoverAccountSeedPhrase.errorInvalidSeedPhrase', { publicKey });
        }

        const connection = nearApiJs.Connection.fromConfig({
            networkId: NETWORK_ID,
            provider: { type: 'JsonRpcProvider', args: { url: NODE_URL + '/' } },
            signer: new nearApiJs.InMemorySigner(tempKeyStore)
        });

        const connectionConstructor = this.connection;

        const accountIdsSuccess = [];
        const accountIdsError = [];
        await Promise.all(accountIds.map(async (accountId, i) => {
            if (!accountId || !accountId.length) {
                return;
            }
            // temp account
            this.connection = connection;
            this.accountId = accountId;
            this.createFungibleTokensInstance();
            let account = await this.getAccount(accountId);
            let recoveryKeyIsFAK = false;
            // check if recover access key is FAK and if so add key without 2FA
            if (await TwoFactor.has2faEnabled(account)) {
                const accessKeys = await account.getAccessKeys();
                recoveryKeyIsFAK = accessKeys.find(({ public_key, access_key }) =>
                    public_key === publicKey &&
                    access_key.permission &&
                    access_key.permission === 'FullAccess'
                );
                if (recoveryKeyIsFAK) {
                    console.log('using FAK and regular Account instance to recover');
                    fromSeedPhraseRecovery = false;
                }
            }

            const keyPair = KeyPair.fromString(secretKey);
            await tempKeyStore.setKey(NETWORK_ID, accountId, keyPair);
            account.keyStore = tempKeyStore;
            account.inMemorySigner = account.connection.signer = new nearApiJs.InMemorySigner(tempKeyStore);
            const newKeyPair = KeyPair.fromRandom('ed25519');

            try {
                await this.addAccessKey(accountId, accountId, newKeyPair.publicKey, fromSeedPhraseRecovery, '', recoveryKeyIsFAK);
                accountIdsSuccess.push({
                    accountId,
                    newKeyPair
                });
            } catch (error) {
                console.error(error);
                accountIdsError.push({
                    accountId,
                    error
                });
            }
        }));

        this.connection = connectionConstructor;

        if (!!accountIdsSuccess.length) {
            await Promise.all(accountIdsSuccess.map(async ({ accountId, newKeyPair }) => {
                await this.saveAccount(accountId, newKeyPair);
            }));

            store.dispatch(selectAccount(accountIdsSuccess[accountIdsSuccess.length - 1].accountId));

            return {
                numberOfAccounts: accountIdsSuccess.length,
                accountList: accountIdsSuccess.flatMap((accountId) => accountId.account_id).join(', '),
            };
        } else {
            const lastAccount = accountIdsError.reverse().find((account) => account.error.type === 'LackBalanceForState');
            if (lastAccount) {
                store.dispatch(redirectTo(`/`, { globalAlertPreventClear: true }));
                throw lastAccount.error;
            } else {
                throw accountIdsError[accountIdsError.length - 1].error;
            }
        }
    }

    async signAndSendTransactions(transactions, accountId = this.accountId) {
        const account = await this.getAccount(accountId);

        store.dispatch(setSignTransactionStatus('in-progress'));
        const transactionHashes = [];
        for (let { receiverId, nonce, blockHash, actions } of transactions) {
            let status, transaction;
            // TODO: Decide whether we always want to be recreating transaction (vs only if it's invalid)
            // See https://github.com/near/near-wallet/issues/1856
            const recreateTransaction = account.deployMultisig || true;
            if (recreateTransaction) {
                ({ status, transaction } = await account.signAndSendTransaction(receiverId, actions));
            } else {
                // TODO: Maybe also only take receiverId and actions as with multisig path?
                const [, signedTransaction] = await nearApiJs.transactions.signTransaction(receiverId, nonce, actions, blockHash, this.connection.signer, accountId, NETWORK_ID);
                ({ status, transaction } = await this.connection.provider.sendTransaction(signedTransaction));
            }

            // TODO: Shouldn't throw more specific errors on failure?
            if (status.Failure !== undefined) {
                throw new Error(`Transaction failure for transaction hash: ${transaction.hash}, receiver_id: ${transaction.receiver_id} .`);
            }

            transactionHashes.push(transaction.hash);
        }

        return transactionHashes;
    }

    dispatchShowLedgerModal(show) {
        const { actionStatus } = store.getState().status;
        const actions = Object.keys(actionStatus).filter((action) => actionStatus[action]?.pending === true);
        const action = actions.length ? actions[actions.length - 1] : false;
        store.dispatch(showLedgerModal({ show, action }));
    }
}

export const wallet = new Wallet();

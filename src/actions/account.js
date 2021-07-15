import { BN } from 'bn.js';
import { push } from 'connected-react-router';
import { utils } from 'near-api-js';
import { PublicKey, KeyType } from 'near-api-js/lib/utils/key_pair';
import { parse, stringify } from 'query-string';
import { createActions, createAction } from 'redux-actions';

import { showAlert, dispatchWithAlert } from '../utils/alerts';
import { loadState, saveState, clearState } from '../utils/sessionStorage';
import { TwoFactor } from '../utils/twoFactor';
import { DISABLE_CREATE_ACCOUNT, wallet } from '../utils/wallet';
import {
    WALLET_CREATE_NEW_ACCOUNT_URL,
    WALLET_CREATE_NEW_ACCOUNT_FLOW_URLS,
    WALLET_LOGIN_URL,
    WALLET_SIGN_URL,
    WALLET_RECOVER_ACCOUNT_URL,
    WALLET_LINKDROP_URL,
    setKeyMeta,
    MULTISIG_MIN_PROMPT_AMOUNT
} from '../utils/wallet';
import { WalletError } from '../utils/walletError';
import { handleFlowLimitation, handleClearflowLimitation } from './flowLimitation';
import { nft } from './nft';
import {
    handleStakingUpdateAccount,
    handleStakingUpdateLockup,
    handleGetLockup,
    staking
} from './staking';
import { tokens } from './tokens';

export const loadRecoveryMethods = createAction('LOAD_RECOVERY_METHODS',
    wallet.getRecoveryMethods.bind(wallet),
    () => ({})
);

export const getProfileStakingDetails = (accountId) => async (dispatch, getState) => {
    await dispatch(handleGetLockup(accountId));

    await dispatch(handleStakingUpdateAccount([], accountId));

    const lockupIdExists = accountId
        ? !!getState().allAccounts[accountId].balance.lockedAmount
        : !!getState().account.balance.lockedAmount;

    lockupIdExists
    && dispatch(handleStakingUpdateLockup(accountId));
};

export const handleRedirectUrl = (previousLocation) => (dispatch, getState) => {
    const { pathname } = getState().router.location;
    const isValidRedirectUrl = previousLocation.pathname.includes(WALLET_LOGIN_URL) || previousLocation.pathname.includes(WALLET_SIGN_URL);
    const page = pathname.split('/')[1];
    const guestLandingPage = !page && !wallet.accountId;
    const createAccountPage = page === WALLET_CREATE_NEW_ACCOUNT_URL;
    const recoverAccountPage = page === WALLET_RECOVER_ACCOUNT_URL;

    if ((guestLandingPage || createAccountPage || recoverAccountPage) && isValidRedirectUrl) {
        let url = {
            ...getState().account.url,
            redirect_url: previousLocation.pathname
        };
        saveState(url);
        dispatch(refreshUrl(url));
    }
};

export const handleClearUrl = () => (dispatch, getState) => {
    const { pathname } = getState().router.location;
    const page = pathname.split('/')[1];
    const guestLandingPage = !page && !wallet.accountId;
    const saveUrlPages = [...WALLET_CREATE_NEW_ACCOUNT_FLOW_URLS, WALLET_LOGIN_URL, WALLET_SIGN_URL, WALLET_LINKDROP_URL].includes(page);

    if (!guestLandingPage && !saveUrlPages) {
        clearState();
        dispatch(refreshUrl({}));
        dispatch(handleClearflowLimitation());
    }
};

export const parseTransactionsToSign = createAction('PARSE_TRANSACTIONS_TO_SIGN');

export const handleRefreshUrl = (prevRouter) => (dispatch, getState) => {
    const { pathname, search } = prevRouter?.location || getState().router.location;
    const currentPage = pathname.split('/')[pathname[1] === '/' ? 2 : 1];

    if ([...WALLET_CREATE_NEW_ACCOUNT_FLOW_URLS, WALLET_LOGIN_URL, WALLET_SIGN_URL, WALLET_LINKDROP_URL].includes(currentPage)) {
        const parsedUrl = {
            referrer: document.referrer && new URL(document.referrer).hostname,
            ...parse(search),
            redirect_url: prevRouter ? prevRouter.location.pathname : undefined
        };
        if ([WALLET_CREATE_NEW_ACCOUNT_URL, WALLET_LINKDROP_URL].includes(currentPage) && search !== '') {
            saveState(parsedUrl);
            dispatch(refreshUrl(parsedUrl));
        } else if ([WALLET_LOGIN_URL, WALLET_SIGN_URL].includes(currentPage) && search !== '') {
            saveState(parsedUrl);
            dispatch(refreshUrl(parsedUrl));
            dispatch(checkContractId());
        } else {
            dispatch(refreshUrl(loadState()));
        }
        dispatch(handleFlowLimitation());
        const { transactions, callbackUrl, meta } = getState().account.url;
        if (transactions) {
            dispatch(parseTransactionsToSign({ transactions, callbackUrl, meta }));
        }
    }
};

const checkContractId = () => async (dispatch, getState) => {
    const { contract_id } = getState().account.url;

    if (contract_id) {
        const redirectIncorrectContractId = () => {
            console.error('Invalid contractId:', contract_id);
            dispatch(redirectTo(`/${WALLET_LOGIN_URL}/incorrect-contract-id`, { globalAlertPreventClear: true }));
        };

        if (!wallet.isLegitAccountId(contract_id)) {
            redirectIncorrectContractId();
            return;
        }

        try {
            await (wallet.getAccountBasic(contract_id)).state();
        } catch (error) {
            if (error.message.indexOf('does not exist while viewing') !== -1) {
                redirectIncorrectContractId();
            }
        }
    }
};

export const redirectTo = (location, state = {}) => (dispatch) => {
    const [pathname, search] = location.split('?');
    dispatch(push({
        pathname,
        search,
        state
    }));
};

export const redirectToApp = (fallback) => async (dispatch, getState) => {
    dispatch(handleRefreshUrl());
    const { account: { url } } = getState();
    dispatch(push({
        pathname: (url && url.redirect_url !== '/' && url.redirect_url) || fallback || '/',
        search: (url && (url.success_url || url.public_key)) ? `?${stringify(url)}` : '',
        state: {
            globalAlertPreventClear: true
        }
    }));
};


export const allowLogin = () => async (dispatch, getState) => {
    const { account } = getState();
    const { url } = account;
    const { success_url, public_key, title } = url;

    if (success_url) {
        if (public_key) {
            await dispatchWithAlert(addAccessKey(account.accountId, url.contract_id, url.public_key, false, url.methodNames), { onlyError: true });
        }
        const availableKeys = await wallet.getAvailableKeys();
        const allKeys = availableKeys.map(key => key.toString());
        const parsedUrl = new URL(success_url);
        parsedUrl.searchParams.set('account_id', account.accountId);
        if (public_key) {
            parsedUrl.searchParams.set('public_key', public_key);
        }
        parsedUrl.searchParams.set('all_keys', allKeys.join(','));
        window.location = parsedUrl.href;
    } else {
        await dispatchWithAlert(addAccessKey(account.accountId, url.contract_id, url.public_key, false, url.methodNames), { data: { title } });
        dispatch(redirectTo('/authorized-apps', { globalAlertPreventClear: true }));
    }
};

export const signInWithLedger = (path) => async (dispatch, getState) => {
    await dispatch(getLedgerAccountIds(path));
    const accountIds = Object.keys(getState().ledger.signInWithLedger);
    await dispatch(signInWithLedgerAddAndSaveAccounts(accountIds, path));
    return;
};

export const signInWithLedgerAddAndSaveAccounts = (accountIds, path) => async (dispatch, getState) => {
    for (let accountId of accountIds) {
        try {
            if (path) {
                await localStorage.setItem(`ledgerHdPath:${accountId}`, path);
            }
            await dispatch(addLedgerAccountId(accountId));
            await dispatch(setLedgerTxSigned(false, accountId));
        } catch (e) {
            console.warn('Error importing Ledger-based account', accountId, e);
            // NOTE: We still continue importing other accounts
        }
    }

    return dispatch(saveAndSelectLedgerAccounts(getState().ledger.signInWithLedger));
};

const twoFactorMethod = async (method, wallet, args) => {
    const account = await wallet.getAccount(wallet.accountId);
    if (account[method]) {
        return await account[method](...args);
    }
    return false;
};

export const {
    initializeRecoveryMethod,
    validateSecurityCode,
    initTwoFactor,
    reInitTwoFactor,
    resendTwoFactor,
    verifyTwoFactor,
    promptTwoFactor,
    deployMultisig,
    disableMultisig,
    checkCanEnableTwoFactor,
    get2faMethod,
    getLedgerKey,
    getAccountHelperWalletState,
    clearFundedAccountNeedsDeposit,
    getLedgerPublicKey,
    setupRecoveryMessage,
    deleteRecoveryMethod,
    checkNearDropBalance,
    claimLinkdropToAccount,
    checkIsNew,
    checkNewAccount,
    createNewAccount,
    saveAccount,
    checkAccountAvailable,
    clearCode
} = createActions({
    INITIALIZE_RECOVERY_METHOD: [
        wallet.initializeRecoveryMethod.bind(wallet),
        () => ({})
    ],
    VALIDATE_SECURITY_CODE: [
        wallet.validateSecurityCode.bind(wallet),
        () => ({})
    ],
    INIT_TWO_FACTOR: [
        (...args) => new TwoFactor(wallet, wallet.accountId).initTwoFactor(...args),
        () => ({})
    ],
    REINIT_TWO_FACTOR: [
        (...args) => new TwoFactor(wallet, wallet.accountId).initTwoFactor(...args),
        () => ({})
    ],
    RESEND_TWO_FACTOR: [
        () => twoFactorMethod('sendCode', wallet, []),
        () => ({})
    ],
    VERIFY_TWO_FACTOR: [
        (...args) => new TwoFactor(wallet, wallet.accountId).verifyCodeDefault(...args),
        () => showAlert()
    ],
    PROMPT_TWO_FACTOR: [
        (requestPending) => {
            let promise;
            if (requestPending !== null) {
                promise = new Promise((resolve, reject) => {
                    requestPending = (verified, error) => {
                        if (verified) {
                            resolve(verified);
                        } else {
                            reject(error);
                        }
                    };
                });
            }
            return ({ requestPending, promise });
        },
        () => ({})
    ],
    DEPLOY_MULTISIG: [
        () => new TwoFactor(wallet, wallet.accountId).deployMultisig(),
        () => showAlert()
    ],
    DISABLE_MULTISIG: [
        (...args) => twoFactorMethod('disableMultisig', wallet, args),
        () => ({})
    ],
    CHECK_CAN_ENABLE_TWO_FACTOR: [
        (...args) => TwoFactor.checkCanEnableTwoFactor(...args),
        () => ({})
    ],
    GET_2FA_METHOD: [
        (...args) => twoFactorMethod('get2faMethod', wallet, args),
        () => ({})
    ],
    GET_LEDGER_KEY: [
        wallet.getLedgerKey.bind(wallet),
        () => ({})
    ],
    GET_ACCOUNT_HELPER_WALLET_STATE: [
        wallet.getAccountHelperWalletState.bind(wallet),
        () => ({})
    ],
    CLEAR_FUNDED_ACCOUNT_NEEDS_DEPOSIT: [
        wallet.clearFundedAccountNeedsDeposit.bind(wallet),
        () => showAlert({ onlyError: true })
    ],
    GET_LEDGER_PUBLIC_KEY: [
        wallet.getLedgerPublicKey.bind(wallet),
        () => ({})
    ],
    SETUP_RECOVERY_MESSAGE: [
        wallet.setupRecoveryMessage.bind(wallet),
        () => showAlert()
    ],
    DELETE_RECOVERY_METHOD: [
        wallet.deleteRecoveryMethod.bind(wallet),
        () => showAlert()
    ],
    CHECK_NEAR_DROP_BALANCE: [
        wallet.checkNearDropBalance.bind(wallet),
        () => ({})
    ],
    CLAIM_LINKDROP_TO_ACCOUNT: [
        wallet.claimLinkdropToAccount.bind(wallet),
        () => showAlert({ onlyError: true })
    ],
    CHECK_IS_NEW: [
        wallet.checkIsNew.bind(wallet),
        () => showAlert({ localAlert: true })
    ],
    CHECK_NEW_ACCOUNT: [
        wallet.checkNewAccount.bind(wallet),
        () => showAlert({ localAlert: true })
    ],
    CREATE_NEW_ACCOUNT: wallet.createNewAccount.bind(wallet),
    SAVE_ACCOUNT: wallet.saveAccount.bind(wallet),
    CHECK_ACCOUNT_AVAILABLE: [
        wallet.checkAccountAvailable.bind(wallet),
        () => showAlert({ localAlert: true })
    ],
    CLEAR_CODE: null
});

export const {
    getAccessKeys,
    removeAccessKey,
    addLedgerAccessKey,
    disableLedger,
    removeNonLedgerAccessKeys,
    getLedgerAccountIds,
    addLedgerAccountId,
    saveAndSelectLedgerAccounts,
    setLedgerTxSigned,
    clearSignInWithLedgerModalState,
    showLedgerModal
} = createActions({
    GET_ACCESS_KEYS: [wallet.getAccessKeys.bind(wallet), () => ({})],
    REMOVE_ACCESS_KEY: [
        wallet.removeAccessKey.bind(wallet),
        () => showAlert({ onlyError: true })
    ],
    ADD_LEDGER_ACCESS_KEY: [
        wallet.addLedgerAccessKey.bind(wallet),
        () => showAlert({ onlyError: true })
    ],
    DISABLE_LEDGER: [
        wallet.disableLedger.bind(wallet),
        () => ({})
    ],
    REMOVE_NON_LEDGER_ACCESS_KEYS: [wallet.removeNonLedgerAccessKeys.bind(wallet), () => ({})],
    GET_LEDGER_ACCOUNT_IDS: [
        wallet.getLedgerAccountIds.bind(wallet),
        () => showAlert({ onlyError: true })
    ],
    ADD_LEDGER_ACCOUNT_ID: [
        wallet.addLedgerAccountId.bind(wallet),
        (accountId) => ({
            accountId,
            ...showAlert()
        })
    ],
    SAVE_AND_SELECT_LEDGER_ACCOUNTS: [
        wallet.saveAndSelectLedgerAccounts.bind(wallet),
        () => showAlert()
    ],
    SET_LEDGER_TX_SIGNED: [
        (status) => ({ status }),
        (status, accountId) => ({
            accountId
        })
    ],
    CLEAR_SIGN_IN_WITH_LEDGER_MODAL_STATE: null,
    SHOW_LEDGER_MODAL: null
});

export const handleAddAccessKeySeedPhrase = (accountId, recoveryKeyPair) => async (dispatch) => {
    try {
        await dispatch(addAccessKeySeedPhrase(accountId, recoveryKeyPair));
    } catch (error) {
        // error is thrown in `addAccessKeySeedPhrase` action, despite the error, we still want to redirect to /profile
    }
    dispatch(redirectTo('/profile', {
        globalAlertPreventClear: true
    }));
};

export const fundCreateAccount = (accountId, recoveryKeyPair, recoveryMethod) => async (dispatch) => {
    await wallet.keyStore.setKey(wallet.connection.networkId, accountId, recoveryKeyPair);
    const implicitAccountId = Buffer.from(recoveryKeyPair.publicKey.data).toString('hex');
    await wallet.keyStore.setKey(wallet.connection.networkId, implicitAccountId, recoveryKeyPair);
    dispatch(redirectTo(`/fund-create-account/${accountId}/${implicitAccountId}/${recoveryMethod}`));
};

export const fundCreateAccountLedger = (accountId, ledgerPublicKey) => async (dispatch) => {
    await setKeyMeta(ledgerPublicKey, { type: 'ledger' });
    const implicitAccountId = Buffer.from(ledgerPublicKey.data).toString('hex');
    const recoveryMethod = 'ledger';
    dispatch(redirectTo(`/fund-create-account/${accountId}/${implicitAccountId}/${recoveryMethod}`));
};

// TODO: Refactor common code with setupRecoveryMessageNewAccount
export const handleCreateAccountWithSeedPhrase = (accountId, recoveryKeyPair, fundingOptions, recaptchaToken) => async (dispatch) => {
    // Implicit account flow
    if (DISABLE_CREATE_ACCOUNT && !fundingOptions && !recaptchaToken) {
        await dispatch(fundCreateAccount(accountId, recoveryKeyPair, 'seed'));
        return;
    }

    try {
        await dispatch(createAccountWithSeedPhrase(accountId, recoveryKeyPair, fundingOptions, recaptchaToken));
    } catch (error) {
        if (await wallet.accountExists(accountId)) {
            // Requests sometimes fail after creating the NEAR account for another reason (transport error?)
            // If that happened, we allow the user can add the NEAR account to the wallet by entering the seed phrase
            dispatch(redirectTo('/recover-seed-phrase', {
                globalAlertPreventClear: true,
                defaultAccountId: accountId
            }));
            return;
        }
        throw error;
    }
};


export const finishAccountSetup = () => async (dispatch, getState) => {
    await dispatch(refreshAccount());
    await dispatch(getBalance());
    await dispatch(staking.clearState());
    dispatch(tokens.clearState());
    const { balance, url, accountId } = getState().account;

    let promptTwoFactor = await TwoFactor.checkCanEnableTwoFactor(balance);

    if (new BN(balance.available).lt(new BN(utils.format.parseNearAmount(MULTISIG_MIN_PROMPT_AMOUNT)))) {
        promptTwoFactor = false;
    }

    if (promptTwoFactor) {
        dispatch(redirectTo('/enable-two-factor', { globalAlertPreventClear: true }));
    } else {
        if (url?.redirectUrl) {
            window.location = `${url.redirectUrl}?accountId=${accountId}`;
        } else {
            dispatch(redirectToApp('/'));
        }
    }
};

export const createAccountFromImplicit = createAction('CREATE_ACCOUNT_FROM_IMPLICIT', async (accountId, implicitAccountId, recoveryMethod) => {
    const recoveryKeyPair = await wallet.keyStore.getKey(wallet.connection.networkId, implicitAccountId);
    if (recoveryKeyPair) {
        await wallet.saveAccount(accountId, recoveryKeyPair);
    }
    const publicKey = new PublicKey({ keyType: KeyType.ED25519, data: Buffer.from(implicitAccountId, 'hex') });
    await wallet.createNewAccount(accountId, { fundingAccountId: implicitAccountId }, recoveryMethod, publicKey);
});

export const { addAccessKey, createAccountWithSeedPhrase, addAccessKeySeedPhrase } = createActions({
    ADD_ACCESS_KEY: [
        wallet.addAccessKey.bind(wallet),
        (title) => showAlert({ title })
    ],
    CREATE_ACCOUNT_WITH_SEED_PHRASE: async (accountId, recoveryKeyPair, fundingOptions = {}, recaptchaToken) => {
        const recoveryMethod = 'seed';
        const previousAccountId = wallet.accountId;
        await wallet.saveAccount(accountId, recoveryKeyPair);
        await wallet.createNewAccount(accountId, fundingOptions, recoveryMethod, recoveryKeyPair.publicKey, previousAccountId, recaptchaToken);
    },
    ADD_ACCESS_KEY_SEED_PHRASE: [
        async (accountId, recoveryKeyPair) => {
            const publicKey = recoveryKeyPair.publicKey.toString();
            const contractName = null;
            const fullAccess = true;

            try {
                await wallet.postSignedJson('/account/seedPhraseAdded', { accountId, publicKey });
                await wallet.addAccessKey(accountId, contractName, publicKey, fullAccess);
            } catch (error) {
                throw new WalletError(error, 'addAccessKeySeedPhrase.errorSecond');
            }
        },
        () => showAlert()
    ]
});

export const { recoverAccountSeedPhrase } = createActions({
    RECOVER_ACCOUNT_SEED_PHRASE: [
        wallet.recoverAccountSeedPhrase.bind(wallet),
        () => showAlert()
    ],
});

export const { signAndSendTransactions, setSignTransactionStatus, sendMoney, transferAllFromLockup } = createActions({
    SET_SIGN_TRANSACTION_STATUS: [
        (status) => ({ status }),
        () => ({})
    ],
    SIGN_AND_SEND_TRANSACTIONS: [
        wallet.signAndSendTransactions.bind(wallet),
        () => showAlert({ onlyError: true })
    ],
    SEND_MONEY: [
        wallet.sendMoney.bind(wallet),
        () => showAlert({ onlyError: true })
    ],
    TRANSFER_ALL_FROM_LOCKUP: [
        async () => {
            const account = await wallet.getAccount(wallet.accountId);
            if (account.transferAllFromLockup) {
                await account.transferAllFromLockup();
            }
        },
        () => showAlert()
    ]
});

export const refreshAccount = (basicData = false) => async (dispatch, getState) => {
    const { flowLimitation } = getState();

    if (!wallet.accountId) {
        return;
    }

    dispatch(setLocalStorage(wallet.accountId));
    await dispatch(refreshAccountOwner(flowLimitation.accountData));

    if (!basicData && !flowLimitation.accountBalance) {
        dispatch(getBalance('', flowLimitation.accountData));
    }
};

export const switchAccount = (accountId) => async (dispatch, getState) => {
    dispatch(selectAccount(accountId));
    dispatch(handleRefreshUrl());
    dispatch(staking.clearState());
    dispatch(refreshAccount());
    dispatch(tokens.clearState());
    dispatch(nft.clearState());
};

export const getAvailableAccountsBalance = () => async (dispatch, getState) => {
    let { accountsBalance } = getState().account;
    let { availableAccounts, flowLimitation } = getState();

    if (flowLimitation.accountData) {
        return;
    }

    for (let i = 0; i < availableAccounts.length; i++) {
        const accountId = availableAccounts[i];
        if (!accountsBalance || !accountsBalance[accountId]) {
            i < 0 && await dispatch(setAccountBalance(accountId));
        }
    }

    accountsBalance = getState().account.accountsBalance || {};

    for (let i = 0; i < Object.keys(accountsBalance).length; i++) {
        const accountId = Object.keys(accountsBalance)[i];
        if (accountsBalance[accountId].loading) {
            await dispatch(getAccountBalance(accountId));
        }
    }
};

export const { selectAccount, refreshAccountOwner, refreshAccountExternal, refreshUrl, updateStakingAccount, updateStakingLockup, getBalance, setLocalStorage, getAccountBalance, setAccountBalance } = createActions({
    SELECT_ACCOUNT: wallet.selectAccount.bind(wallet),
    REFRESH_ACCOUNT_OWNER: [
        wallet.refreshAccount.bind(wallet),
        () => ({ accountId: wallet.accountId })
    ],
    REFRESH_ACCOUNT_EXTERNAL: [
        async (accountId) => ({
            ...await (await wallet.getAccount(accountId)).state(),
            balance: {
                ...await wallet.getBalance(accountId)
            }
        }),
        accountId => ({
            accountId,
            ...showAlert({ onlyError: true, data: { accountId } })
        })
    ],
    REFRESH_URL: null,
    UPDATE_STAKING_ACCOUNT: [
        async (accountId) => await wallet.staking.updateStakingAccount([], [] , accountId),
        (accountId) => ({
            accountId,
            ...showAlert({ onlyError: true })
        })
    ],
    UPDATE_STAKING_LOCKUP: [
        async (accountId) => await wallet.staking.updateStakingLockup(accountId),
        (accountId) => ({
            accountId,
            ...showAlert({ onlyError: true })
        })
    ],
    GET_BALANCE: wallet.getBalance.bind(wallet),
    SET_LOCAL_STORAGE: null,
    GET_ACCOUNT_BALANCE: [
        wallet.getBalance.bind(wallet),
        (accountId) => ({ 
            accountId,
            alert: {
                ignoreMainLoader: true
            }
        })
    ],
    SET_ACCOUNT_BALANCE: null
});

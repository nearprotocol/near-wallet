import BN from 'bn.js';
import * as nearApiJs from 'near-api-js';

import sendJson from '../tmp_fetch_send_json';
import { 
    parseTokenAmount,
    formatTokenAmount,
    removeTrailingZeros
} from '../utils/amounts';
import {
    ACCOUNT_HELPER_URL,
    wallet
} from '../utils/wallet';

const {
    transactions: {
        functionCall
    },
    utils: {
        format: { 
            parseNearAmount,
            formatNearAmount
        }
    }
} = nearApiJs;

// account creation costs 0.00125 NEAR for storage, 0.00000000003 NEAR for gas
// https://docs.near.org/docs/api/naj-cookbook#wrap-and-unwrap-near
const FT_MINIMUM_STORAGE_BALANCE = parseNearAmount('0.00125');
// FT_MINIMUM_STORAGE_BALANCE: nUSDC, nUSDT require minimum 0.0125 NEAR. Came to this conclusion using trial and error.
const FT_MINIMUM_STORAGE_BALANCE_LARGE = parseNearAmount('0.0125');
const FT_STORAGE_DEPOSIT_GAS = parseNearAmount('0.00000000003');

// set this to the same value as we use for creating an account and the remainder is refunded
const FT_TRANSFER_GAS = parseNearAmount('0.00000000003');

// contract might require an attached depositof of at least 1 yoctoNear on transfer methods
// "This 1 yoctoNEAR is not enforced by this standard, but is encouraged to do. While ability to receive attached deposit is enforced by this token."
// from: https://github.com/near/NEPs/issues/141
const FT_TRANSFER_DEPOSIT = '1';

// Fungible Token Standard
// https://github.com/near/NEPs/tree/master/specs/Standards/FungibleToken
export default class FungibleTokens {
    constructor(account) {
        this.account = account;
    }

    getParsedTokenAmount(amount, symbol, decimals) {
        const parsedTokenAmount = symbol === 'NEAR'
        ? parseNearAmount(amount) 
        : parseTokenAmount(amount, decimals);

        return parsedTokenAmount;
    }

    getFormattedTokenAmount(amount, symbol, decimals) {
        const formattedTokenAmount = symbol === 'NEAR'
        ? formatNearAmount(amount, 5) 
        : removeTrailingZeros(formatTokenAmount(amount, decimals, 5));

        return formattedTokenAmount;
    }

    async getEstimatedTotalFees(contractName, accountId) {
        if (contractName && accountId && !await this.isStorageBalanceAvailable(contractName, accountId)) {
            return new BN(FT_TRANSFER_GAS)
                .add(new BN(FT_MINIMUM_STORAGE_BALANCE))
                .add(new BN(FT_STORAGE_DEPOSIT_GAS))
                .toString();
        } else {
            return FT_TRANSFER_GAS;
        }
    }

    async getEstimatedTotalNearAmount(amount) {
        return new BN(amount)
            .add(new BN(await this.getEstimatedTotalFees()))
            .toString();
    }

    async isStorageBalanceAvailable(contractName, accountId) {
        const storageBalance = await this.getStorageBalance(contractName, accountId);
        return storageBalance?.total !== undefined;
    }

    async getStorageBalance(contractName, accountId) {
        return await this.account.viewFunction(contractName, 'storage_balance_of', { account_id: accountId });
    }

    async transfer({ contractName, parsedAmount, receiverId, memo }) {
        if (contractName) {
            const storageAvailable = await this.isStorageBalanceAvailable(contractName, receiverId);

            if (!storageAvailable) {
                try {
                    await this.transferStorageDeposit(contractName, receiverId, FT_MINIMUM_STORAGE_BALANCE);
                } catch(e) {
                    if (e.message.includes('attached deposit is less than the minimum storage balance')) {
                        await this.transferStorageDeposit(contractName, receiverId, FT_MINIMUM_STORAGE_BALANCE_LARGE);
                    }
                }
            }

            return await this.signAndSendTransaction(contractName, [
                functionCall('ft_transfer', {
                    receiver_id: receiverId,
                    amount: parsedAmount,
                    memo: memo
                }, FT_TRANSFER_GAS, FT_TRANSFER_DEPOSIT)
            ]);

        } else {
            return await wallet.sendMoney(receiverId, parsedAmount);
        }
    }

    async transferStorageDeposit(contractName, accountId, storageDepositAmount) {
        return this.signAndSendTransaction(contractName, [
            functionCall('storage_deposit', {
                account_id: accountId,
                registration_only: true,
            }, FT_STORAGE_DEPOSIT_GAS, storageDepositAmount)
        ]);
    }

    async signAndSendTransaction(receiverId, actions) {
        return await this.account.signAndSendTransaction(receiverId, actions);
    }

    getLikelyTokenContracts() {
        return sendJson('GET', `${ACCOUNT_HELPER_URL}/account/${this.account.accountId}/likelyTokens`);
    }

    async getMetadata(contractName) {
        return await this.account.viewFunction(contractName, 'ft_metadata');
    }

    async getBalanceOf(contractName) {
        return await this.account.viewFunction(contractName, 'ft_balance_of', { account_id: this.account.accountId });
    }
}

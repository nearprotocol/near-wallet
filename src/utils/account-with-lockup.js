import BN from 'bn.js'
import sha256 from 'js-sha256'
import { Account, Connection, InMemorySigner, KeyPair } from 'near-api-js'
import { parseNearAmount } from 'near-api-js/lib/utils/format'
import { BinaryReader } from 'near-api-js/lib/utils/serialize'
import { InMemoryKeyStore } from 'near-api-js/lib/key_stores'
import { LOCKUP_ACCOUNT_ID_SUFFIX, MIN_BALANCE_FOR_GAS } from './wallet'
import { WalletError } from './walletError'
import { ACCOUNT_HELPER_URL } from './wallet'

// TODO: Should gas allowance be dynamically calculated
export const LOCKUP_MIN_BALANCE = new BN(parseNearAmount('35'));

const BASE_GAS = new BN('25000000000000');

export function decorateWithLockup(account) {
    // TODO: Use solution without hacky mix-in inheritance
    // TODO: Looks like best if near-api-js allows to specify transaction middleware

    let decorated = {...account, wrappedAccount: account, signAndSendTransaction, getAccountBalance, transferAllFromLockup, deleteLockupAccount };
    decorated.__proto__ = account.__proto__;
    return decorated;
}

async function signAndSendTransaction(...args) {
    if(args.length === 1) return signAndSendTransactionV2.apply(this, args);
    else return signAndSendTransactionV1.apply(this, args);
}

async function signAndSendTransactionV1(receiverId, actions) {
    return signAndSendTransactionV2({ receiverId, actions })
}

async function signAndSendTransactionV2({ receiverId, actions }) {
    const { available: balance } = await this.wrappedAccount.getAccountBalance()

    // TODO: Extract code to compute total cost of transaction
    const total = actions.map(action => action?.transfer?.deposit || action?.functionCall?.deposit)
        .filter(deposit => !!deposit)
        .map(str => new BN(str))
        .reduce((a, b) => a.add(b), new BN("0"));

    const missingAmount = total.sub(new BN(balance)).add(new BN(MIN_BALANCE_FOR_GAS));
    const lockupAccountId = getLockupAccountId(this.accountId)
    if (missingAmount.gt(new BN(0)) && (await accountExists(this.connection, lockupAccountId))) {
        console.warn('Not enough balance on main account, checking lockup account', lockupAccountId);    
        await this.transferAllFromLockup(missingAmount)
    }

    return await this.wrappedAccount.signAndSendTransaction.call(this, { receiverId, actions });
}

async function deleteLockupAccount(lockupAccountId) {
    console.info('Destroying lockup account to claim remaining funds', lockupAccountId)
    const newKeyPair = KeyPair.fromRandom('ed25519')
    await this.wrappedAccount.functionCall(lockupAccountId, 'add_full_access_key', {
        new_public_key: newKeyPair.publicKey.toString()
    }, BASE_GAS.mul(new BN(2)))

    const tmpKeyStore = new InMemoryKeyStore()
    await tmpKeyStore.setKey(this.connection.networkId, lockupAccountId, newKeyPair)
    const tmpConnection = new Connection(this.connection.networkId, this.connection.provider, new InMemorySigner(tmpKeyStore))
    const lockupAccount = new Account(tmpConnection, lockupAccountId)
    await lockupAccount.deleteAccount(this.accountId)
}

export async function transferAllFromLockup(missingAmount) {
    let lockupAccountId = getLockupAccountId(this.accountId)
    if (!(await this.wrappedAccount.viewFunction(lockupAccountId, 'are_transfers_enabled'))) {
        await this.wrappedAccount.functionCall(lockupAccountId, 'check_transfers_vote', {}, BASE_GAS.mul(new BN(3)))
    }

    const poolAccountId = await this.wrappedAccount.viewFunction(lockupAccountId, 'get_staking_pool_account_id')
    if (poolAccountId) {
        await this.wrappedAccount.functionCall(lockupAccountId, 'refresh_staking_pool_balance', {}, BASE_GAS.mul(new BN(3)))
    }

    let liquidBalance = new BN(await this.wrappedAccount.viewFunction(lockupAccountId, 'get_liquid_owners_balance'))

    if (missingAmount && !liquidBalance.gt(missingAmount)) {
        throw new WalletError('Not enough tokens.', 'signAndSendTransactions.notEnoughTokens')
    }

    console.info('Attempting to transfer from lockup account ID:', lockupAccountId)
    await this.wrappedAccount.functionCall(lockupAccountId, 'transfer', {
        // NOTE: Move all the liquid tokens to minimize transactions in the long run
        amount: liquidBalance.toString(),
        receiver_id: this.wrappedAccount.accountId
    }, BASE_GAS.mul(new BN(2)))

    const lockedBalance = new BN(await this.wrappedAccount.viewFunction(lockupAccountId, 'get_locked_amount'))
    if (lockedBalance.eq(new BN(0))) {
        const stakingPoolBalance = await this.wrappedAccount.viewFunction(lockupAccountId, 'get_known_deposited_balance')
        if (!new BN(stakingPoolBalance).eq(new BN(0))) {
            throw new WalletError('Staking pool balance detected.', 'lockup.transferAllWithStakingPoolBalance')
        }

        if (poolAccountId) {
            await this.wrappedAccount.functionCall(lockupAccountId, 'unselect_staking_pool', {}, BASE_GAS.mul(new BN(2)))
        }

        await this.deleteLockupAccount(lockupAccountId)
    }
}

// TODO: Refactor into near-api-js
async function accountExists(connection, accountId) {
    try {
        await new Account(connection, accountId).state();
        return true;
    } catch (error) {
        if (error.toString().indexOf('does not exist while viewing') !== -1) {
            return false;
        }
        throw error;
    }
}

export function getLockupAccountId(accountId) {
    if (process.env.REACT_APP_USE_TESTINGLOCKUP && accountId.length < 64) {
        return `testinglockup.${accountId}`
    }
    return sha256(Buffer.from(accountId)).substring(0, 40) + '.' + LOCKUP_ACCOUNT_ID_SUFFIX
}

async function getAccountBalance(limitedAccountData = false) {
    const balance = await this.wrappedAccount.getAccountBalance()

    if (limitedAccountData) {
        return {
            ...balance,
            balanceAvailable: balance.available,
        }
    }

    let stakingDeposits = await fetch(ACCOUNT_HELPER_URL + '/staking-deposits/' + this.accountId).then((r) => r.json()) 
    let stakedBalanceMainAccount = new BN(0)
    await Promise.all(
        stakingDeposits.map(async ({ validator_id }) => {
            const validatorBalance = new BN(await this.wrappedAccount.viewFunction(validator_id, 'get_account_total_balance', { account_id: this.accountId }))
            stakedBalanceMainAccount = stakedBalanceMainAccount.add(validatorBalance)
        })
    )

    // TODO: Should lockup contract balance be retrieved separately only when needed?
    let lockupAccountId = getLockupAccountId(this.accountId)
    console.log('lockupAccountId', lockupAccountId)
    try {
        const lockupAccount = new Account(this.connection, lockupAccountId)
        const lockupBalance = await lockupAccount.getAccountBalance();
        const {
            lockupAmount,
            releaseDuration,
            transferInformation,
            lockupTimestamp,
            lockupDuration,
            terminationWithdrawnTokens
        } = await viewLockupState(this.connection, lockupAccountId)

        const dateNowBN = new BN(Date.now()).mul(new BN('1000000'))

        const { transfer_poll_account_id, transfers_timestamp } = transferInformation
        const transfersTimestamp = transfer_poll_account_id ? await this.viewFunction(transfer_poll_account_id, 'get_result') : transfers_timestamp

        const hasBrokenTimestamp = (await lockupAccount.state()).code_hash === '3kVY9qcVRoW3B5498SMX6R3rtSLiCdmBzKs7zcnzDJ7Q'
        const startTimestampBN = BN.max(
            new BN(transfersTimestamp).add(new BN(lockupDuration || 0)),
            new BN(lockupTimestamp || 0)
        )

        const releaseDurationBN = new BN(releaseDuration || '0')
        const endTimestamp = (hasBrokenTimestamp ? new BN(transfersTimestamp) : startTimestampBN).add(releaseDurationBN)
        const timeLeft = BN.max(new BN(0), endTimestamp.sub(dateNowBN))

        const unreleasedAmount = dateNowBN.lte(endTimestamp)
            ? startTimestampBN.lte(dateNowBN)
                ? new BN(lockupAmount).mul(timeLeft).div(releaseDurationBN)
                : new BN(lockupAmount)
            : new BN('0')

        let totalBalance = new BN(lockupBalance.total)
        let stakedBalanceLockup = new BN(0)
        const stakingPoolLockupAccountId = await this.wrappedAccount.viewFunction(lockupAccountId, 'get_staking_pool_account_id');
        if (stakingPoolLockupAccountId) {
            stakedBalanceLockup = new BN(await this.wrappedAccount.viewFunction(stakingPoolLockupAccountId,
                'get_account_total_balance', { account_id: lockupAccountId }))
            totalBalance = totalBalance.add(stakedBalanceLockup)
        }
        const isFullyUnlocked = timeLeft.eq(new BN(0))
        const ownersBalance = isFullyUnlocked
            ? totalBalance.sub(new BN(terminationWithdrawnTokens))
            : totalBalance.sub(BN.max(unreleasedAmount.sub(new BN(terminationWithdrawnTokens)), LOCKUP_MIN_BALANCE))

        const lockedAmount = totalBalance.sub(ownersBalance)
        const liquidOwnersBalance = BN.min(
            ownersBalance, 
            isFullyUnlocked 
                ? stakedBalanceLockup.isZero()
                    ? new BN(lockupBalance.total)
                    : new BN(lockupBalance.total).sub(LOCKUP_MIN_BALANCE)
                : new BN(lockupBalance.total).sub(LOCKUP_MIN_BALANCE)
        )

        const available = BN.max(new BN(0), new BN(balance.available).add(new BN(liquidOwnersBalance)).sub(new BN(MIN_BALANCE_FOR_GAS)))

        return {
            ...balance,
            balanceAvailable: balance.available,
            available,
            ownersBalance,
            liquidOwnersBalance,
            lockedAmount,
            total: new BN(balance.total).add(new BN(lockedAmount)).add(new BN(ownersBalance)).add(stakedBalanceMainAccount).toString(),
            totalBalance,
            stakedBalanceLockup: stakedBalanceLockup,
            lockupAccountId,
            stakedBalanceMainAccount
        }
    } catch (error) {
        if (error.message.match(/ccount ".+" doesn't exist/) || error.message.includes('does not exist while viewing') || error.message.includes('cannot find contract code for account')) {
            return {
                ...balance,
                balanceAvailable: balance.available,
                total: new BN(balance.total).add(stakedBalanceMainAccount).toString(),
                stakedBalanceMainAccount,

            }
        }
        throw error
    }
}

function readOption(reader, f) {
    let x = reader.readU8();
    if (x === 1) {
        return f();
    }
    return null;
}

// NOTE: Taken from account-lookup project
// TODO: Client-library for lockup?
async function viewLockupState(connection, lockupAccountId) {
    const result = await connection.provider.sendJsonRpc("query", {
        request_type: "view_state",
        finality: "final",
        account_id: lockupAccountId,
        prefix_base64: Buffer.from('STATE', 'utf-8').toString('base64'),
    });
    let value = Buffer.from(result.values[0].value, 'base64');
    let reader = new BinaryReader(value);
    let owner = reader.readString();
    let lockupAmount = reader.readU128().toString();
    let terminationWithdrawnTokens = reader.readU128().toString();
    let lockupDuration = reader.readU64().toString();
    let releaseDuration = readOption(reader, () => reader.readU64().toString());
    let lockupTimestamp = readOption(reader, () => reader.readU64().toString());
    let tiType = reader.readU8();
    let transferInformation;
    if (tiType === 0) {
        transferInformation = {
            transfers_timestamp: reader.readU64()
        };
    } else {
        transferInformation = {
            transfer_poll_account_id: reader.readString()
        };
    };
    let vestingType = reader.readU8();
    let vestingInformation = null;
    if (vestingType === 1) {
        vestingInformation = { VestingHash: reader.readArray(() => reader.readU8()) };
    } else if (vestingType === 2) {
        let vestingStart = reader.readU64();
        let vestingCliff = reader.readU64();
        let vestingEnd = reader.readU64();
        vestingInformation = { vestingStart, vestingCliff, vestingEnd };
    } else if (vestingType === 3) {
        vestingInformation = 'TODO';
    }
    return {
        owner,
        lockupAmount,
        terminationWithdrawnTokens,
        lockupDuration,
        releaseDuration,
        lockupTimestamp,
        transferInformation,
        vestingInformation,
    }
}

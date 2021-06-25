import { createActions } from 'redux-actions'
import BN from 'bn.js'
import * as nearApiJs from 'near-api-js'

import { wallet } from '../../../utils/wallet'
import { WalletError } from '../../../utils/walletError'
import { getLockupAccountId } from '../../../utils/account-with-lockup'
import { showAlert } from '../../../utils/alerts'
import { 
    STAKING_AMOUNT_DEVIATION,
    MIN_DISPLAY_YOCTO,
    ZERO,
    MIN_LOCKUP_AMOUNT,
    STAKING_GAS_BASE,
    EXPLORER_DELAY,
    ACCOUNT_DEFAULTS,
    getStakingDeposits, 
    lockupMethods,
    updateStakedBalance,
    signAndSendTransaction,
    stakingMethods,
    shuffle
} from '../../../utils/staking'
import { getBalance } from '../account'

let ghValidators

const {
    transactions: {
        functionCall
    },
    utils: {
        format: {
            parseNearAmount
        }
    },
    Account,
    Contract
} = nearApiJs

export const { staking } = createActions({
    STAKING: {
        CLEAR_STATE: null,
        GET_ACCOUNTS: null,
        STAKE: {
            LOCKUP: [
                async (lockupId, amount, contract, validatorId) => {
                    const selectedValidatorId = await contract.get_staking_pool_account_id()
                    if (validatorId !== selectedValidatorId) {
                        if (selectedValidatorId !== null) {
                            await signAndSendTransaction(lockupId, [
                                functionCall('unselect_staking_pool', {}, STAKING_GAS_BASE, '0')
                            ])
                        }
                        await signAndSendTransaction(lockupId, [
                            functionCall('select_staking_pool', { staking_pool_account_id: validatorId }, STAKING_GAS_BASE * 3, '0')
                        ])
                    }
                    return await signAndSendTransaction(lockupId, [
                        functionCall('deposit_and_stake', { amount }, STAKING_GAS_BASE * 5, '0')
                    ])
                },
                () => showAlert({ onlyError: true })
            ],
            ACCOUNT: [
                async (validatorId, amount, accountId, contract) => {
                    const result = await signAndSendTransaction(validatorId, [
                        functionCall('deposit_and_stake', {}, STAKING_GAS_BASE * 5, amount)
                    ])
                    // wait for chain/explorer to index results
                    await new Promise((r) => setTimeout(r, EXPLORER_DELAY))
                    await updateStakedBalance(validatorId, accountId, contract)
                    return result
                },
                () => showAlert({ onlyError: true })
            ],
        },
        UNSTAKE: {
            LOCKUP: [
                async (lockupId, amount) => {
                    if (amount) {
                        return await signAndSendTransaction(lockupId, [
                            functionCall('unstake', { amount }, STAKING_GAS_BASE * 5, '0')
                        ])
                    }
                    return await signAndSendTransaction(lockupId, [
                        functionCall('unstake_all', {}, STAKING_GAS_BASE * 5, '0')
                    ])
                },
                () => showAlert({ onlyError: true })
            ],
            ACCOUNT: [
                async (validatorId, amount, accountId, contract) => {
                    let result
                    if (amount) {
                        result = await signAndSendTransaction(validatorId, [
                            functionCall('unstake', { amount }, STAKING_GAS_BASE * 5, '0')
                        ])
                    } else {
                        result = await signAndSendTransaction(validatorId, [
                            functionCall('unstake_all', {}, STAKING_GAS_BASE * 5, '0')
                        ])
                    }
                    // wait for explorer to index results
                    await new Promise((r) => setTimeout(r, EXPLORER_DELAY))
                    await updateStakedBalance(validatorId, accountId, contract)
                    return result
                },
                () => showAlert({ onlyError: true })
            ],
        },
        WITHDRAW: {
            LOCKUP: [
                async (lockupId, amount) => {
                    let result
                    if (amount) {
                        result = await signAndSendTransaction(lockupId, [
                            functionCall('withdraw_from_staking_pool', { amount }, STAKING_GAS_BASE * 5, '0')
                        ])
                    } else {
                        result = await signAndSendTransaction(lockupId, [
                            functionCall('withdraw_all_from_staking_pool', {}, STAKING_GAS_BASE * 7, '0')
                        ])
                    }
                    if (result === false) {
                        throw new WalletError('Unable to withdraw pending balance from validator', 'staking.noWithdraw')
                    }
                    return result
                },
                () => showAlert()
            ],
            ACCOUNT: [
                async (validatorId, amount) => {
                    let result
                    if (amount) {
                        result = await signAndSendTransaction(validatorId, [
                            functionCall('withdraw', { amount }, STAKING_GAS_BASE * 5, '0')
                        ])
                    } else {
                        result = await signAndSendTransaction(validatorId, [
                            functionCall('withdraw_all', {}, STAKING_GAS_BASE * 7, '0')
                        ])
                    }
                    if (result === false) {
                        throw new WalletError('Unable to withdraw pending balance from validator', 'staking.noWithdraw')
                    }
                    // wait for explorer to index results
                    await new Promise((r) => setTimeout(r, EXPLORER_DELAY))
                    return result
                },
                () => showAlert()
            ],
        },
        UPDATE_ACCOUNT: async (balance, validators, accountId, validatorDepositMap) => {
            let totalUnstaked = new BN(balance.available)
            if (totalUnstaked.lt(new BN(STAKING_AMOUNT_DEVIATION))) {
                totalUnstaked = ZERO.clone();
            }
            let totalStaked = ZERO.clone();
            let totalUnclaimed = ZERO.clone();
            let totalAvailable = ZERO.clone();
            let totalPending = ZERO.clone();

            await Promise.all(validators.map(async (validator, i) => {
                try {
                    const total = new BN(await validator.contract.get_account_total_balance({ account_id: accountId }))
                    if (total.lte(ZERO)) {
                        validator.remove = true
                        return
                    }

                    // try to get deposits from explorer
                    const deposit = new BN(validatorDepositMap[validator.accountId] || '0')
                    validator.staked = await validator.contract.get_account_staked_balance({ account_id: accountId })

                    // rewards (lifetime) = total - deposits
                    validator.unclaimed = total.sub(deposit).toString()
                    if (!deposit.gt(ZERO) || new BN(validator.unclaimed).lt(MIN_DISPLAY_YOCTO)) {
                        validator.unclaimed = ZERO.clone().toString()
                    }

                    validator.unstaked = new BN(await validator.contract.get_account_unstaked_balance({ account_id: accountId }))
                    if (validator.unstaked.gt(MIN_DISPLAY_YOCTO)) {
                        const isAvailable = await validator.contract.is_account_unstaked_balance_available({ account_id: accountId })
                        if (isAvailable) {
                            validator.available = validator.unstaked.toString()
                            totalAvailable = totalAvailable.add(validator.unstaked)
                        } else {
                            validator.pending = validator.unstaked.toString()
                            totalPending = totalPending.add(validator.unstaked)
                        }
                    }

                    totalStaked = totalStaked.add(new BN(validator.staked))
                    totalUnclaimed = totalUnclaimed.add(new BN(validator.unclaimed))
                } catch (e) {
                    if (e.message.indexOf('cannot find contract code') === -1) {
                        console.warn('Error getting data for validator', validator.accountId, e)
                    }
                }
            }))

            return {
                accountId,
                validators: validators.filter((v) => !v.remove),
                selectedValidator: null,
                totalUnstaked: totalUnstaked.toString(),
                totalStaked: totalStaked.toString(),
                totalUnclaimed: (totalUnclaimed.lt(MIN_DISPLAY_YOCTO) ? ZERO : totalUnclaimed).toString(),
                totalPending: totalPending.toString(),
                totalAvailable: (totalAvailable.lt(MIN_DISPLAY_YOCTO) ? ZERO : totalAvailable).toString(),
            }
        },
        UPDATE_LOCKUP: async (contract, account_id, exAccountId, accountId, validators) => {
            // use MIN_LOCKUP_AMOUNT vs. actual storage amount
            const deposited = new BN(await contract.get_known_deposited_balance())
            let totalUnstaked = new BN(await contract.get_owners_balance())
                .add(new BN(await contract.get_locked_amount()))
                .sub(MIN_LOCKUP_AMOUNT)
                .sub(deposited)

            // minimum displayable for totalUnstaked 
            if (totalUnstaked.lt(new BN(parseNearAmount('0.002')))) {
                totalUnstaked = ZERO.clone()
            }
            
            // validator specific
            const selectedValidator = await contract.get_staking_pool_account_id()
            if (!selectedValidator) {
                return {
                    ...ACCOUNT_DEFAULTS,
                    accountId: account_id,
                    totalUnstaked: totalUnstaked.toString(),
                    mainAccountId: exAccountId
                }
            }
            let validator = validators.find((validator) => 
                validator.accountId === selectedValidator
            )

            let totalStaked = ZERO.clone();
            let totalUnclaimed = ZERO.clone();
            let totalAvailable = ZERO.clone();
            let totalPending = ZERO.clone();
            let total
            const minimumUnstaked = new BN('100'); // 100 yocto

            try {
                total = new BN(await validator.contract.get_account_total_balance({ account_id }))
                if (total.gt(ZERO)) {
                    validator.staked = await validator.contract.get_account_staked_balance({ account_id })
                    validator.unclaimed = total.sub(deposited).toString()
                    validator.unstaked = new BN(await validator.contract.get_account_unstaked_balance({ account_id }))
                    if (validator.unstaked.gt(minimumUnstaked)) {
                        const isAvailable = await validator.contract.is_account_unstaked_balance_available({ account_id })
                        if (isAvailable) {
                            validator.available = validator.unstaked.toString()
                            totalAvailable = totalAvailable.add(validator.unstaked)
                        } else {
                            validator.pending = validator.unstaked.toString()
                            totalPending = totalPending.add(validator.unstaked)
                        }
                    }
                } else {
                    validator.remove = true
                }
                totalStaked = totalStaked.add(new BN(validator.staked || ZERO.clone()))
                totalUnclaimed = totalUnclaimed.add(new BN(validator.unclaimed || ZERO.clone()))
            } catch (e) {
                if (e.message.indexOf('cannot find contract code') === -1) {
                    console.warn('Error getting data for validator', validator.accountId, e)
                }
            }

            return {
                mainAccountId: exAccountId,
                accountId: account_id,
                validators: !validator.remove ? [validator] : [],
                selectedValidator,
                totalBalance: total.toString(),
                totalUnstaked: totalUnstaked.toString(),
                totalStaked: totalStaked.toString(),
                totalUnclaimed: totalUnclaimed.toString(),
                totalPending: totalPending.toString(),
                totalAvailable: totalAvailable.toString(),
            }
        },
        UPDATE_CURRENT: null,
        GET_LOCKUP: async (accountId) => {
            let lockupId
            if (process.env.REACT_APP_USE_TESTINGLOCKUP && accountId.length < 64) {
                lockupId = `testinglockup.${accountId}`
            } else {
                lockupId = getLockupAccountId(accountId)
            }

            let contract
            try {
                await (await new Account(wallet.connection, lockupId)).state()
                contract = await new Contract(await wallet.getAccount(accountId), lockupId, { ...lockupMethods })
            } catch (e) {
                return
            }

            return { contract, lockupId, accountId }
        },
        GET_VALIDATORS: async (accountIds, accountId) => {
            const { current_validators, next_validators, current_proposals } = await wallet.connection.provider.validators()
            const currentValidators = shuffle(current_validators).map(({ account_id }) => account_id)
            
            if (!accountIds) {
                const rpcValidators = [...current_validators, ...next_validators, ...current_proposals].map(({ account_id }) => account_id)

                // TODO use indexer - getting all historic validators from raw GH script .json
                const networkId = wallet.connection.provider.connection.url.indexOf('mainnet') > -1 ? 'mainnet' : 'testnet'
                if (!ghValidators) {
                    ghValidators = (await fetch(`https://raw.githubusercontent.com/frol/near-validators-scoreboard/scoreboard-${networkId}/validators_scoreboard.json`).then((r) => r.json()))
                    .map(({ account_id }) => account_id)
                }

                accountIds = [...new Set([...rpcValidators, ...ghValidators])]
                    .filter((v) => v.indexOf('nfvalidator') === -1 && v.indexOf(networkId === 'mainnet' ? '.near' : '.m0') > -1)
            }

            const currentAccount = await wallet.getAccountBasic(accountId)

            return (await Promise.all(
                accountIds.map(async (account_id) => {
                    try {
                        const contract = new Contract(currentAccount, account_id, stakingMethods)
                        const validator = {
                            accountId: account_id,
                            active: currentValidators.includes(account_id),
                            contract
                        }
                        const fee = validator.fee = await validator.contract.get_reward_fee_fraction()
                        fee.percentage = +(fee.numerator / fee.denominator * 100).toFixed(2)
                        return validator
                    } catch (e) {
                        console.warn('Error getting fee for validator %s: %s', account_id, e);
                    }
                })
            )).filter((v) => !!v)
        }
    }
})

const handleGetAccounts = () => async (dispatch, getState) => {
    await dispatch(handleGetLockup())

    const accounts = [{
        accountId: wallet.accountId,
        ...getState().staking.accounts[0]
    }]

    if (getState().staking?.lockup?.lockupId) {
        accounts.push({
            accountId: getState().staking.lockup.lockupId,
            ...getState().staking.accounts[1]
        })
    }

    return await dispatch(staking.getAccounts(accounts))
}

export const handleGetLockup = (accountId) => async (dispatch, getState) => {
    try {
        await dispatch(staking.getLockup(accountId || getState().account.accountId))
    } catch(e) {
        if (!/No contract for account/.test(e.message)) {
            throw e
        }
    }
}

export const handleStakingUpdateAccount = (recentlyStakedValidators = [], exAccountId) => async (dispatch, getState) => {
    const { accountId, balance } = exAccountId
        ? getState().allAccounts[exAccountId]
        : getState().account

    const validatorDepositMap = await getStakingDeposits(accountId)

    if (!getState().staking.allValidators.length) {
        await dispatch(staking.getValidators(null, exAccountId))
    }

    const validators = getState().staking.allValidators
        .filter((validator) => Object.keys(validatorDepositMap).concat(recentlyStakedValidators).includes(validator.accountId))
        .map((validator) => ({ ...validator }))

    await dispatch(staking.updateAccount(balance, validators, accountId, validatorDepositMap))
}

export const handleStakingUpdateLockup = (exAccountId) => async (dispatch, getState) => {
    const { contract, lockupId: account_id } = getState().staking.lockup
    const { accountId } = getState().account

    const validators = getState().staking.allValidators.map((validator) => ({
        ...validator
    }))

    await dispatch(staking.updateLockup(contract, account_id, exAccountId, accountId, validators))
}

export const handleStakingAction = (action, validatorId, amount) => async (dispatch, getState) => {
    const { accountId } = getState().staking.accountsObj
    const { accountId: currentAccountId } = getState().staking.currentAccount

    const isLockup = currentAccountId !== accountId

    if (amount && amount.length < 15) {
        amount = parseNearAmount(amount)
    }
    if (isLockup) {
        const { contract, lockupId } = getState().staking.lockup
        await dispatch(staking[action].lockup(lockupId, amount, contract, validatorId))
    } else {
        const { contract } = getState().staking.allValidators.find((validator) => validator.accountId === validatorId)
        await dispatch(staking[action].account(validatorId, amount, accountId, contract))
    }

    await dispatch(getBalance())
    await dispatch(updateStaking(currentAccountId, [validatorId]))
}

export const updateStaking = (currentAccountId, recentlyStakedValidators) => async (dispatch, getState) => {
    await dispatch(handleGetAccounts())
    const { accountId, lockupId } = getState().staking.accountsObj

    await dispatch(staking.getValidators(null, accountId))

    await dispatch(handleStakingUpdateAccount(recentlyStakedValidators))
    if (lockupId) {
        await dispatch(handleStakingUpdateLockup())
    }

    dispatch(staking.updateCurrent(currentAccountId || accountId))
}

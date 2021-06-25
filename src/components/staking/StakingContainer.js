import React, { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { Switch, Route } from 'react-router-dom'
import { ConnectedRouter } from 'connected-react-router'
import styled from 'styled-components'

import {
    updateStaking,
    staking as stakingActions,
    handleStakingAction
} from '../../redux/actions/staking'
import Container from '../common/styled/Container.css'
import Staking from './components/Staking'
import Validators from './components/Validators'
import Unstake from './components/Unstake'
import Withdraw from './components/Withdraw'
import Validator from './components/Validator'
import StakingAction from './components/StakingAction'
import { setStakingAccountSelected, getStakingAccountSelected } from '../../utils/localStorage'
import { getBalance } from '../../redux/actions/account'
import { Mixpanel } from '../../mixpanel/index'
import { useSelector } from '../../redux/useSelector'

const StyledContainer = styled(Container)`
    button {
        display: block !important;
        margin: 35px auto 40px auto !important;
        width: 100% !important;

        &.seafoam-blue {
            &:hover {
                border-color: #6ad1e3 !important;
                background: #6ad1e3 !important;
            }
        }
    }

    .desc {
        text-align: center;
        line-height: 150% !important;
        margin: 25px 0;
        font-size: 16px;
    }

    input {
        margin: 0 !important;

        &.view-validator {
            margin-bottom: 25px !important;
        }
    }
    
    .input-validation-label {
        margin-top: -14px !important;
    }

    h3 {
        border-bottom: 2px solid #F2F2F2;
        margin-top: 50px;
        padding-bottom: 15px;

        @media (max-width: 767px) {
            margin: 50px -14px 0px -14px;
            padding: 0 14px 15px 14px;
        }
    }

    h4 {
        margin: 30px 0 10px 0;
    }

    .transfer-money-icon {
        display block;
        margin: 50px auto;
    }

    .withdrawal-disclaimer {
        font-style: italic;
        margin-top: 15px;
        max-width: 375px;
        font-size: 13px;
    }

    .balance-banner {
        margin-bottom: 40px;
    }

    .alert-banner {
        margin: -25px -14px 50px -14px;
        border-radius: 0;
        @media (min-width: 451px) {
            margin: 0 0 50px 0;
            border-radius: 4px;
        }
    }

    .amount-header-wrapper,
    .validator-header-wrapper  {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin: 30px 0 10px 0;

        h4 {
            margin: 0;
        }

        button {
            margin: 0 !important;
            width: auto !important;
            text-decoration: none !important;
            font-weight: 500 !important;
            text-transform: capitalize !important;
        }
    }

    .account-info {
        display: block;
        margin-bottom: 15px;
        svg {
            margin-left: 8px;
            width: 16px;
            height: 16px;
            margin-bottom: -3px;
        }
    }

    .radio-label {
        cursor: ${props => props.numAccounts ? 'pointer' : 'default'};
        .input-wrapper {
            display: ${props => props.numAccounts > 1 ? 'block' : 'none'};
        }
    }

    .account-loader {
        .animation-wrapper {
            :first-of-type {
                margin-bottom: 10px;
            }
        }
        .animation {
            border-radius: 8px;
        }
    }

    .select-account-title {
        display: flex;
        align-items: center;
        margin-bottom: 10px;
        
        .tooltip {
            margin-bottom: -1px;
        }
    }
`

export function StakingContainer({ history, match }) {
    const dispatch = useDispatch()
    const { accountId, has2fa, balance = {} } = useSelector(({ account }) => account);
    const status = useSelector(({ status }) => status);
    const { hasLedger } = useSelector(({ ledger }) => ledger)
    
    const staking = useSelector(({ staking }) => staking)
    const hasLockup = !!staking.lockupId
    const { currentAccount } = staking
    const stakingAccounts = staking.accounts
    const validators = staking.allValidators
    const currentValidators = currentAccount.validators
    const validatorId = history.location.pathname.split('/')[2]
    let validator = currentValidators.filter(validator => validator.accountId === validatorId)[0]
    // validator profile not in account's current validators (with balances) find validator in allValidators
    if (!validator) {
        validator = validators.filter(validator => validator.accountId === validatorId)[0]
    }
    const { totalUnstaked, selectedValidator } = currentAccount
    const loadingBalance = !stakingAccounts.every((account) => !!account.totalUnstaked)
    const stakeFromAccount = currentAccount.accountId === accountId

    useEffect(() => {
        if (accountId) {
            dispatch(getBalance())
        }
        if (!!balance.available) {
            dispatch(updateStaking(getStakingAccountSelected()))
        }
    }, [accountId, !!balance.available])

    const handleSwitchAccount = (accountId) => {
        setStakingAccountSelected(accountId)
        dispatch(stakingActions.updateCurrent(accountId))
    }

    const handleAction = async (action, validator, amount) => {
        let id = Mixpanel.get_distinct_id()
        Mixpanel.identify(id)
        await Mixpanel.withTracking(action.toUpperCase(),
            async () => {
                const properValidator = action === 'stake'
                    ? validator
                    : selectedValidator || validator
                await dispatch(handleStakingAction(action, properValidator, amount))
                Mixpanel.people.set({[`last_${action}_time`]: new Date().toString()})
            }
        )
    }

    return (
        <StyledContainer className='small-centered' numAccounts={stakingAccounts.length}>
            <ConnectedRouter history={history}>
                <Switch>
                    <Route
                        exact
                        path='/staking'
                        render={() => (
                            <Staking
                                {...currentAccount}
                                currentValidators={currentValidators}
                                onSwitchAccount={handleSwitchAccount}
                                accounts={stakingAccounts}
                                activeAccount={currentAccount}
                                accountId={accountId}
                                loading={status.mainLoader && !stakingAccounts.length}
                                loadingDetails={(status.mainLoader && !stakingAccounts.length) || loadingBalance}
                                hasLockup={hasLockup}
                                stakeFromAccount={stakeFromAccount}
                                selectedValidator={selectedValidator}
                            />
                        )}
                    />
                    <Route
                        exact
                        path='/staking/validators'
                        render={(props) => (
                            <Validators
                                {...props}
                                validators={validators}
                                stakeFromAccount={stakeFromAccount}
                            />
                        )}
                    />
                    <Route
                        exact
                        path='/staking/unstake'
                        render={(props) => (
                            <Unstake
                                {...props}
                                currentValidators={currentValidators}
                            />
                        )}
                    />
                    <Route
                        exact
                        path='/staking/withdraw'
                        render={(props) => (
                            <Withdraw
                                {...props}
                                currentValidators={currentValidators}
                            />
                        )}
                    />
                    <Route
                        exact
                        path='/staking/:validator'
                        render={(props) => (
                            <Validator 
                                {...props} 
                                validator={validator}
                                onWithdraw={handleAction}
                                loading={status.mainLoader}
                                selectedValidator={selectedValidator}
                                currentValidators={currentValidators}
                            />
                        )}
                    />
                    <Route
                        exact
                        path='/staking/:validator/stake'
                        render={(props) => (
                            <StakingAction
                                {...props}
                                action='stake'
                                handleStakingAction={handleAction}
                                availableBalance={totalUnstaked} 
                                validator={validator}
                                loading={status.mainLoader}
                                hasLedger={hasLedger}
                                has2fa={has2fa}
                                stakeFromAccount={stakeFromAccount}
                                selectedValidator={selectedValidator}
                                currentValidators={currentValidators}
                            />
                        )}
                    />
                    <Route
                        exact
                        path='/staking/:validator/unstake'
                        render={(props) => (
                            <StakingAction
                                {...props}
                                action='unstake'
                                handleStakingAction={handleAction}
                                availableBalance={totalUnstaked}
                                validator={validator}
                                loading={status.mainLoader}
                                hasLedger={hasLedger}
                                has2fa={has2fa}
                            />
                        )}
                    />
                </Switch>
            </ConnectedRouter>
        </StyledContainer>
    )
}
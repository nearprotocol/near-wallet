import React, { useEffect, useState } from 'react'
import { Translate } from 'react-localize-redux'
import { useDispatch } from 'react-redux'
import Container from '../common/styled/Container.css'
import RecoveryContainer from './Recovery/RecoveryContainer'
import BalanceContainer from './balances/BalanceContainer'
import HardwareDevices from './hardware_devices/HardwareDevices'
import TwoFactorAuth from './two_factor/TwoFactorAuth'
import { getLedgerKey, checkCanEnableTwoFactor, redirectTo, refreshAccount, transferAllFromLockup, loadRecoveryMethods, getProfileStakingDetails, getBalance } from '../../redux/actions/account'
import styled from 'styled-components'
import LockupAvailTransfer from './balances/LockupAvailTransfer'
import UserIcon from '../svg/UserIcon'
import ShieldIcon from '../svg/ShieldIcon'
import LockIcon from '../svg/LockIcon'
import CheckCircleIcon from '../svg/CheckCircleIcon'
import BN from 'bn.js'
import SkeletonLoading from '../common/SkeletonLoading'
import { selectProfileBalance } from '../../redux/selectors/balance'
import { useAccount } from '../../hooks/allAccounts'
import { Mixpanel } from "../../mixpanel/index"
import AuthorizedApp from './authorized_apps/AuthorizedApp'
import FormButton from '../common/FormButton'
import Tooltip from '../common/Tooltip'
import { useSelector } from '../../redux/useSelector'


const StyledContainer = styled(Container)`

    @media (max-width: 991px) {
        .right {
            margin-top: 50px;
        }
    }

    h2 {
        font-weight: 900 !important;
        font-size: 24px !important;
        margin: 10px 0;
        text-align: left !important;
        line-height: 140% !important;
        display: flex;
        align-items: center;

        svg {
            margin-right: 15px;

            &.user-icon {
                margin-right: 10px;
            }

            .background {
                display: none;
            }
        }
    }

    .left, .right {
        .animation-wrapper {
            border-radius: 8px;
            overflow: hidden;
        }
    }

    .left {
        @media (min-width: 992px) {

            > hr {
                margin: 50px 0px 30px 0px;
            }
        }

        .animation-wrapper {
            margin-top: 50px;

            :last-of-type {
                margin-top: 30px;
            }
        }

        .tooltip {
            margin-bottom: -1px;
        }
    }

    .right {
        > h4 {
            margin: 50px 0 20px 0;
            display: flex;
            align-items: center;
        }

        .recovery-option,
        .animation-wrapper {
            margin-top: 15px;
        }
    }

    hr {
        border: 1px solid #F0F0F0;
        margin: 50px 0 40px 0;
    }

    .sub-heading {
        margin: 20px 0;
        color: #72727A;
    }

    .auth-apps {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 35px;

        button {
            &.link {
                text-decoration: none !important;
                white-space: nowrap;
            }
        }
    }

    .authorized-app-box {
        margin-top: 20px !important;
    }
`

export function Profile({ match }) {
    const [transferring, setTransferring] = useState(false)
    const { has2fa, authorizedApps, ledgerKey } = useSelector(({ account }) => account)
    const loginAccountId = useSelector(state => state.account.accountId)
    const recoveryMethods = useSelector(({ recoveryMethods }) => recoveryMethods);
    const accountIdFromUrl = match.params.accountId
    const accountId = accountIdFromUrl || loginAccountId
    const isOwner = accountId === loginAccountId
    const account = useAccount(accountId)
    const dispatch = useDispatch()
    const userRecoveryMethods = recoveryMethods[account.accountId]
    const twoFactor = has2fa && userRecoveryMethods && userRecoveryMethods.filter(m => m.kind.includes('2fa'))[0]
    const profileBalance = selectProfileBalance(account.balance)

    useEffect(() => {
        if (!loginAccountId) {
            return
        }

        if (accountIdFromUrl && accountIdFromUrl !== accountIdFromUrl.toLowerCase()) {
            dispatch(redirectTo(`/profile/${accountIdFromUrl.toLowerCase()}`))
        }
        
        (async () => {
            if (isOwner) {
                await dispatch(loadRecoveryMethods())
                if (!ledgerKey) {
                    dispatch(getLedgerKey())
                }
                const balance = await dispatch(getBalance())
                dispatch(checkCanEnableTwoFactor(balance))
                dispatch(getProfileStakingDetails())
            }
        })()
    }, [loginAccountId]);

    useEffect(() => {
        if (userRecoveryMethods) {
            let id = Mixpanel.get_distinct_id()
            Mixpanel.identify(id)
            Mixpanel.people.set_once({create_date: new Date().toString(),})
            Mixpanel.people.set({
                relogin_date: new Date().toString(),
                enabled_2FA: account.has2fa
            })
            Mixpanel.alias(accountId)
            userRecoveryMethods.map(method => {
                Mixpanel.people.set({['recovery_with_'+method.kind]:true})
            })
        }
    },[userRecoveryMethods])

    useEffect(()=> {
        if (twoFactor) {
            let id = Mixpanel.get_distinct_id()
            Mixpanel.identify(id)
            Mixpanel.people.set({
                create_2FA_at: twoFactor.createdAt, 
                enable_2FA_kind:twoFactor.kind, 
                enabled_2FA: twoFactor.confirmed})
        }
    }, [twoFactor])

    const handleTransferFromLockup = async () => {
        try {
            setTransferring(true)
            await dispatch(transferAllFromLockup())
            await dispatch(refreshAccount())
            await dispatch(getProfileStakingDetails())
        } finally {
            setTransferring(false)
        }
    }

    const MINIMUM_AVAILABLE_TO_TRANSFER = new BN('10000000000000000000000')

    return (
        <StyledContainer>
            {isOwner && profileBalance?.lockupIdExists && new BN(profileBalance.lockupBalance.unlocked.availableToTransfer).gte(MINIMUM_AVAILABLE_TO_TRANSFER) &&
                <LockupAvailTransfer
                    available={profileBalance.lockupBalance.unlocked.availableToTransfer || '0'}
                    onTransfer={handleTransferFromLockup}
                    sending={transferring}
                />
            }
            <div className='split'>
                <div className='left'>
                    <h2><UserIcon/><Translate id='profile.pageTitle.default'/></h2>
                    {profileBalance ? (
                        <BalanceContainer
                            account={account}
                            profileBalance={profileBalance}
                        />
                    ) : (
                        <SkeletonLoading
                            height='323px'
                            show={!profileBalance}
                            number={2}
                        />
                    )}
                    {isOwner && authorizedApps?.length ?
                        <>
                            <hr/>
                            <div className='auth-apps'>
                                <h2><CheckCircleIcon/><Translate id='profile.authorizedApps.title'/></h2>
                                <FormButton color='link' linkTo='/authorized-apps'><Translate id='button.viewAll'/></FormButton>
                            </div>
                            {authorizedApps.slice(0, 2).map((app, i) => (
                                <AuthorizedApp key={i} app={app}/>
                            ))}
                        </>
                        : null
                    }
                </div>
                {isOwner &&
                    <div className='right'>
                        <h2><ShieldIcon/><Translate id='profile.security.title'/></h2>
                        <h4><Translate id='profile.security.mostSecure'/><Tooltip translate='profile.security.mostSecureDesc' icon='icon-lg'/></h4>
                        {!twoFactor && <HardwareDevices recoveryMethods={userRecoveryMethods}/>}
                        <RecoveryContainer type='phrase' recoveryMethods={userRecoveryMethods}/>
                        <h4><Translate id='profile.security.lessSecure'/><Tooltip translate='profile.security.lessSecureDesc' icon='icon-lg'/></h4>
                        <RecoveryContainer type='email' recoveryMethods={userRecoveryMethods}/>
                        <RecoveryContainer type='phone' recoveryMethods={userRecoveryMethods}/>
                        {!account.ledgerKey &&
                            <>
                                <hr/>
                                <h2><LockIcon/><Translate id='profile.twoFactor'/></h2>
                                {account.canEnableTwoFactor !== null ? (
                                    <>
                                        <div className='sub-heading'><Translate id='profile.twoFactorDesc'/></div>
                                        {/* TODO: Also check recovery methods in DB for Ledger */}
                                        <TwoFactorAuth twoFactor={twoFactor}/>
                                    </>
                                ) : (
                                    <SkeletonLoading
                                        height='80px'
                                        show={true}
                                    />
                                )}
                            </>
                        }
                    </div>
                }
            </div>
        </StyledContainer>
    )
}

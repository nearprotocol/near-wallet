import React, { Component } from 'react'
import styled from 'styled-components'
import { Translate } from 'react-localize-redux'
import { checkNearDropBalance, claimLinkdropToAccount, redirectTo } from '../../redux/actions/account'
import { clearLocalAlert } from '../../redux/actions/status'
import Container from '../common/styled/Container.css'
import FormButton from '../common/FormButton'
import { Mixpanel } from '../../mixpanel/index'
import Balance from '../common/Balance'
import NearGiftIcons from '../svg/NearGiftIcons'
import BrokenLinkIcon from '../svg/BrokenLinkIcon';
import AccountDropdown from '../common/AccountDropdown'
import { actionsPending } from '../../utils/alerts'
import connectAccount from '../../redux/connectAccount'

const StyledContainer = styled(Container)`
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;

    .near-balance {
        color: #0072CE;
        font-weight: 600;
        border: 1px solid #D6EDFF;
        border-radius: 4px;
        padding: 6px 15px;
        background-color: #F0F9FF;
        margin: 30px 0;
    }

    .desc {
        color: #72727A;
        margin-bottom: 40px;
    }

    h3 {
        margin-top: 40px;
    }

    .or {
        color: #A2A2A8;
        margin: 20px 0 -6px 0;
    }

    button {
        width: 100% !important;
    }

    .account-dropdown-container {
        width: 100%;
    }

    &.invalid-link {
        svg {
            display: block;
            margin: 0 auto;
        }

        h2 {
            margin-top: 20px;
        }
    }
`

class LinkdropLanding extends Component {
    state = {
        balance: null,
        invalidNearDrop: null
    }

    componentDidMount() {
        const { fundingContract, fundingKey } = this.props
        if (fundingContract && fundingKey) {
            this.handleCheckNearDropBalance()
        }
    }

    handleCheckNearDropBalance = async () => {
        const { fundingContract, fundingKey, checkNearDropBalance } = this.props
        await Mixpanel.withTracking("CA Check near drop balance",
            async () => {
                const balance = await checkNearDropBalance(fundingContract, fundingKey)
                this.setState({ balance: balance })
            },
            () => this.setState({ invalidNearDrop: true })
        )
    }

    handleClaimNearDrop = async () => {
        const { fundingContract, fundingKey, redirectTo, claimLinkdropToAccount } = this.props
        await claimLinkdropToAccount(fundingContract, fundingKey)
        localStorage.setItem('linkdropAmount', this.state.balance)
        redirectTo('/')
    }

    render() {
        const { fundingContract, fundingKey, accountId, mainLoader } = this.props
        const { balance, invalidNearDrop } = this.state
        const claimingDrop = actionsPending('CLAIM_LINKDROP_TO_ACCOUNT')
        const fundingAmount = balance;

        if (!invalidNearDrop) {
            return (
                <StyledContainer className='xs-centered'>
                    <NearGiftIcons/>
                    <h3><Translate id='linkdropLanding.title'/></h3>
                    <div className='near-balance'>
                        <Balance amount={balance} symbol='near'/>
                    </div>
                    <div className='desc'>
                        <Translate id='linkdropLanding.desc'/>
                    </div>
                    {accountId ? <AccountDropdown disabled={claimingDrop}/> : null}
                    {accountId ?
                        <FormButton
                            onClick={this.handleClaimNearDrop}
                            sending={claimingDrop}
                            disabled={mainLoader}
                            sendingString='linkdropLanding.claiming'
                        >
                            <Translate id='linkdropLanding.ctaAccount'/>
                        </FormButton>
                        :
                        <FormButton
                            linkTo={`/recover-account?fundingOptions=${encodeURIComponent(JSON.stringify({ fundingContract, fundingKey, fundingAmount }))}`}
                        >
                            <Translate id='linkdropLanding.ctaLogin'/>
                        </FormButton>
                    }
                    <div className='or'><Translate id='linkdropLanding.or'/></div>
                    <FormButton color='gray-blue' disabled={claimingDrop} linkTo={`/create/${fundingContract}/${fundingKey}?redirect=false`}>
                        <Translate id='linkdropLanding.ctaNew'/>
                    </FormButton>
                </StyledContainer>
            )
        } else {
            return (
                <StyledContainer className='small-centered invalid-link'>
                    <BrokenLinkIcon/>
                    <h1><Translate id='createAccount.invalidLinkDrop.title'/></h1>
                    <h2><Translate id='createAccount.invalidLinkDrop.one'/></h2>
                    <h2><Translate id='createAccount.invalidLinkDrop.two'/></h2>
                </StyledContainer>
            )
        }
    }
}

const mapDispatchToProps = {
    clearLocalAlert,
    checkNearDropBalance,
    claimLinkdropToAccount,
    redirectTo
}

const mapStateToProps = ({ account, status }, stateMainReducer, { match }) => ({
    ...account,
    fundingContract: match.params.fundingContract,
    fundingKey: match.params.fundingKey,
    mainLoader: status.mainLoader
})

export const LinkdropLandingWithRouter = connectAccount(
    mapStateToProps,
    mapDispatchToProps
)(LinkdropLanding)

import React, { Component } from 'react'
import styled from 'styled-components'
import { connect } from 'react-redux'
import { Link } from 'react-router-dom'
import { Translate } from 'react-localize-redux'
import { checkNewAccount, createNewAccount, refreshAccount, checkNearDropBalance, redirectToApp } from '../../actions/account'
import { clearLocalAlert } from '../../actions/status'
import { ACCOUNT_ID_SUFFIX } from '../../utils/wallet'
import { getDirectWebSdk } from '../../utils/torus'
import Container from '../common/styled/Container.css'
import BrokenLinkIcon from '../svg/BrokenLinkIcon';
import FormButton from '../common/FormButton'
import AccountFormAccountId from './AccountFormAccountId'
import AccountNote from '../common/AccountNote'
import { Mixpanel } from '../../mixpanel/index'

const StyledContainer = styled(Container)`

    .input {
        width: 100%;
    }

    button {
        :first-of-type {
            width: 100% !important;
        }
    }

    h6 {
        margin: 30px 0 5px 0 !important;
        font-size: 15px !important;
        color: #24272a;
        letter-spacing: normal !important;
    }

    .recaptcha-disclaimer {
        font-size: 12px;
        font-weight: 400;
        max-width: 383px;
        margin: 50px auto 0 auto;
        text-align: center;

        a {
            color: inherit;
        }
    }

    a {
        text-decoration: underline;
    }
    
    .alternatives-title {
        color: #24272a;
        text-align: center;
        margin-top: 30px;
    }

    .alternatives {
        display: flex;
        justify-content: center;
        margin-top: 5px;
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

class CreateAccount extends Component {
    state = {
        loader: false,
        accountId: '',
        token: '',
        invalidNearDrop: null
    }

    componentDidMount() {
        if (this.props.fundingContract && this.props.fundingKey) {
            this.handleCheckNearDropBalance()
        }
    }

    componentWillUnmount = () => {
        this.props.clearLocalAlert()
    }

    handleCheckNearDropBalance = async () => {
        await Mixpanel.withTracking("CA Check near drop balance",
            async () => await this.props.checkNearDropBalance(this.props.fundingContract, this.props.fundingKey),
            () => this.setState({ invalidNearDrop: true })
        )
    }

    handleChange = (e, { name, value }) => {
        if (value.length > 0) {
            this.setState({[name]: `${value}.${ACCOUNT_ID_SUFFIX}`})
        } else {
            this.setState({[name]: value})
        }
    }

    handleLoginWithGoogle = async () => {
        const torusdirectsdk = await getDirectWebSdk();
        await torusdirectsdk.init(); // TODO: Should call .init() in helper?
        const loginDetails = await torusdirectsdk.triggerLogin({
            typeOfLogin: 'google',
            verifier: 'google-near',
            clientId: "206857959151-uebr6impkept4p3q6qv3e2bdevs9mro6.apps.googleusercontent.com"
        });

        await wallet.createOrRecoverAccountFromTorus(loginDetails);

        this.props.refreshAccount()
        this.props.redirectToApp()
    }

    handleCreateAccount = async () => {
        const { accountId } = this.state;
        const { 
            fundingContract, fundingKey,
            fundingAccountId,
        } = this.props

        this.setState({ loader: true });

        let queryString = ''
        if (fundingAccountId || fundingContract) {
            const fundingOptions = fundingAccountId ? { fundingAccountId } : { fundingContract, fundingKey }
            queryString = `?fundingOptions=${encodeURIComponent(JSON.stringify(fundingOptions))}`
        }
        let nextUrl = process.env.DISABLE_PHONE_RECOVERY === 'yes' ?
            `/setup-seed-phrase/${accountId}/phrase${queryString}` :
            `/set-recovery/${accountId}${queryString}`;
        Mixpanel.track("CA Click create account button")
        this.props.history.push(nextUrl);
    }

    render() {
        const { loader, accountId, invalidNearDrop } = this.state
        const { localAlert, mainLoader, checkNewAccount, resetAccount, clearLocalAlert } = this.props
        const useLocalAlert = accountId.length > 0 ? localAlert : undefined;
        
        if (!invalidNearDrop) {
            return (
                <StyledContainer className='small-centered'>
                    <form onSubmit={e => {this.handleCreateAccount(); e.preventDefault();}} autoComplete='off'>
                        <h1><Translate id='createAccount.pageTitle'/></h1>
                        <h2><Translate id='createAccount.pageText'/></h2>
                        <h4 className='small'><Translate id='createAccount.accountIdInput.title'/></h4>
                        <AccountFormAccountId
                            mainLoader={mainLoader}
                            handleChange={this.handleChange}
                            type='create'
                            pattern={/[^a-zA-Z0-9_-]/}
                            checkAvailability={checkNewAccount}
                            localAlert={useLocalAlert}
                            accountId={accountId}
                            clearLocalAlert={clearLocalAlert}
                            defaultAccountId={resetAccount && resetAccount.accountIdNotConfirmed.split('.')[0]}
                        />
                        <AccountNote/>
                        <FormButton
                            type='submit'
                            disabled={!(localAlert && localAlert.success)}
                            sending={loader}
                        >
                            <Translate id='button.createAccountCapital'/>
                        </FormButton>
                        <div className='alternatives-title'><Translate id='createAccount.alreadyHaveAnAccount'/></div>
                        <div className='alternatives' onClick={() => {Mixpanel.track("IE Click import existing account button")}}>
                            <Link to={process.env.DISABLE_PHONE_RECOVERY === 'yes' ? '/recover-seed-phrase' : '/recover-account'}><Translate id='createAccount.recoverItHere' /></Link>
                        </div>
                        <div>
                            <a href="#" onClick={(e) => { e.preventDefault(); this.handleLoginWithGoogle() }}>Login with Google</a>
                        </div>
                    </form>
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
    checkNewAccount,
    createNewAccount,
    clearLocalAlert,
    refreshAccount,
    redirectToApp,
    checkNearDropBalance
}

const mapStateToProps = ({ account, status }, { match }) => ({
    ...account,
    localAlert: status.localAlert,
    mainLoader: status.mainLoader,
    fundingContract: match.params.fundingContract,
    fundingKey: match.params.fundingKey,
    fundingAccountId: match.params.fundingAccountId,
})

export const CreateAccountWithRouter = connect(
    mapStateToProps,
    mapDispatchToProps
)(CreateAccount)

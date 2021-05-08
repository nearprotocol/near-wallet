import React, { Component } from 'react'
import { connect } from 'react-redux'
import { withRouter, Route } from 'react-router-dom'

import LoginContainer from './LoginContainer'
import LoginForm from './LoginForm'
import LoginConfirm from './LoginConfirm'
import LoginDetails from './LoginDetails'
import LoginIncorrectContractId from './LoginIncorrectContractId'
import { handleRefreshUrl, switchAccount, allowLogin, redirectToApp, redirectTo } from '../../actions/account'
import { clearLocalAlert } from '../../actions/status'
import { LOCKUP_ACCOUNT_ID_SUFFIX } from '../../utils/wallet'
import { Mixpanel } from '../../mixpanel/index'

class Login extends Component {
    state = {
        buttonLoader: false,
        dropdown: false
    }

    handleOnClick = () => {
        this.setState({
            dropdown: !this.state.dropdown
        })
    }

    handleDeny = () => {
        const failureUrl = this.props.account.url.failure_url;
        Mixpanel.track("LOGIN Click deny button")

        if (failureUrl) {
            window.location.href = failureUrl;
        } else {
            this.props.redirectToApp();
        }
    }

    handleAllow = async () => {
        this.setState({ buttonLoader: true })

        await Mixpanel.withTracking("LOGIN",
            async () => await this.props.allowLogin(),
            () => {},
            () => this.setState({
                buttonLoader: false
            })
        )
    }

    handleSelectAccount = accountId => {
        this.props.switchAccount(accountId)
    }

    redirectCreateAccount = () => {
        Mixpanel.track("LOGIN Click create new account button")
        this.props.redirectTo('/create')
    }

    render() {
        const { account: { url, accountId }, match, appTitle } = this.props
        const accountConfirmationForm = (url.public_key && (!url.contract_id || url.contract_id?.endsWith(`.${LOCKUP_ACCOUNT_ID_SUFFIX}`))) || url.contract_id === accountId
        const requestAccountIdOnly = !url.public_key && !url.contract_id;
        
        return (
            <LoginContainer>
                <Route
                    exact
                    path={`${match.url}`}
                    render={(props) => (
                        <LoginForm
                            {...this.state}
                            {...props}
                            appTitle={appTitle}
                            handleOnClick={this.handleOnClick}
                            handleDeny={this.handleDeny}
                            handleAllow={this.handleAllow}
                            handleSelectAccount={this.handleSelectAccount}
                            redirectCreateAccount={this.redirectCreateAccount}
                            handleDetails={this.handleDetails}
                            accountConfirmationForm={accountConfirmationForm}
                            requestAccountIdOnly={requestAccountIdOnly}
                        />
                    )}
                />
                <Route 
                    exact
                    path={`${match.url}/details`}
                    render={(props) => (
                        <LoginDetails
                            {...props}
                            contractId={url && url.contract_id}
                            appTitle={appTitle}
                            accountConfirmationForm={accountConfirmationForm}
                        />
                    )}
                />
                <Route 
                    exact
                    path={`${match.url}/confirm`}
                    render={(props) => (
                        <LoginConfirm
                            {...props}
                            buttonLoader={this.state.buttonLoader}
                            appTitle={appTitle}
                            handleAllow={this.handleAllow}
                        />
                    )}
                />
                <Route 
                    exact
                    path={`${match.url}/incorrect-contract-id`}
                    render={() => (
                        <LoginIncorrectContractId
                            contractId={url.contract_id}
                            failureUrl={url.failure_url}
                        />
                    )}
                />
            </LoginContainer>
        )
    }
}

const mapDispatchToProps = {
    handleRefreshUrl,
    switchAccount,
    allowLogin,
    redirectToApp,
    redirectTo,
    clearLocalAlert
}

const mapStateToProps = ({ account }) => ({
    account,
    appTitle: account.url?.referrer
})

export const LoginWithRouter = connect(
    mapStateToProps,
    mapDispatchToProps
)(withRouter(Login))

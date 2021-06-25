import React, { Component, Fragment } from 'react'
import { withRouter, Route } from 'react-router-dom'
import { Translate } from 'react-localize-redux'
import { parse as parseQuery } from 'query-string'
import {
    handleAddAccessKeySeedPhrase,
    refreshAccount,
    checkIsNew,
    handleCreateAccountWithSeedPhrase,
    fundCreateAccount,
    loadRecoveryMethods
} from '../../redux/actions/account'
import { generateSeedPhrase } from 'near-seed-phrase'
import SetupSeedPhraseVerify from './SetupSeedPhraseVerify'
import SetupSeedPhraseForm from './SetupSeedPhraseForm'
import copyText from '../../utils/copyText'
import isMobile from '../../utils/isMobile'
import { Snackbar, snackbarDuration } from '../common/Snackbar'
import Container from '../common/styled/Container.css'
import { KeyPair } from 'near-api-js'
import { Mixpanel } from '../../mixpanel/index'
import { clearGlobalAlert, showCustomAlert } from '../../redux/actions/status';
import { isRetryableRecaptchaError } from '../Recaptcha';
import connectAccount from '../../redux/connectAccount'

// FIXME: Use `debug` npm package so we can keep some debug logging around but not spam the console everywhere
const ENABLE_DEBUG_LOGGING = false;

const debugLog = (...args) => ENABLE_DEBUG_LOGGING && console.log('SetupSeedPhrase:', ...args);

class SetupSeedPhrase extends Component {
    recaptchaRef = null

    state = {
        seedPhrase: '',
        enterWord: '',
        wordId: null,
        localAlert: null,
        successSnackbar: false,
        submitting: false,
        recaptchaToken: null,
        isNewAccount: false
    }

    componentDidMount = async () => {
        this.refreshData()

        if (this.props.accountId === this.props.activeAccountId) {
            this.props.loadRecoveryMethods()
        }

        // We need to know if the account is new so when we render SetupSeedPhraseVerify, it doesn't load reCaptcha if its an existing account
        const isNewAccount = await this.props.checkIsNew(this.props.accountId)
        this.setState({ isNewAccount });
    }

    refreshData = () => {

        const { seedPhrase, publicKey, secretKey } = generateSeedPhrase()
        const recoveryKeyPair = KeyPair.fromString(secretKey)
        const wordId = Math.floor(Math.random() * 12)

        this.setState((prevState) => ({
            ...prevState,
            seedPhrase,
            publicKey,
            wordId,
            enterWord: '',
            localAlert: null,
            recoveryKeyPair
        }))
    }

    handleChangeWord = (e, { name, value }) => {
        if (value.match(/[^a-zA-Z]/)) {
            return false
        }

        this.setState((state) => ({
            [name]: value.trim().toLowerCase(),
            localAlert: null
        }))
    }

    handleStartOver = e => {
        const {
            history,
            location,
            accountId,
        } = this.props

        this.refreshData()
        history.push(`/setup-seed-phrase/${accountId}/phrase${location.search}`)
    }

    handleVerifyPhrase = () => {
        const { seedPhrase, enterWord, wordId, submitting } = this.state
        Mixpanel.track("SR-SP Verify start")
        if (enterWord !== seedPhrase.split(' ')[wordId]) {
            this.setState(() => ({
                localAlert: {
                    success: false,
                    messageCode: 'account.verifySeedPhrase.error'
                }
            }))
            Mixpanel.track("SR-SP Verify fail", { error: 'word is not matched the phrase' })
            return false
        }

        if (!submitting) {
            this.setState({ submitting: true }, this.handleSetupSeedPhrase)
        }
        Mixpanel.track("SR-SP Verify finish")
    }

    handleSetupSeedPhrase = async () => {
        debugLog('handleSetupSeedPhrase()');
        const {
            accountId,
            handleAddAccessKeySeedPhrase,
            handleCreateAccountWithSeedPhrase,
            fundCreateAccount,
            location,
            showCustomAlert,

        } = this.props
        const { recoveryKeyPair } = this.state

        if (!this.state.isNewAccount) {
            debugLog('handleSetupSeedPhrase()/existing account');

            await Mixpanel.withTracking("SR-SP Setup for existing account",
                async () => await handleAddAccessKeySeedPhrase(accountId, recoveryKeyPair)
            )
            return
        }

        const queryOptions = parseQuery(location.search);
        const fundingOptions = JSON.parse(queryOptions.fundingOptions || 'null')

        await Mixpanel.withTracking("SR-SP Setup for new account",
            async () => await handleCreateAccountWithSeedPhrase(accountId, recoveryKeyPair, fundingOptions, this.state.recaptchaToken),
            async (err) => {
                debugLog('failed to create account!', err);

                this.setState({ submitting: false });
                
                if (isRetryableRecaptchaError(err)) {
                    Mixpanel.track('Funded account creation failed due to invalid / expired reCaptcha response from user');
                    this.recaptchaRef.reset();
                    showCustomAlert({
                        success: false,
                        messageCodeHeader: 'error',
                        messageCode: 'walletErrorCodes.invalidRecaptchaCode'
                    })
                } else if(err.code === 'NotEnoughBalance') {
                    Mixpanel.track('SR-SP NotEnoughBalance creating funded account');
                    await fundCreateAccount(accountId, recoveryKeyPair, 'seed');
                } else {
                    showCustomAlert({
                        errorMessage: err.message,
                        success: false,
                        messageCodeHeader: 'error',
                    })
                }
            }
        );
    }

    handleCopyPhrase = () => {
        Mixpanel.track("SR-SP Copy seed phrase")
        if (navigator.share && isMobile()) {
            navigator.share({
                text: this.state.seedPhrase
            }).catch(err => {
                debugLog(err.message);
            });
        } else {
            this.handleCopyDesktop();
        }
    }

    handleCopyDesktop = () => {
        copyText(document.getElementById('seed-phrase'));
        this.setState({ successSnackbar: true }, () => {
            setTimeout(() => {
                this.setState({ successSnackbar: false });
            }, snackbarDuration)
        });
    }

    handleRecaptchaChange = (recaptchaToken) => {
        debugLog('handleRecaptchaChange()', recaptchaToken)
        this.setState({ recaptchaToken })
    }

    handleOnSubmit = (e) => {
        this.handleVerifyPhrase();
        e.preventDefault();
    }

    render() {
        // TODO: store recovery methods for only active account in recoveryMethods reducer
        const recoveryMethods = this.props.recoveryMethods && this.props.recoveryMethods[this.props.accountId]
        const hasSeedPhraseRecovery = recoveryMethods && recoveryMethods.filter(m => m.kind === 'phrase').length > 0
        return (
            <Translate>
                {({ translate }) => (
                    <Fragment>
                        <Route
                            exact
                            path={`/setup-seed-phrase/:accountId/phrase`}
                            render={() => (
                                <Container className='small-centered'>
                                    <h1><Translate id='setupSeedPhrase.pageTitle'/></h1>
                                    <h2><Translate id='setupSeedPhrase.pageText'/></h2>
                                    <SetupSeedPhraseForm
                                        seedPhrase={this.state.seedPhrase}
                                        handleCopyPhrase={this.handleCopyPhrase}
                                        hasSeedPhraseRecovery={hasSeedPhraseRecovery}
                                    />
                                </Container>
                            )}
                        />
                        <Route
                            exact
                            path={`/setup-seed-phrase/:accountId/verify`}
                            render={() => (
                                <Container className='small-centered'>
                                    <form
                                        onSubmit={this.handleOnSubmit}
                                        autoComplete='off'
                                    >
                                        <h1><Translate id='setupSeedPhraseVerify.pageTitle'/></h1>
                                        <h2><Translate id='setupSeedPhraseVerify.pageText'/></h2>
                                        <SetupSeedPhraseVerify
                                            enterWord={this.state.enterWord}
                                            wordId={this.state.wordId}
                                            handleChangeWord={this.handleChangeWord}
                                            handleStartOver={this.handleStartOver}
                                            mainLoader={this.props.mainLoader || this.state.submitting}
                                            localAlert={this.state.localAlert}
                                            globalAlert={this.props.globalAlert}
                                            onRecaptchaChange={this.handleRecaptchaChange}
                                            ref={(ref) => this.recaptchaRef = ref}
                                            isNewAccount={this.state.isNewAccount}
                                            onSubmit={this.handleOnSubmit}
                                        />
                                    </form>
                                </Container>
                            )}
                        />
                        <Snackbar
                            theme='success'
                            message={translate('setupSeedPhrase.snackbarCopySuccess')}
                            show={this.state.successSnackbar}
                            onHide={() => this.setState({ successSnackbar: false })}
                        />
                    </Fragment>
                )}
            </Translate>
        )
    }
}

const mapDispatchToProps = {
    clearGlobalAlert,
    handleAddAccessKeySeedPhrase,
    refreshAccount,
    checkIsNew,
    handleCreateAccountWithSeedPhrase,
    fundCreateAccount,
    loadRecoveryMethods,
    showCustomAlert
}

const mapStateToProps = ({ account, recoveryMethods }, { statusMain }, { match }) => ({
    ...account,
    verify: match.params.verify,
    accountId: match.params.accountId,
    activeAccountId: account?.accountId,
    recoveryMethods,
    mainLoader: statusMain?.mainLoader
})

export const SetupSeedPhraseWithRouter = connectAccount(mapStateToProps, mapDispatchToProps)(withRouter(SetupSeedPhrase))

import { ConnectedRouter } from 'connected-react-router';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';
import { Redirect, Route, Switch } from 'react-router-dom';
import styled, { ThemeProvider } from 'styled-components';

import * as accountActions from '../actions/account';
import { setIsMobile } from '../actions/status';
import TwoFactorVerifyModal from '../components/accounts/two_factor/TwoFactorVerifyModal';
import { Mixpanel } from "../mixpanel/index";
import translations_en from '../translations/en.global.json';
import translations_pt from '../translations/pt.global.json';
import translations_ru from '../translations/ru.global.json';
import translations_vi from '../translations/vi.global.json';
import translations_zh_hans from '../translations/zh-hans.global.json';
import translations_zh_hant from '../translations/zh-hant.global.json';
import { handleClearAlert } from '../utils/alerts';
import classNames from '../utils/classNames';
import getBrowserLocale from '../utils/getBrowserLocale';
import isMobile from '../utils/isMobile';
import { getAccountIsInactive, removeAccountIsInactive, setAccountIsInactive } from '../utils/localStorage';
import { reportUiActiveMixpanelThrottled } from '../utils/reportUiActiveMixpanelThrottled';
import ScrollToTop from '../utils/ScrollToTop';
import { IS_MAINNET, SHOW_PRERELEASE_WARNING, WALLET_CREATE_NEW_ACCOUNT_FLOW_URLS } from '../utils/wallet';
import { AuthorizedAppsWithRouter, FullAccessKeysWithRouter } from './access-keys/AccessKeys';
import { AutoImport } from './accounts/auto_import/AutoImport';
import { ActivateAccountWithRouter } from './accounts/create/ActivateAccount';
import { CreateAccountWithRouter } from './accounts/CreateAccount';
import LedgerConfirmActionModal from './accounts/ledger/LedgerConfirmActionModal';
import { SetupLedgerWithRouter } from './accounts/ledger/SetupLedger';
import { SetupLedgerSuccessWithRouter } from './accounts/ledger/SetupLedgerSuccess';
import { SignInLedger } from './accounts/ledger/SignInLedger';
import { LinkdropLandingWithRouter } from './accounts/LinkdropLanding';
import { RecoverAccountWithRouter } from './accounts/RecoverAccount';
import { RecoverAccountSeedPhraseWithRouter } from './accounts/RecoverAccountSeedPhrase';
import { RecoverWithLinkWithRouter } from './accounts/RecoverWithLink';
import { SetupRecoveryMethodWithRouter } from './accounts/recovery_setup/SetupRecoveryMethod';
import { SetupImplicitWithRouter } from './accounts/SetupImplicit';
import { SetupImplicitSuccess } from './accounts/SetupImplicitSuccess';
import { SetupSeedPhraseWithRouter } from './accounts/SetupSeedPhrase';
import { EnableTwoFactor } from './accounts/two_factor/EnableTwoFactor';
import { BuyNear } from './buy/BuyNear';
import Footer from './common/Footer';
import GlobalAlert from './common/GlobalAlert';
import GuestLandingRoute from './common/GuestLandingRoute';
import NetworkBanner from './common/NetworkBanner';
import PrivateRoute from './common/PrivateRoute';
import PrivateRouteLimited from './common/PrivateRouteLimited';
import GlobalStyle from './GlobalStyle';
import { LoginWithRouter } from './login/Login';
import { LoginCliLoginSuccess } from './login/LoginCliLoginSuccess';
import Navigation from './navigation/Navigation';
import { Profile } from './profile/Profile';
import { ReceiveContainerWrapper } from './receive-money/ReceiveContainerWrapper';
import { ReceiveMoneyWithRouter } from './receive-money/ReceiveMoney';
import { SendContainer } from './send/SendContainer';
import { SendContainerWrapper } from './send/SendContainerWrapper';
import { SignWithRouter } from './sign/Sign';
import { StakingContainer } from './staking/StakingContainer';
import Terms from './terms/Terms';
import { Wallet } from './wallet/Wallet';

import '../index.css';

const  {
    getAccountHelperWalletState,
    handleClearUrl,
    handleRedirectUrl,
    handleRefreshUrl,
    promptTwoFactor,
    redirectTo,
    refreshAccount
} = accountActions;

const theme = {};

const PATH_PREFIX = process.env.PUBLIC_URL;

const Container = styled.div`
    min-height: 100vh;
    padding-bottom: 200px;
    padding-top: 75px;
    .main {
        padding-bottom: 200px;
    }

    @media (max-width: 991px) {
        .App {
            .main {
                padding-bottom: 0px;
            }
        }
    }

    &.network-banner {
        @media (max-width: 450px) {
            .alert-banner, .lockup-avail-transfer {
                margin-top: -35px;
            }
        }
    }
`;
class Routing extends Component {
    constructor(props) {
        super(props);

        this.state = {
            isInactiveAccount: null
        };

        const languages = [
            { name: "English", code: "en" },
            { name: "Português", code: "pt" },
            { name: "Русский", code: "ru" },
            { name: "Tiếng Việt", code: "vi" },
            { name: "简体中文", code: "zh-hans" },
            { name: "繁體中文", code: "zh-hant" }
        ];

        const browserLanguage = getBrowserLocale(languages.map(l => l.code));
        const activeLang = localStorage.getItem("languageCode") || browserLanguage || languages[0].code;

        this.props.initialize({
            languages,
            options: {
                defaultLanguage: 'en',
                onMissingTranslation: ({ defaultTranslation }) => defaultTranslation,
                renderToStaticMarkup: false,
                renderInnerHtml: true
            }
        });

        // TODO: Figure out how to load only necessary translations dynamically
        this.props.addTranslationForLanguage(translations_en, "en");
        this.props.addTranslationForLanguage(translations_pt, "pt");
        this.props.addTranslationForLanguage(translations_ru, "ru");
        this.props.addTranslationForLanguage(translations_zh_hans, "zh-hans");
        this.props.addTranslationForLanguage(translations_zh_hant, "zh-hant");
        this.props.addTranslationForLanguage(translations_vi, "vi");

        this.props.setActiveLanguage(activeLang);
        // this.addTranslationsForActiveLanguage(defaultLanguage)
    }

    componentDidMount = async () => {
        const {
            refreshAccount,
            handleRefreshUrl,
            history,
            handleRedirectUrl,
            handleClearUrl,
            router,
            setIsMobile
        } = this.props;

        handleRefreshUrl(router);
        refreshAccount();
        setIsMobile(isMobile());

        history.listen(async () => {
            handleRedirectUrl(this.props.router.location);
            handleClearUrl();
            if (!WALLET_CREATE_NEW_ACCOUNT_FLOW_URLS.find((path) => this.props.router.location.pathname.indexOf(path) > -1)) {
                await refreshAccount(true);
            }

            handleClearAlert();
        });
    }

    componentDidUpdate(prevProps) {
        const { activeLanguage, account, getAccountHelperWalletState } = this.props;

        if (prevProps.account.localStorage?.accountId !== account.localStorage?.accountId) {
            this.setState({ isInactiveAccount: getAccountIsInactive(`${account.accountId || account.localStorage?.accountId}`) });
        }

        if (prevProps.account.accountId !== account.accountId && account.accountId !== undefined) {
            getAccountHelperWalletState(account.accountId);
        }

        if (prevProps.account.accountHelperWalletState.isLoaded !== account.accountHelperWalletState.isLoaded) {
            const needsDeposit = account.accountHelperWalletState.fundedAccountNeedsDeposit;
            const accountId = account.accountId || account.localStorage?.accountId;

            this.setState({ isInactiveAccount: needsDeposit });

            if (!needsDeposit) {
                removeAccountIsInactive(accountId);
            } else {
                setAccountIsInactive(accountId);
            }
        }

        const prevLangCode = prevProps.activeLanguage && prevProps.activeLanguage.code;
        const curLangCode = activeLanguage && activeLanguage.code;
        const hasLanguageChanged = prevLangCode !== curLangCode;

        if (hasLanguageChanged) {
            // this.addTranslationsForActiveLanguage(curLangCode)
            localStorage.setItem("languageCode", curLangCode);
        }
    }

    // addTranslationsForActiveLanguage(activeLang) {
    //     import(`../translations/${activeLang}.global.json`).then(
    //         translations => {
    //             console.log(translations)
    //             this.props.addTranslationForLanguage(translations, activeLang);
    //         }
    //     );
    // }

    render() {
        const { search, query: { tab }, hash } = this.props.router.location;
        const { account } = this.props;
        const setTab = (nextTab) => {
            if (tab !== nextTab) {
                const destinationSearch = new URLSearchParams(search);

                if (nextTab) {
                    destinationSearch.set('tab', nextTab);
                } else {
                    destinationSearch.delete('tab');
                }

                // Ensure any `hash` value remains in the URL when we toggle tab
                this.props.history.push({ search: destinationSearch.toString(), hash });
            }
        };
        const { isInactiveAccount } = this.state;

        reportUiActiveMixpanelThrottled();

        return (
            <Container className={classNames(['App', {'network-banner': (!IS_MAINNET || SHOW_PRERELEASE_WARNING)}])} id='app-container'>
                <GlobalStyle />
                <ConnectedRouter basename={PATH_PREFIX} history={this.props.history}>
                    <ThemeProvider theme={theme}>
                        <ScrollToTop/>
                        <NetworkBanner
                            account={account}
                        />
                        <Navigation isInactiveAccount={isInactiveAccount}/>
                        <GlobalAlert/>
                        <LedgerConfirmActionModal/>
                        {
                            account.requestPending !== null &&
                            <TwoFactorVerifyModal
                                onClose={(verified, error) => {
                                    const { account, promptTwoFactor } = this.props;
                                    Mixpanel.track("2FA Modal Verify start");
                                    // requestPending will resolve (verified == true) or reject the Promise being awaited in the method that dispatched promptTwoFactor
                                    account.requestPending(verified, error);
                                    // clears requestPending and closes the modal
                                    promptTwoFactor(null);
                                    if (error) {
                                        // tracking error
                                        Mixpanel.track("2FA Modal Verify fail", {error: error.message});
                                    }
                                    if (verified) {
                                        Mixpanel.track("2FA Modal Verify finish");
                                    }
                                }}
                            />
                        }
                        <Switch>
                            <Redirect from="//*" to={{
                                pathname: '/*',
                                search: search
                            }} />
                            <GuestLandingRoute
                                exact
                                path='/'
                                render={(props) => isInactiveAccount ? <ActivateAccountWithRouter {...props}/> : <Wallet tab={tab} setTab={setTab} {...props} />}
                                accountFound={this.props.account.localStorage?.accountFound}
                            />
                            <Route
                                exact
                                path='/linkdrop/:fundingContract?/:fundingKey?'
                                component={LinkdropLandingWithRouter}
                            />
                            <Route
                                exact
                                path='/create/:fundingContract?/:fundingKey?'
                                component={CreateAccountWithRouter}
                            />
                            <Route
                                exact
                                path={'/create-from/:fundingAccountId'}
                                component={CreateAccountWithRouter}
                            />
                            <Route
                                exact
                                path='/set-recovery/:accountId/:fundingContract?/:fundingKey?'
                                component={SetupRecoveryMethodWithRouter}
                            />
                            <Route
                                exact
                                path='/setup-seed-phrase/:accountId/:step'
                                component={SetupSeedPhraseWithRouter}
                            />
                            <Route
                                exact
                                path='/fund-create-account/:accountId/:implicitAccountId/:recoveryMethod'
                                component={SetupImplicitWithRouter}
                            />
                            <Route
                                exact
                                path='/fund-create-account/success'
                                component={SetupImplicitSuccess}
                            />
                            <Route
                                exact
                                path='/setup-ledger/:accountId'
                                component={SetupLedgerWithRouter}
                            />
                            <PrivateRoute
                                exact
                                path='/setup-ledger-success'
                                component={SetupLedgerSuccessWithRouter}
                            />
                            <PrivateRoute
                                exact
                                path='/enable-two-factor'
                                component={EnableTwoFactor}
                            />
                            <Route
                                exact
                                path='/recover-account'
                                component={RecoverAccountWithRouter}
                            />
                            <Route
                                exact
                                path='/recover-seed-phrase/:accountId?/:seedPhrase?'
                                component={RecoverAccountSeedPhraseWithRouter}
                            />
                            <Route
                                exact
                                path='/recover-with-link/:accountId?/:seedPhrase?'
                                component={RecoverWithLinkWithRouter}
                            />
                            <Route
                                exact
                                path='/auto-import-seed-phrase'
                                component={AutoImport}
                            />
                            <Route
                                exact
                                path='/sign-in-ledger'
                                component={SignInLedger}
                            />
                            <PrivateRouteLimited
                                path='/login'
                                component={LoginWithRouter}
                            />
                            <PrivateRouteLimited
                                exact
                                path='/authorized-apps'
                                component={AuthorizedAppsWithRouter}
                            />
                            <PrivateRouteLimited
                                exact
                                path='/full-access-keys'
                                component={FullAccessKeysWithRouter}
                            />
                            {!isInactiveAccount &&
                                <PrivateRouteLimited
                                    exact
                                    path='/send-money/new/:accountId?'
                                    component={SendContainerWrapper}
                                />
                            }
                            <PrivateRouteLimited
                                exact
                                path='/receive-money/new'
                                component={ReceiveContainerWrapper}
                            />
                            {!isInactiveAccount &&
                                <PrivateRouteLimited
                                    exact
                                    path='/send-money/:id?'
                                    component={SendContainer}
                                />
                            }
                            <PrivateRouteLimited
                                exact
                                path='/receive-money'
                                component={ReceiveMoneyWithRouter}
                            />
                            <PrivateRouteLimited
                                exact
                                path='/buy'
                                component={BuyNear}
                            />
                            <Route
                                exact
                                path='/profile/:accountId'
                                component={Profile}
                            />
                            {!isInactiveAccount &&
                                <PrivateRouteLimited
                                    exact
                                    path='/profile/:accountId?'
                                    component={Profile}
                                />
                            }
                            <PrivateRouteLimited
                                exact
                                path='/sign'
                                component={SignWithRouter}
                            />
                            {!isInactiveAccount &&
                                <PrivateRouteLimited
                                    path='/staking'
                                    component={StakingContainer}
                                    render={() => (
                                        <StakingContainer
                                            history={this.props.history}
                                        />
                                    )}
                                />
                            }
                            <Route
                                exact
                                path='/cli-login-success'
                                component={LoginCliLoginSuccess}
                            />
                            <Route
                                exact
                                path='/terms'
                                component={Terms}
                            />
                            <PrivateRouteLimited
                                component={isInactiveAccount ? ActivateAccountWithRouter : Wallet}
                            />
                        </Switch>
                        <Footer />
                    </ThemeProvider>
                </ConnectedRouter>
            </Container>
        );
    }
}

Routing.propTypes = {
    history: PropTypes.object.isRequired
};

const mapDispatchToProps = {
    refreshAccount,
    handleRefreshUrl,
    handleRedirectUrl,
    handleClearUrl,
    promptTwoFactor,
    redirectTo,
    getAccountHelperWalletState,
    setIsMobile
};

const mapStateToProps = ({ account, router }) => ({
    account,
    router
});

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(withLocalize(Routing));

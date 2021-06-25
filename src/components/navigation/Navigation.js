import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import { switchAccount, getAvailableAccountsBalance, getAccountBalance, getBalance } from '../../redux/actions/account';
import DesktopContainer from './DesktopContainer';
import MobileContainer from './MobileContainer';
import styled from 'styled-components';
import connectAccount from '../../redux/connectAccount';

const Container = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    @media (max-width: 991px) {
        bottom: ${props => props.open ? '0' : 'unset'};
    }

    h6 {
        font-size: 13px !important;
        margin-bottom: 10px !important;
        color: #72727A;
        font-weight: normal !important;
    }
`
class Navigation extends Component {

    state = {
        menuOpen: false
    }

    componentDidUpdate(prevState) {

        const { menuOpen } = this.state;

        if (menuOpen !== prevState.menuOpen) {
            if (menuOpen) {
                document.addEventListener('keydown', this.handleKeyDown);
                document.addEventListener('click', this.handleClick);
            } else {
                document.removeEventListener('keydown', this.handleKeyDown);
                document.removeEventListener('click', this.handleClick);
            }
        }
    }

    handleKeyDown = (e) => {
        if (e.keyCode === 27) {
            this.setState({ menuOpen: false });
        }
    }

    handleClick = (e) => {
        const desktopMenu = document.getElementById('desktop-menu');
        const mobileMenu = document.getElementById('mobile-menu');

        if (e.target.tagName === 'SPAN') {
            return false
        }

        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || (!desktopMenu.contains(e.target) && !mobileMenu.contains(e.target))) {
            this.setState({ menuOpen: false });
        }
    }

    get showNavLinks() {
        return this.props.account?.localStorage?.accountFound
    }

    toggleMenu = () => {
        if (!this.state.menuOpen) {
            this.props.getAvailableAccountsBalance()
        }

        this.setState(prevState => ({
            menuOpen: !prevState.menuOpen
        }));
    }

    handleSelectAccount = accountId => {
        this.props.switchAccount(accountId)
        this.setState({ menuOpen: false });
    }

    render() {
        const { menuOpen } = this.state;
        const { flowLimitation } = this.props

        return (
            <Container id='nav-container' open={menuOpen}>
                <DesktopContainer
                    menuOpen={menuOpen}
                    toggleMenu={this.toggleMenu}
                    selectAccount={this.handleSelectAccount}
                    showNavLinks={this.showNavLinks}
                    flowLimitation={flowLimitation}
                    refreshBalance={this.props.getAccountBalance}
                    getBalance={this.props.getBalance}
                    {...this.props}
                />
                <MobileContainer
                    menuOpen={menuOpen}
                    toggleMenu={this.toggleMenu}
                    selectAccount={this.handleSelectAccount}
                    showNavLinks={this.showNavLinks}
                    flowLimitation={flowLimitation}
                    refreshBalance={this.props.getAccountBalance}
                    getBalance={this.props.getBalance}
                    {...this.props}
                />
            </Container>
        )
    }
}

const mapStateToProps = ({ account, availableAccounts, flowLimitation }, { router }) => ({
    account,
    availableAccounts,
    router,
    flowLimitation
})

const mapDispatchToProps = {
    switchAccount,
    getAvailableAccountsBalance,
    getAccountBalance,
    getBalance
}

export default connectAccount(
    mapStateToProps,
    mapDispatchToProps
)(withRouter(Navigation))

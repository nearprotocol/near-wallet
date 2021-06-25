import React, { Component } from 'react';
import styled from 'styled-components';
import languagesIcon from '../../images/icon-languages.svg';
import Logo from './Logo';
import NavLinks from './NavLinks';
import UserAccount from './UserAccount';
import DesktopMenu from './DesktopMenu';
import LanguageToggle from '../common/LangSwitcher';

const Container = styled.div`
    display: none;
    color: white;
    position: relative;
    font-size: 14px;
    margin-bottom: 20px;
    padding: 0 15px;
    border-bottom: 1px solid #F0F0F1;

    @media (min-width: 992px) {
        display: flex;
    }

    background-color: white;
    height: 70px;
    align-items: center;

    img {
        width: 180px;
    }

    .click-outside {
        position: relative;
    }

    .divider {
        height: 35px;
        width: 2px;
        background-color: #E5E5E6;
        margin: 0 20px;
    }
`


const Lang = styled.div`
    margin-left: auto;
    position: relative;

    &:after {
        content: '';
        border-color: #72727A;
        border-style: solid;
        border-width: 2px 2px 0 0;
        display: inline-block;
        position: absolute;
        right: 10px;
        top: calc(50% - 10px);
        transform: rotate(135deg) translateY(-50%);
        height: 9px;
        width: 9px;
    }

    &:last-child {
        margin-right: 15px;
    }

    .lang-selector {
        appearance: none;
        background: transparent url(${languagesIcon}) no-repeat 5px center / 20px 20px;
        border: 0;
        cursor: pointer;
        font-size: 16px;
        height: 32px;
        outline: none;
        padding-right: 54px;
        position: relative;
        user-select: none;
        width: 54px;
        z-index: 1;

        &::-ms-expand {
            display: none;
        }
    }
`

class DesktopContainer extends Component {
    render() {

        const {
            account,
            menuOpen,
            toggleMenu,
            availableAccounts,
            selectAccount,
            showNavLinks,
            flowLimitation,
            refreshBalance,
            getBalance
        } = this.props

        return (
            <Container>
                <Logo link={!flowLimitation?.mainMenu} />
                {showNavLinks && !flowLimitation?.mainMenu &&
                    <NavLinks />
                }
                <Lang>
                    <LanguageToggle />
                </Lang>
                {showNavLinks &&
                    <>
                        <div className='divider'/>
                        <UserAccount
                            accountId={account.accountId || account.localStorage?.accountId}
                            onClick={toggleMenu}
                            flowLimitation={flowLimitation}
                        />
                        <DesktopMenu
                            show={menuOpen}
                            toggleMenu={toggleMenu}
                            accountId={account.accountId}
                            accountIdLocalStorage={account.localStorage?.accountId}
                            accounts={availableAccounts}
                            selectAccount={selectAccount}
                            accountsBalance={account.accountsBalance}
                            balance={account.balance}
                            refreshBalance={refreshBalance}
                            getBalance={getBalance}
                        />
                    </>
                }
            </Container>
        )
    }
}

export default DesktopContainer

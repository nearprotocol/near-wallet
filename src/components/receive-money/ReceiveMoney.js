import React, { Component } from 'react';
import { withRouter } from 'react-router-dom';
import styled from 'styled-components';
import ProfileQRCode from '../profile/ProfileQRCode';
import Divider from '../common/Divider';
import { Translate } from 'react-localize-redux';
import {Snackbar, snackbarDuration } from '../common/Snackbar';
import copyText from '../../utils/copyText';
import isMobile from '../../utils/isMobile';
import iconShare from '../../images/icon-share-blue.svg';
import { Mixpanel } from '../../mixpanel/index';
import connectAccount from '../../redux/connectAccount';

const Container = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    max-width: 450px;
    text-align: center;
    margin: 0 auto;
    color: #25282A;
    padding: 20px 0 40px 0;

    .divider-container {
        margin: 25px 0;
    }

    .qr-code-container {
        margin-top: 25px;
        max-width: 250px;
    }

    @media (min-width: 768px) {
        padding: 30px 0 40px 0;

        .divider-container {
            margin: 35px 0;
        }

        .qr-code-container {
            margin-top: 35px;
        }

    }

    h1 {
        align-self: center;
        margin: 0;
    }
`

const Address = styled.div`
    border: 1px solid #e6e6e6;
    border-radius: 4px;
    position: relative;
    width: 100%;
    font-size: 22px;
    word-break: break-all;
    margin-top: 25px;
    position: relative;
    background-color: white;
    overflow: hidden;
    padding: 15px 75px;
    min-height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: normal;

    @media (min-width: 768px) {
        margin-top: 35px;
        font-size: 28px;
    }
`

const CopyAddress = styled.div`
    color: #0072CE;
    font-size: 16px;
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    margin: 0;
    cursor: pointer;
    background-color: #f8f8f8;
    border-radius: 4px;
    padding: 6px 10px;
`

const UrlAddress = styled.div`
    position: absolute;
    z-index: -1;
    text-transform: initial;
`

const MobileShare = styled.div`
    background: url(${iconShare}) center no-repeat;
    position: absolute;
    right: 10px;
    top: 50%;
    transform: translateY(-50%);
    margin: 0;
    background-color: #f8f8f8;
    height: 40px;
    width: 40px;
    border-radius: 4px;
`

class ReceiveMoney extends Component {
    constructor(props) {
        super(props);
        this.urlRef = React.createRef();

        this.state = {
            successSnackbar: false,
        };
    }

    handleCopyAddress = () => {
        Mixpanel.track("RECEIVE Copy account address")
        if (navigator.share && isMobile()) {
            navigator.share({
                url: this.props.account.accountId
            }).catch(err => {
                console.log(err.message);
            });
        } else {
            this.handleCopyDesktop();
        }
    }

    handleCopyDesktop = () => {
        copyText(this.urlRef.current);
        this.setState({ successSnackbar: true }, () => {
            setTimeout(() => {
                this.setState({ successSnackbar: false });
            }, snackbarDuration)
        });
    }

    render() {

        const {
            successSnackbar
        } = this.state;

        const {
            account
        } = this.props

        const accountId = account?.accountId || account.localStorage?.accountId

        return (
            <Translate>
                {({ translate }) => (
                    <div className='ui container'>
                        <Container>
                            <h1>{translate('receivePage.addressTitle')}</h1>
                            <Address onClick={this.handleCopyAddress}>
                                {accountId}
                                <UrlAddress ref={this.urlRef}>
                                    {accountId}
                                </UrlAddress>
                                {navigator.share && isMobile() ? (
                                    <MobileShare/>
                                ) : (
                                    <CopyAddress title={translate('receivePage.copyAddressLinkLong')}>
                                        {translate('receivePage.copyAddressLinkShort')}
                                    </CopyAddress>
                                )}
                            </Address>
                            <Divider/>
                            <h1>
                                {translate('receivePage.qrCodeTitle')}
                            </h1>
                            <ProfileQRCode accountId={accountId}/>
                        </Container>
                        <Snackbar
                            theme='success'
                            message={translate('receivePage.snackbarCopySuccess')}
                            show={successSnackbar}
                            onHide={() => this.setState({ successSnackbar: false })}
                        />
                    </div>
                )}
            </Translate>
        )
    }
}

const mapStateToProps = ({ account }) => ({
   account
})

export const ReceiveMoneyWithRouter = connectAccount(
   mapStateToProps
)(withRouter(ReceiveMoney))

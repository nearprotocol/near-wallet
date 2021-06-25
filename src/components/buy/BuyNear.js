import React, { useState, useEffect } from 'react'
import styled from 'styled-components'
import Container from '../common/styled/Container.css'
import { Translate } from 'react-localize-redux'
import FormButton from '../common/FormButton'
import ArrowIcon from '../svg/ArrowIcon'
import MoonPayIcon from '../svg/MoonPayIcon'
import BinanceLogo from '../../images/binance-logo.svg'
import HuobiLogo from '../../images/huobi-logo.svg'
import OkexLogo from '../../images/okex-logo.svg'
import GateLogo from '../../images/gate-io-logo.svg'
import { isMoonpayAvailable, getSignedUrl } from '../../utils/moonpay'
import { Mixpanel } from '../../mixpanel'
import { useSelector } from '../../redux/useSelector'

const StyledContainer = styled(Container)`
    position: relative;

    button {
        display: block !important;

        svg {
            width: initial !important;
            height: initial !important;
            margin: initial !important;
        }

        &.go-back {
            position: absolute;
            top: 0;
            left: -13px;
            min-height: 42px !important;
            height: 42px !important;
            min-width: 42px !important;
            width: 42px !important;
            border-radius: 50% !important;

            :hover {
                background-color: #eeefee !important;
            }

            @media (max-width: 991px) {
                top: -9px;
                left: 1px;
            }
        }

        &.learn-more {
            font-size: 14px !important;
            font-weight: 400 !important;
            text-decoration: none !important;
            margin-top: 10px !important;

            :hover {
                text-decoration: underline !important;
            }
        }

        &.black {
            width: 100% !important;
            height: 54px !important;
            display: flex !important;
            align-items: center;
            justify-content: center;
            border-radius: 8px !important;
            border: 0 !important;

            svg {
                margin-left: 10px !important;
            }
        }
    }

    h3 {
        margin-top: 50px;
    }

    h4 {
        text-align: center;
        font-weight: 900;
    }

    .desc {
        margin-top: 15px;
    }

    .exchanges {
        grid-gap: 15px;
        grid-template-columns: repeat(2,minmax(0, 1fr));
        display: grid;
        margin-top: 30px;

        a {
            border: 2px solid #F5F5F3;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: 100ms;
            min-height: 240px;

            @media (max-width: 500px) {
                min-height: 200px;
                img {
                    transform: scale(0.7);
                }
            }

            @media (max-width: 380px) {
                min-height: 164px;
            }
    
            :hover {
                border-color: #8FCDFF;
                background-color: #F0F9FF;
            }
        }
    }

    .see-more {
        margin-top: 30px;
    }
`

export function BuyNear({ match, location, history }) {
    const { accountId } = useSelector(({ account }) => account);
    const [moonPayAvailable, setMoonPayAvailable] = useState(null);
    const [signedMoonPayUrl, setSignedMoonPayUrl] = useState(null);

    useEffect(() => {
        checkMoonPay()
    }, [])

    const checkMoonPay = async () => {
        await Mixpanel.withTracking("Wallet Check Moonpay available", 
            async () => {
                const moonPay = await isMoonpayAvailable()
                if (moonPay) {
                    const url = await getSignedUrl(accountId, window.location.origin)
                    setMoonPayAvailable(moonPay)
                    setSignedMoonPayUrl(url)
                }
            },
            (e) => console.warn('Error checking Moonpay', e)
        )
    }

    return (
        <StyledContainer className='small-centered'>
            <FormButton
                color='link go-back'
                onClick={() => history.goBack()}
            >
                <ArrowIcon/>
            </FormButton>
            <h4><Translate id='buyNear.title' /></h4>
            {moonPayAvailable &&
                <>
                    <h3><Translate id='buyNear.moonPay' /></h3>
                    <div className='desc'><Translate id='buyNear.descOne' /></div>
                    <FormButton
                        color='link learn-more'
                        linkTo='https://support.moonpay.com/'
                    >
                        <Translate id='button.learnMore' />
                    </FormButton>
                    <FormButton
                        color='black'
                        disabled={!moonPayAvailable}
                        linkTo={signedMoonPayUrl}
                        onClick={() => Mixpanel.track("Wallet Click Buy with Moonpay")}
                    >
                        <Translate id='buyNear.buyWith' />
                        <MoonPayIcon/>
                    </FormButton>
                </>   
            }
            <h3><Translate id='buyNear.supportedExchanges' /></h3>
            <div className='desc'><Translate id='buyNear.descTwo' /></div>
            <div className='exchanges'>
                <a href='https://www.binance.com/' target='_blank' rel='noreferrer'>
                    <img src={BinanceLogo} alt='BINANCE'/>
                </a>
                <a href='https://www.huobi.com/' target='_blank' rel='noreferrer'>
                    <img src={HuobiLogo} alt='HUOBI'/>
                </a>
                <a href='https://www.okex.com/' target='_blank' rel='noreferrer'>
                    <img src={OkexLogo} alt='OKEX'/>
                </a>
                <a href='https://www.gate.io/' target='_blank' rel='noreferrer'>
                    <img src={GateLogo} alt='GATE'/>
                </a>
            </div>
            <div className='see-more'>
                <Translate id='buyNear.seeMore' /> <a href='https://coinmarketcap.com/currencies/near-protocol/markets/' target='_blank' rel='noreferrer'><Translate id='buyNear.coinMarketCap' /></a>
            </div>
        </StyledContainer>
    )
}
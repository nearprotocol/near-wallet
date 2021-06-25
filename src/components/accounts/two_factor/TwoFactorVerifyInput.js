import React from 'react';
import styled from 'styled-components';
import { Translate } from 'react-localize-redux';

const Container = styled.div`
    max-width: 350px;
    width: 100%;
    margin: 40px 0;

    .color-black {
        font-weight: 500;
    }

    div {
        :last-of-type {
            font-weight: 300;
            margin-top: 10px;

            span {
                margin-left: 3px;
            }
        }
    }

    .color-blue {
        &:hover {
            text-decoration: underline;
            cursor: pointer;
        }
    }
`

const TwoFactorVerifyInput = ({
    onChange,
    onResend,
    code,
    account,
    resendCode,
    status
}) => {

    return (
        <Container>
            <div className='color-black font-bw'><Translate id='twoFactor.verify.inputLabel'/></div>
            <Translate>
                {({ translate }) => (
                    <>
                        <input
                            type='number'
                            pattern='[0-9]*'
                            inputMode='numeric'
                            placeholder={translate('setRecoveryConfirm.inputPlaceholder')}
                            aria-label={translate('setRecoveryConfirm.inputPlaceholder')}
                            value={code}
                            onChange={e => onChange(e.target.value)}
                            autoFocus={true}
                        />
                        {status?.localAlert && status.localAlert.messageCode === 'reduxActions.VERIFY_TWO_FACTOR.error' && code.length > 0 &&
                            <div style={{color: '#ff585d', marginTop: '5px'}}>
                                {translate('setRecoveryConfirm.invalidCode')}
                            </div>
                        }
                    </>
                )}
            </Translate>
            <div onClick={!resendCode ? onResend : null}>
                <Translate id='twoFactor.verify.didntReceive'/>
                {!resendCode && <span className='color-blue'><Translate id='twoFactor.verify.resend'/></span>}
                {resendCode === 'resending' && <span><Translate id='twoFactor.verify.resending'/></span>}
                {resendCode === 'resent' && <span className='color-green'><Translate id='twoFactor.verify.resent'/></span>}
            </div>
        </Container>
    )
}

export default TwoFactorVerifyInput;
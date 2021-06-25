import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useDispatch } from 'react-redux';
import Modal from "../../common/modal/Modal";
import ModalTheme from '../ledger/ModalTheme';
import FormButton from '../../common/FormButton';
import { Translate } from 'react-localize-redux';
import TwoFactorVerifyInput from './TwoFactorVerifyInput';
import { WalletError } from '../../../utils/walletError'
import { resendTwoFactor, get2faMethod } from '../../../redux/actions/account';
import { actionsPending } from '../../../utils/alerts';
import { Mixpanel } from "../../../mixpanel/index"
import { useSelector } from '../../../redux/useSelector';

const Form = styled.form`
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
`

const TwoFactorVerifyModal = ({ open, onClose }) => {

    const [method, setMethod] = useState();
    const [code, setCode] = useState('');
    const [resendCode, setResendCode] = useState();
    const dispatch = useDispatch();
    const account = useSelector(({ account }) => account);
    const status = useSelector(({ status }) => status);
    const loading = actionsPending('VERIFY_TWO_FACTOR');

    useEffect(() => {
        let isMounted = true;

        const handleGetTwoFactor = async () => {
            setMethod(await dispatch(get2faMethod()))
        };

        if (isMounted) {
            handleGetTwoFactor()
        }
        
        return () => { isMounted = false }
    }, []);

    const handleVerifyCode = async () => {
        if (code.length === 6 && !loading) {
            onClose(code)
        }
    }

    const handleChange = (code) => {
        setCode(code);
    }

    const handleResendCode = async () => {
        setResendCode('resending')
        await Mixpanel.withTracking("2FA Modal Resend code", 
            async () => await dispatch(resendTwoFactor()),
            (e) => {
                setResendCode()
                throw e
            },
            () => {
                setResendCode('resent')
                setTimeout(() => { setResendCode() }, 3000)
            }
        )
    }
    
    const handleCancelClose = () => {
        Mixpanel.track("2FA Modal Cancel verification")
        onClose(false, new WalletError('Request was cancelled.', 'promptTwoFactor.userCancelled'))
    }
    
    return (
        <Modal
            id='two-factor-verify-modal'
            isOpen={open}
            onClose={handleCancelClose}
            closeButton='desktop'
        >
            <ModalTheme/>
            <h2><Translate id='twoFactor.verify.title'/></h2>
            <p className='font-bw'><Translate id='twoFactor.verify.desc'/></p>
            <p className='color-black font-bw' style={{ marginTop: '-10px', fontWeight: '500', height: '19px'}}>{method && method.detail}</p>
            <Form onSubmit={e => {handleVerifyCode(); e.preventDefault();}}>
                <TwoFactorVerifyInput
                    code={code}
                    onChange={handleChange}
                    onResend={handleResendCode}
                    account={account}
                    status={status}
                    resendCode={resendCode}
                />
                <FormButton type='submit' disabled={code.length !== 6 || loading} sending={loading}>
                    <Translate id='button.verifyCode'/>
                </FormButton>
            </Form>
            <button onClick={handleCancelClose} className='link color-red'><Translate id='button.cancel'/></button>
        </Modal>
    );
}

export default TwoFactorVerifyModal;
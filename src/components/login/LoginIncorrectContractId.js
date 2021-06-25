import React, { useEffect } from 'react'
import { useDispatch } from 'react-redux';

import MobileContainer from '../sign/MobileContainer'
import FormButton from '../common/FormButton'
import { showCustomAlert } from '../../redux/actions/status'

const LoginIncorrectContractId = ({ contractId, failureUrl }) => {
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(showCustomAlert({
            success: false,
            messageCode: 'account.login.incorrectContractId.error',
            data: {
                contractId
            }
        }))
    }, []);
    
    return (
        <MobileContainer>
            <div />
            <div className='return-to-app'>
                <FormButton
                    color='blue'
                    onClick={() => window.location.href = failureUrl}
                >
                    RETURN TO APP
                </FormButton>
            </div>
        </MobileContainer>
    )
}

export default LoginIncorrectContractId

import React, { useState } from 'react';
import { Translate } from 'react-localize-redux';
import styled from 'styled-components';

import classNames from '../../../utils/classNames';
import InputAccountId from './InputAccountId';

const StyledContainer = styled.div`
    background-color: #FAFAFA;
    border: 2px solid #FAFAFA;
    display: flex;
    border-radius: 8px;
    transition: 100ms;
    color: #272729;
    font-weight: 600;
    white-space: nowrap;
    align-items: center;
    padding-left: 15px;
    margin-top: 50px;
    overflow-x: hidden;

    &.focus {
        border-color: #0072ce;
        background-color: white;
        box-shadow: 0 0 0 2pt #C8E3FC;
    }

    &.problem {
        border: 2px solid #ff585d;
        background-color: white;

        &.focus {
            box-shadow: 0px 0px 0px 2pt #FFBDBE;
        }
    }

    &.success {
        border: 2px solid #00C08B;
        background-color: white;

        &.focus {
            box-shadow: 0px 0px 0px 2pt #c5ffef;
        }
    }
`;

const ReceiverInputWithLabel = ({
    receiverId,
    handleChangeReceiverId,
    checkAccountAvailable,
    localAlert,
    clearLocalAlert,
    inputError,
    autoFocus
}) => {

    const [inputHasFocus, setInputHasFocus] = useState(false);
    const success = localAlert?.success;
    const problem = !localAlert?.success && localAlert?.show;

    // TODO: Add remaining error style text

    return (
        <StyledContainer className={classNames([{ 'success': success }, { 'problem': problem }, { 'focus': inputHasFocus }])}>
            <Translate id='sendV2.selectReceiver.receiverInputLabel' />
            <InputAccountId
                accountId={receiverId}
                handleChange={handleChangeReceiverId}
                ReceiverInputWithLabel={ReceiverInputWithLabel}
                checkAvailability={checkAccountAvailable}
                localAlert={localAlert}
                clearLocalAlert={clearLocalAlert}
                onFocus={() => setInputHasFocus(true)}
                onBlur={() => setInputHasFocus(false)}
                autoFocus={!receiverId && autoFocus}
                success={success}
                problem={problem}
            />  
        </StyledContainer>
    );
};

export default ReceiverInputWithLabel;
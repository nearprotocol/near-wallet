import React from 'react';
import { Translate } from 'react-localize-redux';
import styled from 'styled-components';

import ClickToCopy from '../../common/ClickToCopy';
import CopyIcon from '../../svg/CopyIcon';

const StyledContainer = styled.div`
    background-color: #FAFAFA;
    color: #72727A;
    padding: 15px;
    border-radius: 8px;

    .top {
        display: flex;
        align-items: center;
        justify-content: space-between;

        .copy-account-id {
            display: flex;
            align-items: center;
            font-size: 12px;
            color: #0072CE;

            svg {
                margin-right: 4px;
                width: 16px;

                path {
                    stroke: #0072CE;
                }
            }
        }
    }

    .bottom {
        color: black;
        font-weight: 600;
        background-color: #F0F0F1;
        border-radius: 8px;
        padding: 15px;
        font-size: 16px;
        margin-top: 10px;
        line-break: anywhere;
    }
`;

const AccountId = ({ accountId }) => {
    return (
        <StyledContainer>
            <div className='top'>
                <div><Translate id='input.accountId.title' /></div>
                <ClickToCopy
                    copy={accountId}
                    className='copy-account-id'
                >
                    <CopyIcon/>
                    <Translate id='copy.title' />
                </ClickToCopy>
            </div>
            <div className='bottom'>
                {accountId}
            </div>
        </StyledContainer>
    );
};

export default AccountId;
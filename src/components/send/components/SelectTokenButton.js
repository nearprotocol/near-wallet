import React from 'react';
import styled from 'styled-components';

import ChevronIcon from '../../svg/ChevronIcon';
import Token from './entry_types/Token';

const StyledContainer = styled.div`
    display: flex;
    align-items: center;
    padding: 15px;
    background-color: #FAFAFA;
    border-radius: 8px;
    cursor: pointer;
    transition: 100ms;

    :hover {
        background-color: #F0F0F1;
    }

    > div {
        width: 100%;
        padding: 0px;
        color: #272729;
        font-weight: 600;
    }

    svg {
        margin-left: 15px;
    }
`;

const SelectTokenButton = ({ token, onClick }) => {
    return (
        <StyledContainer onClick={onClick}>
            <Token
                translateIdTitle='sendV2.selectTokenButtonTitle'
                symbol={token.symbol}
                icon={token.icon}
            />
            <ChevronIcon color='#0072ce'/>
        </StyledContainer>
    );
};

export default SelectTokenButton;
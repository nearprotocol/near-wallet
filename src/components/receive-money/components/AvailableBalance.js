import React from 'react';
import styled from 'styled-components';

import Amount from '../../send/components/entry_types/Amount';

const StyledContainer = styled.div`
    background-color: #FAFAFA;
    border-radius: 8px;
`;

const AvailableBalance = ({ availableBalance }) => {
    return (
        <StyledContainer>
            <Amount
                amount={availableBalance}
                translateIdTitle='sendV2.TXEntry.title.availableBalance'
            />
        </StyledContainer>
    );
};

export default AvailableBalance;
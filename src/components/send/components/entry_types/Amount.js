import React from 'react';
import { Translate } from 'react-localize-redux';

import Tooltip from '../../../common/Tooltip';
import RawTokenAmount from '../RawTokenAmount';
import StyledContainer from './css/Style.css';


const Amount = ({ className, symbol, amount, decimals, translateIdTitle, translateIdInfoTooltip }) => {
    /* TODO: Handle long amounts */
    return (
        <StyledContainer className={className}>
            <Translate id={translateIdTitle} />
            {translateIdInfoTooltip &&
                <Tooltip translate={translateIdInfoTooltip}/>
            }
            <div className='amount'>
                <RawTokenAmount
                    symbol={symbol}
                    amount={amount}
                    decimals={decimals}
                />
            </div>
        </StyledContainer>
    );
};

export default Amount;
import React from 'react';

import Balance from '../../common/Balance';
import TokenAmount from '../../wallet/TokenAmount';

const RawTokenAmount = ({ symbol, amount, decimals, withSymbol = true }) => {
    if (decimals && symbol) {
        return (
            <TokenAmount 
                token={{ symbol, decimals, balance: amount }}
                withSymbol={withSymbol}
            />
        );
    } else {
        return <Balance amount={amount} symbol={withSymbol ? 'near' : false}/>;
    }
};

export default RawTokenAmount;
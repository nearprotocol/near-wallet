import React from 'react';
import { useSelector } from 'react-redux';

import ReceiveContainer from './ReceiveContainer';

export function ReceiveContainerWrapper() {
    const { accountId, balance } = useSelector(({ account }) => account);
    const availableBalance = balance?.available;

    //TODO: Add support for receiver in URL

    return (
        <ReceiveContainer
            accountId={accountId}
            availableBalance={availableBalance}
        />
    );
};
import React, { useState } from 'react';

import classNames from '../../../utils/classNames';
import Accordion from '../../common/Accordion';
import AccordionTrigger from './AccordionTrigger';
import Breakdown from './css/Breakdown.css';
import Amount from './entry_types/Amount';
import Token from './entry_types/Token';

const prefixTXEntryTitledId = (key) => `sendV2.TXEntry.title.${key}`;

const TransactionDetails = ({ selectedToken, estimatedFeesInNear, estimatedTotalInNear, amount, onTokenClick }) => {

    const [open, setOpen] = useState(false);

    return (
        <Breakdown className={classNames(['transaction-details-breakdown' , open ? 'open' : ''])}>
            <Token
                translateIdTitle={prefixTXEntryTitledId('token')}
                symbol={selectedToken.symbol}
                icon={selectedToken.icon}
                onClick={onTokenClick}
            />
            <Accordion
                trigger='transaction-details-breakdown'
                className='breakdown'
            >
                <Amount
                    /* Always show fees in NEAR */
                    translateIdTitle={prefixTXEntryTitledId('estimatedFees')}
                    amount={estimatedFeesInNear}
                    symbol='NEAR'
                    translateIdInfoTooltip='sendV2.translateIdInfoTooltip.estimatedFees'
                />
                {selectedToken.symbol === 'NEAR' ?
                    /* Show 'Estimated total' (amount + fees) when sending NEAR only */
                    <Amount
                        translateIdTitle={prefixTXEntryTitledId('estimatedTotal')}
                        amount={estimatedTotalInNear}
                        symbol='NEAR'
                        translateIdInfoTooltip='sendV2.translateIdInfoTooltip.estimatedTotal'
                    />
                    :
                    /* Show 'Amount' when sending non-NEAR token only */
                    <Amount
                        translateIdTitle={prefixTXEntryTitledId('amount')}
                        amount={amount}
                        symbol={selectedToken.symbol}
                        decimals={selectedToken.decimals}
                    />
                }
            </Accordion>
            <AccordionTrigger
                id='transaction-details-breakdown'
                translateIdTitle='sendV2.accordionTriggerTitle.transactionDetails'
                open={open}
                onClick={() => setOpen(!open)}
            />
        </Breakdown>
    );
};

export default TransactionDetails;
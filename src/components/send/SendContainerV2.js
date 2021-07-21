import BN from 'bn.js';
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

import classNames from '../../utils/classNames';
import isDecimalString from '../../utils/isDecimalString';
import Container from '../common/styled/Container.css';
import EnterAmount from './components/views/EnterAmount';
import EnterReceiver from './components/views/EnterReceiver';
import Review from './components/views/Review';
import SelectToken from './components/views/SelectToken';
import Success from './components/views/Success';

export const VIEWS = {
    ENTER_AMOUNT: 'enterAmount',
    SELECT_TOKEN: 'selectToken',
    ENTER_RECEIVER: 'enterReceiver',
    REVIEW: 'review',
    SUCCESS: 'success'
};

const StyledContainer = styled(Container)`
    &&& {
        .header {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #272729;
            font-weight: 600;
            font-size: 20px;
            line-break: anywhere;
    
            .back-arrow-button {
                position: absolute;
                left: 0;
            }
        }

        .buttons-bottom-buttons {
            margin-top: 55px;
    
            > button {
                display: block;
                width: 100%;
            }
    
            .link {
                display: block;
                margin: 20px auto;
            }
        }
    
        @media (max-width: 500px) {
            .buttons-bottom {
                display: flex;
                flex-direction: column;
                min-height: calc(100vh - 160px);
        
                .buttons-bottom-buttons {
                    margin-top: auto;
                }
            }

            &.showing-banner {
                .buttons-bottom {
                    min-height: calc(100vh - 218px);
                }
            }
        }
    }
`;

const SendContainerV2 = ({
    availableNearBalance,
    FTMethods,
    reservedNearForFees,
    availableNearToSend,
    redirectTo,
    fungibleTokens,
    checkAccountAvailable,
    localAlert,
    clearLocalAlert,
    accountId,
    showCustomAlert,
    isMobile,
    explorerUrl,
    showNetworkBanner,
    accountIdFromUrl
}) => {

    const [amount, setAmount] = useState('');
    const [estimatedTotalFees, setEstimatedTotalFees] = useState('0');
    const [estimatedTotalInNear, setEstimatedTotalInNear] = useState('0');
    const [parsedAmount, setParsedAmount] = useState('');
    const [receiverId, setReceiverId] = useState(accountIdFromUrl);
    const [transactionHash, setTransactionHash] = useState(null);
    const [activeView, setActiveView] = useState(VIEWS.ENTER_AMOUNT);
    const [maxAmount, setMaxAmount] = useState(null);
    const [sendingToken, setSendingToken] = useState(false);
    const [selectedToken, setSelectedToken] = useState(fungibleTokens[0]);

    useEffect(() => {
        // Initial render may not have NEAR available balance loaded yet
        // Anytime NEAR available balance changes, we update the state
        if (selectedToken.symbol === 'NEAR') {
            setSelectedToken(fungibleTokens[0]);
        }
    }, [availableNearBalance]);

    useEffect(() => window.scrollTo(0, 0), [activeView]);
    useEffect(() => setActiveView(VIEWS.ENTER_AMOUNT), [accountId]);

    const handleChangeAmount = (userInputAmount) => {
        // FIX: Add block when entering more than max decimals allowed
        setAmount(userInputAmount);
        setParsedAmount(FTMethods.getParsedTokenAmount(userInputAmount, selectedToken.symbol, selectedToken.decimals));
        setMaxAmount(false);
    };

    const handleSetMaxAmount = () => {
        const formattedTokenAmount = FTMethods.getFormattedTokenAmount(selectedToken.balance, selectedToken.symbol, selectedToken.decimals);

        if (!new BN(formattedTokenAmount).isZero()) {
            setMaxAmount(true);
            setAmount(formattedTokenAmount.replace(/,/g, ''));
            setParsedAmount(selectedToken.balance);
        }
    };

    const isValidAmount = () => {
        const parsedTokenAmount = FTMethods.getParsedTokenAmount(amount, selectedToken.symbol, selectedToken.decimals);

        if (maxAmount) {
            return true;
        }

        return !new BN(parsedTokenAmount).isZero() && new BN(parsedTokenAmount).lte(new BN(selectedToken.balance)) && isDecimalString(amount);
        // TODO: Handle rounding issue that can occur entering exact available amount
    };

    const handleContinueToEnterReceiver = () => {
        setActiveView(VIEWS.ENTER_RECEIVER);
    };

    const handleSelectToken = (token) => {
        setSelectedToken(token);
        setActiveView(VIEWS.ENTER_AMOUNT);
        setAmount('');
        setParsedAmount('');
        setMaxAmount(false);
    };

    const enterAmountIsComplete = () => {     
        return amount && !new BN(selectedToken.balance).isZero() && isValidAmount();
    };

    const handleContinueToReview = async () => {

        if (selectedToken.symbol === 'NEAR') {
            setEstimatedTotalFees(await FTMethods.getEstimatedTotalFees());
            setEstimatedTotalInNear(await FTMethods.getEstimatedTotalNearAmount(parsedAmount));
        } else {
            const totalFees = await FTMethods.getEstimatedTotalFees(selectedToken.contractName, receiverId);
            setEstimatedTotalFees(totalFees);
        }

        setActiveView(VIEWS.REVIEW);
    };

    const handleSendToken = async () => {
        setSendingToken(true);
        let result;

        try {
            result = await FTMethods.transfer({ 
                contractName: selectedToken.contractName,
                parsedAmount: parsedAmount,
                receiverId
            });
        } catch(e) {
            showCustomAlert({
                success: false,
                messageCodeHeader: 'error',
                messageCode: 'walletErrorCodes.sendFungibleToken.error',
                errorMessage: e.message,
            });
            setSendingToken('failed');
            return;
        }

        setActiveView(VIEWS.SUCCESS);
        setTransactionHash(result.transaction.hash);
    };

    const getCurrentViewComponent = (view) => {
        switch(view) {
            case 'enterAmount':
                return (
                    <EnterAmount
                        amount={amount}
                        onChangeAmount={handleChangeAmount}
                        onSetMaxAmaount={handleSetMaxAmount}
                        availableToSend={selectedToken.balance}
                        availableBalance={availableNearBalance}
                        reservedForFees={reservedNearForFees}
                        continueAllowed={enterAmountIsComplete()}
                        onContinue={handleContinueToEnterReceiver}
                        onClickCancel={() => redirectTo('/')}
                        selectedToken={selectedToken}
                        onClickSelectToken={() => setActiveView(VIEWS.SELECT_TOKEN)}
                        error={amount && amount !== '0' && !enterAmountIsComplete()}
                        isMobile={isMobile}
                    />
                );
            case 'selectToken':
                return (
                    <SelectToken
                        onClickGoBack={() => setActiveView(VIEWS.ENTER_AMOUNT)}
                        onSelectToken={handleSelectToken}
                        fungibleTokens={fungibleTokens}
                        availableNearToSend={availableNearToSend}
                    />
                );
            case 'enterReceiver':
                return (
                    <EnterReceiver
                        onClickGoBack={() => setActiveView(VIEWS.ENTER_AMOUNT)}
                        onClickCancel={() => redirectTo('/')}
                        amount={parsedAmount}
                        selectedToken={selectedToken}
                        handleChangeReceiverId={(receiverId) => setReceiverId(receiverId)}
                        receiverId={receiverId}
                        checkAccountAvailable={checkAccountAvailable}
                        localAlert={localAlert}
                        clearLocalAlert={clearLocalAlert}
                        onClickContinue={handleContinueToReview}
                        isMobile={isMobile}
                    />
                );
            case 'review':
                return (
                    <Review
                        onClickCancel={() => redirectTo('/')}
                        amount={parsedAmount}
                        selectedToken={selectedToken}
                        onClickContinue={handleSendToken}
                        senderId={accountId}
                        receiverId={receiverId}
                        estimatedFeesInNear={estimatedTotalFees}
                        sendingToken={sendingToken}
                        estimatedTotalInNear={estimatedTotalInNear}
                        onClickAmount={() => setActiveView(VIEWS.ENTER_AMOUNT)}
                        onClickReceiver={() => setActiveView(VIEWS.ENTER_RECEIVER)}
                        onClickSelectedToken={() => setActiveView(VIEWS.SELECT_TOKEN)}
                    />
                );
            case 'success':
                return (
                    <Success
                        tokenSymbol={selectedToken.symbol}
                        amount={amount}
                        receiverId={receiverId}
                        onClickContinue={() => redirectTo('/')}
                        onClickGoToExplorer={() => window.open(`${explorerUrl}/transactions/${transactionHash}`, '_blank')}
                    />
                );
        default:
            return null;
        }
    };

    return (
        <StyledContainer className={classNames(['small-centered', {'showing-banner' : showNetworkBanner }])}>
            { getCurrentViewComponent(activeView) }
        </StyledContainer>
    );
};

export default SendContainerV2;
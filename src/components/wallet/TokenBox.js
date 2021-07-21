import React from 'react';
import styled from 'styled-components';

import { EXPLORER_URL } from '../../utils/wallet';
import Balance from '../common/Balance';
import TokenIcon from '../send/components/TokenIcon';
import TokenAmount from './TokenAmount';

const StyledContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 15px 14px;

    @media (max-width: 767px) {
        margin: 0 -14px;
    }

    @media (min-width: 992px) {
        padding: 15px 20px;
    }

    .icon {
        width: 33px;
        height: 33px;
        min-width: 33px;
        min-height: 33px;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;

        img, svg {
            height: 32px;
            width: 32px;
        }
    }

    .desc {
        display: flex;
        flex-direction: column;
        margin-left: 14px;

        .symbol {
            font-weight: 700;
            font-size: 16px;
            color: #24272a;
        }

        .contract-link {
            font-size: 12px;
            color: #72727A;
            max-width: 200px;
            overflow: hidden;
            text-overflow: ellipsis;

            @media (max-width: 500px) {
                max-width: 180px;
            }

            @media (max-width: 330px) {
                max-width: 150px;
            }

            a {
                color: inherit;
            }
        }
    }

    .balance {
        margin-left: auto;
        font-size: 16px;
        font-weight: 700;
        color: #24272a;

        .dots {
            :after {
                position: absolute;
                content: '.';
                font-weight: 300;
                animation: link 1s steps(5, end) infinite;
            
                @keyframes link {
                    0%, 20% {
                        color: rgba(0,0,0,0);
                        text-shadow:
                            .3em 0 0 rgba(0,0,0,0),
                            .6em 0 0 rgba(0,0,0,0);
                    }
                    40% {
                        color: #24272a;
                        text-shadow:
                            .3em 0 0 rgba(0,0,0,0),
                            .6em 0 0 rgba(0,0,0,0);
                    }
                    60% {
                        text-shadow:
                            .3em 0 0 #24272a,
                            .6em 0 0 rgba(0,0,0,0);
                    }
                    80%, 100% {
                        text-shadow:
                            .3em 0 0 #24272a,
                            .6em 0 0 #24272a;
                    }
                }
            }
        }
    }
`;

const TokenBox = ({ token, onClick }) => {
    const explorerContractLink = `${EXPLORER_URL}/accounts/${token.contractName}`;

    return (
        <StyledContainer className='token-box' onClick={() => onClick(token)}>
            <div className='icon'>
                <TokenIcon symbol={token.symbol} icon={token.icon}/>
            </div>
            <div className='desc'>
                <span className='symbol'>{token.symbol}</span>
                <span className='contract-link' title={token.contractName}>
                    <a href={explorerContractLink} target='_blank' rel='noopener noreferrer'>
                        {token.contractName}
                    </a>
                </span>
            </div>
            {token.symbol === 'NEAR' && !token.contractName ?
                <div className='balance'>
                    <Balance amount={token.balance} symbol={false}/>
                </div>
                :
                <TokenAmount 
                    token={token} 
                    className='balance'
                />
            }
        </StyledContainer>
    );
};

export default TokenBox;

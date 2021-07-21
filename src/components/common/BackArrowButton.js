import React from 'react';
import styled from 'styled-components';

import ArrowIcon from '../svg/ArrowIcon';

const StyledContainer = styled.div`
    transition: 100ms;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    cursor: pointer;

    :hover {
        background-color: #eeefee;

        svg {
            path {
                stroke: #0072CE;
            }
        }
    }
`;

const BackArrowButton = ({ onClick }) => {
    return (
        <StyledContainer onClick={onClick} className='back-arrow-button'>
            <ArrowIcon color='black'/>
        </StyledContainer>
    );
};

export default BackArrowButton;
import React from 'react';
import { Translate } from 'react-localize-redux';

import classNames from '../../../../utils/classNames';
import StyledContainer from './css/Style.css';

const Information = ({ className, translateIdTitle, informationValue, onClick }) => {
    /* TODO: Handle long informationValue */
    return (
        <StyledContainer
            className={classNames(['information' , className, { 'clickable' : onClick }])}
            onClick={onClick}
        >
            <Translate id={translateIdTitle} />
            <div>{informationValue}</div>
        </StyledContainer>
    );
};

export default Information;
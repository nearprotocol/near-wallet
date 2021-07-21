import React from 'react';
import styled from 'styled-components';

const StyledInput = styled.input`
    text-align: center;
    font-weight: 600;
    padding: 0;
    height: 73px;
    border: 0;
    background-color: white;

    :focus {
        border: 0;
        box-shadow: none;
    }

    ::placeholder {
        color: #CCCCCC;
    }

    &.error {
        color: #FC5B5B;
    }
`;

const getFontSize = (charLength) => {
    let baseSize = 70;
    
    if (charLength > 5) {
        baseSize = 60;
    }

    if (charLength > 10) {
        baseSize = 50;
    }

    if (charLength >= baseSize) {
        charLength = baseSize - 6;
    }
    const fontSize = baseSize - charLength;
    return fontSize;
};

const AmountInput = ({ value, onChange, error, autoFocus = true }) => {
    return (
        <StyledInput
            className={error ? 'error' : ''}
            style={{ fontSize: `${value.length ? getFontSize(value.length) : 70}px` }}
            type='number'
            step='any'
            placeholder='0'
            value={value}
            onChange={e => onChange(e.target.value)}
            autoFocus={!value ? autoFocus : false}
        />
    );
};

export default AmountInput; 
import React, { Component, createRef } from 'react';
import { Translate } from 'react-localize-redux';
import styled from 'styled-components';

import classNames from '../../../utils/classNames';
import { ACCOUNT_CHECK_TIMEOUT } from '../../../utils/wallet';
import CheckCircleIcon from '../../svg/CheckCircleIcon';

const InputWrapper = styled.div`
    position: relative;
    font: 16px 'Inter';
    width: 100%;

    input {
        margin-top: 0px;
    }
    
    &.wrong-char {
        input {
            animation-duration: 0.4s;
            animation-iteration-count: 1;
            animation-name: border-blink;

            @keyframes border-blink {
                0% {
                    box-shadow: 0 0 0 0 rgba(255, 88, 93, 0.8);
                }
                100% {
                    box-shadow: 0 0 0 6px rgba(255, 88, 93, 0);
                }
            }
        }
    }

    &.success, &.problem {
        input {
            border: 0;
        }
    }

    input {
        text-align: right;
        border: 0;
        padding-right: 15px;
        background-color: transparent;

        &:focus {
            box-shadow: none;
        }
    }

    .check-circle-icon {
        width: 18px;
        height: 18px;
    }

    .success-prefix {
        position: absolute;
        pointer-events: none;
        top: 50%;
        transform: translateY(-50%);
        height: 18px;
        opacity: 0;
        margin-top: 1px;
        visibility: hidden;
    }

    &.success {
        input {
            color: #008D6A;
            &:focus {
                box-shadow: none;
            }
        }
        .success-prefix {
            opacity: 1;
        }
    }

    &.problem {
        input {
            color: #FC5B5B;
            &:focus {
                box-shadow: none;
            }
        }
    }
`;
class InputAccountId extends Component {
    state = {
        wrongChar: false
    }

    checkAccountAvailabilityTimer = null;
    canvas = null;
    prefix = createRef();

    componentDidMount = () => {
        const { accountId } = this.props;

        if (accountId) {
            this.handleChangeAccountId({ userValue: accountId });
        }
    }

    updatePrefix = (userValue) => {
        // FIX: Handle prefix placement for overflowing input (implicit accounts, etc.)
        const isSafari = /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor);
        const width = this.getTextWidth(userValue, '16px Inter');
        const extraSpace = isSafari ? 22 : 23;
        this.prefix.current.style.right = width + extraSpace + 'px';
        this.prefix.current.style.visibility = 'visible';
        if (userValue.length === 0) this.prefix.current.style.visibility = 'hidden';
    }

    getTextWidth = (text, font) => {
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
        }
        let context = this.canvas.getContext('2d');
        context.font = font;
        let metrics = context.measureText(text);
        return metrics.width;
    }

    handleChangeAccountId = ({ userValue, el }) => {
        const { handleChange, localAlert, clearLocalAlert } = this.props;
        const { wrongChar } = this.state;
        const pattern = /[^a-zA-Z0-9._-]/;

        const accountId = userValue.trim().toLowerCase();

        if (accountId.match(pattern)) {
            if (wrongChar) {
                el.style.animation = 'none';
                void el.offsetHeight;
                el.style.animation = null;
            } else {
                this.setState({ wrongChar: true });
            }
            return;
        } else {
            this.setState({ wrongChar: false });
        }

        handleChange(accountId);

        localAlert && clearLocalAlert();

        this.checkAccountAvailabilityTimer && clearTimeout(this.checkAccountAvailabilityTimer);
        this.checkAccountAvailabilityTimer = setTimeout(() => {
            this.handleCheckAvailability(accountId);
        }, ACCOUNT_CHECK_TIMEOUT);
    }

    isImplicitAccount = (accountId) => accountId.length === 64 && !accountId.includes('.')

    handleCheckAvailability = async (accountId) => {
        const { checkAvailability, clearLocalAlert } = this.props;

        if (!accountId) {
            return false;
        }

        try {
            await checkAvailability(accountId);
        } catch(e) {
            if (this.isImplicitAccount(accountId) && e.toString().includes('does not exist while viewing')) {
                console.warn(`${accountId} does not exist. Assuming this is an implicit Account ID.`);
                clearLocalAlert();
                return;
            }
            throw e;
        }
    }

    render() {
        const {
            disabled,
            localAlert,
            accountId,
            onFocus,
            onBlur,
            autoFocus
        } = this.props;

        const { wrongChar } = this.state;
        const success = localAlert?.success;
        const problem = !localAlert?.success && localAlert?.show;

        return (
            <Translate>
                {({ translate }) => (
                    <InputWrapper className={classNames([{ 'success': success }, { 'problem': problem }, { 'wrong-char': wrongChar }])}>
                        <input
                            value={accountId}
                            onInput={(e) => this.updatePrefix(e.target.value)}
                            onChange={e => this.handleChangeAccountId({ userValue: e.target.value, el: e.target })}
                            placeholder={translate('input.accountId.placeHolderAlt')}
                            required
                            autoComplete='off'
                            autoCorrect='off'
                            autoCapitalize='off'
                            spellCheck='false'
                            tabIndex='1'
                            disabled={disabled}
                            autoFocus={autoFocus}
                            onBlur={onBlur}
                            onFocus={onFocus}
                        />
                        <span className='success-prefix' ref={this.prefix}>
                            <CheckCircleIcon color='#00C08B' />
                        </span>
                    </InputWrapper>
                )}
            </Translate>
        );
    }
}

export default InputAccountId;

// TODO: Add required props for: accountId, onChange, localAlert, clearLocalAlert, checkAvailability
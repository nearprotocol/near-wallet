import PropTypes from 'prop-types';
import React from 'react';
import { Translate } from 'react-localize-redux';
import { withRouter } from 'react-router';
import { Button } from 'semantic-ui-react';
import styled from 'styled-components';

import ArrowGrnImage from '../../images/icon-arrow-grn.svg';
import ArrowWhiteImage from '../../images/icon-arrow-white.svg';
import { Mixpanel } from '../../mixpanel/index';
import classNames from '../../utils/classNames';

const CustomButton = styled(Button)`
    &&& {
        color: #fff;
        margin: 24px 0 0 0;
        border: 2px solid;
        font-weight: 600;
        height: 56px;
        border-radius: 30px;
        
        font-size: 15px;
        word-break: keep-all;

        svg {
            width: 16px;
            height: 16px;
            margin: 0 0 -4px 8px;
        }

        &.small {
            width: 110px;
            height: 36px;
            border-radius: 20px;
            padding: 0px 0px;
            
            font-size: 14px;
        }

        &.black {
            background-color: black;
            transition: 100ms;

            :hover {
                background-color: #1f1f1f;
            }
        }

        &.dark-gray {
            background-color: #272729;
            border-color: #272729;
            transition: 100ms;

            :hover {
                background-color: black;
            }

            :disabled {
                background: #e6e6e6;
                border-color: #e6e6e6;
                opacity: 1 !important;
                color: #A2A2A8;
            }
        }

        &.gray-gray {
            background-color: #F0F0F1;
            border-color: #F0F0F1;
            color: #3F4045;
            transition: 100ms;

            :hover {
                background-color: #ececec;
            }

            :disabled {
                opacity: 0.8;
            }
        }

        &.light-blue {
            background-color: #D6EDFF !important;
            border: 0;
            color: #005497;
            border-radius: 4px;

            &.small {
                padding: 6px 12px;
                height: auto;
                font-weight: 400 !important;
                font-size: 12px;
            }

            &.rounded {
                border-radius: 50px;
                padding: 12px 15px;
                width: auto;
            }
        }

        &.red {
            border-color: #ff585d;
            background: #ff585d;

            :disabled {
                background: #e6e6e6;
                border-color: #e6e6e6;
                opacity: 1 !important;
            }
            :active,
            :hover,
            :focus {
                border-color: #ff585d;
                background: #fff;
                color: #ff585d;
            }
            &.dots {
                color: #fff;
            }
        }
        &.blue {
            border-color: #0072ce;
            background: #0072ce;

            :active,
            :hover,
            :focus {
                border-color: #007fe6;
                background: #007fe6;
            }
            :disabled {
                background: #e6e6e6;
                border-color: #e6e6e6;
                opacity: 1 !important;
                color: #A2A2A8;
            }
        }
        &.seafoam-blue {
            border-color: #6ad1e3;
            background: #6ad1e3;

            :disabled {
                background: #e6e6e6;
                border-color: #e6e6e6;
                opacity: 1 !important;
            }
            :active,
            :hover,
            :focus {
              opacity: 0.8;
            }
        }
        &.seafoam-blue-white {
            border-color: #6ad1e3;
            background: #fff;
            color: #6ad1e3;

            :disabled {
                background: #fff;
                border-color: #e6e6e6;
                opacity: 1 !important;
            }
            :active,
            :hover,
            :focus {
              opacity: 0.8;
            }
        }
        &.green {
            border-color: #5ace84;
            background: #5ace84;
            

            :disabled {
                border-color: #e6e6e6;
                background: #e6e6e6;
                opacity: 1 !important;
            }
            :active,
            :hover,
            :focus {
                border-color: #61de8d;
                background: #61de8d;
            }
        }
        &.green-dark {
            background-color: #00C08B;
            color: #00261C;
            border: 0;
            font-weight: 600 !important;

            :disabled {
                opacity: 0.5;
            }

            &.border {
                color: #008D6A !important;
                background-color: #C8F6E0 !important;
                border: 2px solid #56BC8F !important;
            }
        }
        &.green-white-arrow {
            color: #5ace84;
            border-color: #5ace84;
            background-color: #fff;
            background-image: url(${ArrowGrnImage});
            background-repeat: no-repeat;
            background-position: 90% center;
            background-size: 14px 20px;

            :disabled {
                color: e6e6e6;
                border-color: #e6e6e6;
                background: #fff;
                opacity: 1 !important;
            }
            :active,
            :hover,
            :focus {
                color: #fff;
                border-color: #61de8d;
                background-color: #61de8d;
                background-image: url(${ArrowWhiteImage});
            }
        }
        &.green-pastel {
            background-color: #4DD5A6;
            color: #00261C;
            border: 0;
            transition: 200ms;

            :hover {
                background-color: #49cc9f;
            }
        }
        &.gray-white {
            color: #cccccc;
            border-color: #cccccc;
            background: #fff;

            :disabled {
                border-color: #e6e6e6;
                background: #e6e6e6;
                opacity: 1 !important;
            }
            :active,
            :hover,
            :focus {
                color: #fff;
                border-color: #cccccc;
                background: #cccccc;
            }
        }
        &.gray-red {
            color: #FF585D;
            border: none;
            background-color: #f8f8f8;

            :hover,
            :active,
            :focus {
                color: #fff;
                background-color: #FF585D;
            }
        }
        &.gray-blue {
            color: #0072ce;
            border-color: #f8f8f8;
            background: #f8f8f8;

            :disabled {
                border-color: #e6e6e6;
                background: #e6e6e6;
                opacity: 1 !important;
            }
            :active,
            :hover,
            :focus {
                color: #0072ce;
                border-color: #f8f8f8;
                background: #fff;
            }

            &.dark {
                border-color: #EFEFEF;
                background: #EFEFEF;
            }

            &.border {
                background: none;
                border-color: #E6E5E3;
                transition: 100ms;

                :hover {
                    border-color: #0072ce;
                }
            }
        }
        &.white-blue {
            background-color: white;
            border: 0;
            color: #0072ce;

            :active,
            :hover,
            :focus {
                color: white;
                background: #0072ce;
            }
        }
        &.link {
            width: auto !important;
            height: auto;
            padding: 0;
            margin: 0;
            border-radius: 0px;
            background: none;
            border: none;
            display: inline;
            color: #0072ce;

            :hover,
            :focus {
                color: #0072ce;
                background-color: transparent;
                text-decoration: underline;
            }

            &.gray {
                color: #72727A;

                :hover,
                :focus {
                    color: #72727A;
                }
            }

            &.red {
                color: #ff585d;

                :disabled {
                    opacity: 0.8;
                    background: transparent !important;
                }
            }

            &.normal {
                font-weight: 400;
                font-size: 16px;
            }

            &.underline {
                font-weight: 400;
                text-decoration: underline;

                :hover {
                    text-decoration: none;
                }
            }

        }

        &.dots {
            color: #fff;
            border-color: #cccccc;
            background-color: #cccccc;
            cursor: default;

            :active,
            :hover,
            :focus,
            :disabled {
                background: #cccccc;
                border-color: #cccccc;
            }
            :after {
                content: '.';
                animation: dots 1s steps(5, end) infinite;
            
                @keyframes dots {
                    0%, 20% {
                        color: rgba(0,0,0,0);
                        text-shadow:
                            .3em 0 0 rgba(0,0,0,0),
                            .6em 0 0 rgba(0,0,0,0);
                    }
                    40% {
                        color: white;
                        text-shadow:
                            .3em 0 0 rgba(0,0,0,0),
                            .6em 0 0 rgba(0,0,0,0);
                    }
                    60% {
                        text-shadow:
                            .3em 0 0 white,
                            .6em 0 0 rgba(0,0,0,0);
                    }
                    80%, 100% {
                        text-shadow:
                            .3em 0 0 white,
                            .6em 0 0 white;
                    }
                }
            }
        }

        &.link.dots {
            color: #24272a;
            border: 0;
            background-color: transparent;
            text-transform: lowercase;
            text-decoration: none;

            :active,
            :hover,
            :focus,
            :disabled {
                background: transparent;
                border: 0;
            }
            :after {
                content: '.';
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
        &.bold {
            font-weight: 500;
        }
        @media screen and (max-width: 767px) {
            width: 100%;
        }
    }
`;

const FormButton = ({ 
    children, 
    type, 
    color = 'blue', 
    disabled = false,
    onClick,
    sending = false,
    sendingString,
    size,
    linkTo,
    history,
    className,
    id,
    trackingId,
}) => (
    <CustomButton
        type={type}
        id={id}
        className={classNames([color, size, className, {'dots': sending}])}
        disabled={disabled}
        onClick={(e) => {
            onClick && onClick(e);
            linkTo && (linkTo.toLowerCase().startsWith('http') ? window.open(linkTo, '_blank') : history.push(linkTo));
            trackingId && Mixpanel.track(trackingId);
        }}
        tabIndex='3'
    >
        {sending
            ? <Translate id={sendingString ? sendingString : 'sending'} />
            : children
        }
    </CustomButton>
);

FormButton.propTypes = {
    children: PropTypes.node.isRequired,
    type: PropTypes.string,
    color: PropTypes.string,
    disabled: PropTypes.bool,
    onClick: PropTypes.func,
    sending: PropTypes.bool,
    size: PropTypes.string,
    linkTo: PropTypes.string,
    className: PropTypes.string,
    trackingId: PropTypes.string
};

export default withRouter(FormButton);

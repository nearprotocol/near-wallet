import React from 'react';
import { Container, Grid, Segment } from 'semantic-ui-react';
import styled from 'styled-components';

import classNames from '../../utils/classNames';

const CustomContainer = styled(Container)`
    &&& {
        .dashboard-balance {
            display: flex;
            align-items: center;

            .balance {
                margin-right: 10px;
            }

            @media (max-width: 991px) {
                justify-content: center;
                margin: 20px 0;
            }
        }
        .page-title {
            border-bottom: 2px solid #e6e6e6;
            padding: 36px 0 36px 0;
            word-wrap: break-word;
            margin-bottom: 24px;

            &.center {
                border-bottom: 0;
                margin-bottom: 0;
            }
            button {
                margin-top: 0px;
            }
            .column {
                padding-left: 0;
            }
            .add {
                text-align: right;
                padding-right: 0;
            }
            .dots {
                color: #24272a;

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
        }
        @media screen and (max-width: 991px) {
            .page-title {
                padding: 24px 0 12px 0;
                text-align: center;

                button {
                    margin-bottom: 12px;
                    margin-top: 12px;
                }
                .column {
                    padding: 0 0 12px 0;
                }
                .balance {
                    display: none;
                }
                .add {
                    text-align: center;
                    padding-bottom: 0px;

                    h1 {
                        font-size: 11px !important;
                        text-transform: uppercase;
                        padding-bottom: 0px;
                    }
                }
            }
        }
        @media screen and (max-width: 767px) {
            .title-section {
                margin-left: 0;
                margin-right: 0;

                .page-title {
                    padding-top: 24px;
                    text-align: center;
                    margin-bottom: 12px;

                    .column {
                        padding: 0;
                    }
                    .balance {
                        display: none;
                    }
                }
            }
        }
    }
`;

const PageContainer = ({ children, title, additional, bottom, type, dots }) => (
    <CustomContainer>
        <Grid className='title-section'>
            {type === 'center'
                ? (
                    <Grid.Row columns='1' className='page-title center'>
                        <Grid.Column as='h1' textAlign='center'>
                            {title}
                        </Grid.Column>
                    </Grid.Row>
                ) : (
                    <Grid.Row columns='2' className='page-title'>
                        <Grid.Column as='h1' computer={11} tablet={16} mobile={16} verticalAlign='middle'>
                            <span className={classNames({ dots: dots })}>
                                {title}
                            </span>
                        </Grid.Column>
                        <Grid.Column computer={5} tablet={16} mobile={16} className='add'>
                            {additional}
                        </Grid.Column>
                    </Grid.Row>
                )}
        </Grid>
        {children}
        {bottom && (
            <Segment basic textAlign='center'>
                {bottom}
            </Segment>
        )}
    </CustomContainer>
);

export default PageContainer;

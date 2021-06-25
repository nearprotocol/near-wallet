import React from 'react'
import styled from 'styled-components'
import classNames from '../../utils/classNames'
import DropDown from '../common/DropDown'
import { Translate } from 'react-localize-redux'
import { useDispatch } from 'react-redux';
import { switchAccount } from '../../redux/actions/account';
import { useSelector } from '../../redux/useSelector'

const Container = styled.div`
    .dropdown-container {
        width: 100%;
    }

    .dropdown-title-wrapper, .dropdown-content {
        border-radius: 4px;
    }

    .dropdown-title-wrapper {
        padding: 15px 25px 15px 15px;
    }

    .dropdown-title {
        font-size: 14px !important;
        font-weight: 600 !important;
        color: #72727A;
    }

    .account-dropdown-toggle {
        padding: 15px;
        text-align: left;
        border-bottom: 1px solid #F0F0F1;
        transition: 100ms;
        cursor: pointer;
        color: #72727A;
        font-weight: 500;
        text-overflow: ellipsis;
        overflow: hidden;

        :last-of-type {
            border: 0;
        }

        :hover {
            background-color: #f9f9f9;
            color: #3F4045;
        }
    }

    .account-dropdown-title {
        text-align: left;
        margin-bottom: 8px;
        font-size: 13px;
        color: #A2A2A8;
    }
`

export default function AccountDropdown({ disabled }) {
    const dispatch = useDispatch();
    const { accountId } = useSelector(({ account }) => account);
    const availAccounts = useSelector(({ availableAccounts }) => availableAccounts);

    const singleAccount = availAccounts.length < 2;
    
    return (
        <Container className={classNames(['account-dropdown-container'])}>
            <div className='account-dropdown-title'>
                <Translate id={`selectAccountDropdown.${singleAccount ? 'account' : 'selectAccount'}`}/>
            </div>
            <DropDown
                disabled={singleAccount || disabled}
                name='account-dropdown'
                title={accountId || ''}
                content={
                    availAccounts.filter(a => a !== accountId).map((account, i) =>
                        <div
                            key={i}
                            onClick={() => dispatch(switchAccount(account))}
                            className='account-dropdown-toggle'
                        >
                            {account}
                        </div>
                    )
                }
            />
        </Container>
    )
}
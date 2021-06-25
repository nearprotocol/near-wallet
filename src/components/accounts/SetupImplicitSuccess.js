import React from 'react'
import { useDispatch } from 'react-redux';
import Container from '../common/styled/Container.css'
import FormButton from '../common/FormButton'
import { Translate } from 'react-localize-redux'
import styled from 'styled-components'
import StarIcon from '../svg/StarIcon.js'
import { redirectToApp } from '../../redux/actions/account'
import { useSelector } from '../../redux/useSelector';

const StyledContainer = styled(Container)`
    button {
        margin-top: 40px !important;
        width: 100% !important;
    }
`

const IdGraphic = styled.div`
    position: relative;
    background-color: #C8F6E0;
    color: #005A46;
    padding: 15px;
    border-radius: 8px;
    margin: 20px 0;
    max-width: 250px;
    word-break: break-word;

    svg {
        position: absolute;

        :nth-of-type(1) {
            top: -30px;
            left: -3px;
            width: 13px;
        }

        :nth-of-type(2) {
            top: -19px;
            left: -22px;
        }

        :nth-of-type(3) {
            bottom: 0px;
            right: -29px;
            width: 16px;
        }
    }
`

const AccountIdGraphic = ({ accountId }) => {
    return (
        <IdGraphic>
            <StarIcon color='#80E8F8'/>
            <StarIcon color='#ECE750'/>
            <StarIcon/>
            {accountId}
        </IdGraphic>
    )
}

export function SetupImplicitSuccess() {
    const dispatch = useDispatch();

    const account = useSelector(({ account }) => account);

    return (
        <StyledContainer className='small-centered center'>
            <AccountIdGraphic accountId={account.accountId}/>
            <h1><Translate id='account.createImplicit.success.title'/></h1>
            <h2><Translate id='account.createImplicit.success.descOne' data={{ accountId: account.accountId}}/></h2>
            <h2><Translate id='account.createImplicit.success.descTwo'/></h2>
            <h2><Translate id='account.createImplicit.success.descThree'/></h2>
            <FormButton
                onClick={() => dispatch(redirectToApp('/'))}
                trackingId='CA Click continue to account button'
            >
                <Translate id='account.createImplicit.success.button'/>
            </FormButton>
        </StyledContainer>
    );
}

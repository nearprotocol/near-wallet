import React from 'react'
import PropTypes from 'prop-types'
import { Link } from 'react-router-dom'
import { Translate } from 'react-localize-redux'
import { Header } from 'semantic-ui-react'
import styled from 'styled-components'

import FormButton from '../common/FormButton'
import AccountFormAccountId from './AccountFormAccountId'

const Container = styled.div`
`

const QrCodeLoginBtn = styled(Link)`
    font-weight: 600;
    margin-top: 5px;
    text-decoration: underline;
    display: inline-block;
`

const CreateAccountForm = ({
    loader,
    formLoader,
    handleChange,
    requestStatus,
    checkAvailability,
    accountId,
    clearRequestStatus,
    setFormLoader,
    defaultAccountId
}) => (
    <Container>
        <Header as='h4'><Translate id='createAccount.accountIdInput.title' /></Header>
        <AccountFormAccountId
            formLoader={formLoader}
            handleChange={handleChange}
            type='create'
            pattern={/[^a-zA-Z0-9_-]/}
            checkAvailability={checkAvailability}
            requestStatus={requestStatus}
            accountId={accountId}
            clearRequestStatus={clearRequestStatus}
            setFormLoader={setFormLoader}
            defaultAccountId={defaultAccountId}
        />
        
        <FormButton
            type='submit'
            color='blue'
            disabled={!(requestStatus && requestStatus.success)}
            sending={loader}
        >
            <Translate id='button.createAccountCapital' />
        </FormButton>
        <div className='recover'>
            <div><Translate id='createAccount.alreadyHaveAnAccount' /></div>
            <Link to={process.env.DISABLE_PHONE_RECOVERY === 'yes' ? '/recover-seed-phrase' : '/recover-account'}><Translate id='createAccount.recoverItHere' /></Link>
        </div>
        <QrCodeLoginBtn to='/add-device'>Use logged in device</QrCodeLoginBtn>
    </Container>
)

CreateAccountForm.propTypes = {
    loader: PropTypes.bool.isRequired,
    formLoader: PropTypes.bool.isRequired,
    handleChange: PropTypes.func.isRequired,
    requestStatus: PropTypes.object
}

export default CreateAccountForm

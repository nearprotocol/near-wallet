import React, { Fragment } from 'react'
import PropTypes from 'prop-types'
import { withRouter } from 'react-router-dom'
import { Translate } from 'react-localize-redux'
import { Grid } from 'semantic-ui-react'

import MobileContainer from '../sign/MobileContainer'
import FormButton from '../common/FormButton'
import SelectAccountDropdown from './SelectAccountDropdown'

import IconProblems from '../../images/IconProblems'
import IconAuthorize from '../../images/IconAuthorize'
import connectAccount from '../../redux/connectAccount'

const LoginForm = ({
    dropdown,
    account,
    availableAccounts,
    appTitle,
    handleOnClick,
    handleDeny,
    handleAllow,
    handleSelectAccount,
    redirectCreateAccount,
    buttonLoader,
    match,
    accountConfirmationForm,
    requestAccountIdOnly
}) => (
    <MobileContainer>
        <Grid padded>
            <Grid.Row centered>
                <Grid.Column
                    textAlign='center'
                    className='authorize'
                >
                    {!accountConfirmationForm && (
                        <IconAuthorize color='#999' />
                    )}
                    {accountConfirmationForm && (
                        <IconProblems color='#fca347' />
                    )}
                </Grid.Column>
            </Grid.Row>
            <Grid.Row className='title'>
                <Grid.Column
                    as='h1'
                    textAlign='center'
                    computer={16}
                    tablet={16}
                    mobile={16}
                >
                    {!accountConfirmationForm && (
                        <Fragment>
                            <div><b>{appTitle || <Translate id='sign.unknownApp' />}</b></div>
                            {requestAccountIdOnly ?
                                <div className='h2'><Translate id='login.form.accountIdOnly' /></div>
                            :
                                <>
                                    <div className='h2'><Translate id='login.form.isRequestingTo' /> </div>
                                    <div className='h2'><Translate id='login.form.accessYourAccount' /></div>
                                </>
                            }
                        </Fragment>
                    )}
                    {accountConfirmationForm && (
                        <Fragment>
                            <div><b>{appTitle || <Translate id='sign.unknownApp' />}</b></div>
                            <div className='h2'><Translate id='login.form.isRequestingFullAccess' /></div>
                            <div className='h2'><Translate id='login.form.toYourAccount' /></div>
                        </Fragment>
                    )}
                </Grid.Column>
            </Grid.Row>
            <Grid.Row>
                <Grid.Column
                    textAlign='center'
                    computer={16}
                    tablet={16}
                    mobile={16}
                    className='color-black'
                >
                    {!accountConfirmationForm && (
                        <div><Translate id='login.form.thisDoesNotAllow' /></div>
                    )}
                    {accountConfirmationForm && (
                        <div><Translate id='login.form.thisProvidesAccess' /></div>
                    )}
                </Grid.Column>
            </Grid.Row>
            {!requestAccountIdOnly &&
                <Grid.Row centered>
                    <Grid.Column
                        largeScreen={12}
                        computer={14}
                        tablet={16}
                        className='cont'
                        textAlign='center'
                    >
                        <FormButton
                            linkTo={`${match.url}${match.url.substr(-1) === '/' ? '' : '/'}details`}
                            className='more-information'
                            trackingId="LOGIN Click more information button"
                        >
                            <Translate id='button.moreInformation' />
                        </FormButton>
                    </Grid.Column>
                </Grid.Row>
            }
        </Grid>
        <Grid padded>
            <Grid.Row centered>
                <Grid.Column largeScreen={6} computer={8} tablet={10} mobile={16}>
                    <SelectAccountDropdown
                        handleOnClick={handleOnClick}
                        account={account}
                        availableAccounts={availableAccounts}
                        dropdown={dropdown}
                        handleSelectAccount={handleSelectAccount}
                        redirectCreateAccount={redirectCreateAccount}
                    />
                </Grid.Column>
            </Grid.Row>
            <Grid.Row centered className='but-sec'>
                <Grid.Column largeScreen={6} computer={8} tablet={10} mobile={16}>
                    <FormButton
                        color='gray-white'
                        onClick={handleDeny}
                    >
                        <Translate id='button.deny' />
                    </FormButton>

                    {!accountConfirmationForm && (
                        <FormButton
                            color='blue'
                            sending={buttonLoader}
                            onClick={handleAllow}
                            sendingString='button.authorizing'
                            disabled={!account.accountId}
                        >
                            <Translate id='button.allow' />
                        </FormButton>
                    )}
                    {accountConfirmationForm && (
                        <FormButton
                            linkTo={`${match.url}${match.url.substr(-1) === '/' ? '' : '/'}confirm`}
                            color='blue'
                            sending={buttonLoader}
                            disabled={!account.accountId}
                        >
                            <Translate id='button.allow' />
                        </FormButton>
                    )}
                </Grid.Column>
            </Grid.Row>
        </Grid>
    </MobileContainer>
)

LoginForm.propTypes = {
    dropdown: PropTypes.bool.isRequired,
    handleOnClick: PropTypes.func.isRequired,
    handleDeny: PropTypes.func.isRequired,
    handleSelectAccount: PropTypes.func.isRequired,
    redirectCreateAccount: PropTypes.func.isRequired
}

const mapStateToProps = ({ account, availableAccounts }) => ({
    account,
    availableAccounts
})

export default connectAccount(mapStateToProps)(withRouter(LoginForm))

import React, { Component } from 'react'
import { Translate } from 'react-localize-redux'
import { withRouter } from 'react-router-dom'

import { getAccessKeys, removeAccessKey } from '../../redux/actions/account'

import AccessKeysEmpty from './AccessKeysEmpty'
import PaginationBlock from '../pagination/PaginationBlock'
import PageContainer from '../common/PageContainer';

import KeyListItem from '../dashboard/KeyListItem'
import connectAccount from '../../redux/connectAccount'

class AccessKeys extends Component {
    state = {
        showSub: false,
        showSubOpen: 0,
        showSubData: null,
        accountId: '',
        confirm: false,
        confirmStatus: '',
        authorizedApps: [],
        filterTypes: [
            { img: '', name: 'ALL' },
            { img: '', name: 'ALL' },
            { img: '', name: 'ALL' },
            { img: '', name: 'ALL' }
        ]
    }

    handleConfirm = () => {
        this.setState((state) => ({
            confirm: !state.confirm
        }))
    }

    handleConfirmSubmit = (e) => {
        e.preventDefault()

        if (this.state.accountId === this.props.accountId) {
            this.setState(() => ({
                confirmStatus: 'success'
            }))
            this.handleDeauthorize()
        }
        else {
            this.setState(() => ({
                confirmStatus: 'problem'
            }))
        }
    }

    handleChange = (e, { name, value }) => {
        this.setState(() => ({
            [name]: value,
            confirmStatus: ''
        }))
    }

    handleConfirmClear = () => {
        this.setState(() => ({
            accountId: '',
            confirm: false,
            confirmStatus: ''
        }))
    }

    toggleShowSub = (i, accessKey) => {
        i = i == null ? this.state.showSubOpen : i

        this.setState(state => ({
            showSub: true,
            showSubOpen: i,
            showSubData: accessKey
        }))

        this.handleConfirmClear()
    }

    toggleCloseSub = () => {
        this.setState(() => ({
            showSub: false,
            showSubOpen: 0,
            showSubData: null
        }))

        this.handleConfirmClear()
    }

    handleDeauthorize = async () => {
        const publicKey = this.state.showSubData.public_key

        try {
            await this.props.removeAccessKey(publicKey)
        } finally {
            this.toggleCloseSub()
            this.refreshAccessKeys()
        }
    }

    refreshAccessKeys = () => {
        this.props.getAccessKeys()
    }

    render() {
        const {
            filterTypes,
            showSub,
            showSubOpen,
            showSubData,
            accountId,
            confirm,
            confirmStatus
        } = this.state

        const { authorizedApps, title, mainLoader } = this.props

        return (
            <PageContainer
                title={<Translate id={title} />}
                additional={(
                    <h1>
                        {authorizedApps && authorizedApps.length}
                        <span className='color-brown-grey'> <Translate id='total' /></span>
                    </h1>
                )}
                dots={!this.props.accountId}
            >
                <PaginationBlock
                    filterTypes={filterTypes}
                    showSub={showSub}
                    showSubData={showSubData}
                    toggleShowSub={this.toggleShowSub}
                    toggleCloseSub={this.toggleCloseSub}
                    subPage='access-keys'
                    handleDeauthorize={this.handleDeauthorize}
                    handleConfirm={this.handleConfirm}
                    handleConfirmSubmit={this.handleConfirmSubmit}
                    handleChange={this.handleChange}
                    handleConfirmClear={this.handleConfirmClear}
                    accountId={accountId}
                    confirm={confirm}
                    confirmStatus={confirmStatus}
                    mainLoader={mainLoader}
                >
                    {authorizedApps && (authorizedApps.length 
                        ? authorizedApps.map((accessKey, i) => (
                            <KeyListItem
                                key={`a-${i}`}
                                accessKey={accessKey}
                                i={i}
                                wide={true}
                                showSub={showSub}
                                toggleShowSub={this.toggleShowSub}
                                showSubOpen={showSubOpen}
                            />
                        )) : <AccessKeysEmpty />)}
                </PaginationBlock>
            </PageContainer>
        )
    }
}

const mapDispatchToProps = {
    getAccessKeys,
    removeAccessKey
}

const mapStateToPropsAuthorizedApps = ({ account, status }) => ({
    ...account,
    authorizedApps: account.authorizedApps,
    title: 'authorizedApps.pageTitle',
    mainLoader: status.mainLoader
})

export const AuthorizedAppsWithRouter = connectAccount(
    mapStateToPropsAuthorizedApps,
    mapDispatchToProps
)(withRouter(AccessKeys))

const mapStateToPropsFullAccess = ({ account }) => ({
    ...account,
    authorizedApps: account.fullAccessKeys,
    title: 'fullAccessKeys.pageTitle'
})

export const FullAccessKeysWithRouter = connectAccount(
    mapStateToPropsFullAccess,
    mapDispatchToProps
)(withRouter(AccessKeys))

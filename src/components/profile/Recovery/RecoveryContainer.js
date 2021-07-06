import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { withRouter } from 'react-router-dom';
import styled from 'styled-components';
import RecoveryMethod from './RecoveryMethod';
import {
    deleteRecoveryMethod,
    loadRecoveryMethods
} from '../../../actions/account';
import SkeletonLoading from '../../common/SkeletonLoading';
import { actionsPending } from '../../../utils/alerts';
import { Mixpanel } from '../../../mixpanel/index'

const Container = styled.div`

    border: 2px solid #e6e6e6;
    border-radius: 8px;

    > div {
        padding: 15px 20px;
        border-bottom: 2px solid #f8f8f8;

        &:last-of-type {
            border-bottom: 0;
        }
    }

    button, a {
        font-size: 15px;
        width: 100px;
        height: 36px;
    }
`

const RecoveryContainer = ({ type, recoveryMethods }) => {
    const [deletingMethod, setDeletingMethod] = useState('');
    const dispatch = useDispatch();
    const account = useSelector(({ account }) => account);
    const { mainLoader } = useSelector(({ status }) => status);
    let userRecoveryMethods = recoveryMethods || []
    const allKinds = ['email', 'phone', 'phrase'];
    const activeMethods = userRecoveryMethods.filter(({ kind }) => allKinds.includes(kind));
    const currentActiveKinds = new Set(activeMethods.map(method => method.kind));
    const missingKinds = allKinds.filter(kind => !currentActiveKinds.has(kind))
    const deleteAllowed = [...currentActiveKinds].length > 1 || account.ledgerKey;
    const recoveryLoader = (actionsPending('LOAD_RECOVERY_METHODS') && !userRecoveryMethods.length) || !account.accountId || !account.balance.stakedBalanceMainAccount
    missingKinds.forEach(kind => activeMethods.push({kind: kind}));

    const handleDeleteMethod = async (method) => {
        try {
            setDeletingMethod(method.publicKey)
            await Mixpanel.withTracking(method.kind === 'phrase'? 'SR-SP Delete method': `SR ${method.kind} Delete method`,
                async () => await dispatch(deleteRecoveryMethod(method, deleteAllowed))
            )   
        } finally {
            setDeletingMethod('')
        }
        dispatch(loadRecoveryMethods())
    }

    if (!recoveryLoader) {
        return (
            <Container className='recovery-option'>
                {activeMethods.filter(method => method.kind === type).map((method, i) =>
                    <RecoveryMethod
                        key={i}
                        method={method}
                        accountId={account.accountId}
                        deletingMethod={deletingMethod === method.publicKey}
                        onDelete={() => handleDeleteMethod(method)}
                        deleteAllowed={deleteAllowed}
                        mainLoader={mainLoader}
                    />
                )}
            </Container>
        )
    } else {
        return (
            <SkeletonLoading
                height='80px'
                show={recoveryLoader}
            />
        )
    }
}

export default withRouter(RecoveryContainer);

import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { withRouter } from 'react-router-dom';
import styled from 'styled-components';
import { Translate } from 'react-localize-redux';
import Card from '../../common/styled/Card.css';

import FormButton from '../../common/FormButton';
import { 
    getAccessKeys,
    disableLedger,
    getLedgerKey,
    addLedgerAccessKey,
    loadRecoveryMethods
} from '../../../redux/actions/account';
import ConfirmDisable from './ConfirmDisable';
import SkeletonLoading from '../../common/SkeletonLoading';
import { actionsPending } from '../../../utils/alerts'
import { Mixpanel } from '../../../mixpanel/index'
import { useSelector } from '../../../redux/useSelector';

const Container = styled(Card)`

    .device {
        display: flex;
        align-items: center;
        justify-content: space-between;

        .name {
            font-weight: 500;
            color: #24272a;

            div {
                color: #5ACE84;
                margin-top: 3px;
            }
        }

        button {
            width: 100px !important;
            height: 36px !important;
            margin: 0 !important;
            padding: 0;
        }
    }

    i {
        margin-top: 20px;
        display: block;
        color: #A1A1A9;
        font-style: normal;
        color: #A1A1A9;

    }

    .color-red {
        margin-top: 20px;
    }

`

const HardwareDevices = ({ recoveryMethods }) => {

    const [disabling, setDisabling] = useState(false);
    const [confirmDisable, setConfirmDisable] = useState(false);
    const dispatch = useDispatch();
    const account = useSelector(({ account }) => account);
    let userRecoveryMethods = recoveryMethods || []
    const keys = account.fullAccessKeys || [];
    const recoveryKeys = userRecoveryMethods.filter(method => method.kind !== 'ledger').map(key => key.publicKey)
    const publicKeys = keys.map(key => key.public_key)
    const hasOtherMethods = publicKeys.some(key => recoveryKeys.includes(key))
    const hasLedger = userRecoveryMethods.filter(method => method.kind === 'ledger').map(key => key.publicKey).some(key => publicKeys.includes(key))
    const ledgerIsConnected = account.ledgerKey;
    const hasLedgerButNotConnected = hasLedger && !ledgerIsConnected
    const recoveryLoader = (actionsPending('LOAD_RECOVERY_METHODS') && !userRecoveryMethods.length) || !account.accountId

    const handleConfirmDisable = async () => {
        await Mixpanel.withTracking("SR-Ledger Handle confirm disable",
            async () => {
                setDisabling(true)
                await dispatch(disableLedger());
            },
            () => {},
            async () => {
                await dispatch(getAccessKeys())
                await dispatch(getLedgerKey())
                await dispatch(loadRecoveryMethods())
                setDisabling(false)
                setConfirmDisable(false)
            }
        )
    }

    const handleConnectLedger = async () => {
        await Mixpanel.withTracking("SR-Ledger Reconnect ledger",
            async () => {
                await dispatch(addLedgerAccessKey())
                await dispatch(getLedgerKey())
                await dispatch(loadRecoveryMethods())
            }
        )
    }

    const getActionButton = () => {
        if (ledgerIsConnected) {
            return <FormButton disabled={!hasOtherMethods} color='gray-red' onClick={() => setConfirmDisable(true)}><Translate id='button.disable'/></FormButton>
        } else if (hasLedgerButNotConnected) {
            return <FormButton color='blue' onClick={handleConnectLedger}><Translate id='button.connect'/></FormButton>
        } else {
            return <FormButton linkTo={`/setup-ledger/${account.accountId}`} color='blue' trackingId="SR-Ledger Click enable button"><Translate id='button.enable'/></FormButton> 
        }
    }

    if (!recoveryLoader) {
        return (
            <Container>
                {!confirmDisable ?
                    <>
                        <div className='device'>
                            <div className='name'>
                                <Translate id='hardwareDevices.ledger.title'/>
                                {ledgerIsConnected && <div><Translate id='hardwareDevices.ledger.auth'/></div>}
                            </div>
                            {getActionButton()}
                        </div>
                        {!hasOtherMethods && ledgerIsConnected && 
                            <i><Translate id='hardwareDevices.ledger.disclaimer'/></i>
                        }
                        {hasLedgerButNotConnected &&
                            <div className='color-red'><Translate id='hardwareDevices.ledger.connect'/></div>
                        }
                        {!hasLedger && 
                            <i><Translate id='hardwareDevices.desc'/></i>
                        }
                    </>
                    :
                    <ConfirmDisable 
                        onConfirmDisable={handleConfirmDisable} 
                        onKeepEnabled={() => setConfirmDisable(false)}
                        accountId={account.accountId}
                        disabling={disabling}
                        component='hardwareDevices'
                    />
                }
            </Container>
        )
    } else {
        return (
            <SkeletonLoading
                height='138px'
                show={recoveryLoader}
            />
        )
    }
}


export default withRouter(HardwareDevices);

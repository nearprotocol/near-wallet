import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { redirectToApp, refreshAccount } from '../../../actions/account';

import { getDirectWebSdk } from '../../../utils/torus'
import { wallet } from '../../../utils/wallet';

export function TorusSupport() {
    console.log('torusSupport')
    const dispatch = useDispatch();

    useEffect(() => {
        async function handleTorusLogin()  {
            console.log('mounted');
            const torusdirectsdk = await getDirectWebSdk();
            console.log('location', window.location.href);
            const { result: loginDetails } = await torusdirectsdk.getRedirectResult();
            console.log(loginDetails);

            // TODO: Refactor with CreateAccount (or remove there unless popup?)
            await wallet.createOrRecoverAccountFromTorus(loginDetails);

            dispatch(refreshAccount());
            dispatch(redirectToApp());
        }

        handleTorusLogin();
    }, []);

    return <p>TODO: Loading...?</p>;
}


import * as nearApiJs from 'near-api-js'
import { store } from '..'
import { promptTwoFactor, refreshAccount } from '../redux/actions/account'
import { MULTISIG_MIN_AMOUNT, ACCOUNT_HELPER_URL } from './wallet'
import { utils } from 'near-api-js'
import { BN } from 'bn.js'

export const MULTISIG_CONTRACT_HASHES = process.env.MULTISIG_CONTRACT_HASHES || [
    // https://github.com/near/core-contracts/blob/fa3e2c6819ef790fdb1ec9eed6b4104cd13eb4b7/multisig/src/lib.rs
    '7GQStUCd8bmCK43bzD8PRh7sD2uyyeMJU5h8Rj3kXXJk',
    // https://github.com/near/core-contracts/blob/fb595e6ec09014d392e9874c2c5d6bbc910362c7/multisig/src/lib.rs
    'AEE3vt6S3pS2s7K6HXnZc46VyMyJcjygSMsaafFh67DF',
    // https://github.com/near/core-contracts/blob/636e7e43f1205f4d81431fad0be39c5cb65455f1/multisig/src/lib.rs
    '8DKTSceSbxVgh4ANXwqmRqGyPWCuZAR1fCqGPXUjD5nZ',
    // https://github.com/near/core-contracts/blob/f93c146d87a779a2063a30d2c1567701306fcae4/multisig/res/multisig.wasm
    '55E7imniT2uuYrECn17qJAk9fLcwQW4ftNSwmCJL5Di',
];

const {
    multisig: { Account2FA },
} = nearApiJs

export class TwoFactor extends Account2FA {
    constructor(wallet, accountId) {
        super(wallet.connection, accountId, {
            storage: localStorage,
            helperUrl: ACCOUNT_HELPER_URL,
            getCode: () => store.dispatch(promptTwoFactor(true)).payload.promise
        })
        this.wallet = wallet
    }

    static async has2faEnabled(account) {
        const state = await account.state()
        if (!state) return false
        return MULTISIG_CONTRACT_HASHES.includes(state.code_hash)
    }

    static async checkCanEnableTwoFactor(balance) {
        const availableBalance = new BN(balance.available)
        const multisigMinAmount = new BN(utils.format.parseNearAmount(MULTISIG_MIN_AMOUNT))
        return multisigMinAmount.lt(availableBalance)
    }

    async get2faMethod() {
        if (TwoFactor.has2faEnabled(this)) {
            return super.get2faMethod()
        }
        return null
    }

    async initTwoFactor(accountId, method) {
        // clear any previous requests in localStorage (for verifyTwoFactor)
        this.setRequest({ requestId: -1 })
        return await this.wallet.postSignedJson('/2fa/init', {
            accountId,
            method
        });
    }

    async deployMultisig() {
        const contractBytes = new Uint8Array(await (await fetch('/multisig.wasm')).arrayBuffer())
        await super.deployMultisig(contractBytes)
    }

    async disableMultisig() {
        const contractBytes = new Uint8Array(await (await fetch('/main.wasm')).arrayBuffer())
        const result = await this.disable(contractBytes)
        await store.dispatch(refreshAccount())
        return result
    }
}
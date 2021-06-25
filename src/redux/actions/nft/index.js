import { createActions } from 'redux-actions'
import sendJson from '../../../tmp_fetch_send_json'
import { wallet, ACCOUNT_HELPER_URL } from '../../../utils/wallet'
import { Account } from 'near-api-js'

export const handleGetNFTs = () => async (dispatch, getState) => {
    let { account: { accountId } } = getState()

    const likelyContracts = await dispatch(nft.likelyContracts.get(accountId))

    // TODO: Should this happen in likelyContracts.get reducer?
    const contracts = likelyContracts.reduce((x, contract) => ({
        ...x,
        [contract]: { contract }
    }), {})

    // TODO: Does this even need to await for the whole thing?
    const contractMetadata = await Promise.all(Object.keys(contracts).map(async contract => {
        return await dispatch(nft.tokensDetails.getMetadata(contract, accountId))
    }))

    Object.keys(contracts).map(async (contract, i) => {
        await dispatch(nft.tokensDetails.getTokens(contract, accountId, contractMetadata[i].metadata))
    })
}

// TODO: Decide where to ignore and where to bubble up errors
// TODO: Maybe errors should be stored per token in Redux state?
async function getLikelyContracts(accountId) {
    return await sendJson('GET', `${ACCOUNT_HELPER_URL}/account/${accountId}/likelyNFTs`)
}

async function getMetadata(contractName, accountId) {
    const account = new Account(wallet.connection, accountId)
    const metadata = await account.viewFunction(contractName, 'nft_metadata')
    console.log('metadata', metadata);
    return { metadata, contractName }
}

async function getTokens(contractName, accountId, { base_uri }) {
    const account = new Account(wallet.connection, accountId)
    let tokens
    try {
        const tokenIds = await account.viewFunction(contractName, 'nft_tokens_for_owner_set', { account_id: accountId })
        console.log('tokenIds', tokenIds)
        tokens = await Promise.all(tokenIds.map(async token_id => {
            let metadata = await account.viewFunction(contractName, 'nft_token_metadata', { token_id: token_id.toString() })
            let { media, reference } = metadata
            if (!media && reference) {
                // TODO: Filter which URIs are allowed for privacy?
                // TODO: Figure out ARWeave CORS issue
                // NOTE: For some reason raw fetch() doesn't have same issue as sendJson
                // tokenMetadata = sendJson('GET', `${base_uri}/${reference}`);
                metadata = await (await fetch(`${base_uri}/${reference}`)).json();
            }
            return { token_id, metadata }
        }));
    } catch (e) {
        if (!e.toString().includes('FunctionCallError(MethodResolveError(MethodNotFound))')) {
            throw e;
        }

        // TODO: Pagination
        tokens = await account.viewFunction(contractName, 'nft_tokens_for_owner', { account_id: accountId, from_index: "0", limit: 50 });
    }
    console.log('tokens', tokens);
    // TODO: Separate Redux action for loading image
    tokens = await Promise.all(tokens.filter(({ metadata }) => !!metadata).map(async ({ metadata, ...token }) => {
        const { media } = metadata;
        let mediaUrl
        if (!media.includes('://')) {
            if (base_uri) {
                mediaUrl = `${base_uri}/${media}`;
            } else {
                mediaUrl = `https://cloudflare-ipfs.com/ipfs/${media}`;
            }
        } else {
            mediaUrl = media;
        }

        return {
            ...token,
            metadata: {
                ...metadata,
                mediaUrl
            }
        }
    }));
    console.log('tokens map', tokens);

    return { contractName, tokens };
}

export const { nft } = createActions({
    NFT: {
        LIKELY_CONTRACTS: {
            GET: getLikelyContracts,
        },
        TOKENS_DETAILS: {
            GET_METADATA: getMetadata,
            GET_TOKENS: getTokens,
        },
        CLEAR_STATE: null
    }
})

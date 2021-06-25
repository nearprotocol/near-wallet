import { connectRouter } from 'connected-react-router'
import { localizeReducer } from 'react-localize-redux'

import status from './status'

export default (history) => ({
    localize: localizeReducer,
    router: connectRouter(history),
    statusMain: status
})

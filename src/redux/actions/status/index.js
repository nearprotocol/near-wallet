import { createActions } from 'redux-actions'
import { showAlert } from '../../../utils/alerts'

export const { clearLocalAlert, clearGlobalAlert, showCustomAlert, setMainLoader } = createActions({
    CLEAR_LOCAL_ALERT: null,
    CLEAR_GLOBAL_ALERT: null,
    SHOW_CUSTOM_ALERT: [
        (payload) => (payload),
        (meta) => showAlert(meta)
    ],
    SET_MAIN_LOADER: null
})

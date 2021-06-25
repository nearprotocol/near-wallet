import * as Sentry from '@sentry/browser'

/**
* Lets you dispatch special actions with a { promise } field.
*
* This middleware will turn them into a single action at the beginning,
* and a single success (or failure) action when the `promise` resolves.
*
* For convenience, `dispatch` will return the promise so the caller can wait.
*/
export default store => next => action => {
    if (!action.payload || !action.payload.then) {
        return next(action)
    }

    function makeAction(ready, data) {
        const newAction = Object.assign({}, action)
        delete newAction.payload
        return Object.assign(newAction, { ready }, data)
    }

    next(makeAction(false))
    return action.payload.then(
        payload => {
            next(makeAction(true, { payload }))
            return payload
        },
        error => {
            console.warn('Error in background action:', error)
            Sentry.captureException(error);
            next(makeAction(true, { error: true, payload: error }))
            throw error
        }
    )
}

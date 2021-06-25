import { connect } from 'react-redux'

export default (mapStateToProps, mapDispatchToProps) => {
    return connect(
        (state, ownProps) => {
            const accountId = localStorage.getItem('_4:wallet:active_account_id_v2') || ''
            return {
                ...mapStateToProps(
                    accountId ? state[accountId] : {}, 
                    state, 
                    ownProps
                ),
            }
        },
        mapDispatchToProps
    )
}

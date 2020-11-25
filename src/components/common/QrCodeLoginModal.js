import React, { Component } from 'react'
import { connect } from 'react-redux';
import { withRouter, Link } from 'react-router-dom'
import { Modal } from 'semantic-ui-react'
import Spinner from '../svg/Spinner'
import { QRCode } from "react-qr-svg"
import { createMagicLink } from '../../actions/account'
import styled from 'styled-components'
import qrCodeIcon from '../../images/qr-code-icon.svg'

const CustomModal = styled(Modal)`
    background-color: transparent !important;
    box-shadow: none !important;
    width: auto !important;

    &.modal {
        &.ui {
            i {
                &.close {
                    top: 0 !important;
                    right: 0 !important;
                }
            }
        }
    }

    a {
        color: white;
    }
`

const AddDeviceBtn = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    color: #0072CE;
    border-radius: 4px;
    height: 40px;
    font-weight: 600;
    box-shadow: none;
    width: 100%;
    border: 0;
    text-transform: uppercase;
    margin-top: 20px;
    cursor: pointer;
    background-color: #f8f8f8 !important;
    background: url(${qrCodeIcon}) top 9px left 12px no-repeat;
    background-size: 22px;
`

const QrContainer = styled.div`
    max-width: 250px;
    padding: 20px;
    box-shadow: 0px 5px 9px -1px rgba(0,0,0,0.17);
    position: relative;
    background-color: white;
    border-radius: 4px;

    @media (min-width: 768px) {
        max-width: 300px;
    }

    .qr-spinner {
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        margin: auto;
    }
`

const Overlay = styled.div`
    opacity: 0.9;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: white;
    border-radius: 4px;
`

const Instructions = styled.div`
    color: white;
    text-align: center;
    max-width: 250px;
    margin: 10px auto 0 auto;
`

const QrCode = ({ loginLink }) => {
    return (
        <QrContainer>
            <QRCode
                bgColor="#FFFFFF"
                fgColor="#24272a"
                level="Q"
                style={{ width: "100%" }}
                value={loginLink}
            />
            {!loginLink &&
                <>
                    <Overlay/>
                    <Spinner className='qr-spinner'/>
                </>
            }
        </QrContainer>
    )
}

class QrCodeLoginModal extends Component {

    state = {
        loginLink: ''
    }

    handleCreateLink = async () => {
        const codeUrl = await this.props.createMagicLink()
        this.setState({ loginLink: codeUrl })
    }

    render() {

        const { loginLink } = this.state;

        return (
            <CustomModal 
                size='mini'
                trigger={<AddDeviceBtn type='button'>Sign In on 2nd Device w/ QR Code</AddDeviceBtn>}
                onOpen={this.handleCreateLink}
                onClose={() => this.setState({ loginLink: '' })}
                closeIcon
            >
                <QrCode 
                    loginLink={loginLink}
                />
                <Instructions>
                    Scan using camera app or go to<br/>
                    <Link to='/add-device'>{`${window.location.protocol}//${window.location.host}/add-device`}</Link>
                </Instructions>
            </CustomModal>
        )
    }
}

const mapDispatchToProps = {
    createMagicLink
}

const mapStateToProps = () => ({})

export default connect(mapStateToProps, mapDispatchToProps)(withRouter(QrCodeLoginModal));
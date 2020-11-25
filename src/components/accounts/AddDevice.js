import React, { Component } from 'react'
import { withRouter } from 'react-router-dom';
import styled from 'styled-components'
import QrReader from 'react-qr-reader'

const Container = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;

    .camera {
        width: 100%;
        margin-top: -15px;

        @media (min-width: 500px) {
            margin-top: 50px;
            width: 50%;
        }

        @media (min-width: 768px) {
            width: 35%;
        }

        @media (min-width: 992px) {
            width: 25%;
        }

        section > div {
            box-shadow: #8fd6bd 0px 0px 0px 5px inset !important;
        }
    }

    .instructions {
        margin-top: 10px;
    }
`

class AddDevice extends Component {

    state = {
        result: ''
    }

    handleScan = data => {

        if (data) {
            this.setState({ result: data })
            //this.props.history.push(data); TODO: Deconstruct URL to use history
            window.location.href = data;
        }
    }

    handleError = err => {
        console.error(err)
    }

    render() {
        return (
            <Container>
                <QrReader
                    delay={500}
                    onError={this.handleError}
                    onScan={this.handleScan}
                    className='camera'
                />
                <div className='instructions'>
                    On your logged in device:<br/>
                    1. Go to your profile and generate a QR code<br/>
                    2. Use this device to scan the code
                </div>
            </Container>
        )
    }
}

export const AddDeviceWithRouter = withRouter(AddDevice)
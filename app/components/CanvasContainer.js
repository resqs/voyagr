//make a function that checks if user
//then if that user belongs to this trip or vice versa
//if both are true then render edit/view button, and tool bar, otherwise don't
//set permissions to anyone can see but only owners can edit

import React, { Component } from 'react'
import Canvas from './Canvas'
import { Provider } from 'react-redux'
import { database, auth } from 'APP/db/firebase'
import store from 'APP/app/store'
import ToolBox from './ToolBox'
import { Grid, Col, Button } from 'react-bootstrap'

export default class CanvasContainer extends Component {
  constructor (props) {
    super(props)

    this.state = {
      selected: null,
      store: null,
      editable: false,
      userId: null,
      canEdit: false,
    }

    this.selectElement = this.selectElement.bind(this)
    this.toggleMode = this.toggleMode.bind(this)
    this.renderView = this.renderView.bind(this)
    this.renderEditButton = this.renderEditButton.bind(this)
    this.clearSelectedIfDeleted = this.clearSelectedIfDeleted.bind(this)
  }

  //when this component mounts, figure out the firebase path from params
  componentWillMount () {
    const pageId = this.props.params.pageId,
          tripId = this.props.params.tripId,
          pageActionsRef = database.ref(`pageActions/${pageId}`),
          tripUsersRef = database.ref(`tripUsers/${tripId}`)

    //replays the actions from the Firebase db to get to 'current state'
    this.setState({
      store: store(pageActionsRef),
      tripInfoRef: database.ref(`tripInfo/${tripId}`),
      pageInfoRef: database.ref(`pageInfo/${pageId}`), //should be all set up for page info view/edit
    }, () => {
      this.state.tripInfoRef.on('value', (snap) => this.setState({
          tripInfo: snap.val()
        }))
      this.state.pageInfoRef.on('value', (snap) => this.setState({ //should be all set up for page info view/edit
          pageInfo: snap.val()
        }))
    })

    //sets a current user listener from Firebase auth
    this.unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        //set user id on state for rendring the edit/view button
        this.setState({
          userId: user.uid,
        })
        //get the object of users that belong to this trip from Firebase db
        tripUsersRef.on('value', (snap) => {
          let tripUsers = snap.val()
          //get an array of values from the tripUsers object
          let isCollaborator = Object.values(tripUsers).includes(user.uid)
          //if current user is in the array, then they can edit, else they can't
          this.setState({
            editable: isCollaborator,
            canEdit: isCollaborator,
          })
        })
      } else { //if there is no user or then they can't edit
        this.setState({
          userId: null,
          editable: false,
          canEdit: false,
        })
      }
    })
  }

  componentWillUnmount () {
    //add cleanup from auth.userChange listener
    this.unsubscribe()
  }

  toggleMode() {
    this.setState({
      editable: !this.state.editable,
    })
  }

  //this function is called from inside page when we move an element
  selectElement (type, id) {
    this.setState({
      selected: {id: id, type: type}
    })
  }

  //this function gets passed down to Page so that selected is cleared before delete
  //otherwise there is a bug when you delete the currently selected element
  clearSelectedIfDeleted (type, id) {
    const selected = this.state.selected
    if (selected && type === selected.type && id === selected.id) {
      this.setState({ selected: null })
    }
  }

  renderView() {
    return this.state.editable ?
    //render this if editable is true
        <Col lg={3}>
          <ToolBox
            tripInfo={this.state.tripInfo}
            tripInfoRef={this.state.tripInfoRef}
            selected={this.state.selected}
            tripId={this.props.params.tripId}
            pageInfo={this.state.pageInfo} //should be all set up for page info view/edit
            pageInfoRef={this.state.pageInfoRef} //should be all set up for page info view/edit
          />
        </Col>

    //render this if editable is false
    : null
  }

  renderEditButton() {
    return this.state.canEdit ?
                      (<Button onClick={this.toggleMode}>
                        {this.state.editable ? "View" : "Edit" }
                      </Button>)
                     : null
  }

  render () {
    console.log('state', this.state)
    if (!this.state) return null
    let tripInfo = this.state.tripInfo || null
    let pageInfo = this.state.pageInfo || null //should be all set up for page info view/edit

    return (
      <div>
        <Grid id="canvas-header">
          <Col lg={12}>
          {this.renderEditButton()}
          {
            tripInfo ?
            <div>
              <h2>{`${tripInfo.name}, ${tripInfo.description}, ${tripInfo.startDate}`}</h2>
            </div>
            : null
          }
          </Col>
        </Grid>
        <Provider store={this.state.store}>
          <Grid id="canvas-wrapper">
            {this.renderView()}
            <Col lg={9}>
              <Canvas editable={this.state.editable}
                      selectElement={this.selectElement}
                      clearSelectedIfDeleted={this.clearSelectedIfDeleted} />
            </Col>
          </Grid>
        </Provider>
      </div>
    )
  }
}

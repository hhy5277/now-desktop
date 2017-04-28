// Native
import queryString from 'querystring'

// Packages
import React from 'react'
import moment from 'moment'

// Components
import Title from '../components/title'
import Switcher from '../components/feed/switcher'
import DropZone from '../components/feed/dropzone'
import TopArrow from '../components/feed/top-arrow'
import EventMessage from '../components/feed/events'
import NoEvents from '../components/feed/events/none'

// Utilities
import remote from '../utils/electron'
import loadData from '../utils/data/load'
import { API_USER_EVENTS, API_TEAM_EVENTS } from '../utils/data/endpoints'

class Feed extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      dropZone: false,
      events: {},
      scope: null,
      currentUser: null,
      teams: []
    }
  }

  isUser() {
    if (!this.state.scope || !this.state.currentUser) {
      return false
    }

    if (this.state.scope === this.state.currentUser.username) {
      return true
    }

    return false
  }

  async loadEvents(scope) {
    const query = {
      limit: 15
    }

    if (!this.isUser()) {
      query.teamId = scope
    }

    const params = queryString.stringify(query)
    const endpoint = this.isUser() ? API_USER_EVENTS : API_TEAM_EVENTS
    const data = await loadData(`${endpoint}?${params}`)

    if (!data || !data.events) {
      return
    }

    // Make sure to respect cached events
    const events = this.state.events

    // Cache events
    events[scope] = data.events
    this.setState({ events })
  }

  async componentDidMount() {
    const { get: getConfig } = remote.require('./utils/config')
    const config = await getConfig()

    this.setState({
      scope: config.user.username,
      currentUser: config.user
    })
  }

  componentDidUpdate(prevProps, prevState) {
    const newScope = this.state.scope

    if (newScope === prevState.scope) {
      return
    }

    this.loadEvents(newScope)
  }

  showDropZone() {
    this.setState({
      dropZone: true
    })
  }

  hideDropZone() {
    this.setState({
      dropZone: false
    })
  }

  renderEvents() {
    const scope = this.state.scope
    const scopedEvents = this.state.events[scope]

    if (!scopedEvents) {
      return <NoEvents />
    }

    const months = {}

    for (const message of scopedEvents) {
      const created = moment(message.created)
      const month = created.format('MMMM YYYY')

      if (!months[month]) {
        months[month] = []
      }

      months[month].push(message)
    }

    let scopedTeam = {}

    if (this.state.teams && scope !== this.state.currentUser.username) {
      scopedTeam = this.state.teams.find(team => {
        return team.id === scope
      })
    }

    const eventList = month => {
      return months[month].map(item => {
        return (
          <EventMessage
            content={item}
            key={item.id}
            currentUser={this.state.currentUser}
            team={scopedTeam}
          />
        )
      })
    }

    const monthKeys = Object.keys(months)

    if (monthKeys.length === 0) {
      return <NoEvents />
    }

    return monthKeys.map(month => (
      <div key={month}>
        <h1>{month}</h1>
        {eventList(month)}

        <style jsx>
          {`
          div {
            position: relative;
          }

          h1 {
            background: #F5F5F5;
            font-size: 13px;
            height: 30px;
            line-height: 30px;
            padding: 0 10px;
            color: #000;
            margin: 0;
            position: sticky;
            top: 0;
          }
        `}
        </style>
      </div>
    ))
  }

  setScope(scope) {
    if (this.scrollingSection) {
      this.scrollingSection.scrollTop = 0
    }

    this.setState({ scope })
  }

  render() {
    const dropZoneRef = zone => {
      this.dropZone = zone
    }

    const scrollRef = element => {
      this.scrollingSection = element
    }

    return (
      <main>
        <TopArrow />

        <div onDragEnter={this.showDropZone.bind(this)}>
          <Title light>Now</Title>

          {this.state.dropZone &&
            <DropZone ref={dropZoneRef} hide={this.hideDropZone.bind(this)} />}

          <section ref={scrollRef}>
            {this.renderEvents()}
          </section>

          <Switcher
            setFeedScope={this.setScope.bind(this)}
            setTeams={teams => this.setState({ teams })}
            currentUser={this.state.currentUser}
          />
        </div>

        <style jsx>
          {`
          main, div {
            display: flex;
            flex-direction: column;
          }

          main {
            height: 100vh;
          }

          div {
            flex-shrink: 1;
            position: relative;
          }

          section {
            overflow: scroll;
            background: #fff;
            user-select: none;
            cursor: default;
            flex-shrink: 1;
            position: relative;
          }

          /*
            This is required because the element always needs
            to be at least as high as the remaining space, flex
            will shrink it down then
          */

          section {
            height: 100vh;
          }
        `}
        </style>

        <style jsx global>
          {`
          body {
            font-family: BlinkMacSystemFont;
            -webkit-font-smoothing: antialiased;
            margin: 0;
            overflow: hidden;
          }
        `}
        </style>
      </main>
    )
  }
}

export default Feed

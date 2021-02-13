/* global Module */

/* Magic Mirror
 * Module: MMM-SoccerLiveScore
 *
 * By Omar Adobati https://github.com/0m4r
 * MIT Licensed.
 */

Module.register("MMM-SoccerLiveScore", {

  changeLeagueTimeout: null,
  defaultTimeoutValueinMillis: 1000,
  updateDomTimeout: null,

  standings: {},
  tables: [],
  scorers: [],

  scorersActive: false,
  standingActive: true,
  tablesActive: true,

  defaults: {
    leagues: [1],
    showNames: true,
    showLogos: true,
    displayTime: 20 * 1000,
    showStandings: true,
    showTables: true,
    showScorers: true,
  },

  getScripts: function () {
    return ["moment.js"];
  },

  getStyles: function () {
    return ["font-awesome.css", "MMM-SoccerLiveScore.css"]
  },

  start: function () {
    Log.info("Starting module " + this.name, this.config);
    this.loade = false;
    this.logos = {};
    this.standings = {};
    this.leagueIds = {};
    this.tables = {};
    this.tableActive = false;
    this.idList = [];
    this.activeId = 0;
    this.sendConfigs();
    Log.debug("with config: " + JSON.stringify(this.config));
  },

  stop: function () {
    Log.info("Stopping module " + this.name);
  },

  resume: function () {
    Log.info("Resuming module " + this.name);
    Log.debug("with config: " + JSON.stringify(this.config));
  },

  suspend: function () {
    Log.info("Suspending module " + this.name);
  },

  setLeague: function () {
    Log.info(this.name, 'setLeague', this.idList)
    if (this.idList.length === 0) {
      setTimeout(function () {
        this.setLeague(this);
      }, this.defaultTimeoutValueinMillis);
    } else {
      this.activeId = this.idList[0];
      this.updateDom(this.defaultTimeoutValueinMillis);
    }
  },


  changeLeague: function (count = 0) {
    Log.info(this.name, 'changeLeague', this.config.displayTime)
    clearTimeout(this.changeLeagueTimeout)
    let displayTime = 1000
    index = 0;
    if (this.idList.length > 0) {
      displayTime = this.config.displayTime
      if (count < this.idList.length) {
        index = count;
      }
      this.activeId = this.idList[index];
      this.updateDom();
    }

    this.changeLeagueTimeout = setTimeout(() => {
      this.changeLeague(index + 1);
    }, this.config.displayTime);
  },

  sendConfigs: function () {
    const config = {
      ...this.config,
      leagues: this.config.leagues,
      showLogos: this.config.showLogos,
      showTables: this.config.showTables
    }
    this.sendSocketNotification('CONFIG', config);
  },

  getDom: function () {
    Log.debug(this.name, 'getDom', this.activeId, 'table', this.tableActive);
    clearTimeout(this.updateDomTimeout);
    const self = this;
    const wrapper = document.createElement("div");

    if (this.idList.length === 0 || !this.idList.includes(this.activeId)) {
      wrapper.innerHTML = '';
      return wrapper;
    }

    const standing = this.standings && Object.keys(this.standings).length ? this.standings[this.activeId] : []
    const tables = this.tables && Object.keys(this.tables).length ? this.tables[this.activeId] : []
    const scorers = this.scorers && Object.keys(this.scorers).length ? this.scorers[this.activeId] : []

    const hasStandingsToShow = this.config.showStandings && standing && Object.keys(standing).length > 0;
    const hasTablesToShow = this.config.showTables && tables && tables.length > 0;
    const hasScorersToShow = this.config.showScorers && scorers && scorers.length > 0;

    if (hasTablesToShow && this.tableActive) {
      tables.forEach(t => {
        const table = t.table
        const places = document.createElement('table');
        places.className = 'xsmall';
        const title = document.createElement('header');
        title.innerHTML = this.leagueIds[this.activeId].name;
        wrapper.appendChild(title);

        const labelRow = document.createElement("tr");

        const position = document.createElement("th");
        labelRow.appendChild(position);

        const logo = document.createElement("th");
        labelRow.appendChild(logo);

        const name = document.createElement("th");
        name.innerHTML = 'TEAM';
        name.setAttribute('align', 'left');
        labelRow.appendChild(name);

        const playing = document.createElement("th");
        labelRow.appendChild(playing);

        const gamesLabel = document.createElement("th");
        const gamesLogo = document.createElement("i");
        gamesLogo.classList.add("fa", "fa-hashtag");
        gamesLabel.setAttribute('width', '30px');
        gamesLabel.appendChild(gamesLogo);
        labelRow.appendChild(gamesLabel);

        const goalsLabel = document.createElement("th");
        const goalslogo = document.createElement("i");
        goalslogo.classList.add("fa", "fa-soccer-ball-o");
        goalsLabel.appendChild(goalslogo);
        goalsLabel.setAttribute('width', '30px');
        labelRow.appendChild(goalsLabel);

        const pointsLabel = document.createElement("th");
        const pointslogo = document.createElement("i");
        pointslogo.classList.add("fa", "fa-line-chart");
        pointsLabel.setAttribute('width', '30px');
        pointsLabel.appendChild(pointslogo);
        labelRow.appendChild(pointsLabel);

        places.appendChild(labelRow);

        table.forEach((tableRow, i) => {
          const place = document.createElement('tr');

          if (tableRow.marker_color) {
            place.setAttribute('style', 'background-color:' + tableRow.marker_color + '0d')
          }

          const number = document.createElement('td');
          number.innerHTML = i + 1;
          place.appendChild(number);

          if (this.config.showLogos) {
            const team_logo_cell = document.createElement('td');
            const team_logo_image = document.createElement('img');
            team_logo_image.className = 'MMM-SoccerLiveScore-team_logo';
            team_logo_image.src = 'https://www.toralarm.com/api/proxy/images/ta/images/teams/' + tableRow.team_id + '/64/';
            team_logo_image.width = 20;
            team_logo_image.height = 20;
            team_logo_cell.appendChild(team_logo_image);
            place.appendChild(team_logo_cell);
          }

          if (this.config.showNames) {
            const team_name = document.createElement('td');
            team_name.setAttribute('align', 'left');
            team_name.innerHTML = tableRow.team_name;
            place.appendChild(team_name);
          }

          const is_playing = document.createElement('td');
          is_playing.setAttribute('align', 'right');
          const is_playing_dot = document.createElement('p');
          if (tableRow.is_playing) {
            is_playing_dot.classList.add('MMM-SoccerLiveScore-active-dot');
          }
          is_playing.appendChild(is_playing_dot);
          place.appendChild(is_playing);

          const games = document.createElement('td');
          games.innerHTML = tableRow.games;
          place.appendChild(games);

          const goals = document.createElement('td');
          goals.innerHTML = tableRow.dif;
          place.appendChild(goals);

          const points = document.createElement('td');
          points.innerHTML = tableRow.points;
          place.appendChild(points);

          places.appendChild(place);
        });
        wrapper.appendChild(places);
      });

      this.tableActive = false;
      this.standingActive = !hasScorersToShow;
      this.scorersActive = hasScorersToShow;

    } else if (hasStandingsToShow && this.standingActive) {
      const matches = document.createElement('table');
      matches.className = 'xsmall';
      const round = standing && 'current_round' in standing ? standing.current_round : null
      const roundLabel = round && 'rounds' in standing ? ' | ' + standing.rounds[round - 1] : ''
      const title = document.createElement('header');
      title.innerHTML = (this.leagueIds[this.activeId].name + roundLabel).trim()
      wrapper.appendChild(title);

      const activeLeagueStandings = standing.data || [];
      activeLeagueStandings.forEach(activeStanding => {
        const activeMatches = activeStanding.matches || []
        if (activeMatches.length > 0) {

          const time_row = document.createElement('tr');
          const time = document.createElement('td');
          time.innerHTML = moment(activeStanding.time * 1000).format('DD.MM - HH:mm');
          time.className = 'MMM-SoccerLiveScore-time';
          time.setAttribute('colspan', '7');
          time_row.appendChild(time);
          matches.appendChild(time_row);


          activeMatches.forEach(activeMatch => {
            const match = document.createElement('tr');

            if (this.config.showNames) {
              const team1_name = document.createElement('td');
              team1_name.setAttribute('align', 'right');
              team1_name.innerHTML = activeMatch.team1_name;
              match.appendChild(team1_name);
            }

            if (this.config.showLogos) {
              const team1_logo_cell = document.createElement('td');
              team1_logo_cell.setAttribute('align', 'right');
              const team1_logo_image = document.createElement('img');
              team1_logo_image.className = 'MMM-SoccerLiveScore-team1_logo';
              team1_logo_image.src = 'https://www.toralarm.com/api/proxy/images/ta/images/teams/' + activeMatch.team1_id + '/64/';
              team1_logo_image.width = 20;
              team1_logo_image.height = 20;
              team1_logo_cell.appendChild(team1_logo_image);
              match.appendChild(team1_logo_cell);
            }

            const team1_score = document.createElement('td');
            team1_score.setAttribute('width', '15px');
            team1_score.setAttribute('align', 'center');
            team1_score.innerHTML = activeMatch.team1_goals;
            const colon = document.createElement('td');
            colon.innerHTML = ':';
            const team2_score = document.createElement('td');
            team2_score.setAttribute('width', '15px');
            team2_score.setAttribute('align', 'center');
            team2_score.innerHTML = activeMatch.team2_goals;
            match.appendChild(team1_score);
            match.appendChild(colon);
            match.appendChild(team2_score);

            if (![0, 100, 110, 120].includes(activeMatch.status)) {
              team1_score.classList.add('MMM-SoccerLiveScore-active');
              colon.classList.add('MMM-SoccerLiveScore-active');
              team2_score.classList.add('MMM-SoccerLiveScore-active');
            }

            if (this.config.showLogos) {
              const team2_logo_cell = document.createElement('td');
              team2_logo_cell.setAttribute('align', 'left');
              const team2_logo_image = document.createElement('img');
              team2_logo_image.className = 'MMM-SoccerLiveScore-team2_logo';
              team2_logo_image.src = 'https://www.toralarm.com/api/proxy/images/ta/images/teams/' + activeMatch.team2_id + '/64/';
              team2_logo_image.width = 20;
              team2_logo_image.height = 20;
              team2_logo_cell.appendChild(team2_logo_image);
              match.appendChild(team2_logo_cell);
            }

            if (this.config.showNames) {
              const team2_name = document.createElement('td');
              team2_name.setAttribute('align', 'left');
              team2_name.innerHTML = activeMatch.team2_name;
              match.appendChild(team2_name);
            }
            matches.appendChild(match);
          })
        }
      });
      wrapper.appendChild(matches);

      this.tableActive = hasTablesToShow;
      this.standingActive = false;
      this.scorersActive = !hasTablesToShow;
    } else if (hasScorersToShow && this.scorersActive) {

      scorers.forEach(scorer => {
        const table = document.createElement('table');
        table.className = 'xsmall';
        const round = standing && 'current_round' in standing ? standing.current_round : null
        const roundLabel = round && 'rounds' in standing ? ' | ' + standing.rounds[round - 1] : ''
        const title = document.createElement('header');
        title.innerHTML = (this.leagueIds[this.activeId].name + ' ' + roundLabel + ' ' + scorer.type).trim()
        wrapper.appendChild(title);

        const tableHeaderRow = document.createElement("tr");

        const position = document.createElement("th");
        position.setAttribute('align', 'left');
        const positionLogo = document.createElement("i");
        positionLogo.classList.add("fa", "fa-line-chart");
        positionLogo.setAttribute('align', 'left');
        position.appendChild(positionLogo);
        tableHeaderRow.appendChild(position);

        const name = document.createElement("th");
        name.innerHTML = 'PLAYER';
        name.setAttribute('align', 'left');
        tableHeaderRow.appendChild(name);

        const goals = document.createElement("th");
        const goalslogo = document.createElement("i");
        goalslogo.classList.add("fa", "fa-soccer-ball-o");
        goalslogo.setAttribute('align', 'left');
        goals.appendChild(goalslogo);
        tableHeaderRow.appendChild(goals);

        if (this.config.showLogos) {
          const logo = document.createElement("th");
          logo.setAttribute('align', 'left');
          tableHeaderRow.appendChild(logo);
        }

        if (this.config.showNames) {
          const playing = document.createElement("th");
          playing.setAttribute('align', 'left');
          tableHeaderRow.appendChild(playing);
        }

        table.appendChild(tableHeaderRow);
        wrapper.appendChild(table)

        scorer.scorers.forEach(s => {
          const tableRow = document.createElement("tr");

          const position = document.createElement("td");
          position.innerHTML = s.position;
          position.setAttribute('align', 'left');
          tableRow.appendChild(position);

          const name = document.createElement("td");
          name.innerHTML = s.player_name;
          name.setAttribute('align', 'left');
          tableRow.appendChild(name);

          const goals = document.createElement("td");
          goals.innerHTML = s.goals;
          goals.setAttribute('align', 'left');
          tableRow.appendChild(goals);

          if (this.config.showLogos) {
            const team_logo_cell = document.createElement('td');
            const team_logo_image = document.createElement('img');
            team_logo_image.className = 'MMM-SoccerLiveScore-team_logo';
            team_logo_image.src = 'https://www.toralarm.com/api/proxy/images/ta/images/teams/' + s.team_id + '/64/';
            team_logo_image.width = 20;
            team_logo_image.height = 20;
            team_logo_image.setAttribute('align', 'left');
            team_logo_cell.appendChild(team_logo_image);
            tableRow.appendChild(team_logo_cell);
          }

          if (this.config.showNames) {
            const team_name = document.createElement('td');
            team_name.setAttribute('align', 'left');
            team_name.innerHTML = s.team_name;
            tableRow.appendChild(team_name);
          }

          table.appendChild(tableRow);
        })
      })

      this.tableActive = !hasStandingsToShow;
      this.standingActive = hasStandingsToShow;
      this.scorersActive = false;
    }

    this.updateDomTimeout = setTimeout(function () {
      self.updateDom(this.defaultTimeoutValueinMillis);
    }, this.config.displayTime / 6);


    return wrapper;
  },

  socketNotificationReceived: function (notification, payload) {
    Log.info(this.name, "socketNotificationReceived", notification, payload)
    if (notification === 'LEAGUES') {
      this.idList = Object.keys(payload.leaguesList)
      this.leagueIds = payload.leaguesList
      if (this.idList && this.idList[0]) {
        this.changeLeague(this.idList[0])
      }
    } else if (notification === 'STANDINGS') {
      this.standings[payload.leagueId] = payload.standings;
      if (!this.config.showTables) {
        this.updateDom();
      }
    } else if (notification === 'TABLE') {
      this.tables[payload.leagueId] = payload.table;
    } else if (notification === 'SCORERS') {
      this.scorers[payload.leagueId] = payload.scorers;
    } else {
      Log.error(this.name, "unknown notification", notification, payload)
    }
  }
});

/* MagicMirror²
 * Module: MMM-SoccerLiveScore
 *
 * By Omar Adobati https://github.com/0m4r
 * MIT Licensed.
 */

Module.register('MMM-SoccerLiveScore', {
  name: "MMM-SoccerLiveScore",
  changeLeagueTimeout: null,
  defaultTimeoutValueInMillis: 1000,
  updateDomTimeout: null,

  standings: {},
  tables: {},
  scorers: {},
  nextRequest: [],

  scorersActive: false,
  standingActive: true,
  tablesActive: true,

  defaults: {
    leagues: [1], // UEFA Champions League (UCL)
    displayTime: 20 * 1000, // 20 seconds
    showNames: true,
    showLogos: true,
    showStandings: true,
    showTables: true,
    showScorers: true,
    showDetails: true,
    scrollVertical: true,
    logosToInvert: [109], // Juventus
  },

  getStyles: function () {
    return ['font-awesome.css', 'MMM-SoccerLiveScore.css'];
  },

  start: function () {
    Log.info('Starting module ' + this.name, JSON.stringify(this.config));
    this.logos = {};
    this.standings = {};
    this.leagueIds = {};
    this.tables = {};
    this.tableActive = false;
    this.idList = [];
    this.activeId = null;
    this.sendConfig();
    Log.debug('with config: ' + JSON.stringify(this.config));
  },

  stop: function () {
    Log.info('Stopping module ' + this.name);
  },

  resume: function () {
    Log.info('Resuming module ' + this.name);
    Log.debug('with config: ' + JSON.stringify(this.config));
  },

  suspend: function () {
    Log.info('Suspending module ' + this.name);
  },

  changeLeague: function (count = 0) {
    Log.debug(this.name, 'changeLeague', this.config.displayTime, this.activeId, count, this.changeLeagueTimeout);
    clearTimeout(this.changeLeagueTimeout);
    if (this.idList.length > 0) {
      const index = count % this.idList.length;
      this.activeId = this.idList[index];
      this.standingActive = this.config.showStandings;
      // this.tableActive =
      //   this.leagueIds[this.activeId].has_table && !this.config.showStandings && this.config.showTables;
      // this.scorersActive =
      //   this.leagueIds[this.activeId].has_scorers &&
      //   !this.config.showStandings &&
      //   !this.config.showTables &&
      //   this.config.showScorers;
      this.updateDom();

      this.changeLeagueTimeout = setTimeout(() => {
        this.changeLeague(++count);
      }, this.config.displayTime);
    }
  },

  sendConfig: function () {
    const config = {
      ...this.config,
      leagues: this.config.leagues,
      showTables: this.config.showTables,
      showScorers: this.config.showScorers,
      showStandings: this.config.showStandings,
      showDetails: this.config.showDetails,
    };
    this.sendSocketNotification(this.name + '-CONFIG', config);
  },

  buildTD: function (value = '', classes = [], colspan = 1) {
    const td = document.createElement('td');
    let classNames = classes
    if (!Array.isArray(classes)) {
      classNames = [classes]
    }
    td.classList.add(...classNames)
    td.innerHTML = value;
    td.setAttribute('colspan', colspan);
    return td;
  },

  buildTDForFlag: function (value, classes) {
    console.log(value)
    const td = this.buildTD('', classes)
    const img = document.createElement('img')
    const invert = this.config.logosToInvert.some(s => console.log(value, s) || value.includes(`${s}`))
    console.log(invert)
    if (invert) {
      img.classList.add('MMM-SoccerLiveScore-team_logo--invert');
    }
    img.src = value
    img.style.width = '20px'
    img.style.height = '20px'
    td.appendChild(img)
    return td;
  },

  buildTH: function (value) {
    const th = document.createElement('th');
    th.innerHTML = value;
    return th;
  },

  renderStandings: function ({ standing, wrapper, nextRequest }) {
    const matches = document.createElement('table');
    matches.className = 'xsmall';
    const round = standing && 'current_round' in standing ? standing.current_round : null;
    const roundLabel = round && 'rounds' in standing ? ' | ' + standing.rounds[round - 1] : '';
    const title = document.createElement('header');

    title.innerHTML = "" + roundLabel; //(this.leagueIds[this.activeId].name + roundLabel).trim();
    wrapper.appendChild(title);

    standing.forEach(f => {
      const tr = document.createElement('tr');
      tr.appendChild(this.buildTD(new Date(f.date).toLocaleDateString(), 'MMM-SoccerLiveScore-date', 7));
      matches.appendChild(tr)

      f.games.forEach(m => {
        const tr1 = document.createElement('tr');
        const time = new Date(m.utcDate).toLocaleTimeString()
        const group = m.group
        tr1.appendChild(this.buildTD(time + " " + group, [], 7));
        tr1.classList.add('MMM-SoccerLiveScore-' + m.status, 'MMM-SoccerLiveScore-time-group')
        matches.appendChild(tr1)

        const tr = document.createElement('tr');
        tr.appendChild(this.buildTD(m.homeTeam.name, 'MMM-SoccerLiveScore-homeTeam'));
        tr.appendChild(this.buildTDForFlag(m.homeTeam.crest, 'MMM-SoccerLiveScore-flag'));
        tr.appendChild(this.buildTD(m.score.fullTime.home, 'MMM-SoccerLiveScore-score'));
        tr.appendChild(this.buildTD('-'));
        tr.appendChild(this.buildTD(m.score.fullTime.away, 'MMM-SoccerLiveScore-score'));
        tr.appendChild(this.buildTDForFlag(m.awayTeam.crest, 'MMM-SoccerLiveScore-flag'));
        tr.appendChild(this.buildTD(m.awayTeam.name, 'MMM-SoccerLiveScore-awayTeam'));
        tr.classList.add('MMM-SoccerLiveScore-' + m.status)
        matches.appendChild(tr)

        m.referees.forEach(r => {
          const trReferee = document.createElement("tr");
          trReferee.appendChild(this.buildTD(`${r.type.toLowerCase()}: ${r?.name} (${r?.nationality})`, `MMM-SoccerLiveScore-referee`, 7))
          matches.appendChild(trReferee)
        })
      });
    });

    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.setAttribute('colspan', '7');
    td.classList.add('MMM-SoccerLiveScore__api-info');
    td.innerHTML = 'Next API request: ' + nextRequest;
    tr.appendChild(td);
    matches.appendChild(tr);

    this.standingActive = true
    return matches;
    // outerWrapper.appendChild(matches)


    // this.standingActive = (!hasTablesToShow && !hasScorersToShow) || false;
    // this.tableActive = hasTablesToShow;
    // this.scorersActive = !hasTablesToShow && hasScorersToShow;
  },

  getDom: function () {
    Log.debug(this.name, 'getDom', this.activeId);
    clearTimeout(this.updateDomTimeout);
    const self = this;
    const outerWrapper = document.createElement('div');
    const wrapper = document.createElement('div');
    outerWrapper.appendChild(wrapper);
    outerWrapper.classList.add('MMM-SoccerLiveScore-outer-wrapper');
    wrapper.classList.add('MMM-SoccerLiveScore-inner-wrapper');

    if (!this.activeId || this.idList.length === 0 || !this.idList.includes(this.activeId)) {
      wrapper.innerHTML = 'Loading...';
      return wrapper;
    }

    const standing = this.standings && Object.keys(this.standings).length ? this.standings[this.activeId] : [];
    const tables = this.tables && Object.keys(this.tables).length ? this.tables[this.activeId] : [];
    const scorers = this.scorers && Object.keys(this.scorers).length ? this.scorers[this.activeId] : [];

    const hasStandingsToShow = this.config.showStandings === true && standing && Object.keys(standing).length > 0;
    // const hasTablesToShow =
    //   (this.leagueIds[this.activeId].has_table && this.config.showTables) === true &&
    //   Array.isArray(tables) &&
    //   tables.length > 0;
    // const hasScorersToShow =
    //   (this.leagueIds[this.activeId].has_scorers && this.config.showScorers) === true &&
    //   Array.isArray(scorers) &&
    //   scorers.length > 0;
    const hasTablesToShow = false;
    const hasScorersToShow = false;
    const formatDate = (time) => {
      const d = new Date(time);
      return d.toLocaleString();
    };

    let nextRequest = null;
    if (this.nextRequest[this.activeId]) {
      const tmp = new Date(this.nextRequest[this.activeId]);
      nextRequest = formatDate(tmp);
    }

    if (hasStandingsToShow && this.standingActive) {
      const matches = this.renderStandings({ standing, wrapper, nextRequest })
      outerWrapper.appendChild(matches)
      // this.standingActive = (!hasTablesToShow && !hasScorersToShow) || false;
      // this.tableActive = hasTablesToShow;
      // this.scorersActive = !hasTablesToShow && hasScorersToShow;
    } else if (hasTablesToShow && this.tableActive) {
      tables.forEach((t) => {
        const table = t.table;
        if (table) {
          const places = document.createElement('table');
          places.className = 'xsmall';
          const title = document.createElement('header');
          title.innerHTML = this.leagueIds[this.activeId].name;
          wrapper.appendChild(title);

          const labelRow = document.createElement('tr');

          const position = document.createElement('th');
          labelRow.appendChild(position);

          if (this.config.showLogos) {
            const logo = document.createElement('th');
            logo.setAttribute('width', '30px');
            labelRow.appendChild(logo);
          }

          if (this.config.showNames) {
            const name = document.createElement('th');
            name.innerHTML = 'TEAM';
            name.setAttribute('align', 'left');
            labelRow.appendChild(name);
          }

          const playing = document.createElement('th');
          labelRow.appendChild(playing);

          const gamesLabel = document.createElement('th');
          const gamesLogo = document.createElement('i');
          gamesLogo.classList.add('fa', 'fa-hashtag');
          gamesLabel.setAttribute('width', '30px');
          gamesLabel.appendChild(gamesLogo);
          labelRow.appendChild(gamesLabel);

          const goalsLabel = document.createElement('th');
          const goalsLogo = document.createElement('i');
          goalsLogo.classList.add('fa', 'fa-soccer-ball-o');
          goalsLabel.setAttribute('width', '30px');
          goalsLabel.appendChild(goalsLogo);
          labelRow.appendChild(goalsLabel);

          const pointsLabel = document.createElement('th');
          const pointsLogo = document.createElement('i');
          pointsLogo.classList.add('fa', 'fa-line-chart');
          pointsLabel.setAttribute('width', '30px');
          pointsLabel.appendChild(pointsLogo);
          labelRow.appendChild(pointsLabel);

          places.appendChild(labelRow);

          table.forEach((tableRow, i) => {
            const place = document.createElement('tr');

            if (tableRow.marker_color) {
              place.setAttribute('style', 'background-color:' + tableRow.marker_color + '0d');
            }

            const number = document.createElement('td');
            number.innerHTML = i + 1;
            place.appendChild(number);

            if (this.config.showLogos) {
              const team_logo_cell = document.createElement('td');
              const team_logo_image = document.createElement('img');
              team_logo_image.className = 'MMM-SoccerLiveScore-team_logo';
              if (this.config.logosToInvert.includes(tableRow.team_id)) {
                team_logo_image.classList.add('MMM-SoccerLiveScore-team_logo--invert');
              }
              team_logo_image.src =
                'https://www.toralarm.com/api/proxy/images/ta/images/teams/' + tableRow.team_id + '/64/';
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
            is_playing.className = 'MMM-SoccerLiveScore__is_playing';
            const is_playing_dot = document.createElement('p');
            if (tableRow.is_playing) {
              is_playing_dot.classList.add('MMM-SoccerLiveScore__is_playing__active-dot');
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
        }
      });

      this.standingActive = hasStandingsToShow && !hasScorersToShow;
      this.tableActive = (!hasScorersToShow && !hasStandingsToShow) || false;
      this.scorersActive = hasScorersToShow;
    } else if (hasScorersToShow && this.scorersActive) {
      scorers.forEach((scorer) => {
        const table = document.createElement('table');
        table.className = 'xsmall';
        const round = standing && 'current_round' in standing ? standing.current_round : null;
        const roundLabel = round && 'rounds' in standing ? ' | ' + standing.rounds[round - 1] : '';
        const title = document.createElement('header');
        title.innerHTML = (this.leagueIds[this.activeId].name + ' ' + roundLabel + ' ' + scorer.type).trim();
        wrapper.appendChild(title);

        const tableHeaderRow = document.createElement('tr');

        const position = document.createElement('th');
        position.setAttribute('align', 'left');
        const positionLogo = document.createElement('i');
        positionLogo.classList.add('fa', 'fa-line-chart');
        positionLogo.setAttribute('align', 'left');
        position.appendChild(positionLogo);
        tableHeaderRow.appendChild(position);

        const name = document.createElement('th');
        name.innerHTML = 'PLAYER';
        name.setAttribute('align', 'left');
        tableHeaderRow.appendChild(name);

        const goals = document.createElement('th');
        const goalsLogo = document.createElement('i');
        goalsLogo.classList.add('fa', 'fa-soccer-ball-o');
        goals.setAttribute('align', 'center');
        goals.appendChild(goalsLogo);
        tableHeaderRow.appendChild(goals);

        if (this.config.showLogos) {
          const logo = document.createElement('th');
          logo.setAttribute('align', 'left');
          tableHeaderRow.appendChild(logo);
        }

        if (this.config.showNames) {
          const playing = document.createElement('th');
          playing.setAttribute('align', 'left');
          tableHeaderRow.appendChild(playing);
        }

        matches.appendChild(tableHeaderRow);
        wrapper.appendChild(table);

        scorer.scorers.forEach((s) => {
          const tableRow = document.createElement('tr');

          const position = document.createElement('td');
          position.innerHTML = s.position;
          position.setAttribute('align', 'left');
          tableRow.appendChild(position);

          const name = document.createElement('td');
          name.innerHTML = s.player_name;
          name.setAttribute('align', 'left');
          tableRow.appendChild(name);

          const goals = document.createElement('td');
          goals.innerHTML = s.goals;
          goals.setAttribute('align', 'left');
          tableRow.appendChild(goals);

          if (this.config.showLogos) {
            const team_logo_cell = document.createElement('td');
            const team_logo_image = document.createElement('img');
            team_logo_image.className = 'MMM-SoccerLiveScore-team_logo';
            if (this.config.logosToInvert.includes(s.team_id)) {
              team_logo_image.classList.add('MMM-SoccerLiveScore-team_logo--invert');
            }
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

          matches.appendChild(tableRow);
        });
      });

      this.standingActive = hasStandingsToShow;
      this.tableActive = !hasStandingsToShow && hasTablesToShow;
      this.scorersActive = (hasScorersToShow && !hasStandingsToShow && !hasTablesToShow) || false;
    }

    const timeSplit = [hasStandingsToShow, hasTablesToShow, hasScorersToShow].filter((v) => v);
    Log.debug(this.name, 'timeSplit', timeSplit.length, this.activeId);

    clearTimeout(this.updateDomTimeout);
    if (timeSplit.length > 0) {
      this.updateDomTimeout = setTimeout(
        function () {
          self.updateDom(this.defaultTimeoutValueInMillis);
        },
        this.config.displayTime / (timeSplit.length || 1)
      );
    } else {
      const activeIdIndex = this.idList.findIndex((i) => i === this.activeId);
      setTimeout(function () {
        self.changeLeague(activeIdIndex + 1);
      }, 1 * 1000);
      wrapper.innerHTML = 'Loading...';
    }

    if (this.config.scrollVertical) {
      setTimeout(() => {
        const rect = outerWrapper.getBoundingClientRect();
        const top = rect.height + rect.top;
        if (window.innerHeight < top) {
          var r = document.querySelector(':root');
          const offset = window.innerHeight - top;
          r.style.setProperty('--vertical-animation-offset', parseInt(offset * 1.01) + 'px');
          outerWrapper.classList.add('MMM-SoccerLiveScore-vertical-infinite-scroll');
        }
      }, 500);
    }

    return outerWrapper;
  },

  socketNotificationReceived(notification, payload) {
    const name = "MMM-SoccerLiveScore";
    Log.debug(name, 'socketNotificationReceived', notification, JSON.stringify(payload));
    this.standingActive = this.config.showStandings;
    this.tableActive = !this.config.showStandings && this.config.showTables;
    this.scorersActive = !this.config.showStandings && !this.config.showTables && this.config.showScorers;

    if (notification === name + '-LEAGUES') {
      this.idList = Object.values(payload.leaguesList).map(c => c.code);
      this.leagueIds = payload.leaguesList;
      if (this.idList && this.idList.length > 0) {
        this.changeLeague();
      }
    } else if (notification === name + '-STANDINGS') {
      this.standings[payload.leagueId] = payload.standings;
      this.nextRequest[payload.leagueId] = payload.nextRequest;
    } else if (notification === name + '-TABLE') {
      this.tables[payload.leagueId] = payload.table;
    } else if (notification === name + '-SCORERS') {
      this.scorers[payload.leagueId] = payload.scorers;
    } else {
      Log.log(this.name, 'unknown notification', notification, JSON.stringify(payload));
    }
    this.updateDom?.(500);
  },
});

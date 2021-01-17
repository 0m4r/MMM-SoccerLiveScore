/* global Module */

/* Magic Mirror
 * Module: MMM-SoccerLiveScore
 *
 * By Luke Scheffler https://github.com/LukeSkywalker92
 * MIT Licensed.
 */

Module.register("MMM-SoccerLiveScore", {

  changeLeagueTimeout: null,
  defaultTimeoutValueinMillis: 1000,
  standingsTableTimout: null,

  defaults: {
    leagues: [1],
    showNames: true,
    showLogos: true,
    displayTime: 20 * 1000,
    showTables: true
  },

  getScripts: function () {
    return ["moment.js"];
  },

  getStyles: function () {
    return ["font-awesome.css", "MMM-SoccerLiveScore.css"]
  },

  start: function () {
    Log.info("Starting module " + this.name);
    this.loadet = false;
    this.logos = {};
    this.standings = {};
    this.leagueIds = {};
    this.tables = {};
    this.tableActive = false;
    this.idList = [];
    this.activeId = 0;
    this.sendConfigs();

    // if (this.config.leagues.length > 1) {
    //   this.changeLeague(0);
    // } else {
    //   this.setLeague(this);
    // }
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
    if (this.idList.length == 0) {
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
      this.updateDom(this.defaultTimeoutValueinMillis);
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
    clearTimeout(this.standingsTableTimout);
    var self = this;
    var wrapper = document.createElement("div");

    if(this.idList.length === 0 || !this.idList.includes(this.activeId)) {
      wrapper.innerHTML = '';
      return wrapper;
    }

    const standing = this.standings && Object.keys(this.standings).length ? this.standings[this.activeId] : []
    const tables = this.tables && Object.keys(this.tables).length ? this.tables[this.activeId] : []
    const showTables = this.config.showTables
    
    if (standing.length === 0 || (showTables && tables && tables.length === 0)) {
      wrapper.innerHTML = '';
      return wrapper;
    }

    if (showTables && this.tableActive && tables.length > 0) {
      tables.forEach(t => {
        const table = t.table
        var places = document.createElement('table');
        places.className = 'xsmall';
        var title = document.createElement('header');
        title.innerHTML = this.leagueIds[this.activeId].name;
        wrapper.appendChild(title);

        var labelRow = document.createElement("tr");

        var position = document.createElement("th");
        labelRow.appendChild(position);

        var logo = document.createElement("th");
        labelRow.appendChild(logo);

        var name = document.createElement("th");
        name.innerHTML = 'TEAM';
        name.setAttribute('align', 'left');
        labelRow.appendChild(name);

        var gamesLabel = document.createElement("th");
        var gamesLogo = document.createElement("i");
        gamesLogo.classList.add("fa", "fa-hashtag");
        gamesLabel.setAttribute('width', '30px');
        gamesLabel.appendChild(gamesLogo);
        labelRow.appendChild(gamesLabel);

        var goalsLabel = document.createElement("th");
        var goalslogo = document.createElement("i");
        goalslogo.classList.add("fa", "fa-soccer-ball-o");
        goalsLabel.appendChild(goalslogo);
        goalsLabel.setAttribute('width', '30px');
        labelRow.appendChild(goalsLabel);

        var pointsLabel = document.createElement("th");
        var pointslogo = document.createElement("i");
        pointslogo.classList.add("fa", "fa-line-chart");
        pointsLabel.setAttribute('width', '30px');
        pointsLabel.appendChild(pointslogo);
        labelRow.appendChild(pointsLabel);

        places.appendChild(labelRow);
        for (var i = 0; i < table.length; i++) {
          var place = document.createElement('tr');

          var number = document.createElement('td');
          number.innerHTML = i + 1;
          place.appendChild(number);

          if (this.config.showLogos) {
            var team_logo_cell = document.createElement('td');
            var team_logo_image = document.createElement('img');
            team_logo_image.className = 'MMM-SoccerLiveScore-team_logo';
            // team_logo_image.src = 'data:image/png;base64, ' + this.logos[table[i].team_id];
            team_logo_image.src = 'https://www.toralarm.com/api/proxy/images/ta/images/teams/' + table[i].team_id + '/64/';
            team_logo_image.width = 20;
            team_logo_image.height = 20;
            team_logo_cell.appendChild(team_logo_image);
            place.appendChild(team_logo_cell);
          }

          if (this.config.showNames) {
            var team_name = document.createElement('td');
            team_name.setAttribute('align', 'left');
            team_name.innerHTML = table[i].team_name;
            place.appendChild(team_name);
          }

          var games = document.createElement('td');
          games.innerHTML = table[i].games;
          place.appendChild(games);

          var goals = document.createElement('td');
          goals.innerHTML = table[i].dif;
          place.appendChild(goals);

          var points = document.createElement('td');
          points.innerHTML = table[i].points;
          place.appendChild(points);

          places.appendChild(place);
        }
        wrapper.appendChild(places);
      })

      this.tableActive = false;
      this.standingsTableTimout = setTimeout(function () {
        self.updateDom(this.defaultTimeoutValueinMillis);
      }, this.config.displayTime / 4);
      return wrapper;
    } else {
      
      const matches = document.createElement('table');
      matches.className = 'xsmall';
      const round = standing && 'current_round' in standing ? standing.current_round : null
      const roundLabel = round && 'rounds' in standing ? ' | ' + standing.rounds[round - 1] : ''
      const title = document.createElement('header');
      title.innerHTML = (this.leagueIds[this.activeId].name + roundLabel).trim()
      wrapper.appendChild(title);

      const activeLeagueStandings = standing.data;
      for (let i = 0; i < activeLeagueStandings.length; i++) {
        const activeMatches = activeLeagueStandings[i].matches || []
        if (activeMatches.length > 0) {

          const time_row = document.createElement('tr');
          const time = document.createElement('td');
          time.innerHTML = moment(activeLeagueStandings[i].time * 1000).format('DD.MM - HH:mm');
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
      }
      if (showTables && tables && tables.length > 0) {
        this.tableActive = true;
        this.standingsTableTimout = setTimeout(function () {
          self.updateDom(this.defaultTimeoutValueinMillis);
        }, this.config.displayTime / 4);
      }
      wrapper.appendChild(matches);
      return wrapper;
    }
  },

  socketNotificationReceived: function (notification, payload) {
    Log.debug(this.name, "socketNotificationReceived", notification, payload)
    if (notification === 'LEAGUES') {
      this.idList = Object.keys(payload.leaguesList)
      this.leagueIds = payload.leaguesList
      if (this.idList && this.idList[0]) {
        this.changeLeague(this.idList[0])
      }
    }else if (notification === 'STANDINGS') {
      this.standings[payload.leagueId] = payload.standings;
      if (!this.config.showTables) {
        this.updateDom();
      }
    } else if (notification === 'TABLE') {
      this.tables[payload.leagueId] = payload.table;
    } else {
      Log.error(this.name, "unknown notification", notification, payload)
    }
  }
});

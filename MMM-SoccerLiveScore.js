/* global Module */

/* Magic Mirror
 * Module: MMM-SoccerLiveScore
 *
 * By Luke Scheffler https://github.com/LukeSkywalker92
 * MIT Licensed.
 */

Module.register("MMM-SoccerLiveScore", {

  defaults: {
    leagues: [35, 1, 9],
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
    this.sendConfigs(this);

    if (this.config.leagues.length > 1) {
      this.changeLeague(this, 0);
    } else {
      this.setLeague(this);
    }
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

  setLeague: function (self) {

    if (self.idList.length == 0) {
      setTimeout(function () {
        self.setLeague(self);
      }, 1000);
    } else {
      self.activeId = self.idList[0];
      self.updateDom(1000);
    }
  },


  changeLeague: function (self, count) {
    if (self.idList.length > 0) {
      if (count < self.idList.length) {
        self.activeId = self.idList[count];
        this.updateDom(1000);
        setTimeout(function () {
          self.changeLeague(self, count + 1);
        }, self.config.displayTime);
      } else {
        self.activeId = this.idList[0];
        this.updateDom(1000);
        setTimeout(function () {
          self.changeLeague(self, 1);
        }, self.config.displayTime);
      }
    } else {
      setTimeout(function () {
        self.changeLeague(self, 0);
      }, 1000);
    }
  },

  sendConfigs: function (self) {

    self.sendSocketNotification('CONFIG', {
      leagues: self.config.leagues,
      showLogos: self.config.showLogos,
      showTables: self.config.showTables
    });
  },

  getDom: function () {
    var self = this;
    var wrapper = document.createElement("div");

    if (Object.keys(this.standings).length === 0) {
      wrapper.innerHTML = '';
      return wrapper;
    }

    const tables = this.tables[this.activeId]    

    if (this.tableActive && tables.length > 0 && this.config.showTables) {
      tables.forEach(t => {
        const table = t.table
        var places = document.createElement('table');
        places.className = 'xsmall';
        var title = document.createElement('header');
        title.innerHTML = this.leagueIds[this.activeId];
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
      setTimeout(function () {
        self.updateDom(1000);
      }, this.config.displayTime / 4);
      return wrapper;
    } else {
      var matches = document.createElement('table');
      matches.className = 'xsmall';
      var title = document.createElement('header');
      title.innerHTML = this.leagueIds[this.activeId];
      wrapper.appendChild(title);

      var activeLeagueStandings = this.standings[this.activeId] || [];
      for (var i = 0; i < activeLeagueStandings.length; i++) {
        if (activeLeagueStandings[i].matches !== undefined) {

          var time_row = document.createElement('tr');
          var time = document.createElement('td');
          time.innerHTML = moment(activeLeagueStandings[i].time * 1000).format('DD.MM - HH:mm');
          time.className = 'MMM-SoccerLiveScore-time';
          time.setAttribute('colspan', '7');
          time_row.appendChild(time);
          matches.appendChild(time_row);

          for (var j = 0; j < activeLeagueStandings[i].matches.length; j++) {

            var match = document.createElement('tr');

            if (this.config.showNames) {
              var team1_name = document.createElement('td');
              team1_name.setAttribute('align', 'left');
              team1_name.innerHTML = activeLeagueStandings[i].matches[j].team1_name;
              match.appendChild(team1_name);
            }

            if (this.config.showLogos) {
              var team1_logo_cell = document.createElement('td');
              var team1_logo_image = document.createElement('img');
              team1_logo_image.className = 'MMM-SoccerLiveScore-team1_logo';
              // team1_logo_image.src = 'data:image/png;base64, ' + this.logos[activeLeagueStandings[i].matches[j].team1_id];
              team1_logo_image.src = 'https://www.toralarm.com/api/proxy/images/ta/images/teams/' + activeLeagueStandings[i].matches[j].team1_id + '/64/';
              team1_logo_image.width = 20;
              team1_logo_image.height = 20;
              team1_logo_cell.appendChild(team1_logo_image);
              match.appendChild(team1_logo_cell);
            }

            var team1_score = document.createElement('td');
            team1_score.setAttribute('width', '15px');
            team1_score.setAttribute('align', 'center');
            team1_score.innerHTML = activeLeagueStandings[i].matches[j].team1_goals;
            var collon = document.createElement('td');
            collon.innerHTML = ':';
            var team2_score = document.createElement('td');
            team2_score.setAttribute('width', '15px');
            team2_score.setAttribute('align', 'center');
            team2_score.innerHTML = activeLeagueStandings[i].matches[j].team2_goals;
            match.appendChild(team1_score);
            match.appendChild(collon);
            match.appendChild(team2_score);

            if (activeLeagueStandings[i].matches[j].status != 0 && activeLeagueStandings[i].matches[j].status != 100) {
              team1_score.classList.add('MMM-SoccerLiveScore-red');
              collon.classList.add('MMM-SoccerLiveScore-red');
              team2_score.classList.add('MMM-SoccerLiveScore-red');
            }

            if (this.config.showLogos) {
              var team2_logo_cell = document.createElement('td');
              var team2_logo_image = document.createElement('img');
              team2_logo_image.className = 'MMM-SoccerLiveScore-team2_logo';
              // team2_logo_image.src = 'data:image/png;base64, ' + this.logos[activeLeagueStandings[i].matches[j].team2_id];
              team2_logo_image.src = 'https://www.toralarm.com/api/proxy/images/ta/images/teams/' + activeLeagueStandings[i].matches[j].team2_id + '/64/';
              team2_logo_image.width = 20;
              team2_logo_image.height = 20;
              team2_logo_cell.appendChild(team2_logo_image);
              match.appendChild(team2_logo_cell);
            }

            if (this.config.showNames) {
              var team2_name = document.createElement('td');
              team2_name.setAttribute('align', 'right');
              team2_name.innerHTML = activeLeagueStandings[i].matches[j].team2_name;
              match.appendChild(team2_name);
            }
            matches.appendChild(match);
          }
        }
      }
      if (tables.length > 0 && this.config.showTables) {
        this.tableActive = true;
        setTimeout(function () {
          self.updateDom(1000);
        }, this.config.displayTime / 4);
      }
      wrapper.appendChild(matches);
      return wrapper;
    }
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification === 'LOGO') {
      this.logos[payload.teamId] = payload.image;
    } else if (notification === 'STANDINGS') {
      this.standings[payload.leagueId] = payload.standings;
      if (!this.config.showTables) {
        this.updateDom();
      }
    } else if (notification === 'LEAGUES') {
      this.idList.push(payload.id);
      this.leagueIds[payload.id] = payload.name;
    } else if (notification === 'TABLE') {
      this.tables[payload.leagueId] = payload.table;
    }
  }
});

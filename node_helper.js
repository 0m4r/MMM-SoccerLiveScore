/* Magic Mirror
 * Module: MMM-SoccerLiveScore
 *
 * By Omar Adobati https://github.com/0m4r
 * MIT Licensed.
 */

const NodeHelper = require('node_helper');
const request = require('request');
const Log = require('../../js/logger.js');

module.exports = NodeHelper.create({
  refreshTime: 2 * 60 * 1000,
  timeoutStandings: [],
  timeoutTable: [],
  timeoutScorers: [],
  showStandings: false,
  showTables: false,
  showScorers: false,
  showDetails: false,
  baseURL: 'https://www.ta4-data.de/ta/data',
  requestOptions: {
    method: 'POST',
    headers: {
      Host: 'ta4-data.de',
      'Content-Type': 'application/x-www-form-urlencoded',
      Connection: 'keep-alive',
      Accept: '*/*',
      'User-Agent': 'TorAlarm/20161202 CFNetwork/808.1.4 Darwin/16.1.0',
      'Accept-Language': 'en-us',
      'Accept-Encoding': 'gzip',
      'Content-Length': '49',
    },
    body: JSON.stringify({ lng: 'en-US', device_type: 0, decode: 'decode' }),
    form: false,
  },

  clearTimeouts: function () {
    Log.debug(this.name, 'clearTimeouts');
    [...this.timeoutStandings, ...this.timeoutScorers, ...this.timeoutTable].forEach((id) => clearTimeout(id));
    this.timeoutStandings.length = 0
    this.timeoutScorers.length = 0
    this.timeoutTable.length = 0
  },

  start: function () {
    Log.log('Starting node helper for:', this.name);
  },

  stop: function () {
    Log.log('Stopping node helper for:', this.name);
    this.clearTimeouts()
  },

  getLeagueIds: function (leagues) {
    this.clearTimeouts()

    const url = `${this.baseURL}/competitions`;
    Log.debug(this.name, 'getLeagueIds', url);
    const self = this;
    const options = {
      ...this.requestOptions,
      url,
    };

    request(options, function (error, _response, body) {
      if (!error && body) {
        const parsedBody = JSON.parse(body);
        const leaguesList = {};
        if ('competitions' in parsedBody) {
          const competitions = parsedBody.competitions;
          leagues.forEach((l) => {
            const comp = competitions.find((c) => c.id === l);
            leaguesList[comp.id] = comp;
          });
          Object.keys(leaguesList).forEach((id) => {
            self.showStandings && self.getStandings(id);
            self.showTables && leaguesList[id].has_table && self.getTable(id);
            self.showScorers && leaguesList[id].has_scorers && self.getScorers(id);
          });
        }
        self.sendSocketNotification(self.name + '-LEAGUES', { leaguesList });
      } else {
        Log.error(this.name, 'getLeagueIds', error);
      }
    });
  },

  getTable: function (leagueId) {
    const url = `${this.baseURL}/competitions/${leagueId.toString()}/table`;
    Log.info(this.name, 'getTable', url);
    const self = this;
    const options = {
      ...this.requestOptions,
      url,
    };
    request(options, function (error, _response, body) {
      if (!error && body) {
        const data = JSON.parse(body);
        Log.debug(self.name, 'getTable | data', JSON.stringify(data, null, 2));
        self.refreshTime = (data.refresh_time || 5 * 60) * 1000;
        Log.debug(self.name, 'getTable | refresh_time', data.refresh_time, self.refreshTime);
        const tables = data.data.filter((d) => d.type === 'table' && d.table);
        self.sendSocketNotification(self.name + '-TABLE', {
          leagueId: leagueId,
          table: tables,
        });
        self.timeoutTable[leagueId] = setTimeout(function () {
          self.getTable(leagueId);
        }, self.refreshTime);
      }
    });
  },

  getStandings: function (leagueId) {
    const url = `${this.baseURL}/competitions/${leagueId.toString()}/matches/round/0`;
    Log.info(this.name, 'getStandings', url);
    const self = this;
    const options = {
      ...this.requestOptions,
      url,
    };

    request(options, function async(error, _response, body) {
      if (!error && body) {
        const data = JSON.parse(body);
        Log.debug(self.name, 'getStandings | data', JSON.stringify(data, null, 2));
        self.refreshTime = (data.refresh_time || 5 * 60) * 1000;
        Log.debug(self.name, 'getStandings | refresh_time', data.refresh_time, self.refreshTime);
        const standings = data;

        const forLoop = async () => {
          if (self.showDetails) {
            for (let s of standings.data) {
              if (s.type === 'matches') {
                const matches = s.matches;
                for (let m of matches) {
                  const d = await self.getDetails(leagueId, m.match_id);
                  const details = d && d.filter(t => t.type === 'details');
                  Log.debug(self.name, 'getStandings | details', JSON.stringify(details, null, 2));
                  m.details = details && details[0] ? details[0].details : []
                  const match_info = d && d.filter(t => t.type === 'match_info');
                  Log.debug(self.name, 'getStandings | match_info', JSON.stringify(match_info, null, 2));
                  m.match_info = match_info && match_info[0] ? match_info[0].match_info : []
                };
              }
            };
          }
        }

        forLoop().then(() => {
          self.sendSocketNotification(self.name + '-STANDINGS', {
            leagueId: leagueId,
            standings: standings,
          });

          self.timeoutStandings[leagueId] = setTimeout(function () {
            self.getStandings(leagueId);
          }, self.refreshTime);
        })
      } else {
        Log.error(error);
        self.timeoutStandings[leagueId] = setTimeout(function () {
          self.getStandings(leagueId);
        }, 5 * 60 * 1000);
      }
    });
  },

  getScorers: function (leagueId) {
    const url = `${this.baseURL}/competitions/${leagueId.toString()}/scorers`;
    Log.info(this.name, 'getScorers', url);
    const self = this;
    const options = {
      ...this.requestOptions,
      url,
    };

    request(options, function (error, _response, body) {
      if (!error && body) {
        const data = JSON.parse(body);
        Log.debug(self.name, 'getScorers | data', JSON.stringify(data, null, 2));
        self.refreshTime = (data.refresh_time || 5 * 60) * 1000;
        Log.debug(self.name, 'getScorers | refresh_time', data.refresh_time, self.refreshTime);
        const scorers = data.data.filter(d => d.type === 'scorers' && d.scorers) || [];
        self.sendSocketNotification(self.name + '-SCORERS', {
          leagueId: leagueId,
          scorers: scorers,
        });
        self.timeoutScorers[leagueId] = setTimeout(function () {
          self.getScorers(leagueId);
        }, self.refreshTime);
      } else {
        Log.error(error);
        self.timeoutScorers[leagueId] = setTimeout(function () {
          self.getScorers(leagueId);
        }, 5 * 60 * 1000);
      }
    });
  },

  getDetails: function (leagueId, matchId) {
    const url = `${this.baseURL}/competitions/${leagueId.toString()}/matches/${matchId.toString()}/details`;
    Log.info(this.name, 'getDetails', url);
    const self = this;
    const options = {
      ...this.requestOptions,
      url,
    };
    let details = []
    return new Promise((resolve, _reject) => {
      request(options, function (error, _response, body) {
        let data = null
        if (!error && body) {
          try {
            data = JSON.parse(body);
            Log.debug(self.name, 'getDetails | data', JSON.stringify(data, null, 2));
            details = data.data || [];
          } catch (e){
            Log.error(body);
            Log.error(e);
          }
        }
        resolve(details);
      });
    });
  },

  socketNotificationReceived: function (notification, payload) {
    Log.info(this.name, 'socketNotificationReceived', notification, payload)
    if (notification === this.name + '-CONFIG') {
      this.showStandings = payload.showStandings;
      this.showDetails = this.showStandings && payload.showDetails;
      this.showTables = payload.showTables;
      this.showScorers = payload.showScorers;
      this.getLeagueIds(payload.leagues);
    }
  },
});

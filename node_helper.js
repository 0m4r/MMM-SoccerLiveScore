/* global Module */

/* Magic Mirror
 * Module: MMM-SoccerLiveScore
 *
 * By Omar Adobati https://github.com/0m4r
 * MIT Licensed.
 */

const NodeHelper = require('node_helper');
const request = require('request');
const Log = require("../../js/logger.js");

module.exports = NodeHelper.create({
  refreshTime: 2 * 60 * 1000,
  timeoutScore: [],
  timeoutTable: [],
  baseURL: 'https://www.ta4-data.de/ta/data',
  requestOptions: {
    method: 'POST',
    headers: {
      'Host': 'ta4-data.de',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Connection': 'keep-alive',
      'Accept': '*/*',
      'User-Agent': 'TorAlarm/20161202 CFNetwork/808.1.4 Darwin/16.1.0',
      'Accept-Language': 'en-us',
      'Accept-Encoding': 'gzip',
      'Content-Length': '49',
    },
    body: '{"lng":"en-US","device_type":0,"decode":"decode"}',
    form: false
  },

  start: function () {
    Log.log('Starting node helper for:', this.name)
  },

  stop: function () {
    Log.log('Stopping node helper for:', this.name)
    ([...this.timeoutScore, ...this.timeoutTable]).forEach(id => clearTimeout(id))
  },

  getLeagueIds: function (leagues, showTables) {
    leagues.forEach(id => {
      clearTimeout(this.timeoutScore[id]);
      clearTimeout(this.timeoutTable[id]);
    })
    
    const url = this.baseURL + '/competitions'
    Log.debug(this.name, 'getLeagueIds', url)
    var self = this;
    var options = {
      ...this.requestOptions,
      url
    }

    request(options, function (error, _response, body) {
      if (!error && body) {
        const parsedBody = JSON.parse(body);
        const leaguesList = {}
        if('competitions' in parsedBody){
          const competitions = parsedBody.competitions;
          leagues.forEach(l => {
            const comp = competitions.find(c => c.id === l)
            console.log(comp)
            leaguesList[comp.id] = comp
          })
          // for (let i = 0; i < leagues.length; i++) {
          //   for (let j = 0; j < competitions.length; j++) {
          //     if (competitions[j].id === leagues[i]) {
          //       leaguesList[competitions[j].id] = competitions[j]
          //     }
          //   }
          // }
          Object.keys(leaguesList).forEach(id => {
            self.getStandings(id)
            leaguesList[id].has_table && showTables && self.getTable(id)
          })
        }
        self.sendSocketNotification('LEAGUES', 
          { leaguesList }
        );
      } else {
        Log.error(this.name, 'getLeagueIds', error)
      }
    });
  },

  getTable: function (leagueId) {
    const url = this.baseURL + '/competitions/' + leagueId.toString() + '/table'
    Log.info(this.name, 'getTable', url)
    const self = this;
    const options = {
      ...this.requestOptions,
      url
    }
    request(options, function (error, response, body) {
      if (!error && body) {
        const data = JSON.parse(body);
        Log.debug(self.name, 'getTable | data', JSON.stringify(data, null, 2))
        self.refreshTime = ((data.refresh_time  || (5 * 60)) * 1000);
        Log.debug(self.name, 'getTable | refresh_time', data.refresh_time, self.refreshTime)
        const tables = data.data.filter(d => d.type === 'table')
        self.sendSocketNotification('TABLE', {
          leagueId: leagueId,
          table: tables
        });
        self.timeoutTable[leagueId] = setTimeout(function () {
          self.getTable(leagueId);
        }, self.refreshTime);
      }
    });
  },

  getStandings: function (leagueId) {
    const url = this.baseURL + '/competitions/' + leagueId.toString() + '/matches/round/0'
    Log.info(this.name, 'getStandings', url)
    const self = this;
    const options = {
      ...this.requestOptions,
      url
    }

    request(options, function (error, response, body) {
      if(!error && body) {
        const data = JSON.parse(body);
        Log.debug(self.name, 'getStandings | data', JSON.stringify(data, null, 2))
        self.refreshTime = ((data.refresh_time  || (5 * 60)) * 1000);
        Log.debug(self.name, 'getStandings | refresh_time', data.refresh_time, self.refreshTime)
        const standings = data;
        self.sendSocketNotification('STANDINGS', {
          leagueId: leagueId,
          standings: standings
        });
        self.timeoutScore[leagueId] = setTimeout(function () {
          self.getStandings(leagueId);
        }, self.refreshTime);
      } else {
        Log.error(error);
        self.timeoutScore[leagueId] = setTimeout(function () {
          self.getStandings(leagueId);
        }, 5 * 60 * 1000);
      }
    });
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification === 'CONFIG') {
      this.getLeagueIds(payload.leagues,  payload.showTables);
    }
  }

});

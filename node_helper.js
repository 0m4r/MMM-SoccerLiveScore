/* global Module */

/* Magic Mirror
 * Module: MMM-SoccerLiveScore
 *
 * By Luke Scheffler https://github.com/LukeSkywalker92
 * MIT Licensed.
 */

const NodeHelper = require('node_helper');
const request = require('request');
const Log = require("../../js/logger.js");

module.exports = NodeHelper.create({
  refreshTime: 2 * 60 * 1000,
  timeoutScore: [],
  timeoutTable: [],
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
    
    const url = 'https://www.ta4-data.de/ta/data/competitions'
    Log.debug(this.name, 'getLeagueIds', url)
    var self = this;
    var options = {
      ...this.requestOptions,
      url
    }

    request(options, function (error, response, body) {
      if (!error && body) {
        const parsedBody = JSON.parse(body);
        if('competitions' in parsedBody){
          var competitions = parsedBody.competitions;
          var leagueIds = [];
          for (var i = 0; i < leagues.length; i++) {
            for (var j = 0; j < competitions.length; j++) {
              if (competitions[j].id == leagues[i]) {
                if (showTables && competitions[j].has_table) {
                  self.getTable(competitions[j].id);
                }

                leagueIds.push(competitions[j].id)
                self.sendSocketNotification('LEAGUES', {
                  name: competitions[j].name,
                  id: competitions[j].id
                });
              }
            }
          }
          for (var i = 0; i < leagueIds.length; i++) {
            self.getScores(leagueIds[i]);
          }
        }
      }
    });
  },

  getTable: function (leagueId) {
    const url = 'https://www.ta4-data.de/ta/data/competitions/' + leagueId.toString() + '/table'
    Log.info(this.name, 'getTable', url)
    var self = this;
    var options = {
      ...this.requestOptions,
      url
    }
    request(options, function (error, response, body) {
      if (!error && body) {
        var data = JSON.parse(body);
        data = data.data;
        const tables = data.filter(d => d.type === 'table')
        self.sendSocketNotification('TABLE', {
          leagueId: leagueId,
          table: tables
        });
      }
    });
  },

  getScores: function (leagueId) {
    const url = 'https://www.ta4-data.de/ta/data/competitions/' + leagueId.toString() + '/matches/round/0'
    Log.info(this.name, 'getScores', url)
    var self = this;
    var options = {
      ...this.requestOptions,
      url
    }

    request(options, function (error, response, body) {
      if(!error && body) {
        var data = JSON.parse(body);
        Log.debug(self.name, 'getScores | data', JSON.stringify(data, null, 2))
        self.refreshTime = ((data.refresh_time  || (5 * 60)) * 1000);
        Log.debug(self.name, 'getScores | refresh_time', data.refresh_time, self.refreshTime)
        var standings = data;
        self.sendSocketNotification('STANDINGS', {
          leagueId: leagueId,
          standings: standings
        });
        self.timeoutScore[leagueId] = setTimeout(function () {
          self.getScores(leagueId);
        }, self.refreshTime);
      } else {
        self.timeoutScore[leagueId] = setTimeout(function () {
          self.getScores(leagueId);
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

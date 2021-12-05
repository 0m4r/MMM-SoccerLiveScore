/* Magic Mirror
 * Module: MMM-SoccerLiveScore
 *
 * By Omar Adobati https://github.com/0m4r
 * MIT Licensed.
 */

const NodeHelper = require('node_helper');
const Log = require('../../js/logger.js');
const fetch = require('node-fetch');

module.exports = NodeHelper.create({
  refreshTime: 2 * 60 * 1000,
  timeoutStandings: [],
  timeoutTable: [],
  timeoutScorers: [],
  showStandings: false,
  showTables: false,
  showScorers: false,
  showDetails: false,
  baseURL: 'https://toralarm.com/api/api',
  requestOptions: {
    method: 'POST',
    gzip: true,
    headers: {
      Host: 'toralarm.com',
      'Content-Type': 'application/x-www-form-urlencoded',
      Connection: 'keep-alive',
      Accept: 'application/json, text/plain, */*',
      'User-Agent': 'TorAlarm/20161202 CFNetwork/808.1.4 Darwin/16.1.0',
      'Accept-Language': 'en-US,en;q=0.9,it;q=0.8,de-DE;q=0.7,de;q=0.6',
      'Accept-Encoding': 'gzip, deflate, br',
      'Content-Length': '12',
    },
    body: JSON.stringify({ lng: 'en-US' }),
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

  getLeagueIds: async function (leagues) {
    this.clearTimeouts()
    const self = this;
    const url = new URL(`${this.baseURL}/competitions`)
    Log.debug(this.name, 'getLeagueIds', url);
    const resp = await fetch(url, this.requestOptions)
    if (resp.status === 200) {
      const data = await resp.json();
      const leaguesList = {};
      if ('competitions' in data) {
        const competitions = data.competitions;
        leagues.forEach((l) => {
          const comp = competitions.find((c) => 'id' in c && c.id === l);
          if (comp && 'id' in comp) {
            leaguesList[comp.id] = comp;
          }
        });
        Object.keys(leaguesList).forEach((id) => {
          self.showStandings && self.getStandings(id);
          self.showTables && leaguesList[id].has_table && self.getTable(id);
          self.showScorers && leaguesList[id].has_scorers && self.getScorers(id);
        });
      }
      self.sendSocketNotification(self.name + '-LEAGUES', { leaguesList });
    } else {
      Log.error(this.name, 'getLeagueIds', resp);
    }
  },

  getTable: async function (leagueId) {
    const url = new URL(`${this.baseURL}/competitions/${leagueId.toString()}/table`);
    Log.debug(this.name, 'getTable', url);
    const self = this;
    const resp = await fetch(url, this.requestOptions)

    if (resp.status === 200) {
      const data = await resp.json();
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
    } else {
      Log.error(this.name, 'getTable', resp);
    }
  },

  getStandings: async function (leagueId) {
    const url = new URL(`${this.baseURL}/competitions/${leagueId.toString()}/matches/round/0`);
    Log.debug(this.name, 'getStandings', url);
    const self = this;


    const resp = await fetch(url, this.requestOptions)
    if (resp.status === 200) {
      const data = await resp.json();
      Log.debug(self.name, 'getStandings | data', JSON.stringify(data, null, 2));
      self.refreshTime = (data.refresh_time || 5 * 60) * 1000;
      Log.debug(self.name, 'getStandings | refresh_time', data.refresh_time, self.refreshTime);
      const standings = data;

      let refreshTimeout = self.refreshTime;

      const current_round = data.current_round;
      const fiveMinutes = 60 * 5
      const rounds_detailed = data.rounds_detailed[current_round - 1]
      const start = rounds_detailed.schedule_start - fiveMinutes
      const end = rounds_detailed.schedule_end + fiveMinutes
      const now = parseInt(Date.now() / 1000)
      const round_title = rounds_detailed.round_title
      let nextRequest = null

      Log.info(self.name, 'getStandings | start', leagueId, round_title, new Date(start * 1000), start, now >= start);
      Log.info(self.name, 'getStandings | end', leagueId, round_title, end > 0 ? new Date(end * 1000) : 0, end, now <= end);
      if (now >= start && end > 0 && now <= end) {
        Log.debug(self.name, 'start now end', new Date(start * 1000), new Date(now * 1000), new Date(end * 1000))
        self.timeoutStandings[leagueId] = setTimeout(function () {
          self.getStandings(leagueId);
        }, refreshTimeout);
        Log.info(self.name, `next request for league id ${leagueId} on ${new Date((now * 1000 + refreshTimeout))} for ${round_title}`)
        nextRequest = new Date((now * 1000 + refreshTimeout));
      } else if (now < start) {
        const delta = start - now;
        refreshTimeout = start;
        self.timeoutStandings[leagueId] = setTimeout(function () {
          self.getStandings(leagueId);
        }, refreshTimeout);
        Log.info(self.name, `next request for league id ${leagueId} on ${new Date(start * 1000)} for ${round_title}`)
        nextRequest = new Date(start * 1000);
      } else if (now > end) {
        Log.debug(self.name, 'now > end', new Date(now * 1000), end > 0 ? new Date(end * 1000) : 0)
        nextRequest = new Date(end * 1000);
      }


      const doRequest = () => {
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
                }
              }
            }
          }
        }

        forLoop().then(() => {
          self.sendSocketNotification(self.name + '-STANDINGS', {
            leagueId: leagueId,
            standings: standings,
            nextRequest: nextRequest
          });
        })
      }

      doRequest();

    } else {
      Log.error(this.name, 'getStandings', resp);
      self.timeoutStandings[leagueId] = setTimeout(function () {
        self.getStandings(leagueId);
      }, 5 * 60 * 1000);
    }
  },

  getScorers: async function (leagueId) {
    const url = new URL(`${this.baseURL}/competitions/${leagueId.toString()}/scorers`);
    Log.debug(this.name, 'getScorers', url);
    const self = this;


    const resp = await fetch(url, this.requestOptions);
    if (resp.status === 200) {
      const data = await resp.json();
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
      Log.error(this.name, 'getScorers', resp);
      self.timeoutScorers[leagueId] = setTimeout(function () {
        self.getScorers(leagueId);
      }, 5 * 60 * 1000);
    }
  },

  getDetails: async function (leagueId, matchId) {
    const url = new URL(`${this.baseURL}/competitions/${leagueId.toString()}/matches/${matchId.toString()}/details`);
    Log.debug(this.name, 'getDetails', url);
    const self = this;

    let details = []
    return new Promise(async (resolve, _reject) => {
      const resp = await fetch(url, this.requestOptions);
      if (resp.status === 200) {
        let data = null
        try {
          data = await resp.json();
          Log.debug(self.name, 'getDetails | data', JSON.stringify(data, null, 2));
          details = data.data || [];
        } catch (e) {
          Log.error(this.name, 'getDetails', resp);
          Log.error(this.name, 'getDetails', e);
        }
        resolve(details);
      } else {
        Log.error(this.name, 'getDetails', resp);
      }
    });
  },

  socketNotificationReceived: function (notification, payload) {
    Log.debug(this.name, 'socketNotificationReceived', notification, payload)
    if (notification === this.name + '-CONFIG') {
      this.showStandings = payload.showStandings;
      this.showDetails = this.showStandings && payload.showDetails;
      this.showTables = payload.showTables;
      this.showScorers = payload.showScorers;
      this.getLeagueIds(payload.leagues);
    }
  },
});

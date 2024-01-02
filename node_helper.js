/* MagicMirror²
 * Module: MMM-SoccerLiveScore
 *
 * By Omar Adobati https://github.com/0m4r
 * MIT Licensed.
 */

const NodeHelper = require('node_helper');
const Log = require("logger");
const fetch = require('node-fetch');

module.exports = NodeHelper.create({
  refreshTime: 2 * 60 * 1000,
  refreshTimeout: {},
  timeoutStandings: [],
  timeoutTable: [],
  timeoutScorers: [],
  showStandings: false,
  showTables: false,
  showScorers: false,
  showDetails: false,
  scrollVertical: true,
  language: 'en',
  supportedLanguages: ['it', 'de', 'en'],
  baseURL: 'https://toralarm.com/api/api',
  requestOptions: {
    method: 'POST',
    gzip: true,
    headers: {
      Host: 'toralarm.com',
      'accept-language': 'en-US,en;q=0.9,it;q=0.8,de-DE;q=0.7,de;q=0.6',
      'content-type': 'application/json;charset=UTF-8',
    },
    body: JSON.stringify({ lng: 'en' }),
  },
  leaguesList: {},

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

  doPost: async function (url, options) {
    let data;
    const localUrl = new URL(url);
    const localOptions = {
      ...this.requestOptions,
      ...options,
      body: JSON.stringify({ lng: this.language })
    }
    Log.debug(this.name, 'doPost', localUrl, localOptions);
    const resp = await fetch(url, localOptions)
    if (resp.status === 200) {
      data = await resp.json();
    } else {
      Log.error(this.name, 'doPost', localUrl, localOptions, resp);
      data = null
    }
    return data
  },

  getLeagueIds: async function (leagues) {
    this.clearTimeouts()
    const url = `${this.baseURL}/competitions`;
    Log.info(this.name, 'getLeagueIds', url, leagues.join(', '));
    const data = await this.doPost(url)
    this.leaguesList = {};
    if (data) {
      if ('competitions' in data) {
        const competitions = data.competitions;
        leagues.forEach((l) => {
          const comp = competitions.find((c) => 'id' in c && c.id === l);
          if (comp && 'id' in comp) {
            this.leaguesList[comp.id] = comp;
          }
        });

        Object.keys(this.leaguesList).forEach(async (id) => {
          await this.getStandings(id, undefined);
          this.showTables && this.leaguesList[id].has_table && this.getTable(id);
          this.showScorers && this.leaguesList[id].has_scorers && this.getScorers(id);
        });
      }
    }
    Log.debug(this.name, 'getLeagueIds', this.leaguesList)
    this.sendSocketNotification(this.name + '-LEAGUES', { leaguesList: this.leaguesList });
  },

  getTable: async function (leagueId) {
    const url = `${this.baseURL}/competitions/${leagueId.toString()}/table`;
    Log.debug(this.name, 'getTable', url);
    const data = await this.doPost(url)
    if (data) {
      Log.debug(this.name, 'getTable     | data', JSON.stringify(data, null, 2));
      if (!this.showStandings) {
        this.refreshTimeout[leagueId] = (data.refresh_time || 5 * 60) * 1000;
      }
      const tables = data.data.filter((d) => d.type === 'table' && d.table);
      this.sendSocketNotification(this.name + '-TABLE', {
        leagueId: leagueId,
        table: tables,
      });

      const nextRequest = new Date(new Date().getTime() + this.refreshTimeout[leagueId])
      Log.info(this.name, `getTable     | next request for league "${this.leaguesList[leagueId].name} (${leagueId})" on ${nextRequest}`)

      this.timeoutTable[leagueId] = setTimeout(() => {
        this.getTable(leagueId);
      }, this.refreshTimeout[leagueId]);
    }
  },

  getStandings: async function (leagueId, round = 0) {
    const url = `${this.baseURL}/competitions/${leagueId.toString()}/matches/round/${round}`;
    Log.debug(this.name, 'getStandings', url);

    const data = await this.doPost(url)
    if (data) {
      const standings = data;

      const allMatches = standings.data.filter(s => s.type === 'matches')
      const allTimes = [...new Set(allMatches.map(m => m.time))].sort()

      const tmp = {}
      allTimes.forEach(t => {
        const matchesAtSameTime = allMatches.filter(m => m.time === t)
        const matchesTmp = [].concat.apply([], matchesAtSameTime.map(m => m.matches));
        const toPlayMatches = matchesTmp.filter(m => ![60, 70, 90, 100, 110, 120].includes(m.status))
        if (Array.isArray(toPlayMatches) && toPlayMatches.length > 0) {
          tmp[t] = toPlayMatches
        }
      })

      let times = [...new Set(Object.keys(tmp).map(t => parseInt(t)))].sort()

      Log.debug(this.name, 'getStandings | data', JSON.stringify(data, null, 2));
      this.refreshTime = (standings.refresh_time || 5 * 60) * 1000;
      Log.debug(this.name, 'getStandings | refresh_time', data.refresh_time, this.refreshTime);

      const fiveMinutes = 60 * 5
      const hundredTwentyMinutes = fiveMinutes * 24;
      const current_round = standings.current_round;
      const rounds_detailed = data.rounds_detailed[current_round - 1]
      const now = new Date().getTime() / 1000
      let nextRequest = null
      this.refreshTimeout[leagueId] = this.refreshTime;

      const nextRoundRequest = () => {
        const selectable_rounds = standings.selectable_rounds;
        let next_round = current_round;
        let next_start = now + 24 * 12 * fiveMinutes; // now + 24 hours in minutes
        let deltaNowNextRequest = next_start * 1000;
        if (next_round <= selectable_rounds) {
          const scheduleStart = data.rounds_detailed[current_round] && data.rounds_detailed[current_round].schedule_start || 0
          if (scheduleStart !== 0) {
            next_start = scheduleStart - fiveMinutes
            deltaNowNextRequest = next_start * 1000
          }
        } else {
          this.refreshTimeout[leagueId] = null
          clearInterval(this.timeoutStandings[leagueId]);
          clearInterval(this.timeoutTable[leagueId]);
          clearInterval(this.timeoutScorers[leagueId]);
        }
        this.refreshTimeout[leagueId] = deltaNowNextRequest;
      }

      if (!rounds_detailed.schedule_start && !rounds_detailed.schedule_end) {
        this.refreshTimeout[leagueId] = 24 * 12 * fiveMinutes; // one day
        nextRequest = new Date((now * 1000 + this.refreshTimeout[leagueId]));
      } else if (times.length >= 1) {
        let start = times.length === 1 ? times[0] : times.reduce((prev, curr) => (Math.abs(curr - now) < Math.abs(prev - now) ? curr : prev)) // closest time to now
        let startIndex = times.findIndex(t => t === start)
        const end = startIndex === times.length - 1 ? start + hundredTwentyMinutes : times[times.length - 1] += fiveMinutes

        start -= fiveMinutes

        // now is in between the start and the end time of the event
        if (now >= start && end > 0 && now <= end) {
          nextRequest = new Date((now * 1000 + this.refreshTime));
          // now is before the start of the event
        } else if (now < start) {
          const deltaNowStart = start - now;
          this.refreshTimeout[leagueId] = deltaNowStart * 1000;
          nextRequest = new Date(start * 1000);

          // now is past the end of the event
        } else if (now > end) {
          nextRoundRequest();
        }
      } else {
        nextRoundRequest();
      }

      // https://developer.mozilla.org/en-US/docs/Web/API/setTimeout#:~:text=Maximum%20delay%20value,the%20timeout%20being%20executed%20immediately.
      // https://stackoverflow.com/a/56718027/448660
      const MAX_TIMEOUT_VALUE = 2147483647

      if (this.refreshTimeout[leagueId] > MAX_TIMEOUT_VALUE) {
        this.refreshTimeout[leagueId] = MAX_TIMEOUT_VALUE
        nextRequest = new Date(this.refreshTimeout[leagueId] + new Date().getTime())
      }

      this.timeoutStandings[leagueId] = setTimeout(() => {
        this.getStandings(leagueId, round);
      }, this.refreshTimeout[leagueId]);

      const round_title = rounds_detailed.round_title
      Log.info(this.name, `getStandings | next request for league "${this.leaguesList[leagueId].name} (${leagueId})" on ${nextRequest}`)


      const doRequest = () => {
        const forLoop = async () => {
          if (this.showDetails) {
            for (let s of standings.data) {
              if (s.type === 'matches') {
                const matches = s.matches;
                for (let m of matches) {
                  const d = await this.getDetails(leagueId, m.match_id);
                  const details = d && d.filter(t => t.type === 'details');
                  Log.debug(this.name, 'getStandings | details', m.match_id, JSON.stringify(details, null, 2));
                  m.details = details && details[0] ? details[0].details : []
                  let match_info = d && d.filter(t => t.type === 'match_info');
                  match_info = match_info && match_info[0] ? match_info[0].match_info : []
                  match_info = match_info.info_items.filter(m => !['stream', 'promotion'].includes(m.info_type))
                  Log.debug(this.name, 'getStandings | match_info', m.match_id, JSON.stringify(match_info, null, 2));
                  m.match_info = match_info
                }
              }
            }
          }
        }

        forLoop().then(() => {
          this.refreshTime = this.refreshTimeout[leagueId]
          this.sendSocketNotification(this.name + '-STANDINGS', {
            leagueId: leagueId,
            standings: standings,
            nextRequest: nextRequest
          });
        })
      }

      doRequest();

    } else {
      Log.error(this.name, 'getStandings', data);
      this.timeoutStandings[leagueId] = setTimeout(() => {
        this.getStandings(leagueId, round);
      }, 5 * 60 * 1000);
    }
  },

  getScorers: async function (leagueId) {
    const url = `${this.baseURL}/competitions/${leagueId.toString()}/scorers`;
    Log.debug(this.name, 'getScorers', url);

    const data = await this.doPost(url)
    if (data) {
      Log.debug(this.name, 'getScorers   | data', JSON.stringify(data, null, 2));
      if (!this.showStandings) {
        this.refreshTime = (data.refresh_time || 5 * 60) * 1000;
      }
      Log.debug(this.name, 'getScorers   | refresh_time', data.refresh_time, (this.refreshTimeout[leagueId] || this.refreshTime));
      const scorers = data.data.filter(d => d.type === 'scorers' && d.scorers) || [];
      this.sendSocketNotification(this.name + '-SCORERS', {
        leagueId: leagueId,
        scorers: scorers,
      });
      this.timeoutScorers[leagueId] = setTimeout(() => {
        this.getScorers(leagueId);
      }, this.refreshTimeout[leagueId] || this.refreshTime);

      const nextRequest = new Date(new Date().getTime() + (this.refreshTimeout[leagueId] || this.refreshTime))
      Log.info(this.name, `getScorers   | next request for league "${this.leaguesList[leagueId].name} (${leagueId})" on ${nextRequest}`)
    } else {
      Log.error(this.name, 'getScorers', data);
      this.timeoutScorers[leagueId] = setTimeout(() => {
        this.getScorers(leagueId);
      }, this.refreshTimeout[leagueId] || 5 * 60 * 1000);
    }
  },

  getDetails: async function (leagueId, matchId) {
    const url = `${this.baseURL}/competitions/${leagueId.toString()}/matches/${matchId.toString()}/details`;
    Log.debug(this.name, 'getDetails', leagueId, url);

    let details = []
    return new Promise(async (resolve, _reject) => {
      const data = await this.doPost(url)
      if (data && data.data) {
        Log.debug(this.name, 'getDetails   | data', leagueId, JSON.stringify(data, null, 2));
        Log.debug(this.name, 'getDetails   | data', 'leagueId', leagueId, 'matchId', matchId);
        details = data.data || [];
        resolve(details);
      } else {
        resolve([]);
        Log.error(this.name, 'getDetails', leagueId, url, data);
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
      if (payload.language) {
        this.language = this.supportedLanguages.includes(payload.language) ? payload.language : 'en'
      }
      this.getLeagueIds(payload.leagues);
    }
  },
});

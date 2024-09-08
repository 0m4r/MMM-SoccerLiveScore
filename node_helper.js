/* MagicMirror²
 * Module: MMM-SoccerLiveScore
 *
 * By Omar Adobati https://github.com/0m4r
 * MIT Licensed.
 */

const NodeHelper = require('node_helper');
const Log = require('logger');

module.exports = NodeHelper.create({
  requiresVersion: "2.1.0",
  // name: "MMM-SoccerLiveScore",
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
  token: null,
  supportedLanguages: ['it', 'de', 'en'],
  baseURL: 'https://api.football-data.org/v4',
  requestOptions: {
    method: 'GET',
    gzip: true,
    headers: {
      // Host: 'toralarm.com',
      // 'accept-language': 'en-US,en;q=0.9,it;q=0.8,de-DE;q=0.7,de;q=0.6',
      'content-type': 'application/json;charset=UTF-8',
    },
    // body: JSON.stringify({ lng: 'en' }),
  },
  leaguesList: {},
  teams: null,

  findNextGameDate: function (datesArray, after = true) {
    var arr = [...datesArray];
    var now = new Date();

    arr.sort(function (a, b) {
      var distanceA = Math.abs(now - new Date(a));
      var distanceB = Math.abs(now - new Date(b));
      return distanceA - distanceB; // sort a before b when the distance is smaller
    });

    const prev = arr.filter((d) => new Date(d) - now < 0);
    const next = arr.filter((d) => new Date(d) - now > 0);

    return after ? next : prev;
  },

  groupByDate: function (data) {
    // this gives an object with dates as keys
    const groups = data.reduce((groups, game) => {
      const date = game.utcDate.split('T')[0];
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(game);
      return groups;
    }, {});

    // Edit: to add it in the array format instead
    const groupArrays = Object.keys(groups).map((date) => {
      return {
        date,
        games: groups[date]
      };
    });

    return groupArrays
  },

  clearTimeouts: function () {
    Log.debug(this.name, 'clearTimeouts');
    [...this.timeoutStandings, ...this.timeoutScorers, ...this.timeoutTable].forEach((id) => clearTimeout(id));
    this.timeoutStandings.length = 0;
    this.timeoutScorers.length = 0;
    this.timeoutTable.length = 0;
  },

  start: function () {
    Log.log('Starting node helper for:', this.name);
  },

  stop: function () {
    Log.log('Stopping node helper for:', this.name);
    this.clearTimeouts();
  },

  doPost: async function (url, options) {
    let data;
    const localUrl = new URL(url);
    const localOptions = {
      ...this.requestOptions,
      ...options,
      headers: {
        ...this.requestOptions?.header,
        ...options?.header,
        'X-Auth-Token': this.token
      },
    };
    Log.debug(this.name, 'doPost', localUrl, localOptions);
    const resp = await fetch(url, localOptions);
    if (resp.status === 200) {
      data = await resp.json();
    } else {
      Log.error(this.name, 'doPost', localUrl, localOptions, resp);
      data = null;
    }
    return data;
    // return {}
  },

  getLeagueIds: async function (leagues) {
    this.clearTimeouts();
    const url = `${this.baseURL}/competitions`;
    Log.info(this.name, 'getLeagueIds', url, leagues.join(', '));
    const data = await this.doPost(url);
    this.leaguesList = {};
    if (data) {
      if (data?.competitions) {
        const competitions = data.competitions;
        leagues.forEach((l) => {
          const comp = competitions.find((c) => 'id' in c && c.id === l);
          if (comp && 'id' in comp) {
            this.leaguesList[comp.id] = { code: comp.code, currentMatchday: comp.currentSeason.currentMatchday };
          }
        });

        Object.values(this.leaguesList).forEach(async ({ code, currentMatchday }) => {
          console.log(code, currentMatchday)
          await this.getStandings(code, currentMatchday);
          this.showTables && this.leaguesList[id].has_table && this.getTable(id);
          this.showScorers && this.leaguesList[id].has_scorers && this.getScorers(id);
        });
      }
    }
    Log.debug(this.name, 'getLeagueIds', this.leaguesList);
    this.sendSocketNotification(this.name + '-LEAGUES', { leaguesList: this.leaguesList });
  },

  getTable: async function (leagueId) {
    const url = `${this.baseURL}/competitions/${leagueId.toString()}/table`;
    Log.debug(this.name, 'getTable', url);
    const data = await this.doPost(url);
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

      const nextRequest = new Date(new Date().getTime() + this.refreshTimeout[leagueId]);
      Log.info(
        this.name,
        `getTable     | next request for league "${this.leaguesList[leagueId].name} (${leagueId})" on ${nextRequest}`
      );

      this.timeoutTable[leagueId] = setTimeout(() => {
        this.getTable(leagueId);
      }, this.refreshTimeout[leagueId]);
    }
  },

  fetchMatchDay: async function (competitionId) {
    Log.debug(this.name, 'fetchMatchDay', competitionId);
    try {
      const url = `${this.baseURL}/competitions/${competitionId}`;
      Log.info(this.name, 'fetchMatchDay', url);
      const response = await this.doPost(url);
      const currentMatchday = response.currentSeason.currentMatchday;
      return currentMatchday
    } catch (e) {
      Log.error(this.name, 'fetchMatchDay', competitionId, e);
      return null
    }
  },

  fetchFixturesForMatchDay: async function (competitionId, matchDay) {
    if (!matchDay) return null;
    Log.debug(this.name, 'fetchFixturesForMatchDay', competitionId, matchDay);
    const url = `${this.baseURL}/competitions/${competitionId}/matches?matchday=${matchDay}`;
    Log.info(this.name, 'fetchFixturesForMatchDay', url);
    return await this.doPost(url);
  },

  fetchTeams: async function (competitionId) {
    Log.debug(this.name, 'fetchTeams', competitionId);
    const url = `${this.baseURL}/competitions/${competitionId}/teams`;
    Log.debug(this.name, 'fetchTeams | url', url);
    return await this.doPost(url);
  },

  getStandings: async function (leagueCode, round = 0) {
    try {
      // if (this.teams === null) {
      //   this.teams = await this.fetchTeams(leagueCode);
      // }
      const matchDay = await this.fetchMatchDay(leagueCode, round);
      const fixtures = await this.fetchFixturesForMatchDay(leagueCode, matchDay);

      const matches = fixtures?.matches || []
      // matches.forEach(m => {
      //   const { teams } = this.teams;
      //   const homeTeam = teams.find(t => t.id === m.homeTeam.id)
      //   console.log(homeTeam)
      //   if (homeTeam) {
      //     m.homeTeam.flag = homeTeam.crest
      //   }

      //   const awayTeam = teams.find(t => t.id === m.awayTeam.id)
      //   if (awayTeam) {
      //     m.awayTeam.flag = awayTeam.crest
      //   }
      // })

      let statuses = matches.map(m => m.status);
      const hasActiveGames = statuses.includes('PAUSED') || statuses.includes('IN_PLAY')
      let timeUntilNextGameMinusFiveMinutes = 0
      if (!hasActiveGames) {
        const dates = matches.map(m => m.utcDate);
        const nextDates = this.findNextGameDate(dates, true)
        if (nextDates && nextDates.length > 0) {
          const next = nextDates[0];
          const timeUntilNextGame = new Date(next) - new Date();
          timeUntilNextGameMinusFiveMinutes = timeUntilNextGame - 5 * 60 * 1000
          if (timeUntilNextGameMinusFiveMinutes > 0) {
            Log.info(this.name, 'getStandings | timeUntilNextGame', leagueCode, round, timeUntilNextGameMinusFiveMinutes, new Date(new Date().getTime() + timeUntilNextGameMinusFiveMinutes));
            // self.fetchAllWithInterval(timeUntilNextGameMinusFiveMinutes, false);
          }
        }
      }
      Log.info(this.name, 'getStandings | timeUntilNextGame', leagueCode, round, timeUntilNextGameMinusFiveMinutes, new Date(new Date().getTime() + timeUntilNextGameMinusFiveMinutes));

      const matchesGroupedByDate = this.groupByDate(matches)
      // this.sendSocketNotification(this.name + 'FIXTURES', matchesGroupedByDate);

      // Log.debug(this.name, 'getStandings', JSON.stringify(matchesGroupedByDate))
      this.sendSocketNotification(this.name + '-STANDINGS', {
        leagueId: leagueCode,
        standings: matchesGroupedByDate,
        nextRequest: new Date(Date.now() + timeUntilNextGameMinusFiveMinutes)
      });
    } catch (e) {
      Log.error(this.name, 'getStandings', e)
      this.sendSocketNotification(this.name + '-STANDINGS', []);
    }
  },

  getScorers: async function (leagueId) {
    const url = `${this.baseURL}/competitions/${leagueId.toString()}/scorers`;
    Log.debug(this.name, 'getScorers', url);

    const data = await this.doPost(url);
    if (data) {
      Log.debug(this.name, 'getScorers   | data', JSON.stringify(data, null, 2));
      if (!this.showStandings) {
        this.refreshTime = (data.refresh_time || 5 * 60) * 1000;
      }
      Log.debug(
        this.name,
        'getScorers   | refresh_time',
        data.refresh_time,
        this.refreshTimeout[leagueId] || this.refreshTime
      );
      const scorers = data.data.filter((d) => d.type === 'scorers' && d.scorers) || [];
      this.sendSocketNotification(this.name + '-SCORERS', {
        leagueId: leagueId,
        scorers: scorers,
      });
      this.timeoutScorers[leagueId] = setTimeout(() => {
        this.getScorers(leagueId);
      }, this.refreshTimeout[leagueId] || this.refreshTime);

      const nextRequest = new Date(new Date().getTime() + (this.refreshTimeout[leagueId] || this.refreshTime));
      Log.info(
        this.name,
        `getScorers   | next request for league "${this.leaguesList[leagueId].name} (${leagueId})" on ${nextRequest}`
      );
    } else {
      Log.error(this.name, 'getScorers', data);
      this.timeoutScorers[leagueId] = setTimeout(
        () => {
          this.getScorers(leagueId);
        },
        this.refreshTimeout[leagueId] || 5 * 60 * 1000
      );
    }
  },

  getDetails: async function (leagueId, matchId) {
    const url = `${this.baseURL}/competitions/${leagueId.toString()}/matches/${matchId.toString()}/details`;
    Log.debug(this.name, 'getDetails', leagueId, url);

    let details = await this.doPost(url);

    if (details && details.data) {
      Log.debug(this.name, 'getDetails   | data', leagueId, JSON.stringify(details, null, 2));
      Log.debug(this.name, 'getDetails   | data', 'leagueId', leagueId, 'matchId', matchId);
      details = details.data || [];
    } else {
      details = [];
      Log.error(this.name, 'getDetails', leagueId, url, details);
    }

    return details;
  },

  socketNotificationReceived: function (notification, payload) {
    Log.debug(this.name, 'socketNotificationReceived', notification, payload);
    if (notification === this.name + '-CONFIG') {
      this.showStandings = payload.showStandings;
      this.showDetails = this.showStandings && payload.showDetails;
      this.showTables = payload.showTables;
      this.showScorers = payload.showScorers;
      this.token = payload.token;
      if (payload.language) {
        this.language = this.supportedLanguages.includes(payload.language) ? payload.language : 'en';
      }
      this.getLeagueIds(payload.leagues);
    }
  },
});

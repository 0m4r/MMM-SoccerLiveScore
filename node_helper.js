/* MagicMirror²
 * Module: MMM-SoccerLiveScore
 *
 * By Omar Adobati https://github.com/0m4r
 * MIT Licensed.
 */

const NodeHelper = require('node_helper');
const Log = require('logger');
const Bottleneck = require('bottleneck');

module.exports = NodeHelper.create({
  requiresVersion: "2.1.0",
  requestInterval: 2 * 60 * 1000, // 2mins
  refreshTimeout: {},
  timeout: [],
  showStandings: false,
  showTables: false,
  showScorers: false,
  scrollVertical: true,
  token: null,
  baseURL: 'https://api.football-data.org/v4',

  requestOptions: {
    method: 'GET',
    gzip: true,
    headers: {
      'content-type': 'application/json;charset=UTF-8',
    },
  },
  teams: null,
  requestsAvailablePerMinute: 10, // default for free plan
  requestsCounterReset: 60, // default for free plan
  requestsQueue: {},
  requestsQueueTimeout: null,

  limiter: new Bottleneck({
    minTime: (60 * 1000) / this.requestsAvailablePerMinute, // 10 requests per minute
    maxConcurrent: 1
  }),

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
      const date = game.utcDate;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(game);
      return groups;
    }, {});

    // Edit: to add it in the array format instead
    const groupArrays = Object.keys(groups).map((date) => {
      return {
        [date]: groups[date]
      };
    });
    return groupArrays
  },

  clearTimeouts: function () {
    Log.debug(this.name, 'clearTimeouts', this.timeout.length);
    this.timeout.forEach((id) => clearTimeout(id));
    this.timeout.length = 0;
  },

  start: function () {
    Log.log('Starting node helper for:', this.name);
  },

  stop: function () {
    Log.log('Stopping node helper for:', this.name);
    this.clearTimeouts();
  },

  doRequest: async function (url, options) {
    Log.info(this.name, 'doRequest', "url", url);


    let data;
    const localUrl = new URL(url);
    const localOptions = {
      ...this.requestOptions,
      ...options,
      headers: {
        ...this.requestOptions?.header,
        ...options?.header,
        'X-Auth-Token': this.token,
        'X-Unfold-Bookings': true,
        'X-Unfold-Goals': true,
        'X-Unfold-Subs': true,
      },
    };

    const resp = await await this.limiter.schedule(() => fetch(url, localOptions));
    if (resp.status === 200) {
      data = await resp.json();
    } else {
      Log.error(this.name, 'doRequest', localUrl.href, resp.status, resp);
      data = null;
    }
    return data;

  },

  getLeagueIds: async function (leagues) {
    this.clearTimeouts();
    const url = `${this.baseURL}/competitions`;
    Log.debug(this.name, 'getLeagueIds', url, leagues.join(', '));
    const data = await this.doRequest(url);
    this.leaguesList = {};
    if (data) {
      if (data?.competitions) {
        const competitions = data.competitions;
        leagues.forEach((l) => {
          const comp = competitions.find((c) => 'id' in c && c.id === l);
          if (comp && 'id' in comp) {
            this.leaguesList[comp.id] = { code: comp.code, currentMatchday: comp.currentSeason.currentMatchday };
            this.refreshTimeout[comp.code] = this.requestInterval
          }
        });

        Object.values(this.leaguesList).forEach(async ({ code, currentMatchday }) => {
          this.getAll(code, currentMatchday);
        });
      }
    }
    Log.debug(this.name, 'getLeagueIds', this.leaguesList);
    this.sendSocketNotification(this.name + '-LEAGUES', { leaguesList: this.leaguesList });
  },

  getAll: async function (leagueCode, currentMatchday) {
    Log.debug(this.name, 'getAll', 'leagueCode', leagueCode, 'currentMatchday', currentMatchday);
    await this.getStandings(leagueCode, currentMatchday);
    this.showTables && await this.getTable(leagueCode);
    this.showScorers && await this.getScorers(leagueCode);
  },

  getTable: async function (leagueId) {
    const url = `${this.baseURL}/competitions/${leagueId.toString()}/standings`;
    Log.debug(this.name, leagueId, 'getTable', url);
    const data = await this.doRequest(url);
    if (data) {
      const tables = data?.standings?.map(s => s.table) || [];
      const competition = data?.competition || {};
      this.sendSocketNotification(this.name + '-TABLE', {
        leagueId: leagueId,
        table: tables,
        competition: competition
      });
    }
  },

  fetchMatchDay: async function (competitionId) {
    Log.debug(this.name, competitionId, 'fetchMatchDay');
    try {
      const url = `${this.baseURL}/competitions/${competitionId}`;
      Log.debug(this.name, 'fetchMatchDay', url);
      const response = await this.doRequest(url);
      return response.currentSeason.currentMatchday;
    } catch (e) {
      Log.error(this.name, competitionId, 'fetchMatchDay', e);
      return null
    }
  },

  fetchFixturesForMatchDay: async function (competitionId, matchDay) {
    if (!matchDay) return null;
    Log.debug(this.name, competitionId, 'fetchFixturesForMatchDay', matchDay);
    const url = `${this.baseURL}/competitions/${competitionId}/matches?matchday=${matchDay}`;
    Log.debug(this.name, competitionId, 'fetchFixturesForMatchDay', url);
    return await this.doRequest(url);
  },

  fetchTeams: async function (competitionId) {
    Log.debug(this.name, 'fetchTeams', competitionId);
    const url = `${this.baseURL}/competitions/${competitionId}/teams`;
    Log.debug(this.name, 'fetchTeams | url', url);
    return await this.doRequest(url);
  },

  getStandings: async function (leagueCode, round = 0) {
    Log.debug(this.name, leagueCode, 'getStandings', round);
    let timeUntilNextRequest = this.refreshTimeout[leagueCode] || this.requestInterval
    try {
      const now = new Date().toISOString();

      const matchDay = await this.fetchMatchDay(leagueCode, round);
      const fixtures = await this.fetchFixturesForMatchDay(leagueCode, matchDay);

      const competition = fixtures?.competition;
      const matches = fixtures?.matches || []

      let statuses = matches.map(m => m.status);
      const hasActiveGames = statuses.includes('PAUSED') || statuses.includes('IN_PLAY')
      Log.debug(this.name, leagueCode, 'getStandings | hasActiveGames:', hasActiveGames);
      const hasGameInTheNext15Mins = matches.some(m => m.status !== 'FINISHED' && new Date(m.utcDate) - now < 15 * 60 * 1000);
      Log.debug(this.name, leagueCode, 'getStandings | hasGameInTheNext15Mins', hasGameInTheNext15Mins);

      if (!hasActiveGames && !hasGameInTheNext15Mins) {
        const dates = matches.map(m => m.utcDate);
        const nextDates = this.findNextGameDate(dates, true)
        if (nextDates && nextDates.length > 0) {
          const next = nextDates[0];
          const timeUntilNextGame = new Date(next) - new Date();
          timeUntilNextRequest = timeUntilNextGame - this.requestInterval
        }
      }

      const matchesGroupedByDate = this.groupByDate(matches)

      if (this.showStandings) {
        this.sendSocketNotification(this.name + '-STANDINGS', {
          leagueId: leagueCode,
          standings: matchesGroupedByDate,
          competition: competition,
          nextRequest: new Date(new Date().getTime() + timeUntilNextRequest)
        });
      }

      this.timeout[leagueCode] = setTimeout(() => {
        this.getAll(leagueCode, matchDay)
      }, timeUntilNextRequest);
    } catch (e) {
      Log.error(this.name, leagueCode, 'getStandings', e)
      this.sendSocketNotification(this.name + '-STANDINGS', {
        leagueId: leagueCode,
        standings: [],
        competition: {},
        nextRequest: new Date(new Date().getTime() + timeUntilNextRequest)
      });
    }
  },

  getScorers: async function (leagueId) {
    const url = `${this.baseURL}/competitions/${leagueId.toString()}/scorers?limit=20`;
    Log.debug(this.name, leagueId, 'getScorers', url);
    const data = await this.doRequest(url);
    if (data) {
      const scorers = data?.scorers || [];
      const competition = data?.competition || {};
      this.sendSocketNotification(this.name + '-SCORERS', {
        leagueId: leagueId,
        scorers: scorers,
        competition: competition
      });
    }
  },

  getDetails: async function (leagueId, matchId) {
    const url = `${this.baseURL}/competitions/${leagueId.toString()}/matches/${matchId.toString()}/details`;
    Log.debug(this.name, leagueId, 'getDetails', url);

    let details = await this.doRequest(url);

    if (details && details.data) {
      Log.debug(this.name, leagueId, 'getDetails | data', JSON.stringify(details, null, 2));
      Log.debug(this.name, leagueId, 'getDetails | data', matchId);
      details = details.data || [];
    } else {
      details = [];
      Log.error(this.name, leagueId, 'getDetails', url, details);
    }

    return details;
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification === this.name + '-CONFIG') {
      Log.info(this.name, 'socketNotificationReceived', notification, payload);
      this.showStandings = payload.showStandings;
      this.showTables = payload.showTables;
      this.showScorers = payload.showScorers;
      this.token = payload.token;
      this.requestInterval = payload.requestInterval
      this.getLeagueIds(payload.leagues);
    }
  },
});

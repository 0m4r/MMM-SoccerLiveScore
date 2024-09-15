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
  requestInterval: 2 * 60 * 1000,
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
  // baseURL: "https://49dc9106-7505-4baf-90f7-b719714418c3.mock.pstmn.io",
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
    // Log.debug(this.name, 'doPost', localUrl, localOptions);
    const resp = await fetch(url, localOptions);
    if (resp.status === 200) {
      data = await resp.json();
    } else {
      Log.error(this.name, 'doPost', localUrl.href, resp);
      // Log.debug(this.name, 'doPost', localUrl, localOptions, resp);
      data = null;
    }
    return data;
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
            this.refreshTimeout[comp.code] = this.requestInterval || 1 * 60 * 1000
          }
        });

        Object.values(this.leaguesList).forEach(async ({ code, currentMatchday }) => {
          // this.showStandings && await this.getStandings(code, currentMatchday);
          // this.showTables && await this.getTable(code);
          // this.showScorers && this.getScorers(code);
          this.getAll(code, currentMatchday);
        });
      }
    }
    Log.debug(this.name, 'getLeagueIds', this.leaguesList);
    this.sendSocketNotification(this.name + '-LEAGUES', { leaguesList: this.leaguesList });
  },

  getAll: async function (leagueCode, currentMatchday) {
    Log.debug(this.name, 'getAll', 'leagueCode', leagueCode, 'currentMatchday', currentMatchday);
    this.showStandings && await this.getStandings(leagueCode, currentMatchday);
    this.showTables && await this.getTable(leagueCode);
    this.showScorers && await this.getScorers(leagueCode);
  },

  getTable: async function (leagueId) {
    const url = `${this.baseURL}/competitions/${leagueId.toString()}/standings`;
    Log.debug(this.name, 'getTable', url);
    const data = await this.doPost(url);
    // const data = {
    //   "filters": {
    //     "season": "2024"
    //   },
    //   "area": {
    //     "id": 2114,
    //     "name": "Italy",
    //     "code": "ITA",
    //     "flag": "https://crests.football-data.org/784.svg"
    //   },
    //   "competition": {
    //     "id": 2019,
    //     "name": "Serie A",
    //     "code": "SA",
    //     "type": "LEAGUE",
    //     "emblem": "https://crests.football-data.org/SA.png"
    //   },
    //   "season": {
    //     "id": 2310,
    //     "startDate": "2024-08-18",
    //     "endDate": "2025-05-25",
    //     "currentMatchday": 4,
    //     "winner": null
    //   },
    //   "standings": [
    //     {
    //       "stage": "REGULAR_SEASON",
    //       "type": "TOTAL",
    //       "group": null,
    //       "table": [
    //         {
    //           "position": 1,
    //           "team": {
    //             "id": 109,
    //             "name": "Juventus FC",
    //             "shortName": "Juventus",
    //             "tla": "JUV",
    //             "crest": "https://crests.football-data.org/109.png"
    //           },
    //           "playedGames": 4,
    //           "form": null,
    //           "won": 2,
    //           "draw": 2,
    //           "lost": 0,
    //           "points": 8,
    //           "goalsFor": 6,
    //           "goalsAgainst": 0,
    //           "goalDifference": 6
    //         },
    //         {
    //           "position": 2,
    //           "team": {
    //             "id": 108,
    //             "name": "FC Internazionale Milano",
    //             "shortName": "Inter",
    //             "tla": "INT",
    //             "crest": "https://crests.football-data.org/108.png"
    //           },
    //           "playedGames": 3,
    //           "form": null,
    //           "won": 2,
    //           "draw": 1,
    //           "lost": 0,
    //           "points": 7,
    //           "goalsFor": 8,
    //           "goalsAgainst": 2,
    //           "goalDifference": 6
    //         },
    //         {
    //           "position": 3,
    //           "team": {
    //             "id": 586,
    //             "name": "Torino FC",
    //             "shortName": "Torino",
    //             "tla": "TOR",
    //             "crest": "https://crests.football-data.org/586.png"
    //           },
    //           "playedGames": 3,
    //           "form": null,
    //           "won": 2,
    //           "draw": 1,
    //           "lost": 0,
    //           "points": 7,
    //           "goalsFor": 5,
    //           "goalsAgainst": 3,
    //           "goalDifference": 2
    //         },
    //         {
    //           "position": 4,
    //           "team": {
    //             "id": 115,
    //             "name": "Udinese Calcio",
    //             "shortName": "Udinese",
    //             "tla": "UDI",
    //             "crest": "https://crests.football-data.org/115.png"
    //           },
    //           "playedGames": 3,
    //           "form": null,
    //           "won": 2,
    //           "draw": 1,
    //           "lost": 0,
    //           "points": 7,
    //           "goalsFor": 4,
    //           "goalsAgainst": 2,
    //           "goalDifference": 2
    //         },
    //         {
    //           "position": 5,
    //           "team": {
    //             "id": 450,
    //             "name": "Hellas Verona FC",
    //             "shortName": "Verona",
    //             "tla": "HVE",
    //             "crest": "https://crests.football-data.org/450.png"
    //           },
    //           "playedGames": 3,
    //           "form": null,
    //           "won": 2,
    //           "draw": 0,
    //           "lost": 1,
    //           "points": 6,
    //           "goalsFor": 5,
    //           "goalsAgainst": 3,
    //           "goalDifference": 2
    //         },
    //         {
    //           "position": 6,
    //           "team": {
    //             "id": 113,
    //             "name": "SSC Napoli",
    //             "shortName": "Napoli",
    //             "tla": "NAP",
    //             "crest": "https://crests.football-data.org/113.png"
    //           },
    //           "playedGames": 3,
    //           "form": null,
    //           "won": 2,
    //           "draw": 0,
    //           "lost": 1,
    //           "points": 6,
    //           "goalsFor": 5,
    //           "goalsAgainst": 4,
    //           "goalDifference": 1
    //         },
    //         {
    //           "position": 7,
    //           "team": {
    //             "id": 445,
    //             "name": "Empoli FC",
    //             "shortName": "Empoli",
    //             "tla": "EMP",
    //             "crest": "https://crests.football-data.org/445.png"
    //           },
    //           "playedGames": 4,
    //           "form": null,
    //           "won": 1,
    //           "draw": 3,
    //           "lost": 0,
    //           "points": 6,
    //           "goalsFor": 3,
    //           "goalsAgainst": 2,
    //           "goalDifference": 1
    //         },
    //         {
    //           "position": 8,
    //           "team": {
    //             "id": 98,
    //             "name": "AC Milan",
    //             "shortName": "Milan",
    //             "tla": "MIL",
    //             "crest": "https://crests.football-data.org/98.png"
    //           },
    //           "playedGames": 4,
    //           "form": null,
    //           "won": 1,
    //           "draw": 2,
    //           "lost": 1,
    //           "points": 5,
    //           "goalsFor": 9,
    //           "goalsAgainst": 6,
    //           "goalDifference": 3
    //         },
    //         {
    //           "position": 9,
    //           "team": {
    //             "id": 110,
    //             "name": "SS Lazio",
    //             "shortName": "Lazio",
    //             "tla": "LAZ",
    //             "crest": "https://crests.football-data.org/110.png"
    //           },
    //           "playedGames": 3,
    //           "form": null,
    //           "won": 1,
    //           "draw": 1,
    //           "lost": 1,
    //           "points": 4,
    //           "goalsFor": 6,
    //           "goalsAgainst": 5,
    //           "goalDifference": 1
    //         },
    //         {
    //           "position": 10,
    //           "team": {
    //             "id": 112,
    //             "name": "Parma Calcio 1913",
    //             "shortName": "Parma",
    //             "tla": "PAR",
    //             "crest": "https://crests.football-data.org/112.png"
    //           },
    //           "playedGames": 3,
    //           "form": null,
    //           "won": 1,
    //           "draw": 1,
    //           "lost": 1,
    //           "points": 4,
    //           "goalsFor": 4,
    //           "goalsAgainst": 4,
    //           "goalDifference": 0
    //         },
    //         {
    //           "position": 11,
    //           "team": {
    //             "id": 107,
    //             "name": "Genoa CFC",
    //             "shortName": "Genoa",
    //             "tla": "GEN",
    //             "crest": "https://crests.football-data.org/107.png"
    //           },
    //           "playedGames": 3,
    //           "form": null,
    //           "won": 1,
    //           "draw": 1,
    //           "lost": 1,
    //           "points": 4,
    //           "goalsFor": 3,
    //           "goalsAgainst": 4,
    //           "goalDifference": -1
    //         },
    //         {
    //           "position": 12,
    //           "team": {
    //             "id": 99,
    //             "name": "ACF Fiorentina",
    //             "shortName": "Fiorentina",
    //             "tla": "FIO",
    //             "crest": "https://crests.football-data.org/99.png"
    //           },
    //           "playedGames": 3,
    //           "form": null,
    //           "won": 0,
    //           "draw": 3,
    //           "lost": 0,
    //           "points": 3,
    //           "goalsFor": 3,
    //           "goalsAgainst": 3,
    //           "goalDifference": 0
    //         },
    //         {
    //           "position": 13,
    //           "team": {
    //             "id": 102,
    //             "name": "Atalanta BC",
    //             "shortName": "Atalanta",
    //             "tla": "ATA",
    //             "crest": "https://crests.football-data.org/102.png"
    //           },
    //           "playedGames": 3,
    //           "form": null,
    //           "won": 1,
    //           "draw": 0,
    //           "lost": 2,
    //           "points": 3,
    //           "goalsFor": 5,
    //           "goalsAgainst": 6,
    //           "goalDifference": -1
    //         },
    //         {
    //           "position": 14,
    //           "team": {
    //             "id": 103,
    //             "name": "Bologna FC 1909",
    //             "shortName": "Bologna",
    //             "tla": "BOL",
    //             "crest": "https://crests.football-data.org/103.png"
    //           },
    //           "playedGames": 4,
    //           "form": null,
    //           "won": 0,
    //           "draw": 3,
    //           "lost": 1,
    //           "points": 3,
    //           "goalsFor": 4,
    //           "goalsAgainst": 7,
    //           "goalDifference": -3
    //         },
    //         {
    //           "position": 15,
    //           "team": {
    //             "id": 5890,
    //             "name": "US Lecce",
    //             "shortName": "Lecce",
    //             "tla": "USL",
    //             "crest": "https://crests.football-data.org/5890.png"
    //           },
    //           "playedGames": 3,
    //           "form": null,
    //           "won": 1,
    //           "draw": 0,
    //           "lost": 2,
    //           "points": 3,
    //           "goalsFor": 1,
    //           "goalsAgainst": 6,
    //           "goalDifference": -5
    //         },
    //         {
    //           "position": 16,
    //           "team": {
    //             "id": 5911,
    //             "name": "AC Monza",
    //             "shortName": "Monza",
    //             "tla": "MON",
    //             "crest": "https://crests.football-data.org/5911.png"
    //           },
    //           "playedGames": 3,
    //           "form": null,
    //           "won": 0,
    //           "draw": 2,
    //           "lost": 1,
    //           "points": 2,
    //           "goalsFor": 2,
    //           "goalsAgainst": 3,
    //           "goalDifference": -1
    //         },
    //         {
    //           "position": 17,
    //           "team": {
    //             "id": 100,
    //             "name": "AS Roma",
    //             "shortName": "Roma",
    //             "tla": "ROM",
    //             "crest": "https://crests.football-data.org/100.png"
    //           },
    //           "playedGames": 3,
    //           "form": null,
    //           "won": 0,
    //           "draw": 2,
    //           "lost": 1,
    //           "points": 2,
    //           "goalsFor": 1,
    //           "goalsAgainst": 2,
    //           "goalDifference": -1
    //         },
    //         {
    //           "position": 17,
    //           "team": {
    //             "id": 104,
    //             "name": "Cagliari Calcio",
    //             "shortName": "Cagliari",
    //             "tla": "CAG",
    //             "crest": "https://crests.football-data.org/104.png"
    //           },
    //           "playedGames": 3,
    //           "form": null,
    //           "won": 0,
    //           "draw": 2,
    //           "lost": 1,
    //           "points": 2,
    //           "goalsFor": 1,
    //           "goalsAgainst": 2,
    //           "goalDifference": -1
    //         },
    //         {
    //           "position": 19,
    //           "team": {
    //             "id": 7397,
    //             "name": "Como 1907",
    //             "shortName": "Como 1907",
    //             "tla": "COM",
    //             "crest": "https://crests.football-data.org/7397.png"
    //           },
    //           "playedGames": 4,
    //           "form": null,
    //           "won": 0,
    //           "draw": 2,
    //           "lost": 2,
    //           "points": 2,
    //           "goalsFor": 3,
    //           "goalsAgainst": 7,
    //           "goalDifference": -4
    //         },
    //         {
    //           "position": 20,
    //           "team": {
    //             "id": 454,
    //             "name": "Venezia FC",
    //             "shortName": "Venezia FC",
    //             "tla": "VEN",
    //             "crest": "https://crests.football-data.org/454.png"
    //           },
    //           "playedGames": 4,
    //           "form": null,
    //           "won": 0,
    //           "draw": 1,
    //           "lost": 3,
    //           "points": 1,
    //           "goalsFor": 1,
    //           "goalsAgainst": 8,
    //           "goalDifference": -7
    //         }
    //       ]
    //     }
    //   ]
    // }
    if (data) {
      // Log.debug(this.name, 'getTable     | data', JSON.stringify(data, null, 2));
      if (!this.showStandings) {
        this.refreshTimeout[leagueId] = (data.refresh_time || 5 * 60) * 1000;
      }
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
    Log.debug(this.name, 'fetchMatchDay', competitionId);
    try {
      const url = `${this.baseURL}/competitions/${competitionId}`;
      Log.info(this.name, 'fetchMatchDay', url);
      const response = await this.doPost(url);
      return response.currentSeason.currentMatchday;
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
    Log.debug(this.name, 'getStandings', 'leagueCode', leagueCode, 'round', round);
    try {
      const now = new Date().toISOString();
      let timeUntilNextRequest = this.refreshTimeout[leagueCode]

      const matchDay = await this.fetchMatchDay(leagueCode, round);
      const fixtures = await this.fetchFixturesForMatchDay(leagueCode, matchDay);

      const competition = fixtures.competition;
      const matches = fixtures?.matches || []

      let statuses = matches.map(m => m.status);
      const hasActiveGames = statuses.includes('PAUSED') || statuses.includes('IN_PLAY')
      Log.info(this.name, leagueCode, 'getStandings | hasActiveGames:', hasActiveGames);
      const hasGameInTheNext15Mins = matches.some(m => m.status !== 'FINISHED' && new Date(m.utcDate) - now < 15 * 60 * 1000);
      Log.info(this.name, leagueCode, 'getStandings | hasGameInTheNext15Mins', hasGameInTheNext15Mins);

      if (!hasActiveGames && !hasGameInTheNext15Mins) {
        const dates = matches.map(m => m.utcDate);
        const nextDates = this.findNextGameDate(dates, true)
        if (nextDates && nextDates.length > 0) {
          const next = nextDates[0];
          const timeUntilNextGame = new Date(next) - new Date();
          timeUntilNextRequest = timeUntilNextGame - 1 * 60 * 1000
        }
      }

      Log.info(this.name, leagueCode, 'getStandings | timeUntilNextRequest', timeUntilNextRequest, new Date(new Date().getTime() + timeUntilNextRequest));
      const matchesGroupedByDate = this.groupByDate(matches)

      this.sendSocketNotification(this.name + '-STANDINGS', {
        leagueId: leagueCode,
        standings: matchesGroupedByDate,
        competition: competition,
        nextRequest: new Date(new Date().getTime() + timeUntilNextRequest)
      });

      this.timeoutTable[leagueCode] = setTimeout(() => {
        this.getAll(leagueCode, matchDay)
      }, new Date(timeUntilNextRequest).getTime());
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
      this.requestInterval = payload.requestInterval
      this.getLeagueIds(payload.leagues);
    }
  },
});

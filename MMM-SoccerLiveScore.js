/* MagicMirror²
 * Module: MMM-SoccerLiveScore
 *
 * By Omar Adobati https://github.com/0m4r
 * MIT Licensed.
 */

Module.register('MMM-SoccerLiveScore', {
  name: "MMM-SoccerLiveScore",
  changeLeagueTimeout: null,
  updateDomTimeout: null,

  standings: {},
  tables: {},
  scorers: {},
  competition: {},
  nextRequest: [],

  scorersActive: false,
  standingActive: true,
  tablesActive: true,

  defaults: {
    leagues: [2019],
    displayTime: 20 * 1000,
    requestInterval: 2 * 60 * 1000,
    showNames: true,
    showLogos: true,
    showStandings: true,
    showTables: true,
    showScorers: true,
    scrollVertical: true,
    logosToInvert: [109],
    token: null,
    requestsAvailablePerMinute: 10
  },

  getStyles() {
    return ['font-awesome.css', 'MMM-SoccerLiveScore.css'];
  },

  start() {
    Log.info('Starting module ' + this.name, JSON.stringify(this.config, null, 2));
    this.logos = {};
    this.standings = {};
    this.leagueIds = {};
    this.tables = {};
    this.tableActive = false;
    this.idList = [];
    this.activeId = null;
    this.sendConfig();
  },

  stop() {
    Log.info('Stopping module ', this.name);
  },

  sendConfig() {
    const config = { ...this.config };
    if (config.token) {
      this.sendSocketNotification(this.name + '-CONFIG', config);
    } else {
      Log.error("missing token value: ", JSON.stringify(config, null, 2))
    }
  },

  // --- Helper DOM functions ---
  createEl(tag, options = {}) {
    const el = document.createElement(tag);
    if (options.class) el.className = options.class;
    if (options.html) el.innerHTML = options.html;
    if (options.attrs) Object.entries(options.attrs).forEach(([k, v]) => el.setAttribute(k, v));
    if (options.children) options.children.forEach(child => el.appendChild(child));
    return el;
  },

  buildTD(value = '', classes = '', colspan = 1) {
    // Display 0 as a value, but keep empty string for undefined/null
    const displayValue = (value === 0) ? '0' : (value || '');
    return this.createEl('td', {
      class: Array.isArray(classes) ? classes.join(' ') : classes,
      html: displayValue,
      attrs: { colspan }
    });
  },

  buildTDForFlag(src, classes) {
    const td = this.buildTD('', classes);
    const img = document.createElement('img');
    if (this.config.logosToInvert.some(s => src.includes(`${s}`))) {
      img.classList.add('MMM-SoccerLiveScore-team_logo--invert');
    }
    img.src = src;
    img.style.width = '20px';
    img.style.height = '20px';
    td.appendChild(img);
    return td;
  },

  buildTDforDot(status) {
    const td = this.createEl('td', { class: 'MMM-SoccerLiveScore__status MMM-SoccerLiveScore__active-dot' });
    const dot = this.createEl('p', { html: " - ", class: `MMM-SoccerLiveScore-${status}` });
    td.appendChild(dot);
    return td;
  },

  buildTH(value) {
    return this.createEl('th', { html: value });
  },

  buildHeader(title, emblem) {
    const header = this.createEl('header', { html: title + ' ' });
    const img = document.createElement('img');
    img.src = emblem;
    img.style = "height: 20px; width: auto; vertical-align: middle; aspect-ratio: 1/1;";
    header.appendChild(img);
    return header;
  },

  // --- Rendering functions ---
  renderStandings({ standing, nextRequest }) {
    const table = this.createEl('table', { class: 'xsmall' });
    standing.forEach(f => {
      Object.entries(f).forEach(([key, games]) => {
        table.appendChild(this.createEl('tr', {
          children: [this.buildTD(
            `${new Date(key).toLocaleDateString()} ${new Date(key).toLocaleTimeString()}`,
            'MMM-SoccerLiveScore-date', 7)]
        }));

        Object.values(games).forEach(m => {
          const tr = this.createEl('tr', {
            class: `MMM-SoccerLiveScore-${m.status}`,
            children: [
              this.buildTD(m.homeTeam.name, 'MMM-SoccerLiveScore-homeTeam'),
              this.buildTDForFlag(m.homeTeam.crest, 'MMM-SoccerLiveScore-flag'),
              this.buildTD(m.score.fullTime.home + '', 'MMM-SoccerLiveScore-score'),
              this.buildTDforDot(m.status),
              this.buildTD(m.score.fullTime.away + '', 'MMM-SoccerLiveScore-score'),
              this.buildTDForFlag(m.awayTeam.crest, 'MMM-SoccerLiveScore-flag'),
              this.buildTD(m.awayTeam.name, 'MMM-SoccerLiveScore-awayTeam')
            ]
          });
          table.appendChild(tr);
          m.referees.forEach(r => {
            table.appendChild(this.createEl('tr', {
              children: [this.buildTD(
                `${r.type.toLowerCase()}: ${r?.name} (${r?.nationality})`,
                'MMM-SoccerLiveScore-referee', 7)]
            }));
          });
        });
      });
    });
    table.appendChild(this.createEl('tr', {
      children: [this.buildTD('Next API request: ' + nextRequest, 'MMM-SoccerLiveScore__api-info', 7)]
    }));
    return table;
  },

  renderTable(tableRows) {
    const table = this.createEl('table', { class: 'xsmall' });
    const labelRow = this.createEl('tr');
    labelRow.appendChild(this.buildTH(''));
    if (this.config.showLogos) labelRow.appendChild(this.buildTH(''));
    if (this.config.showNames) labelRow.appendChild(this.buildTH('TEAM'));
    labelRow.appendChild(this.buildTH(''));
    ['#', 'W', 'D', 'L', 'GD', 'PTS'].forEach(label => labelRow.appendChild(this.buildTH(label)));
    table.appendChild(labelRow);

    tableRows.forEach((row, i) => {
      const tr = this.createEl('tr', {
        attrs: row.marker_color ? { style: `background-color:${row.marker_color}0d` } : {},
        children: [
          this.buildTD(i + 1),
          ...(this.config.showLogos ? [this.buildTDForFlag(row.team.crest, 'MMM-SoccerLiveScore-team_logo')] : []),
          ...(this.config.showNames ? [this.buildTD(row.team.name, 'MMM-SoccerLiveScore-left')] : []),
          this.buildTD('', row.is_playing ? 'MMM-SoccerLiveScore__is_playing__active-dot' : ''),
          this.buildTD(row.playedGames),
          this.buildTD(row.won),
          this.buildTD(row.draw),
          this.buildTD(row.lost),
          this.buildTD(row.goalDifference),
          this.buildTD(row.points)
        ]
      });
      table.appendChild(tr);
    });
    return table;
  },

  renderScorers(scorers) {
    const table = this.createEl('table', { class: 'xsmall' });
    const headerRow = this.createEl('tr');
    ['Goals', 'Penalties', 'Assists'].forEach(label => headerRow.appendChild(this.buildTH(label)));
    if (this.config.showLogos) headerRow.appendChild(this.buildTH(''));
    headerRow.appendChild(this.buildTH('PLAYER'));
    table.appendChild(headerRow);

    scorers.forEach(scorer => {
      const tr = this.createEl('tr', {
        children: [
          this.buildTD(scorer.goals, 'MMM-SoccerLiveScore-center'),
          this.buildTD(scorer.penalties || 0, 'MMM-SoccerLiveScore-center'),
          this.buildTD(scorer.assists || 0, 'MMM-SoccerLiveScore-center'),
          ...(this.config.showLogos ? [this.buildTDForFlag(scorer.team.crest, 'MMM-SoccerLiveScore-right')] : []),
          this.buildTD(`${scorer.player.name} (${scorer.team.name})`, 'MMM-SoccerLiveScore-left')
        ]
      });
      table.appendChild(tr);
    });
    return table;
  },

  // --- Main DOM rendering ---
  getDom() {
    clearTimeout(this.updateDomTimeout);
    if (!this.config.token) {
      return this.createEl('div', {
        class: 'MMM-SoccerLiveScore--error',
        children: [this.createEl('p', { html: "Missing API token in configuration" })]
      });
    }

    const outerWrapper = this.createEl('div', { class: 'MMM-SoccerLiveScore-outer-wrapper' });
    const wrapper = this.createEl('div', { class: 'MMM-SoccerLiveScore-inner-wrapper' });
    outerWrapper.appendChild(wrapper);

    // If idList is empty, show loading
    if (!this.idList || this.idList.length === 0) {
      wrapper.innerHTML = 'Loading...';
      return outerWrapper;
    }

    // If activeId is not set, set it to the first league
    if (!this.activeId || !this.idList.includes(this.activeId)) {
      this.activeId = this.idList[0];
    }

    const standing = this.standings[this.activeId] || [];
    const tables = this.tables[this.activeId] || [];
    const scorers = this.scorers[this.activeId] || [];
    const hasStandingsToShow = this.config.showStandings && standing.length > 0;
    const hasTablesToShow = this.config.showTables && Array.isArray(tables) && tables.length > 0;
    const hasScorersToShow = this.config.showScorers && Array.isArray(scorers) && scorers.length > 0;

    // If no data for current league, show loading
    if (!hasStandingsToShow && !hasTablesToShow && !hasScorersToShow) {
      wrapper.innerHTML = 'Loading...';
      return outerWrapper;
    }

    let nextRequest = null;
    if (this.nextRequest[this.activeId]) {
      nextRequest = new Date(this.nextRequest[this.activeId]).toLocaleString();
    }

    // Render header
    const comp = this.competition[this.activeId] || {};
    if (comp.name && comp.emblem) {
      wrapper.appendChild(this.buildHeader(comp.name, comp.emblem));
    }

    // Render standings, tables, or scorers
    if (hasStandingsToShow && this.standingActive) {
      wrapper.appendChild(this.renderStandings({ standing, nextRequest }));
    } else if (hasTablesToShow && this.tableActive) {
      tables.forEach(t => wrapper.appendChild(this.renderTable(t)));
    } else if (hasScorersToShow && this.scorersActive) {
      wrapper.appendChild(this.renderScorers(scorers));
    }

    // Cycle through views
    const timeSplit = [hasStandingsToShow, hasTablesToShow, hasScorersToShow].filter(Boolean);
    clearTimeout(this.updateDomTimeout);
    if (timeSplit.length > 1) {
      this.updateDomTimeout = setTimeout(() => {
        // Rotate view flags
        if (this.standingActive && hasTablesToShow) {
          this.standingActive = false;
          this.tableActive = true;
          this.scorersActive = false;
        } else if (this.tableActive && hasScorersToShow) {
          this.standingActive = false;
          this.tableActive = false;
          this.scorersActive = true;
        } else {
          this.standingActive = true;
          this.tableActive = false;
          this.scorersActive = false;
        }
        this.updateDom(1000);
      }, this.config.displayTime / timeSplit.length);
    } else if (this.idList.length > 1) {
      // If only one view, cycle leagues
      const activeIdIndex = this.idList.findIndex(i => i === this.activeId);
      this.changeLeagueTimeout = setTimeout(() => this.changeLeague(activeIdIndex + 1), this.config.displayTime);
    }

    // Vertical scroll animation
    if (this.config.scrollVertical) {
      setTimeout(() => {
        const rect = outerWrapper.getBoundingClientRect();
        const scrollDistance = Math.max(0, rect.height - window.innerHeight);
        if (scrollDistance > 0) {
          document.documentElement.style.setProperty('--vertical-animation-offset', `-${scrollDistance * 1.1}px`);
          outerWrapper.classList.add('MMM-SoccerLiveScore-vertical-infinite-scroll');
        } else {
          outerWrapper.classList.remove('MMM-SoccerLiveScore-vertical-infinite-scroll');
          document.documentElement.style.removeProperty('--vertical-animation-offset');
        }
      }, 500);
    }

    return outerWrapper;
  },

  changeLeague(count = 0) {
    clearTimeout(this.changeLeagueTimeout);
    if (this.idList.length > 0) {
      const index = count % this.idList.length;
      this.activeId = this.idList[index];
      this.standingActive = this.config.showStandings;
      this.tableActive = this.tables[this.activeId] && !this.config.showStandings && this.config.showTables;
      this.scorersActive = this.scorers[this.activeId] && !this.config.showStandings && !this.config.showTables && this.config.showScorers;
      this.updateDom();
      this.changeLeagueTimeout = setTimeout(() => this.changeLeague(++count), this.config.displayTime);
    }
  },

  socketNotificationReceived(notification, payload) {
    const name = "MMM-SoccerLiveScore";
    Log.debug(name, 'socketNotificationReceived', notification, JSON.stringify(payload));
    this.standingActive = this.config.showStandings;
    this.tableActive = !this.config.showStandings && this.config.showTables;
    this.scorersActive = !this.config.showStandings && !this.config.showTables && this.config.showScorers;
    Log.info(name, 'socketNotificationReceived | notification', notification, payload.leagueId);

    if (notification === name + '-LEAGUES') {
      this.idList = Object.values(payload.leaguesList).map(c => c.code);
      this.leagueIds = payload.leaguesList;
      if (!this.activeId && this.idList && this.idList.length > 0) {
        this.activeId = this.idList[0];
      }
      this.updateDom(0); // <-- Immediate update for first league list
      // Only start cycling if more than one league
      if (this.idList && this.idList.length > 1) this.changeLeague();
    } else if (notification === name + '-STANDINGS') {
      if (this.idList?.length === 0) {
        this.sendSocketNotification(this.name + '-CONFIG', config);
      }
      this.standings[payload.leagueId] = payload.standings;
      this.competition[payload.leagueId] = payload.competition;
      this.nextRequest[payload.leagueId] = payload.nextRequest;
      // Set view flags for first data
      this.standingActive = true;
      this.tableActive = false;
      this.scorersActive = false;
      this.updateDom(0); // <-- Immediate update for first league list
    } else if (notification === name + '-TABLE') {
      if (this.idList?.length === 0) {
        this.sendSocketNotification(this.name + '-CONFIG', config);
      }
      this.tables[payload.leagueId] = payload.table;
      this.competition[payload.leagueId] = payload.competition;
      this.standingActive = false;
      this.tableActive = true;
      this.scorersActive = false;
      this.updateDom(0); // <-- Immediate update for first league list
    } else if (notification === name + '-SCORERS') {
      if (this.idList?.length === 0) {
        this.sendSocketNotification(this.name + '-CONFIG', config);
      }
      this.scorers[payload.leagueId] = payload.scorers;
      this.competition[payload.leagueId] = payload.competition;
      this.standingActive = false;
      this.tableActive = false;
      this.scorersActive = true;
      this.updateDom(0); // <-- Immediate update for first league list
    } else {
      Log.info(this.name, 'unknown notification', notification, JSON.stringify(payload));
      this.updateDom(500);
    }

  },
});

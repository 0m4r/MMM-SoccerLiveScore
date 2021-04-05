**fork of: https://github.com/mrtysn/MMM-SoccerLiveScore**

# MMM-SoccerLiveScore

This a module for the [MagicMirror](https://github.com/MichMich/MagicMirror).  
It displays live scores of your favorite soccer leagues and competitions.

## Preview

### Standing

![](MMM-SoccerLiveScores-Standings.png)

### Table

![](MMM-SoccerLiveScores-Tables.png)

### Scorers

![](MMM-SoccerLiveScores-Scorers.png)

## Installation

1. Navigate into your MagicMirror's `modules` folder and execute `git clone https://github.com/0m4r/MMM-SoccerLiveScore.git`.

## Config

The entry in `config.js` can include the following options:

| Option          | Description                                                                                                                                                                                                                                                                                                                                                                |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `leagues`       | List of league-ID's you want to display. If you put more than one league the module switches automatically between them. A table with possible leagues and the related ID's can be found further down. **Type:** `integer`<br>**Example:** `[35, 1, 9]` <br>This value is **OPTIONAL** and if not specified it defaults to 1 (Uefa Champions League)                       |
| `showNames`     | Toggles teams names. <br><br>**Default value:** `true`                                                                                                                                                                                                                                                                                                                     |
| `showLogos`     | Toggles team logos.<br><br>**Default value:** `true`                                                                                                                                                                                                                                                                                                                       |
| `displayTime`   | defines how long the information for a league in `leagues` is shown on the screen. This screen time is used to display standings, tables and scorers. For example, if you specify `displayTime` to 30 seconds and `showTables=true`, `showStandings=true`and `showScorers=true` each information will be shown for about 10 seconds. <br><br>**Default value:** 20 \* 1000 |
| `showStandings` | display the standings for the league <br><br>**Default value:** `true`                                                                                                                                                                                                                                                                                                     |
| `showTables`    | display the tables for the league (if available) <br><br>**Default value:** `true`                                                                                                                                                                                                                                                                                         |
| `showScorers`   | display the scorers for the league (if available) <br><br>**Default value:** `true`                                                                                                                                                                                                                                                                                        |

Here is an example of an entry in `config.js`

```js
{
  module: 'MMM-SoccerLiveScore',
  position: 'top_left',
  header: 'Live-Scores',
  config: {
    leagues: [35, 1, 9],
      showNames: true,
      showLogos: true,
      displayTime: 60 * 1000,
      showStandings: true,
      showTables: true,
      showScorers: true,
  }
},
```

## Leagues

<table>
    <tr>
        <th>League</th>
        <th>ID</th>
    </tr>
    <tr>
        <th colspan="2">Europe</th>
    </tr>
    <tr>
        <td align="left">Champions League</td>
        <td align="left">1</td>
    </tr>
    <tr>
        <td align="left">Euro League</td>
        <td align="left">2</td>
    </tr>  
    <tr>
        <th colspan="2">Germany</th>
    </tr>
    <tr>
        <td align="left">1. Liga</td>
        <td align="left">35</td>
    </tr>
    <tr>
        <td align="left">2. Liga</td>
        <td align="left">44</td>
    </tr>
    <tr>
        <td align="left">3. Liga</td>
        <td align="left">491</td>
    </tr>
    <tr>
        <td align="left">DFB-Pokal</td>
        <td align="left">9</td>
    </tr>
    <tr>
        <td align="left">DFB-Team</td>
        <td align="left">0</td>
    </tr>
    <tr>
        <th colspan="2">England</th>
    </tr>
    <tr>
        <td align="left">Premier League</td>
        <td align="left">17</td>
    </tr>
    <tr>
        <td align="left">FA Cup</td>
        <td align="left">19</td>
    </tr>
    <tr>
        <td align="left">League Cup</td>
        <td align="left">21</td>
    </tr>
    <tr>
        <td align="left">3 Lions</td>
        <td align="left">4</td>
    </tr>
    <tr>
        <th colspan="2">Spain</th>
    </tr>
    <tr>
        <td align="left">Primera Division</td>
        <td align="left">8</td>
    </tr>
    <tr>
        <td align="left">Segunda Division</td>
        <td align="left">54</td>
    </tr>
    <tr>
        <th colspan="2">Italy</th>
    </tr>
    <tr>
        <td align="left">Serie A</td>
        <td align="left">23</td>
    </tr>
    <tr>
        <td align="left">Serie B</td>
        <td align="left">53</td>
    </tr>
    <tr>
        <td align="left">Coppa Italia</td>
        <td align="left">328</td>
    </tr>
    <tr>
        <th colspan="2">France</th>
    </tr>
    <tr>
        <td align="left">Ligue 1</td>
        <td align="left">34</td>
    </tr>
    <tr>
        <td align="left">Ligue 2</td>
        <td align="left">182</td>
    </tr>
     <tr>
        <th colspan="2">Portugal</th>
    </tr>
    <tr>
        <td align="left">Primeira Liga</td>
        <td align="left">238</td>
    </tr>
    <tr>
        <td align="left">Segunda Liga</td>
        <td align="left">239</td>
    </tr>
     <tr>
        <th colspan="2">Austria</th>
    </tr>
    <tr>
        <td align="left">Bundesliga</td>
        <td align="left">45</td>
    </tr>
    <tr>
        <td align="left">Erste Liga</td>
        <td align="left">135</td>
    </tr>
    <tr>
        <td align="left">ÖFB Cup</td>
        <td align="left">445</td>
    </tr>
    <tr>
        <th colspan="2">Switzerland</th>
    </tr>
    <tr>
        <td align="left">Super League</td>
        <td align="left">215</td>
    </tr>
    <tr>
        <td align="left">Challange League</td>
        <td align="left">216</td>
    </tr>
    <tr>
        <td align="left">Schweitzer Cup</td>
        <td align="left">399</td>
    </tr>
    <tr>
        <th colspan="2">Turkey</th>
    </tr>
    <tr>
        <td align="left">Süper Lig</td>
        <td align="left">52</td>
    </tr>
    <tr>
        <td align="left">1. Lig</td>
        <td align="left">98</td>
    </tr>
    <tr>
        <th colspan="2">Netherlands</th>
    </tr>
    <tr>
        <td align="left">Eredivisie</td>
        <td align="left">37</td>
    </tr>
    <tr>
        <td align="left">Eerste Divisie</td>
        <td align="left">131</td>
    </tr>  
</table>
  
  
## Special Thanks

- [Michael Teeuw](https://github.com/MichMich) for creating the awesome [MagicMirror2](https://github.com/MichMich/MagicMirror/tree/develop) project that made this module possible.
- [mrtysn](https://github.com/mrtysn) for starting the MMM-soccerLiveScore module, where from this code has been forked (https://github.com/mrtysn/MMM-SoccerLiveScore)

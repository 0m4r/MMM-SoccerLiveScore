**fork of: https://github.com/mrtysn/MMM-SoccerLiveScore**  


MMM-SoccerLiveScore
===================
This a module for the [MagicMirror](https://github.com/MichMich/MagicMirror). It displays live scores of your favorite soccer leagues and competitions.

## Preview

### Scores

![](https://github.com/0m4r/MMM-SoccerLiveScore/blob/master/preview.png?raw=true)

### Table

![](https://github.com/0m4r/MMM-SoccerLiveScore/blob/master/table.png?raw=true)

## Installation
1. Navigate into your MagicMirror's `modules` folder and execute `git clone https://github.com/0m4r/MMM-SoccerLiveScore.git`.


## Config
The entry in `config.js` can include the following options:

|Option|Description|
|---|---|
|`leagues`|List of league-ID's you want to display. If you put more than one league the module switches automatically between them. A table with possible leagues and the related ID's can be found further down.<br><br>**Type:** `integer`<br>**Example:** `[35, 1, 9]` //Bundesliga, Champions League & DFB-Pokal<br>This value is **REQUIRED**|
|`showNames`|Toggles if team-names are shown. <br><br>**Default value:** `true`|
|`showLogos`|Toggles if team-logos are shown.<br><br>**Default value:** `true`|
|`displayTime`|Defines how long one league is shown, if you have more than one League in the `leagues`-value.<br><br>**Default value:** 60 • 1000 // 1 minute|
|`showTables`|Toggles if tables are shown if the league has a table. <br><br>**Default value:** `true`|



Here is an example of an entry in `config.js`
```
{
  module: 'MMM-SoccerLiveScore',
  position: 'top_left',
  header: 'Live-Scores',
  config: {
    leagues: [35, 1, 9],
        showNames: true,
        showLogos: true,
        displayTime: 60 * 1000,
        showTables: true
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
        <td align="center">Champions League</td>
        <td align="center">1</td>
    </tr>
    <tr>
        <td align="center">Euro League</td>
        <td align="center">2</td>
    </tr>  
    <tr>
        <th colspan="2">Germany</th>
    </tr>
    <tr>
        <td align="center">1. Liga</td>
        <td align="center">35</td>
    </tr>
    <tr>
        <td align="center">2. Liga</td>
        <td align="center">44</td>
    </tr>
    <tr>
        <td align="center">3. Liga</td>
        <td align="center">491</td>
    </tr>
    <tr>
        <td align="center">DFB-Pokal</td>
        <td align="center">9</td>
    </tr>
    <tr>
        <td align="center">DFB-Team</td>
        <td align="center">0</td>
    </tr>
    <tr>
        <th colspan="2">England</th>
    </tr>
    <tr>
        <td align="center">Premier League</td>
        <td align="center">17</td>
    </tr>
    <tr>
        <td align="center">FA Cup</td>
        <td align="center">19</td>
    </tr>
    <tr>
        <td align="center">League Cup</td>
        <td align="center">21</td>
    </tr>
    <tr>
        <td align="center">3 Lions</td>
        <td align="center">4</td>
    </tr>
    <tr>
        <th colspan="2">Spain</th>
    </tr>
    <tr>
        <td align="center">Primera Division</td>
        <td align="center">8</td>
    </tr>
    <tr>
        <td align="center">Segunda Division</td>
        <td align="center">54</td>
    </tr>
    <tr>
        <th colspan="2">Italy</th>
    </tr>
    <tr>
        <td align="center">Serie A</td>
        <td align="center">23</td>
    </tr>
    <tr>
        <td align="center">Serie B</td>
        <td align="center">53</td>
    </tr>
    <tr>
        <th colspan="2">France</th>
    </tr>
    <tr>
        <td align="center">Ligue 1</td>
        <td align="center">34</td>
    </tr>
    <tr>
        <td align="center">Ligue 2</td>
        <td align="center">182</td>
    </tr>
     <tr>
        <th colspan="2">Portugal</th>
    </tr>
    <tr>
        <td align="center">Primeira Liga</td>
        <td align="center">238</td>
    </tr>
    <tr>
        <td align="center">Segunda Liga</td>
        <td align="center">239</td>
    </tr>
     <tr>
        <th colspan="2">Austria</th>
    </tr>
    <tr>
        <td align="center">Bundesliga</td>
        <td align="center">45</td>
    </tr>
    <tr>
        <td align="center">Erste Liga</td>
        <td align="center">135</td>
    </tr>
    <tr>
        <td align="center">ÖFB Cup</td>
        <td align="center">445</td>
    </tr>
    <tr>
        <th colspan="2">Switzerland</th>
    </tr>
    <tr>
        <td align="center">Super League</td>
        <td align="center">215</td>
    </tr>
    <tr>
        <td align="center">Challange League</td>
        <td align="center">216</td>
    </tr>
    <tr>
        <td align="center">Schweitzer Cup</td>
        <td align="center">399</td>
    </tr>
    <tr>
        <th colspan="2">Turkey</th>
    </tr>
    <tr>
        <td align="center">Süper Lig</td>
        <td align="center">52</td>
    </tr>
    <tr>
        <td align="center">1. Lig</td>
        <td align="center">98</td>
    </tr>
    <tr>
        <th colspan="2">Netherlands</th>
    </tr>
    <tr>
        <td align="center">Eredivisie</td>
        <td align="center">37</td>
    </tr>
    <tr>
        <td align="center">Eerste Divisie</td>
        <td align="center">131</td>
    </tr>  
</table>



## Special Thanks
- [Michael Teeuw](https://github.com/MichMich) for creating the awesome [MagicMirror2](https://github.com/MichMich/MagicMirror/tree/develop) project that made this module possible.

const cheerio = require("cheerio");
const axios = require("axios");
const urlParser = require("url");
const fs = require("fs");
const iconv = require("iconv-lite");

const selectors = require("./selectors");
const teams = Object.entries(require("./teams")).reduce(
  (obj, [key, value]) => ({ ...obj, [value]: key }),
  {}
);

const games = [];
const players = {};

async function getData(year) {
  try {
    const gameUrls = await getGameUrls(year);
    const gameSheets = await getGameSheets(gameUrls, 10);
    const promises = gameSheets.map(game => processGame(game));

    await Promise.all([...promises]);
    fs.writeFile(
      `players${year}.json`,
      JSON.stringify(Object.values(players)),
      { encoding: "utf8" },
      err => {
        if (err) {
          throw err;
        }
        console.log("players.json written");
      }
    );
  } catch (e) {
    console.log(e, e.stack);
    throw e;
  }
}

async function processGame(gameSheet) {
  gameSheet.data = iconv.decode(gameSheet.data, "latin1");
  const $sheet = cheerio.load(gameSheet.data, { decodeEntities: false });
  const awayRoster = $sheet(selectors.awayRoster);
  const homeRoster = $sheet(selectors.homeRoster);

  awayTeam = $sheet(selectors.awayTeam)
    .text()
    .trim()
    .replace(/\s/g, " ");
  homeTeam = $sheet(selectors.homeTeam)
    .text()
    .trim()
    .replace(/\s/g, " ");

  awayRoster.team = teams[awayTeam];
  homeRoster.team = teams[homeTeam];

  const goals = $sheet(selectors.goalTable)
    .children()
    .map((i, elem) => {
      if (i === 0) {
        return;
      }
      const cells = $sheet(elem).children();
      const team = cells.eq(3).text();
      const offense = cells
        .eq(8)
        .text()
        .replace(/G/g, "")
        .split(",");
      const defense = cells
        .eq(9)
        .text()
        .replace(/G/g, "")
        .split(",");
      return {
        team,
        offense,
        defense
      };
    });
  awayRoster.goals = goals;
  homeRoster.goals = goals;
  getPlayers(awayRoster, $sheet);
  getPlayers(homeRoster, $sheet);
  return Promise.resolve();
}

function getPlayers(roster, $) {
  roster.each((i, elem) => {
    const cells = $(elem).children();
    if (i === 0 || (cells.length !== 8 && cells.length !== 3)) {
      return;
    }

    const playerName = cells.eq(1).text();

    if (!players[playerName]) {
      players[playerName] = {
        name: playerName,
        goals: 0,
        assists: 0,
        points: 0,
        shotsOnGoal: 0,
        plusMinus: 0,
        gamesPlayed: 0,
        goalsFor: 0,
        goalsForPct: 0,
        goalsAgainst: 0,
        shotPct: 0
      };
    }

    const player = players[playerName];
    player.team = roster.team;

    if (cells.length === 8) {
      player.number = cleanStat(cells.eq(0).text());
      player.goals += cleanStat(cells.eq(2).text());
      player.assists += cleanStat(cells.eq(3).text());
      player.points += cleanStat(cells.eq(4).text());
      player.plusMinus +=
        cells.eq(7).text() === "E" ? 0 : cleanStat(cells.eq(7).text());
      player.gamesPlayed += 1;
      player.shotsOnGoal += cleanStat(cells.eq(6).text());
    } else if (cells.length === 3) {
      player.number = cleanStat(cells.eq(0).text());
      player.didNotPlay = true;
    }

    roster.goals.toArray().forEach(goal => {
      if (
        goal.team === player.team &&
        goal.offense.indexOf(player.number.toString()) !== -1
      ) {
        player.goalsFor += 1;
      } else if (
        goal.team !== player.team &&
        goal.defense.indexOf(player.number.toString()) !== -1
      ) {
        player.goalsAgainst += 1;
      }
    });
    const shotPct = player.goals / player.shotsOnGoal;
    const goalsForPct =
      player.goalsFor / (player.goalsFor + player.goalsAgainst);
    player.shotPct = cleanStat(shotPct);
    player.goalsForPct = cleanStat(goalsForPct);
  });

  return players;
}

async function getGameSheets(gameUrls, batchSize) {
  try {
    const gameSheets = [];
    for (let i = 0; i < gameUrls.length; i += batchSize) {
      // change the 1 here back to gameUrls.length
      let axiosPromises = [];
      for (let x = 0; x < batchSize && i + x < gameUrls.length; x++) {
        axiosPromises.push(
          axios(gameUrls[i + x], {
            responseType: "arraybuffer"
          })
        );
      }
      gameSheets.push(...(await Promise.all(axiosPromises)));
    }
    return gameSheets;
  } catch (e) {
    console.log(e);
    throw e;
  }
}

async function getGameUrls(year) {
  // get html for season game listings
  const seasonPage = await axios.get(
    `http://collegehockeyinc.com/stats/compnatfull${year}.php`
  );
  console.log("got season page");
  // get all links to games
  const $season = cheerio.load(seasonPage.data);
  const gameUrls = $season("tr").map((i, el) => {
    if (
      $season(el)
        .find("td:nth-child(9) a")
        .text() !== "" &&
      $season(el)
        .find("td:nth-child(10)")
        .text()
        .toLowerCase()
        .indexOf("exhibition") === -1
    ) {
      return $season(el)
        .find("td:nth-child(9) a")
        .attr("href");
    }
  });

  return gameUrls;
}

function cleanStat(stat) {
  stat = parseFloat(stat);
  if (isNaN(stat) || !isFinite(stat)) {
    return 0;
  }
  return stat;
}

module.exports = getData;

const cheerio = require("cheerio");
const axios = require("axios");
const urlParser = require("url");

const selectors = require("./selectors");
const teams = require("./teams");

main();
const games = [];

async function main() {
  doThatThing(17);
}

async function doThatThing(year) {
  try {
    const gameUrls = await getGameUrls(year);
    // get pages 10 at a time?
    const gameSheets = await getGameSheets(gameUrls, 10);
    // parse those mufuckin' things, god damn.
    const promises = gameSheets.map(game => processGame(game));

    await Promise.all([...promises]);
    // we got all the games in an array. now what???
    // I guess loop through and tabulate all of the player data?
    // probably better to do that in the Process Games function, no?
  } catch (e) {
    console.log(e);
  }
  // http.get(options, handleGetGameUrls).on("error", console.log);
}

async function processGame(gameSheet) {
  const game = {
    awayTeam: {
      players: {}
    },
    homeTeam: {
      players: {}
    }
  };
  const $sheet = cheerio.load(gameSheet.data);
  const awayRoster = $sheet(selectors.awayRoster);
  const homeRoster = $sheet(selectors.homeRoster);

  game.awayTeam.players = getPlayers(awayRoster, $sheet);
  game.homeTeam.players = getPlayers(homeRoster, $sheet);
  game.awayTeam.name = $sheet(selectors.awayTeam).text;
  game.homeTeam.name = $sheet(selectors.homeTeam).text;
  return games.push(game);
}

function getPlayers(roster, $) {
  const players = {};
  roster.each((i, elem) => {
    const cells = $(elem).children();
    const player = {};
    let playerName;
    if (i === 0 || (cells.length !== 8 && cells.length !== 3)) {
      return;
    } else if (cells.length === 8) {
      playerName = cells.eq(1).text();
      player.number = parseInt(cells.eq(0).text());
      player.goals = parseInt(cells.eq(2).text());
      player.assists = parseInt(cells.eq(3).text());
      player.points = parseInt(cells.eq(4).text());
      player.shotsOnGoal = parseInt(cells.eq(6).text());
      player.plusMinus = cells.eq(7).text();
    } else if (cells.length === 3) {
      playerName = cells.eq(1).text();
      player.number = parseInt(cells.eq(0).text());
      player.didNotPlay = true;
    }
    players[playerName] = player;
  });

  return players;
}

async function getGameSheets(gameUrls, batchSize) {
  try {
    const gameSheets = [];
    for (let i = 0; i < 1; i += batchSize) {
      // change the 1 here back to gameUrls.length
      let axiosPromises = [];
      for (let x = 0; x < batchSize && i + x < gameUrls.length; x++) {
        axiosPromises.push(axios(gameUrls[i + x]));
      }
      gameSheets.push(...(await Promise.all(axiosPromises)));
    }
    return gameSheets;
  } catch (e) {
    console.log(e);
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
  const rawGameLinks = $season("td:nth-child(9) a").toArray();
  const gameUrls = rawGameLinks.map(link => {
    return $season(link).attr("href");
  });

  return gameUrls;
}

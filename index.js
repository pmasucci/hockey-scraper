const getData = require('./scrape');

main();

async function main() {
  await getData(19);
}

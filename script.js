// olasi pumplari gostersin
// olasi pumplari silme tusu da olsun

const pricesMap = {}

// configs
const tick = 15 // second
const timeIntervalInMins = [0.25, 1, 3, 5, 15, 60, 120, 240] // minute
const diffs = {}


const timeIntervals = timeIntervalInMins.map(timeToPeriod) // period

main()

async function main() {
  await initializeMaps();
  initializeDOM();
  setInterval(updateData, tick * 1000)
  updateData()
}

async function updateData(){
  const coins = await fetchData()
  addToPrices(coins)
  updateTable();
  // console.log(diffs) //sil
  printTopGainersAndLosers()
}

// // // HELPERS - IMPLEMENTATION DETAILS // // //
// calculate diff from array
function calculateDiff(prices) {
  const lastIndex = prices.length - 1;

  const lastPrice = prices[lastIndex];
  const prevPrice = prices[lastIndex - 1];

  const percentageChange = ((lastPrice - prevPrice) / prevPrice) * 100;
  return percentageChange.toFixed(2); // Yüzde değişimi iki ondalık basamakla döndür
}

function formatSymbol(symbol) {
  let newSymbol = []
  const endIndex = symbol.length - 4;
  for (let i = 0; i < endIndex; i++) {
    if (symbol[i] === '0' || symbol[i] === '1') {
      continue
    }
    newSymbol.push(symbol[i])
  }
  return newSymbol.join('')
}

function formatTime(time){
  // [1, 3, 5, 15, 60, 120, 240]
  if(time >= 60){
    return time / 60
  }
  // ...
  return time
}

function timeToPeriod(time){
  return (time * 60) / tick
}


// Fetch & Prepare Data

// clear fields
function transformCoins(coins) {
  const transformedCoins = coins.map(coin => {
    const {
      symbol,
      last_tick_direction,
      prev_price_24h,
      high_price_24h,
      low_price_24h,
      prev_price_1h,
      mark_price,
      open_interest,
      volume_24h,
      funding_rate
    } = coin

    const formattedSymbol = formatSymbol(symbol)

    return {
      symbol: formattedSymbol,
      last_tick_direction,
      prev_price_24h,
      high_price_24h,
      low_price_24h,
      prev_price_1h,
      mark_price,
      open_interest,
      volume_24h,
      funding_rate
    };
  });

  return transformedCoins;
}

// fetch
async function fetchData() {
  const url = "https://api.bybit.com/v2/public/tickers";
  const response = await fetch(url);
  const data = await response.json();
  const filteredData = data.result.filter(el => el.symbol.endsWith("USDT"))
  const transformedData = transformCoins(filteredData);
  return transformedData
}

// initialize
async function initializeMaps() {
  const coins = await fetchData();

  coins.forEach(({ symbol, mark_price }) => {
    pricesMap[symbol] = [mark_price];
  });

  for (const interval of timeIntervalInMins) {
    diffs[interval] = {};
    for (const currency in pricesMap) {
      diffs[interval][currency] = null;
    }
  }
}

// Process Data
// add to prices
function addToPrices(coins) {
  coins.forEach(({ symbol, mark_price }) => {
    if (pricesMap.hasOwnProperty(symbol)) {
      pricesMap[symbol].push(mark_price);
    } else {
      console.log(`Symbol '${symbol}' not found in pricesMap.`);
    }
  });
}

function calculateChange(prices, timeInterval) {
  if (prices.length <= timeInterval) {
    return null;
  }
  const changeArray = prices.slice(-(timeInterval + 1));

  const startPrice = changeArray[changeArray.length - timeInterval - 1];
  const endPrice = changeArray[changeArray.length - 1];

  const percentageChange = ((endPrice - startPrice) / startPrice) * 100;

  return percentageChange.toFixed(2);
}


//////


// minmax open interest ...




//////






// // // // DOM Manipulation // // // //

function initializeDOM() {
  const table = document.getElementById('cryptoTable');

  const headerRow = document.createElement('tr');
  const headerSymbol = document.createElement('th');
  headerSymbol.textContent = '';
  headerRow.appendChild(headerSymbol);

  for (const interval of timeIntervalInMins) {
    const headerInterval = document.createElement('th');
    headerInterval.textContent = formatTime(interval) // bu satiri degistir
    headerRow.appendChild(headerInterval);
  }

  table.appendChild(headerRow);
  let rowIndex = 1;

  for (const currency in pricesMap) {
    const row = document.createElement('tr');
    const symbol = document.createElement('td');

    symbol.textContent = currency
    row.appendChild(symbol);

    for (let i = 0; i < timeIntervals.length; i++) {
      const cell = document.createElement('td');
      cell.textContent = '';
      cell.id = `cell_${currency}_${i}`;
      row.appendChild(cell);
    }
    table.appendChild(row);
    rowIndex++;
  }
}

function updateTable() {
  for (const currency in pricesMap) {
    for (let i = 0; i < timeIntervals.length; i++) {
      const change = calculateChange(pricesMap[currency], timeIntervals[i]);
      const cell = document.getElementById(`cell_${currency}_${i}`);
      if (change !== null) {
      cell.textContent = change
      // burada change degiskenini diffs yapisina ekle
      diffs[timeIntervalInMins[i]][currency] = change
      }
    }
  }
}

function printTopGainersAndLosers() {
  const topGainers = document.getElementById('topGainersTable');
  const topLosers = document.getElementById('topLosersTable');

  topGainers.innerHTML = '';
  topLosers.innerHTML = '';

  for (const interval of timeIntervalInMins) {
    const currencies = Object.keys(diffs[interval]).sort((a, b) => {
      const diffA = diffs[interval][a];
      const diffB = diffs[interval][b];

      if (diffA === null && diffB === null) return 0;
      if (diffA === null) return 1;
      if (diffB === null) return -1;

      return diffB - diffA;
    });

    const topGainersList = document.createElement('ul');
    const topLosersList = document.createElement('ul');

    const headerGainers = document.createElement('h3');
    headerGainers.textContent = `${formatTime(interval)} minute - Top Gainers`;
    topGainers.appendChild(headerGainers);

    const headerLosers = document.createElement('h3');
    headerLosers.textContent = `${formatTime(interval)} minute - Top Losers`;
    topLosers.appendChild(headerLosers);

    for (let i = 0; i < 10; i++) {
      if (diffs[interval][currencies[i]] !== null) {
        const listItemGainers = document.createElement('li');
        const gainerLink = document.createElement('a')
        gainerLink.rel = "noopener noreferrer"
        gainerLink.target = "_blank"
        gainerLink.href = `https://www.bybit.com/trade/usdt/${currencies[i]}USDT`
        gainerLink.textContent = `${currencies[i]}\t${diffs[interval][currencies[i]]}`;
        listItemGainers.appendChild(gainerLink)
        topGainersList.appendChild(listItemGainers);
      }

      if (diffs[interval][currencies[currencies.length - 1 - i]] !== null) {
        const listItemLosers = document.createElement('li');
        listItemLosers.textContent = `${currencies[currencies.length - 1 - i]}\t${diffs[interval][currencies[currencies.length - 1 - i]]}`;
        topLosersList.appendChild(listItemLosers);
      }
    }

    topGainers.appendChild(topGainersList);
    topLosers.appendChild(topLosersList);
  }
}




window.addEventListener('beforeunload', function (e) {
    // Geçerli tarayıcı (browser) üzerinden sayfanın yenilenmesi veya kapatılması denendiğinde bir uyarı mesajı gösterilir.
    e.preventDefault();
    e.returnValue = ''; // Bazı tarayıcılar için gereklidir (eski tarayıcılar için).
    return ''; // Bazı tarayıcılar için gereklidir.
});
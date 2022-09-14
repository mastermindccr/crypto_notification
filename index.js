require('dotenv').config();
const ccxt = require('ccxt');
const exchange = new ccxt.binance();
exchange.options['defaultType'] = 'future';

let token = process.env.token;

const find = async() => {
    const date = new Date();
    if(date.getMinutes()%15!=1) return;
    await exchange.loadMarkets('true');
    const symbols = exchange.symbols;
    const tickers = await exchange.fetchTickers(symbols, {});
    for(let i in tickers){
        try{
            const OHLCV = await exchange.fetchOHLCV(i, '15m');
            if(OHLCV[499][0]<1662700000000) continue;
            const percentage = (OHLCV[498][4]-OHLCV[498][1])/OHLCV[498][1];
            if(percentage>=0.05){
                sendMessage(`${i}在過去15分鐘漲了${(percentage*100).toFixed(2)}%!`);
            }
            else if(percentage<=-0.05){
                sendMessage(`${i}在過去15分鐘跌了${(percentage*100).toFixed(2)}%!`);
            }
        }
        catch(e){
            continue;
        }
    }
}

async function sendMessage(message){
    const url = 'https://notify-api.line.me/api/notify?';
    const params = new URLSearchParams({
        message: message
    })
    fetch(url+params, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Bearer ${token}`
        }
    })
}

(async() => {
    find();
    setInterval(()=>find(), 1000*60);
})()
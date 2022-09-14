const http = require('http');
const opn = require('open');
require('dotenv').config();
const ccxt = require('ccxt');
const exchange = new ccxt.binance();
exchange.options['defaultType'] = 'future';

const find = async(token) => {
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
                sendMessage(token, `${i}在過去15分鐘漲了${(percentage*100).toFixed(2)}%!`);
            }
            else if(percentage<=-0.05){
                sendMessage(token, `${i}在過去15分鐘跌了${(percentage*100).toFixed(2)}%!`);
            }
        }
        catch(e){
            continue;
        }
    }
}

async function authorize(){
    const url = "https://notify-bot.line.me/oauth/authorize?";
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: process.env.client_id,
        redirect_uri: process.env.redirect_uri,
        scope: 'notify',
        state: 'cryptoBotTest'
    });
    return new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            const origin = new URL(req.url, `https://${req.rawHeaders[1]}`)
            try{
                resolve(origin.searchParams.get('code'));
                res.end(`<h1>Authentication Successful!</h1>`);
            }
            catch(e){
                reject(e);
                res.end(`<h1>Authentication Failed!</h1>`);
            }
            server.close();
        }).listen(9001, process.env.uri, () => {
            opn(url+params, {wait: false}).then(cp => {
                cp.unref();
            })
        })
    })
}

async function getToken(code){
    const url = 'https://notify-bot.line.me/oauth/token?';
    const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.redirect_uri,
        client_id: process.env.client_id,
        client_secret: process.env.client_secret
    })
    const response = await fetch(url+params, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': '*/*',
        }
    })
    const token = (await response.json()).access_token;

    return new Promise(resolve => {
        resolve(token);
    })
}

async function sendMessage(token, message){
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
    const code = await authorize();
    const token = await getToken(code);
    find(token);
    setInterval(()=>find(token), 1000*60);
})()
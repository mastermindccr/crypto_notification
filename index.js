require('dotenv').config();
const express = require('express');
const ccxt = require('ccxt');
const exchange = new ccxt.binance();

// define Line oauth url
let oauth_url = "https://notify-bot.line.me/oauth/authorize?";
const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.client_id,
    redirect_uri: 'http://localhost:3000' + process.env.redirect_uri,
    scope: 'notify',
    state: 'cryptoBotTest'
});
oauth_url+=params

// define server element
const app = express();
const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log('server is running');
})

app.get('/', (req, res) => {
    res.redirect(oauth_url)
})

app.get('/oauth2callback', async (req, res) => {
    const code = authorize(req);
    if(code!=null){
        const token = await getToken(code);
        find(token);
        setInterval(()=>find(token), 1000*60);
        res.end(`<h1>Authentication Successful!</h1>`);
    }
    else{
        res.end(`<h1>Authentication Failed!</h1>`);
    }
})

const find = async(token) => {
    const date = new Date();
    if(date.getMinutes()%60!=1) return;
    await exchange.loadMarkets('true');
    const symbols = exchange.symbols;
    for(let i of symbols){
        // it is not a USDT pair
        if(i.indexOf("/USDT")==-1)continue; 
        try{
            const OHLCV = await exchange.fetchOHLCV(i, '1h');
            if(OHLCV[499][0]<1681400000000) continue;
            let sum = 0
            for(let i = 450;i<=499;i++){
                sum+=OHLCV[i][5];
            }
            avg_50 = sum/50
            if(OHLCV[499][5]<=avg_50) continue;
            const percentage = (OHLCV[498][4]-OHLCV[498][1])/OHLCV[498][1];
            if(percentage>=0){
                sendMessage(token, `${i}在過去15分鐘漲了${(percentage*100).toFixed(2)}%!`);
            }
            else if(percentage<=0){
                sendMessage(token, `${i}在過去15分鐘跌了${(percentage*100).toFixed(2)}%!`);
            }
        }
        catch(e){
            continue;
        }
    }
}

function authorize(req){
    const origin = new URL(req.url, `https://${req.rawHeaders[1]}`)
    try{
        return origin.searchParams.get('code');
    }
    catch(e){
        return null;
    }
}

async function getToken(code){
    const url = 'https://notify-bot.line.me/oauth/token?';
    const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: 'http://localhost:3000' + process.env.redirect_uri,
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

    return token;
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
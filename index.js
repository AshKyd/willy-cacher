const cron = require("node-cron");

const cache = {};

const locations = process.env.GEOHASHES.split(",");
const apiKey = process.env.API_KEY;

async function go() {
  console.log(new Date(), "starting fetch");
  for (location of locations) {
    console.log(new Date(), "fetching", location);
    const request = `https://api.willyweather.com.au/v2/${apiKey}/locations/${location}/weather.json?forecasts=temperature,uv,wind,weather,sunrisesunset,precis&days=5&startDate=2023-04-07`;
    try {
      const json = await fetch(request).then((res) => res.json());
      cache[location] = json;
    } catch (e) {
      console.error(new Date(), "error fetching ", location);
      console.log(e);
    }
  }
}

// Schedule cronjob hourly on a random minute to spread out the load on the API
const refreshMinute = Math.round(Math.random() * 59);
cron.schedule(refreshMinute + " * * * *", go);

// also fetch now, so we have something to serve
go();

const express = require("express");
const app = express();
const port = 80;

for (location of locations) {
  app.get("/" + location, (req, res) => {
    console.info(new Date(), "requesting", location);
    res.header("content-type", "text/json");
    const currentMinute = new Date().getMinutes();
    const nextRefresh = refreshMinute + 1 - currentMinute;
    const expiryMinutes = nextRefresh < 0 ? nextRefresh + 60 : nextRefresh;
    res.header("cache-control", `public, max-age=${expiryMinutes * 60}`);
    res.send(cache[location]);
  });
}

app.listen(port, () => {
  console.log(new Date(), `listening on port ${port}`);
});

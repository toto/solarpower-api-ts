import * as crypto from "crypto"
import fetch from 'node-fetch';

const API_HOST = "api4home.solarmanpv.com"

interface TokenResponse {
    access_token: string
    token_type: string
    refresh_token: string
    expires_in: number
    scope: string
    jti: string
}

async function getToken(username: string, password: string): Promise<TokenResponse> {
  const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
  const params = new URLSearchParams({
    system: "SOLARMAN",
    "grant_type": "password",
    username,
    password: hashedPassword,
    "client_id": "test",
    "clear_text_pwd": password,
    "identity_type": "2"
  });
  params

  const response = await fetch(
    `https://${API_HOST}/oauth-s/oauth/token`,
    { method: 'POST', body: params }
  );
  const data = await response.json();  
  return data as TokenResponse
}

interface SearchResponse {
  lastUpdateTime: number
  name: string
  id: number
  locationAddress: string
  temperature: number
  fullPowerYesterdayHours: number
}

async function stationSearch(token: string, page: number = 1): Promise<{total: number, data: SearchResponse[]}> {
  const body = {
    "region": {
      "nationId": null,
      "level1": null,
      "level2": null,
      "level3": null,
      "level4": null,
      "level5": null
    }
  };
  const response = await fetch(
    `https://${API_HOST}/maintain-s/operating/station/search?page=${page}&size=10&order.direction=ASC&order.property=name`,
    {
      method: 'post',
      body: JSON.stringify(body),
      headers: {
        'Authorization': `bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  )
  const data = await response.json();
  return data as {total: number, data: SearchResponse[]};
}

// History

interface HistoryResponseRecord {
  systemId: number
  dateTime: number
  /** Generated power in W */
  generationPower: number
  /** Percentage generated power of possible peak generation power */
  generationCapacity: number
}

interface HistoryResponseStatistics {
  id: string
  systemId: number
  year: number
  month: number
  day: number
  generationValue: number
  fullPowerHoursDay: number
}

interface HistoryResponse {
  records: HistoryResponseRecord[]
  statistics: HistoryResponseStatistics
}

async function historyPower(token: string, stationId: number, time: {year: number, day: number, month: number}) {
  const response = await fetch(
    `https://${API_HOST}/maintain-s/history/power/${stationId}/record?year=${time.year}&month=${time.month}&day=${time.day}`,
    {
      method: 'get',
      headers: {
        'Authorization': `bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  )
  const data = await response.json();
  return data as HistoryResponse;
}


// DEBUG ---

const USERNAME = "email@example.com";
const PASSWORD = "password";
const STATION_ID = 123456;

getToken(USERNAME, PASSWORD)
  .then(response => {
    const { access_token } = response;
    console.log("token:", JSON.stringify(response, undefined, 2));
    const date = new Date();
    return Promise.all([stationSearch(access_token), historyPower(access_token, STATION_ID, {year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate()})])
  })
  .then(response => {
    const [ searchResponse, historyResponse ] = response;
    const [ home ] = searchResponse.data;
    console.log("home:", JSON.stringify(home, undefined, 2));
    console.log("history:", JSON.stringify(historyResponse, undefined, 2));
  });


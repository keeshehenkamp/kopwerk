'use strict';
/* Openbare instellingen voor de koppelingen. Hier staan geen geheimen in:
   de Firebase-gegevens zijn bedoeld voor in de browser, het Strava-geheim staat alleen in de Cloudflare Worker. */
const CONFIG={
  firebase:null,  // {apiKey,authDomain,projectId,storageBucket,messagingSenderId,appId} uit de Firebase-console
  strava:null     // {clientId:'12345',worker:'https://kopwerk-strava.<naam>.workers.dev'}
};

'use strict';
/* Openbare instellingen voor de koppelingen. Hier staan geen geheimen in:
   de Firebase-gegevens zijn bedoeld voor in de browser, het Strava-geheim staat alleen in de Cloudflare Worker. */
const CONFIG={
  firebase:{apiKey:'AIzaSyCTvTYYmIJQaH0Lz7eHgaybxNPysnwMwWg',authDomain:'kopwerk-c5fb8.firebaseapp.com',projectId:'kopwerk-c5fb8',
    storageBucket:'kopwerk-c5fb8.firebasestorage.app',messagingSenderId:'958425598544',appId:'1:958425598544:web:1a18e9c7bec35c67489f55'},
  strava:null     // {clientId:'12345',worker:'https://kopwerk-strava.<naam>.workers.dev'}
};

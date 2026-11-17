/* Cloudflare Worker voor Kopwerk: wisselt Strava-codes om voor tokens en stuurt API-verzoeken door.
   Het Strava-geheim staat alleen hier, als secret STRAVA_CLIENT_SECRET; STRAVA_CLIENT_ID is een gewone variabele. */
const ORIGINS=['https://keeshehenkamp.github.io','http://localhost:8772'];
export default{async fetch(req,env){
  const o=req.headers.get('Origin')||'',cors={'Access-Control-Allow-Origin':ORIGINS.includes(o)?o:ORIGINS[0],'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Authorization,Content-Type','Vary':'Origin'};
  if(req.method==='OPTIONS')return new Response(null,{headers:cors});
  const url=new URL(req.url),pass=r=>r.text().then(t=>new Response(t,{status:r.status,headers:{...cors,'Content-Type':'application/json'}}));
  if(url.pathname==='/token'&&req.method==='POST'){
    const b=await req.json().catch(()=>({})),body=new URLSearchParams({client_id:env.STRAVA_CLIENT_ID,client_secret:env.STRAVA_CLIENT_SECRET});
    if(b.code){body.set('code',b.code);body.set('grant_type','authorization_code')}
    else if(b.refresh_token){body.set('refresh_token',b.refresh_token);body.set('grant_type','refresh_token')}
    else return new Response('{"error":"missing"}',{status:400,headers:cors});
    return pass(await fetch('https://www.strava.com/oauth/token',{method:'POST',body}));
  }
  if(url.pathname.startsWith('/api/')&&req.method==='GET')
    return pass(await fetch('https://www.strava.com/api/v3/'+url.pathname.slice(5)+url.search,{headers:{Authorization:req.headers.get('Authorization')||''}}));
  return new Response('{"error":"not found"}',{status:404,headers:cors});
}};

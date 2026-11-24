// HVS CRM web-push delivery (empty payload, no customer data on lock screens).
// Requires dashboard secrets HVS_CRM_WEBPUSH_TOKEN, HVS_CRM_VAPID_PRIVATE, HVS_CRM_VAPID_PUBLIC.
// Connect via an authenticated Supabase database webhook on crm_notifications INSERT.
// NEVER put VAPID private material into GitHub or the browser.
import { createClient } from "npm:@supabase/supabase-js@2";

function b64url(bytes: Uint8Array): string {
  let text="";
  for(const b of bytes)text+=String.fromCharCode(b);
  return btoa(text).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
}
function fromB64url(value:string):Uint8Array{
 const s=value.replace(/-/g,"+").replace(/_/g,"/");
 return Uint8Array.from(atob(s.padEnd(Math.ceil(s.length/4)*4,"=")), c=>c.charCodeAt(0));
}
async function signVapid(endpoint:string,publicKey:string,privateKey:string):Promise<string>{
 const raw=fromB64url(publicKey);
 if(raw.length!==65||raw[0]!==4)throw Error("Invalid VAPID public key.");
 const privateRaw=fromB64url(privateKey);
 if(privateRaw.length!==32)throw Error("Invalid VAPID private key.");
 const key=await crypto.subtle.importKey("jwk",{
  kty:"EC",crv:"P-256",
  x:b64url(raw.slice(1,33)),y:b64url(raw.slice(33,65)),
  d:b64url(privateRaw),ext:true
 },{name:"ECDSA",namedCurve:"P-256"},false,["sign"]);
 const head=b64url(new TextEncoder().encode(JSON.stringify({typ:"JWT",alg:"ES256"})));
 const body=b64url(new TextEncoder().encode(JSON.stringify({
  aud:new URL(endpoint).origin,exp:Math.floor(Date.now()/1000)+3600,
  sub:"mailto:sales@homeviewsolutions.com"
 })));
 const payload=head+"."+body;
 const sig=await crypto.subtle.sign({name:"ECDSA",hash:"SHA-256"},key,new TextEncoder().encode(payload));
 return payload+"."+b64url(new Uint8Array(sig));
}
function approvedPushHost(endpoint:string):boolean{
 try {
  const u=new URL(endpoint);
  if(u.protocol!=="https:")return false;
  const h=u.hostname.toLowerCase();
  return h==="fcm.googleapis.com" || h==="updates.push.services.mozilla.com" ||
   h==="web.push.apple.com" || h.endsWith(".push.apple.com") ||
   h.endsWith(".notify.windows.com") || h.endsWith(".wns.windows.com");
 }catch{return false;}
}
Deno.serve(async req=>{
 if(req.method!=="POST")return new Response("Method not allowed",{status:405});
 const hook=Deno.env.get("HVS_CRM_WEBPUSH_TOKEN");
 const priv=Deno.env.get("HVS_CRM_VAPID_PRIVATE");
 const pub=Deno.env.get("HVS_CRM_VAPID_PUBLIC");
 if(!hook||!priv||!pub)return new Response("Web Push not configured",{status:503});
 const provided=req.headers.get("x-crm-webpush-token");
 if(!provided||provided!==hook)return new Response("Forbidden",{status:403});
 let incoming:Record<string,unknown>;
 try{incoming=await req.json();}catch{return new Response("Malformed request",{status:400});}
 // Supabase DB webhooks wrap row details in "record"; support a simple ID body as well.
 const record=(incoming.record&&typeof incoming.record==="object")?incoming.record as Record<string,unknown>:incoming;
 const id=record.id||record.notification_id;
 if(typeof id!=="string"||!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id))
  return new Response("Invalid alert ID",{status:400});
 const secretKeys=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}");
 const adminKey=secretKeys.default||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 const url=Deno.env.get("SUPABASE_URL");
 if(!adminKey||!url)return new Response("Missing backend service credentials",{status:503});
 const admin=createClient(url,adminKey,{auth:{autoRefreshToken:false,persistSession:false}});
 const alertRes=await admin.from("crm_notifications")
  .select("id,workspace_id,recipient_id").eq("id",id).maybeSingle();
 if(alertRes.error)return new Response("Unable to load alert",{status:500});
 const alert=alertRes.data;
 if(!alert)return new Response("No eligible alert",{status:200});
 const member=await admin.from("workspace_members").select("user_id")
  .eq("workspace_id",alert.workspace_id).eq("user_id",alert.recipient_id).maybeSingle();
 if(member.error||!member.data)return new Response("Not an active member",{status:200});
 const prefs=await admin.from("crm_notification_settings").select("enabled")
  .eq("user_id",alert.recipient_id).maybeSingle();
 if(prefs.data&&prefs.data.enabled===false)return new Response("Notifications disabled",{status:200});
 const claim=await admin.rpc("crm_claim_push_alert",{alert_id:alert.id});
 if(claim.error)return new Response("Push queue unavailable",{status:500});
 if(!claim.data)return new Response("Already claimed",{status:200});
 const subs=await admin.from("crm_push_subscriptions").select("id,endpoint")
  .eq("user_id",alert.recipient_id).eq("workspace_id",alert.workspace_id);
 if(subs.error)return new Response("Subscription lookup failed",{status:500});
 let delivered=0;
 for(const sub of subs.data||[]){
  if(!approvedPushHost(sub.endpoint))continue;
  try{
   const jwt=await signVapid(sub.endpoint,pub,priv);
   const res=await fetch(sub.endpoint,{
    method:"POST",headers:{
     Authorization:"vapid t="+jwt+", k="+pub,
     TTL:"3600",Urgency:"normal"
    }
   });
   if(res.ok)delivered++;
   if(res.status===404||res.status===410){
    await admin.from("crm_push_subscriptions").delete().eq("id",sub.id);
   }
  }catch(e){console.error("Push endpoint failed:",String(e));}
 }
 return Response.json({processed:true,accepted:delivered});
});

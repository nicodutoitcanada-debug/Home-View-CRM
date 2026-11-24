
/* Home View CRM: browser-only frontend, Supabase Auth + RLS backend.
 * No customer information is placed in this repository. Demo data is fictional.
 * Never put a Supabase secret/service-role key in config.js or browser storage. */
(function(){
"use strict";
var STAGES=[
  {id:"prospect",name:"Potential client"},
  {id:"contacted",name:"Contacted"},
  {id:"meeting",name:"Meeting booked"},
  {id:"proposal",name:"Proposal sent"},
  {id:"negotiation",name:"Negotiation"},
  {id:"won",name:"Won"},
  {id:"lost",name:"Lost"}
];
var priorities=["hot","warm","cold"];
var app={preview:true,user:null,client:null,workspace:null,member:null,role:"",view:new URLSearchParams(window.location.search).has("alerts")?"alerts":"dashboard",selectedCompany:null,
  companies:[],contacts:[],activities:[],tasks:[],email_messages:[],emailFeatureError:null,members:[],invites:[],search:"",filter:"all",taskFilter:"open",
  modal:null,busy:false,channel:null,alertChannel:null,alerts:[],alertSettings:null,alertError:null,settingsError:null,phonePushEnabled:false,recoveryMode:false};
var el=function(id){return document.getElementById(id);};
var encode=function(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");};
var fmtDate=function(s){if(!s)return "Not scheduled";var d=new Date(String(s).slice(0,10)+"T12:00:00");return isNaN(d.getTime())?"—":d.toLocaleDateString("en-CA",{month:"short",day:"numeric",year:"numeric"});};
var isoToday=function(){var n=new Date();return n.getFullYear()+"-"+String(n.getMonth()+1).padStart(2,"0")+"-"+String(n.getDate()).padStart(2,"0");};
var money=function(n){return Number(n)>0?new Intl.NumberFormat("en-CA",{style:"currency",currency:"CAD",maximumFractionDigits:0}).format(n):"—";};
var safeUrl=function(url){try{var u=new URL(url);return /^https?:$/.test(u.protocol)?u.href:"";}catch(e){return"";}};
var stageInfo=function(s){return STAGES.find(function(x){return x.id===s;})||STAGES[0];};
var chip=function(s){return '<span class="chip stage-'+encode(s)+'">'+encode(stageInfo(s).name)+'</span>';};
var priorityChip=function(s){return '<span class="chip priority-'+encode(s||"warm")+'">'+encode((s||"warm").toUpperCase())+'</span>';};
var company=function(id){return app.companies.find(function(c){return String(c.id)===String(id);});};
var companyName=function(id){return (company(id)||{}).name||"General follow-up";};
var memberName=function(id){var m=app.members.find(function(v){return String(v.user_id)===String(id);});return m?(m.display_name||m.email||"Team member"):(app.user&&id===app.user.id?app.user.email:"Unassigned");};
var activityIcon=function(k){return {note:"✎",call:"☎",meeting:"▣",email:"✉"}[k]||"✎";};
var newer=function(a,b){return String(b.created_at||"").localeCompare(String(a.created_at||""));};
var dueOrder=function(a,b){return String(a.due_date||"9999").localeCompare(String(b.due_date||"9999"));};
function demo(){
 app.preview=true;app.role="demo";
 app.companies=[
  {id:"demo-1",name:"Willowstone Homes",city:"Edmonton",province:"AB",status:"meeting",priority:"hot",estimated_value:85000,contact_name:"Jordan Parker",phone:"",website:"",description:"Sample builder. Interested in a guided demonstration.",assigned_to:"marie",created_at:"2026-10-26"},
  {id:"demo-2",name:"Northline Communities",city:"Calgary",province:"AB",status:"proposal",priority:"warm",estimated_value:62000,contact_name:"Taylor Rivers",phone:"",website:"",description:"Sample proposal discussion, awaiting feedback.",assigned_to:"zanna",created_at:"2026-10-21"},
  {id:"demo-3",name:"Summit Ridge Builders",city:"Red Deer",province:"AB",status:"contacted",priority:"warm",estimated_value:40000,contact_name:"Alex Morgan",phone:"",website:"",description:"Initial conversation about interactive home customization.",assigned_to:"marie",created_at:"2026-10-28"},
  {id:"demo-4",name:"Cedar Valley Developments",city:"Edmonton",province:"AB",status:"prospect",priority:"cold",estimated_value:null,contact_name:"",phone:"",website:"",description:"Research company before outreach.",assigned_to:"zanna",created_at:"2026-10-29"},
  {id:"demo-5",name:"Harbour Point Homes",city:"Calgary",province:"AB",status:"negotiation",priority:"hot",estimated_value:110000,contact_name:"Sam Lee",phone:"",website:"",description:"Discussion about rollout and number of home models.",assigned_to:"marie",created_at:"2026-10-18"}
 ];
 app.members=[{user_id:"marie",email:"marie@example.invalid",display_name:"Marie",role:"admin"},{user_id:"zanna",email:"zanna@example.invalid",display_name:"Zanna",role:"member"}];
 app.contacts=[
  {id:"co1",company_id:"demo-1",name:"Jordan Parker",title:"Marketing Manager",email:"",phone:""},
  {id:"co2",company_id:"demo-2",name:"Taylor Rivers",title:"Sales Director",email:"",phone:""}
 ];
 app.activities=[
  {id:"a1",company_id:"demo-1",type:"meeting",content:"Demo requested. Prepare mobile walkthrough and pricing overview.",created_by:"marie",created_at:"2026-10-30T15:20:00"},
  {id:"a2",company_id:"demo-2",type:"email",content:"Sent introductory package. Follow up after they review it.",created_by:"zanna",created_at:"2026-10-29T13:10:00"},
  {id:"a3",company_id:"demo-3",type:"call",content:"Discussed online presales and their current showroom workflow.",created_by:"marie",created_at:"2026-10-28T12:00:00"}
 ];
 app.tasks=[
  {id:"t1",company_id:"demo-1",title:"Confirm demo meeting time",assigned_to:"marie",due_date:isoToday(),priority:"high",completed:false},
  {id:"t2",company_id:"demo-2",title:"Follow up on proposal",assigned_to:"zanna",due_date:isoToday(),priority:"normal",completed:false},
  {id:"t3",company_id:"demo-3",title:"Send presentation link",assigned_to:"marie",due_date:"2026-12-01",priority:"normal",completed:false},
  {id:"t4",company_id:"demo-5",title:"Clarify requested model count",assigned_to:"zanna",due_date:"2026-12-03",priority:"high",completed:true}
 ];
 app.email_messages=[{id:"sample-mail-1",company_id:"demo-1",created_by:"marie",to_email:"example@example.invalid",subject:"Follow-up after your demonstration",body:"Hello,\n\nThank you for your interest in Home View Solutions.\n\nBest regards,\nHome View Solutions",legal_basis:"review_required",basis_note:"",status:"draft",created_at:"2026-11-23T08:00:00Z"}];
 app.emailFeatureError=null;
 app.alerts=[{id:"sample-alert-1",title:"New customer activity",message:"Sample note added to Willowstone Homes.",company_id:"demo-1",event_kind:"activity_added",read_at:null,created_at:"2026-11-24T10:00:00Z"}];
 app.alertSettings=null;app.alertError=null;app.settingsError=null;
 app.invites=[];app.user=null;app.workspace=null;app.role="demo";
 render();
}
function notify(message,error){var t=el("toast");t.textContent=message;t.style.background=error?"#a43f38":"#19263a";t.classList.remove("hidden");clearTimeout(notify.timer);notify.timer=setTimeout(function(){t.classList.add("hidden");},4300);}
function config(){
 var c=window.HVS_CONFIG||{},stored={};
 try{stored=JSON.parse(localStorage.getItem("hvs-crm-public-config")||"{}");}catch(e){}
 return {url:String(c.supabaseUrl||stored.url||"").trim(),key:String(c.supabaseAnonKey||stored.key||"").trim()};
}
function configured(c){return /^https:\/\//.test(c.url)&&c.key.length>20;}
async function initialize(){
 var c=config();if(!configured(c)){demo();return;}
 if(!window.supabase||!window.supabase.createClient){demo();notify("Could not load Supabase library. Try reloading.",true);return;}
 var recoveryLink=/(?:[#&])type=recovery(?:&|$)/.test(window.location.hash);
 try{
  app.client=window.supabase.createClient(c.url,c.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  // Listen before getSession: the recovery event may fire while the URL is being processed.
  app.client.auth.onAuthStateChange(function(event,session){
   if(event==="PASSWORD_RECOVERY"){
    app.recoveryMode=true;app.user=session?session.user:null;
    showAuth("reset");
   }else if(event==="SIGNED_OUT"&&!app.recoveryMode){
    app.user=null;app.workspace=null;app.member=null;app.role="";demo();showAuth("signin");
   }
  });
  var result=await app.client.auth.getSession();
  if(result.error)throw result.error;
  if(result.data.session){
   if(app.recoveryMode||recoveryLink){
    app.recoveryMode=true;demo();render();app.user=result.data.session.user;showAuth("reset");
   }else{
    app.user=result.data.session.user;await loadWorkspace();
   }
  }else{
   demo();render();
   showAuth(recoveryLink?"forgot":"signin",recoveryLink?"This recovery link could not be used. Request a new email.":null);
  }
 }catch(e){
  demo();render();
  if(recoveryLink)showAuth("forgot","The recovery link could not be verified. Request another email.");
  else notify("Connection issue: "+e.message,true);
 }
}
async function loadWorkspace(){
 if(!app.user)return;
 var r=await app.client.from("workspace_members").select("workspace_id,role,email,display_name").eq("user_id",app.user.id).limit(1).maybeSingle();
 if(r.error)throw r.error;
 if(!r.data){
   var claim=await app.client.rpc("claim_invites");
   if(claim.error)throw claim.error;
   r=await app.client.from("workspace_members").select("workspace_id,role,email,display_name").eq("user_id",app.user.id).limit(1).maybeSingle();
   if(r.error)throw r.error;
 }
 if(!r.data){showAuth("workspace");return;}
 app.member=r.data;app.role=r.data.role;
 var wr=await app.client.from("workspaces").select("id,name").eq("id",r.data.workspace_id).single();
 if(wr.error)throw wr.error;
 app.workspace=wr.data;app.preview=false;el("authLayer").classList.add("hidden");
 await refresh();
 attachRealtime();
 checkPhonePush().catch(function(){});
}
async function refresh(){
 if(app.preview||!app.workspace)return;
 var wid=app.workspace.id;
 var q=[
  app.client.from("companies").select("*").eq("workspace_id",wid).order("created_at",{ascending:false}),
  app.client.from("contacts").select("*").eq("workspace_id",wid),
  app.client.from("activities").select("*").eq("workspace_id",wid).order("created_at",{ascending:false}).limit(300),
  app.client.from("tasks").select("*").eq("workspace_id",wid),
  app.client.from("workspace_members").select("user_id,email,display_name,role,workspace_id").eq("workspace_id",wid)
 ];
 if(app.role==="admin")q.push(app.client.from("workspace_invites").select("id,email,accepted_at,created_at").eq("workspace_id",wid));
 var all=await Promise.all(q);
 var failure=all.find(function(x){return x.error;});if(failure)throw failure.error;
 app.companies=all[0].data||[];app.contacts=all[1].data||[];app.activities=all[2].data||[];
 app.tasks=all[3].data||[];app.members=all[4].data||[];app.invites=app.role==="admin"?(all[5].data||[]):[];
 // The draft table is optional. Load it only when the Email drafts page is open.
 // Do not slow down or block normal CRM login, and handle network failures gracefully.
 if(app.view==="emails"){
  try{
   var mail=await app.client.from("email_messages").select("*").eq("workspace_id",wid).order("created_at",{ascending:false}).limit(200);
   app.emailFeatureError=mail.error?mail.error.message:null;
   app.email_messages=mail.data||[];
  }catch(error){
   app.emailFeatureError=error.message||"Unable to load email drafts.";
   app.email_messages=[];
  }
 }
 render();
 loadAlerts().catch(function(e){app.alertError=e.message;});
}
function attachRealtime(){
 if(app.channel){app.client.removeChannel(app.channel);app.channel=null;}
 if(!app.workspace)return;
 var wid=app.workspace.id;
 var channel=app.client.channel("crm-changes-"+wid);
 ["companies","contacts","activities","tasks","workspace_members","workspace_invites"].forEach(function(table){
  channel.on("postgres_changes",{event:"*",schema:"public",table:table,filter:"workspace_id=eq."+wid},function(){
   clearTimeout(attachRealtime.timer);
   attachRealtime.timer=setTimeout(function(){refresh().catch(function(e){notify(e.message,true);});},650);
  });
 });
 app.channel=channel.subscribe();
 if(app.alertChannel){app.client.removeChannel(app.alertChannel);app.alertChannel=null;}
 if(app.user){
  var personal=app.client.channel("crm-alerts-"+app.user.id);
  personal.on("postgres_changes",{event:"*",schema:"public",table:"crm_notifications",filter:"recipient_id=eq."+app.user.id},function(payload){
   loadAlerts().then(function(){if(payload.eventType==="INSERT"&&document.visibilityState==="visible"){notify("New CRM notification. Open Notifications to see details.");}}).catch(function(e){console.warn("CRM alert refresh:",e);});
  });
  app.alertChannel=personal.subscribe();
 }
}
function go(view){
 app.view=view;app.selectedCompany=null;app.search="";app.filter="all";
 el("sidebar").classList.remove("open");render();window.scrollTo(0,0);
 if(view==="emails"&&!app.preview&&app.workspace)refresh().catch(function(e){notify(e.message,true);});
 if(view==="alerts"&&!app.preview&&app.workspace)loadAlerts().catch(function(e){notify(e.message,true);});
 if(view==="settings"&&!app.preview&&app.workspace)loadAlertSettings().catch(function(e){notify(e.message,true);});
}
function openCompany(id){if(!company(id))return;app.selectedCompany=id;app.view="detail";render();window.scrollTo(0,0);}
function navTitle(){
 var titles={dashboard:["Dashboard","An overview of your builder relationships."],companies:["Companies","Every prospect, contact and conversation in one place."],pipeline:["Sales pipeline","Move relationships forward, one step at a time."],tasks:["Follow-ups & tasks","Know exactly who needs to do what next."],emails:["Email drafts","Prepare sales messages together. Sending is not connected yet."],alerts:["Notifications","Updates and sales activity for your account."],settings:["Team & settings","Your shared CRM workspace."],detail:["Company details","Contacts, notes and follow-ups for this builder."]};
 return titles[app.view]||titles.dashboard;
}
function notice(){
 if(app.preview)return app.client?'<div class="banner"><div><strong>SAMPLE DATA</strong> — Fictional companies only. Sign in to access your shared workspace. No customer records are displayed until you sign in.</div></div>':'<div class="banner"><div><strong>PREVIEW MODE</strong> — Fictional sample companies only. Edits are temporary and do not sync or save. Connect Supabase before entering real client information.</div><button type="button" data-action="connect">Connect database</button></div>';
 return '<div class="banner success-banner"><div><strong>Shared workspace active.</strong> Changes are stored in your protected Supabase database for authorized team members.</div><span style="white-space:nowrap;font-weight:700">'+encode(app.workspace&&app.workspace.name||"HVS")+'</span></div>';
}
function render(){
 var label=navTitle();el("pageTitle").textContent=app.view==="detail"?(company(app.selectedCompany)||{}).name||"Company details":label[0];
 el("pageSubtitle").textContent=label[1];el("notice").innerHTML=notice();
 var primary=el("primaryAction");
 var act={dashboard:["+ Add company","company"],companies:["+ Add company","company"],pipeline:["+ Add company","company"],tasks:["+ Add task","task"],emails:["+ New email draft","email"],alerts:["",""],settings:["+ Invite teammate","invite"],detail:["+ Log activity","activity"]}[app.view]||["+ Add company","company"];
 primary.textContent=act[0];primary.dataset.modal=act[1];primary.style.display=(app.view==="settings"&&app.role!=="admin")||app.view==="alerts"?"none":"";
 Array.prototype.forEach.call(document.querySelectorAll("[data-nav]"),function(n){n.classList.toggle("active",n.dataset.nav===app.view||(app.view==="detail"&&n.dataset.nav==="companies"));});
 var who=app.member?(app.member.display_name||app.member.email):"Preview workspace";
 el("userName").textContent=who;el("userAvatar").textContent=app.preview?"HV":String(who).slice(0,2).toUpperCase();
 el("userRole").textContent=app.preview?"Sample data only":(app.role==="admin"?"Workspace admin":"Team member");
 el("logoutBtn").classList.toggle("hidden",!app.user);
 if(app.view==="companies")el("view").innerHTML=renderCompanies();
 else if(app.view==="pipeline")el("view").innerHTML=renderPipeline();
 else if(app.view==="tasks")el("view").innerHTML=renderTasks();
 else if(app.view==="emails")el("view").innerHTML=renderEmails();
 else if(app.view==="alerts")el("view").innerHTML=renderAlerts();
 else if(app.view==="settings")el("view").innerHTML=renderSettings();
 else if(app.view==="detail")el("view").innerHTML=renderDetail();
 else el("view").innerHTML=renderDashboard();
 updateAlertBadge();
}
function renderDashboard(){
 var count=app.companies.length,active=app.companies.filter(function(c){return c.status!=="won"&&c.status!=="lost";}).length,
 booked=app.companies.filter(function(c){return c.status==="meeting";}).length,
 open=app.tasks.filter(function(t){return !t.completed;}),
 overdue=open.filter(function(t){return t.due_date&&t.due_date<isoToday();}).length;
 var metrics=[
  ["Builder prospects",count,"Total companies in CRM","▤"],
  ["Active opportunities",active,"In the sales pipeline","↗"],
  ["Meetings booked",booked,"Currently at meeting stage","▣"],
  ["Open follow-ups",open.length,(overdue?overdue+" overdue":"Nothing overdue"),"☑"]
 ];
 var h='<div class="metrics">'+metrics.map(function(m){return '<div class="metric"><div class="metric-label">'+encode(m[0])+'<span class="metric-icon">'+m[3]+'</span></div><div class="metric-value">'+m[1]+'</div><div class="metric-note">'+encode(m[2])+'</div></div>';}).join("")+'</div>';
 var recent=app.activities.slice().sort(newer).slice(0,5),upcoming=open.slice().sort(dueOrder).slice(0,6);
 h+='<div class="two-columns"><section class="panel"><div class="panel-head"><div><div class="panel-title">Recent activity</div><div class="panel-kicker">The latest notes, calls and meetings</div></div></div><div class="panel-body">'+(recent.length?recent.map(activityRow).join(""):'<div class="empty">No notes yet. Open a company to add your first update.</div>')+'</div></section>';
 h+='<section class="panel"><div class="panel-head"><div><div class="panel-title">Upcoming follow-ups</div><div class="panel-kicker">Tasks that need attention</div></div><button class="text-action" data-action="viewTasks">View all</button></div><div class="panel-body">'+(upcoming.length?upcoming.map(taskRow).join(""):'<div class="empty">All caught up. Add your next follow-up.</div>')+'</div></section></div>';
 h+='<div class="section-header"><div class="section-title">Your builder relationships</div><button class="text-action" data-action="viewCompanies">View all companies →</button></div>'+renderTable(app.companies.slice(0,7));
 return h;
}
function renderTable(rows){
 var h='<div class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>Company</th><th>Stage</th><th>Priority</th><th>Assigned to</th><th>Potential value</th></tr></thead><tbody>';
 h+=rows.length?rows.map(function(c){return '<tr data-open-company="'+encode(c.id)+'" tabindex="0"><td><div class="company-name">'+encode(c.name)+'</div><div class="company-location">'+encode([c.city,c.province].filter(Boolean).join(", ")||"Location not added")+'</div></td><td>'+chip(c.status)+'</td><td>'+priorityChip(c.priority)+'</td><td>'+encode(memberName(c.assigned_to))+'</td><td>'+encode(money(c.estimated_value))+'</td></tr>';}).join(""):'<tr><td colspan="5" class="empty">No companies yet. Add your first builder prospect.</td></tr>';
 return h+'</tbody></table></div></div>';
}
function renderCompanies(){
 var query=app.search.toLowerCase(),items=app.companies.filter(function(c){return (!query||[c.name,c.city,c.province,c.description].join(" ").toLowerCase().includes(query))&&(app.filter==="all"||c.status===app.filter);});
 return '<div class="toolbar"><input class="search" id="companySearch" data-search="company" value="'+encode(app.search)+'" type="search" placeholder="Search by company, city or notes…" aria-label="Search companies"><select class="filter-select" data-filter="status"><option value="all">All stages</option>'+STAGES.map(function(s){return '<option value="'+s.id+'" '+(app.filter===s.id?"selected":"")+'>'+s.name+'</option>';}).join("")+'</select></div><div class="small muted" style="margin-bottom:13px">'+items.length+' of '+app.companies.length+' companies</div>'+renderTable(items);
}
function renderPipeline(){
 var h='<p class="hint" style="margin:0 0 18px">Drag a card to update its stage on desktop. On mobile, open a company and select Edit to change its stage.</p><div class="board">';
 STAGES.forEach(function(s){
  var items=app.companies.filter(function(c){return c.status===s.id;});
  h+='<section class="board-col" data-drop="'+s.id+'"><div class="board-head">'+encode(s.name)+'<span class="board-count">'+items.length+'</span></div>';
  items.forEach(function(c){h+='<article class="board-card" draggable="true" data-drag-company="'+encode(c.id)+'" data-open-company="'+encode(c.id)+'"><div class="board-name">'+encode(c.name)+'</div><div class="board-meta">'+encode(c.city||"City not added")+' · '+encode(memberName(c.assigned_to))+'</div><div class="board-meta">'+encode(money(c.estimated_value))+'</div></article>';});
  h+='</section>';
 });return h+'</div>';
}
function taskRow(t){
 var overdue=t.due_date&&!t.completed&&t.due_date<isoToday(),done=t.completed?" task-done":"";
 return '<div class="task-row"><input class="task-box" type="checkbox" aria-label="Complete '+encode(t.title)+'" data-task-check="'+encode(t.id)+'" '+(t.completed?"checked":"")+'><div class="activity-details"><div class="task-title'+done+'">'+encode(t.title)+'</div><div class="task-due '+(overdue?"overdue":"")+'">'+encode(companyName(t.company_id))+' · '+encode(fmtDate(t.due_date))+(overdue?" · Overdue":"")+' · '+encode(memberName(t.assigned_to))+'</div></div><button class="text-action" type="button" data-edit-task="'+encode(t.id)+'">Edit</button></div>';
}
function renderTasks(){
 var items=app.tasks.slice().sort(dueOrder).filter(function(t){return app.taskFilter==="all"||(app.taskFilter==="done"?t.completed:!t.completed);});
 return '<div class="toolbar"><div class="section-title">Tasks & reminders</div><select class="filter-select" data-filter="tasks"><option value="open" '+(app.taskFilter==="open"?"selected":"")+'>Open tasks</option><option value="done" '+(app.taskFilter==="done"?"selected":"")+'>Completed</option><option value="all" '+(app.taskFilter==="all"?"selected":"")+'>All tasks</option></select></div><section class="panel"><div class="panel-body" style="padding-top:12px">'+(items.length?items.map(taskRow).join(""):'<div class="empty">No tasks in this view.</div>')+'</div></section>';
}
function activityRow(a){
 return '<div class="activity-row"><div class="activity-icon">'+activityIcon(a.type)+'</div><div class="activity-details"><div class="activity-text">'+encode(a.content)+'</div><div class="activity-meta">'+encode((a.type||"note").toUpperCase())+' · '+encode(companyName(a.company_id))+' · '+encode(memberName(a.created_by))+' · '+encode(fmtDate(a.created_at))+'</div></div></div>';
}
function contactRow(c){
 var email=c.email?'<a class="link" href="mailto:'+encode(c.email)+'">'+encode(c.email)+'</a>':"";
 var phone=c.phone?'<a class="link" href="tel:'+encode(c.phone.replace(/[^0-9+]/g,""))+'">'+encode(c.phone)+'</a>':"";
 return '<div class="contact-row"><div class="activity-icon">♙</div><div class="activity-details"><div class="task-title">'+encode(c.name)+'</div><div class="task-due">'+encode(c.title||"Contact")+'</div><div class="small" style="margin-top:6px">'+[email,phone].filter(Boolean).join(" · ")+'</div></div><button type="button" class="text-action" data-edit-contact="'+encode(c.id)+'">Edit</button></div>';
}
function value(text){return encode(text||"—");}
function renderDetail(){
 var c=company(app.selectedCompany);if(!c)return '<div class="empty">Company not found.</div>';
 var contacts=app.contacts.filter(function(x){return x.company_id===c.id;});
 var activities=app.activities.filter(function(x){return x.company_id===c.id;}).sort(newer);
 var tasks=app.tasks.filter(function(x){return x.company_id===c.id;}).sort(dueOrder);
 var fields=[["Location",[c.city,c.province].filter(Boolean).join(", ")],["Phone",c.phone],["Website",c.website],["Assigned to",memberName(c.assigned_to)],["Potential deal value",money(c.estimated_value)],["Priority",(c.priority||"warm").toUpperCase()]];
 var website=safeUrl(c.website);
 var h='<div class="detail-top"><button class="ghost-btn" data-action="back">← All companies</button><div>'+chip(c.status)+' <button class="secondary-btn" data-modal="company" data-edit-id="'+encode(c.id)+'">Edit company</button></div></div>';
 h+='<div class="detail-grid"><div><section class="panel"><div class="panel-head"><div class="panel-title">Company overview</div></div><div class="panel-body"><div class="field-list">';
 h+=fields.map(function(f){return '<div><div class="field-key">'+encode(f[0])+'</div><div class="field-value">'+(f[0]==="Website"&&website?'<a class="link" rel="noopener noreferrer" target="_blank" href="'+encode(website)+'">'+encode(c.website)+'</a>':value(f[1]))+'</div></div>';}).join("");
 h+='</div><div class="section-spacer"></div><div class="field-key" style="margin-top:18px">Important context / notes</div><div class="info-text">'+encode(c.description||"No background added yet.")+'</div></div></section>';
 h+='<section class="panel" style="margin-top:18px"><div class="panel-head"><div><div class="panel-title">Conversation history</div><div class="panel-kicker">Capture what was said while it is fresh</div></div><button class="text-action" data-modal="activity" data-parent="'+encode(c.id)+'">+ Add note</button></div><div class="panel-body">'+(activities.length?activities.map(activityRow).join(""):'<div class="empty">No conversations logged yet.</div>')+'</div></section></div>';
 h+='<div><section class="panel"><div class="panel-head"><div class="panel-title">People & contacts</div><button class="text-action" data-modal="contact" data-parent="'+encode(c.id)+'">+ Add</button></div><div class="panel-body">'+(contacts.length?contacts.map(contactRow).join(""):'<div class="empty">Add your first contact at this company.</div>')+'</div></section>';
 h+='<section class="panel" style="margin-top:18px"><div class="panel-head"><div class="panel-title">Next steps</div><button class="text-action" data-modal="task" data-parent="'+encode(c.id)+'">+ Add task</button></div><div class="panel-body">'+(tasks.length?tasks.map(taskRow).join(""):'<div class="empty">No follow-ups assigned yet.</div>')+'</div></section></div></div>';
 return h;
}
function renderEmails(){
 var h='<div class="banner"><div><strong>DRAFT MODE — NO EMAILS WILL BE SENT.</strong> Write and save messages here. We will connect sales@homeviewsolutions.com only after the mailbox and sending provider are verified.</div></div>';
 if(app.emailFeatureError&&!app.preview){
  h+='<div class="banner"><div>Email draft storage has not been installed yet. Apply the separate supabase/email-drafts.sql setup script before saving real drafts. Existing CRM features still work.</div></div>';
 }
 h+='<section class="panel"><div class="panel-head"><div><div class="panel-title">Team email drafts</div><div class="panel-kicker">Visible to authorized CRM members; editable only by the author</div></div><button type="button" class="text-action" data-modal="email">+ Compose</button></div><div class="panel-body">';
 h+=app.email_messages.length?app.email_messages.map(function(m){
  var by=memberName(m.created_by),canEdit=m.status==="draft"&&(app.preview||app.user&&app.user.id===m.created_by);
  return '<div class="email-row"><div class="email-row-main"><div class="task-title">'+encode(m.subject)+'</div><div class="task-due">To: '+encode(m.to_email)+' · '+encode(companyName(m.company_id))+' · '+encode(by)+'</div><div class="email-preview">'+encode((m.body||"").slice(0,180))+'</div><div class="task-due">'+encode(String(m.status||"draft").toUpperCase())+' · '+encode(fmtDate(m.created_at))+'</div></div>'+(canEdit?'<button type="button" class="secondary-btn" data-edit-email="'+encode(m.id)+'">Edit draft</button>':"")+'</div>';
 }).join(""):'<div class="empty">No email drafts yet. Click Compose to create your first one.</div>';
 h+='</div></section>';
 h+='<p class="hint" style="margin-top:15px">This is not an Outlook inbox. Marie’s personal mailbox stays private. Customer replies and outgoing sending require a later setup step.</p>';
 return h;
}
function updateAlertBadge(){
 var count=app.alerts.filter(function(n){return !n.read_at;}).length;
 ["alertsCount","alertsNavCount"].forEach(function(id){
  var item=el(id);if(!item)return;
  item.textContent=count>99?"99+":String(count);
  item.classList.toggle("hidden",count===0);
 });
 var btn=el("alertsButton");
 if(btn)btn.setAttribute("aria-label","Notifications"+(count?" ("+count+" unread)":""));
}
async function loadAlerts(){
 if(app.preview||!app.user||!app.workspace){updateAlertBadge();return;}
 var uid=app.user.id,wid=app.workspace.id;
 var result=await app.client.from("crm_notifications")
  .select("id,recipient_id,event_kind,title,message,company_id,task_id,email_id,read_at,created_at")
  .eq("workspace_id",wid).eq("recipient_id",uid)
  .order("created_at",{ascending:false}).limit(150);
 if(app.preview||!app.user||app.user.id!==uid||!app.workspace||app.workspace.id!==wid)return;
 if(result.error){app.alertError=result.error.message;throw result.error;}
 app.alerts=result.data||[];app.alertError=null;
 updateAlertBadge();
 if(app.view==="alerts")el("view").innerHTML=renderAlerts();
}
async function loadAlertSettings(){
 if(app.preview||!app.user||!app.workspace)return;
 var r=await app.client.from("crm_notification_settings").select("*").eq("user_id",app.user.id).eq("workspace_id",app.workspace.id).maybeSingle();
 if(r.error){app.settingsError=r.error.message;throw r.error;}
 app.alertSettings=r.data||null;app.settingsError=null;
 if(app.view==="settings")el("view").innerHTML=renderSettings();
}
async function updateAlertSetting(name,enabled){
 var allowed=["enabled","company_alerts","activity_alerts","task_alerts","email_alerts"];
 if(allowed.indexOf(name)<0||app.preview||!app.user||!app.workspace)return;
 try{
  var data={},r;
  data[name]=enabled;
  if(app.alertSettings){
   data.updated_at=new Date().toISOString();
   r=await app.client.from("crm_notification_settings").update(data)
    .eq("user_id",app.user.id).eq("workspace_id",app.workspace.id);
  }else{
   r=await app.client.from("crm_notification_settings").insert(Object.assign({
    user_id:app.user.id,workspace_id:app.workspace.id
   },data));
  }
  if(r.error)throw r.error;
  app.alertSettings=Object.assign({
   enabled:true,company_alerts:true,activity_alerts:true,task_alerts:true,email_alerts:true
  },app.alertSettings||{},data);
  notify("Notification preference saved.");
  if(app.view==="settings")el("view").innerHTML=renderSettings();
 }catch(err){
  notify(err.message||"Unable to save notification preference.",true);
  await loadAlertSettings().catch(function(){});
 }
}
function renderAlerts(){
 var count=app.alerts.filter(function(n){return !n.read_at;}).length;
 var h='<div class="alert-heading"><div><div class="section-title">Your notifications</div><div class="hint">'+count+' unread update'+(count===1?"":"s")+'</div></div>';
 if(count)h+='<button type="button" class="secondary-btn" data-action="markAllAlertsRead">Mark all read</button>';
 h+='</div>';
 if(app.alertError)h+='<div class="banner"><div>Unable to load your notifications: '+encode(app.alertError)+'</div></div>';
 h+='<section class="panel"><div class="panel-body alert-list">';
 if(!app.alerts.length)h+='<div class="empty">No notifications yet. New customer notes, lead updates, tasks and email drafts will appear here.</div>';
 else h+=app.alerts.map(function(n){
  var when=n.created_at?new Date(n.created_at).toLocaleString("en-CA",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}):"";
  return '<div class="alert-item'+(!n.read_at?' alert-unread':'')+'">'
   +'<div class="alert-content"><div class="task-title">'+encode(n.title)+'</div><div class="info-text">'+encode(n.message)+'</div><div class="task-due">'+encode(when)+' · '+(n.read_at?'Read':'New')+'</div></div>'
   +'<div class="alert-actions"><button type="button" class="secondary-btn" data-open-alert="'+encode(n.id)+'">Open</button>'
   +(!n.read_at?'<button type="button" class="text-action" data-read-alert="'+encode(n.id)+'">Mark read</button>':'')
   +'</div></div>';
 }).join("");
 h+='</div></section>';
 h+='<p class="hint" style="margin-top:14px">Notifications are visible only to your authorized account. Phone push alerts require a separate device permission and background delivery setup.</p>';
 return h;
}
async function markAlertRead(id){
 var record=app.alerts.find(function(n){return String(n.id)===String(id);});
 if(!record||record.read_at)return;
 if(app.preview){
  record.read_at=new Date().toISOString();render();return;
 }
 var r=await app.client.from("crm_notifications").update({read_at:new Date().toISOString()})
  .eq("id",id).eq("recipient_id",app.user.id);
 if(r.error)throw r.error;
 await loadAlerts();
}
async function markAllAlertsRead(){
 if(app.preview){app.alerts.forEach(function(n){n.read_at=n.read_at||new Date().toISOString();});render();return;}
 var r=await app.client.from("crm_notifications").update({read_at:new Date().toISOString()})
  .eq("recipient_id",app.user.id).eq("workspace_id",app.workspace.id).is("read_at",null);
 if(r.error)throw r.error;
 await loadAlerts();
}
async function openAlert(id){
 var n=app.alerts.find(function(x){return String(x.id)===String(id);});if(!n)return;
 try{await markAlertRead(id);}catch(e){notify(e.message,true);}
 if(n.company_id&&company(n.company_id)){openCompany(n.company_id);return;}
 if(n.email_id){go("emails");return;}
 if(n.task_id){go("tasks");return;}
 go("dashboard");
}
function decodeVapidKey(value){
 var b64=value.replace(/-/g,"+").replace(/_/g,"/");
 return Uint8Array.from(atob(b64.padEnd(Math.ceil(b64.length/4)*4,"=")),function(c){return c.charCodeAt(0);});
}
function phonePushConfigured(){
 return !!(window.HVS_CONFIG&&window.HVS_CONFIG.webPushPublicKey);
}
async function enablePhonePush(){
 if(!app.user||app.preview||!app.workspace)throw Error("Sign in before enabling phone alerts.");
 if(!phonePushConfigured())throw Error("The server push setup is not completed yet.");
 if(!("serviceWorker" in navigator)||!("PushManager" in window)||!("Notification" in window))
  throw Error("Web Push is unsupported here. On iPhone, install the CRM to the Home Screen first.");
 if(Notification.permission==="denied")throw Error("Notifications are blocked in device settings.");
 var reg=await navigator.serviceWorker.register("./crm-sw.js",{scope:"./"});
 var permission=await Notification.requestPermission();
 if(permission!=="granted")throw Error("Notification permission was not granted.");
 var sub=await reg.pushManager.getSubscription();
 if(!sub)sub=await reg.pushManager.subscribe({
  userVisibleOnly:true,
  applicationServerKey:decodeVapidKey(window.HVS_CONFIG.webPushPublicKey)
 });
 var info=sub.toJSON();
 var result=await app.client.from("crm_push_subscriptions").upsert({
  user_id:app.user.id,workspace_id:app.workspace.id,endpoint:info.endpoint,
  p256dh:info.keys&&info.keys.p256dh||null,auth:info.keys&&info.keys.auth||null,
  device_label:navigator.userAgent.slice(0,200),updated_at:new Date().toISOString()
 },{onConflict:"endpoint"});
 if(result.error)throw result.error;
 app.phonePushEnabled=true;
 notify("This device is registered. Confirm delivery after server activation.");
 if(app.view==="settings")el("view").innerHTML=renderSettings();
}
async function disablePhonePush(){
 if(!("serviceWorker" in navigator))return;
 var reg=await navigator.serviceWorker.getRegistration("./");
 var sub=reg&&await reg.pushManager.getSubscription();
 if(!sub)return;
 if(app.user&&!app.preview){
  var result=await app.client.from("crm_push_subscriptions").delete()
   .eq("user_id",app.user.id).eq("endpoint",sub.endpoint);
  if(result.error)throw result.error;
 }
 await sub.unsubscribe();
 app.phonePushEnabled=false;
 notify("Phone alerts disabled on this device.");
 if(app.view==="settings")el("view").innerHTML=renderSettings();
}
async function checkPhonePush(){
 if(!phonePushConfigured()||!("serviceWorker" in navigator))return;
 try{
  var reg=await navigator.serviceWorker.getRegistration("./");
  app.phonePushEnabled=!!(reg&&await reg.pushManager.getSubscription());
  if(app.view==="settings")el("view").innerHTML=renderSettings();
 }catch(e){console.warn("Push registration state:",e);}
}
function renderSettings(){
 if(app.preview)return '<div class="settings-stack"><section class="panel"><div class="panel-head"><div class="panel-title">Connect your database</div></div><div class="panel-body"><p class="hint">This is a safe, fictional preview. To share real client information between Marie and Zanna, connect a Supabase project and install the database schema from this repository.</p><button class="primary-btn" data-action="connect">Set up secure database</button></div></section></div>';
 var h='<div class="settings-stack"><section class="panel"><div class="panel-head"><div class="panel-title">Workspace</div></div><div class="panel-body"><div class="field-key">Name</div><div class="company-name">'+encode(app.workspace.name)+'</div><div class="hint">Every member below shares one protected set of companies, contacts, notes and tasks.</div></div></section>';
 h+='<section class="panel"><div class="panel-head"><div class="panel-title">Team members</div>'+(app.role==="admin"?'<button class="text-action" data-modal="invite">+ Invite</button>':"")+'</div><div class="panel-body">';
 h+=app.members.map(function(m){return '<div class="contact-row"><div class="avatar">'+encode((m.display_name||m.email||"T").slice(0,2).toUpperCase())+'</div><div class="activity-details"><div class="task-title">'+encode(m.display_name||m.email)+'</div><div class="task-due">'+encode(m.email)+' · '+encode(m.role)+'</div></div></div>';}).join("");
 if(app.role==="admin"){
  h+='<div class="section-title" style="font-size:13px;margin:20px 0 8px">Invitations</div>';
  h+=(app.invites.length?app.invites.map(function(i){return '<div class="contact-row"><div class="activity-details"><div class="task-title">'+encode(i.email)+'</div><div class="task-due">'+(i.accepted_at?"Joined":"Waiting for sign-up")+'</div></div></div>';}).join(""):'<div class="hint">No invitations yet.</div>');
  h+='<p class="hint">Inviting someone authorizes their matching, verified email address. Ask them to open this CRM and create an account using that same email. The CRM does not automatically email invitations.</p>';
 }
 h+='</div></section>';
 var alertSwitches=[
  ["enabled","All CRM alerts"],["company_alerts","New leads and company updates"],
  ["activity_alerts","Calls, notes and customer activity"],["task_alerts","Newly assigned tasks"],
  ["email_alerts","New email drafts and email activity"]
 ];
 h+='<section class="panel"><div class="panel-head"><div><div class="panel-title">Notification preferences</div><div class="panel-kicker">Choose the alerts you receive</div></div></div><div class="panel-body">';
 if(app.settingsError)h+='<p class="hint">Settings could not load: '+encode(app.settingsError)+'</p>';
 h+=alertSwitches.map(function(k){
  var checked=!app.alertSettings||app.alertSettings[k[0]]!==false;
  return '<label class="alert-preference"><input type="checkbox" data-alert-setting="'+encode(k[0])+'" '+(checked?'checked':'')+'><span>'+encode(k[1])+'</span></label>';
 }).join("");
 h+='<div class="push-setup"><div class="task-title">Phone notifications</div><p class="hint">To receive alerts with the CRM closed, open the installed Home Screen app on iPhone or an eligible desktop browser and enable notifications.</p>';
 if(phonePushConfigured()){
  h+='<button class="secondary-btn" type="button" data-action="'+(app.phonePushEnabled?'disablePhonePush':'enablePhonePush')+'">'+(app.phonePushEnabled?'Disable on this device':'Enable on this device')+'</button>';
 }else{
  h+='<p class="hint"><strong>Phone push awaits the final server connection.</strong> In-app alerts work without it.</p>';
 }
 h+='</div></div></section>';
 h+='<section class="panel"><div class="panel-head"><div class="panel-title">Privacy & setup</div></div><div class="panel-body"><p class="hint">All customer records live in Supabase and are protected by workspace membership policies. This public GitHub Pages site contains frontend code only. Never place a service-role key or client export in GitHub.</p></div></section></div>';
 return h;
}
function input(name,label,v,type,required,full,extra){
 return '<label class="field'+(full?" full":"")+'">'+encode(label)+'<input name="'+name+'" type="'+(type||"text")+'" value="'+encode(v==null?"":v)+'" '+(required?"required":"")+' '+(extra||"")+'></label>';
}
function area(name,label,v){
 return '<label class="field full">'+encode(label)+'<textarea name="'+name+'">'+encode(v||"")+'</textarea></label>';
}
function select(name,label,options,current,full,required){
 return '<label class="field'+(full?" full":"")+'">'+encode(label)+'<select name="'+name+'" '+(required?"required":"")+'>'+options.map(function(o){return '<option value="'+encode(o[0])+'" '+(String(o[0])===String(current==null?"":current)?"selected":"")+'>'+encode(o[1])+'</option>';}).join("")+'</select></label>';
}
function memberOptions(){return [["","Unassigned"]].concat(app.members.map(function(m){return [m.user_id,m.display_name||m.email];}));}
function companyOptions(){return [["","General / no specific company"]].concat(app.companies.map(function(c){return[c.id,c.name];}));}
function openModal(kind,record,parent){
 var title="",body="",r=record||{},cid=parent||app.selectedCompany||"";
 if(kind==="company"){
  title=r.id?"Edit company":"Add potential client";
  body=input("name","Company name",r.name,"text",true,true)+input("city","City",r.city,"text",false,false)+input("province","Province / state",r.province||"AB","text",false,false)+
  input("phone","Main phone",r.phone,"tel")+input("website","Website",r.website,"url")+
  select("status","Sales stage",STAGES.map(function(s){return[s.id,s.name];}),r.status||"prospect")+
  select("priority","Priority",priorities.map(function(p){return[p,p.toUpperCase()];}),r.priority||"warm")+
  select("assigned_to","Assigned to",memberOptions(),r.assigned_to)+input("estimated_value","Estimated value (CAD)",r.estimated_value,"number",false,false,'min="0" step="1"')+
  area("description","Background / important context",r.description);
 }else if(kind==="contact"){
  title=r.id?"Edit contact":"Add contact";body=input("name","Full name",r.name,"text",true,true)+
  input("title","Job title",r.title,"text",false,true)+input("email","Email",r.email,"email")+
  input("phone","Phone",r.phone,"tel");
 }else if(kind==="activity"){
  title="Log conversation or note";body=select("type","Type",[["note","Note"],["call","Phone call"],["meeting","Meeting"],["email","Email"]],"note",true)+
  area("content","What happened? What should we remember?",""); 
 }else if(kind==="task"){
  title=r.id?"Edit follow-up":"New follow-up task";
  body=input("title","Task / reminder",r.title,"text",true,true)+select("company_id","Company",companyOptions(),r.company_id||cid,true)+
  input("due_date","Due date",r.due_date||isoToday(),"date",false,false)+
  select("assigned_to","Assigned to",memberOptions(),r.assigned_to||(app.user?app.user.id:"marie"))+
  select("priority","Priority",[["normal","Normal"],["high","High"]],r.priority||"normal");
 }else if(kind==="email"){
  title=r.id?"Edit email draft":"Compose email draft";
  var suggested=app.contacts.find(function(c){return c.company_id===cid&&c.email;});
  body=input("to_email","Customer email",r.to_email||(suggested?suggested.email:""),"email",true,true)+
    input("subject","Subject",r.subject,"text",true,true,'maxlength="250"')+
    select("company_id","Related company",companyOptions(),r.company_id||cid,true)+
    area("body","Message (draft only)",r.body)+
    select("legal_basis","Email permission / exemption to review",[
      ["review_required","Not yet checked"],
      ["customer_request","Customer requested follow-up"],
      ["express_consent","Express consent"],
      ["implied_consent","Implied consent"],
      ["b2b_exemption","Potential B2B exemption — verify"]
    ],r.legal_basis||"review_required",true)+
    area("basis_note","Notes on permission or relationship (optional)",r.basis_note||"")+
    '<div class="hint" style="grid-column:1/-1">Only saves a draft. Nothing will be sent. Before sending sales emails, verify applicable Canadian anti-spam requirements and your email provider\'s rules.</div>';
 }else if(kind==="invite"){
  title="Invite teammate";body=input("email","Teammate's email",r.email,"email",true,true)+
  '<div class="hint" style="grid-column:1/-1">This grants access after that person signs up with the exact same verified email. No email message will be sent automatically.</div>';
 }else if(kind==="connect"){
  title="Connect secure database";var c=config();
  body='<div class="hint" style="grid-column:1/-1">1. Create a Supabase project. 2. In its SQL Editor, run <strong>supabase/schema.sql</strong> from this GitHub repository. 3. Under Project Settings → API, copy the Project URL and the publishable (or legacy anon) key. Never use a secret or service-role key here.</div>'+
  input("url","Supabase project URL",c.url,"url",true,true,'placeholder="https://example.supabase.co"')+
  input("key","Supabase publishable / anon key",c.key,"text",true,true,'autocomplete="off"');
 }else return;
 app.modal={kind:kind,id:r.id||null,parent:cid};
 el("modalTitle").textContent=title;
 el("modalForm").innerHTML='<div class="form-grid">'+body+'</div><div class="form-actions"><button class="secondary-btn" type="button" data-action="closeModal">Cancel</button><button class="primary-btn" type="submit">'+(kind==="connect"?"Save connection":kind==="invite"?"Invite":kind==="email"?"Save draft":r.id?"Save changes":"Save")+'</button></div>';
 el("modalBackdrop").classList.remove("hidden");
 // iOS zooms the entire page when a small input receives focus automatically.
 // Let mobile users choose their field; only pre-focus on desktop pointers.
 var first=el("modalForm").querySelector("input,select,textarea");
 if(first&&window.matchMedia&&window.matchMedia("(min-width: 701px) and (pointer: fine)").matches)first.focus();
}
function closeModal(){el("modalBackdrop").classList.add("hidden");app.modal=null;}
async function saveRow(table,values,id){
 if(app.preview){
  var collection=app[table],newId=id||"demo-"+Math.random().toString(36).slice(2,8),payload=Object.assign({id:newId,created_at:new Date().toISOString()},collection.find(function(x){return x.id===id;})||{},values);
  if(id){var idx=collection.findIndex(function(x){return x.id===id;});if(idx>=0)collection[idx]=payload;}
  else collection.unshift(payload);
  return payload;
 }
 var q=id?app.client.from(table).update(values).eq("id",id):app.client.from(table).insert(Object.assign({workspace_id:app.workspace.id},values));
 var response=await q.select().single();
 if(response.error)throw response.error;
 return response.data;
}
async function saveModal(event){
 event.preventDefault();if(!app.modal||app.busy)return;
 var button=el("modalForm").querySelector('[type="submit"]');button.disabled=true;app.busy=true;
 var d=Object.fromEntries(new FormData(el("modalForm")).entries()),m=app.modal,kind=m.kind;
 try{
  if(kind==="connect"){
   if(!/^https:\/\/[^ /]+/.test(d.url))throw new Error("Please enter a valid HTTPS Supabase project URL.");
   if(!d.key||d.key.length<20)throw new Error("Please paste the Supabase publishable/anon key.");
   if(d.key.startsWith("sb_secret_")||d.key.startsWith("eyJ")&&d.key.length>1500)throw new Error("Do not use a secret/service-role key in a browser.");
   localStorage.setItem("hvs-crm-public-config",JSON.stringify({url:d.url.trim(),key:d.key.trim()}));
   closeModal();location.reload();return;
  }
  if(kind==="company"){
   d.estimated_value=d.estimated_value?Number(d.estimated_value):null;d.assigned_to=d.assigned_to||null;
   await saveRow("companies",d,m.id);
  }else if(kind==="contact"){
   d.company_id=m.parent;
   if(!d.company_id)throw new Error("Please open a company first.");
   await saveRow("contacts",d,m.id);
  }else if(kind==="activity"){
   if(!m.parent)throw new Error("Please open a company first.");
   d.company_id=m.parent;d.created_by=app.preview?"marie":app.user.id;
   await saveRow("activities",d,null);
  }else if(kind==="task"){
   d.company_id=d.company_id||null;d.assigned_to=d.assigned_to||null;d.due_date=d.due_date||null;
   if(!m.id){d.completed=false;d.created_by=app.preview?"marie":app.user.id;}
   await saveRow("tasks",d,m.id);
   }else if(kind==="email"){
   d.to_email=(d.to_email||"").trim().toLowerCase();d.subject=(d.subject||"").trim();d.body=(d.body||"").trim();
   d.basis_note=(d.basis_note||"").trim();d.company_id=d.company_id||null;
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.to_email))throw new Error("Enter a valid customer email.");
   if(!d.subject||!d.body)throw new Error("Add a subject and message.");
   if(m.id&&!app.email_messages.some(function(x){return String(x.id)===String(m.id)&&x.status==="draft";}))throw new Error("Only drafts can be edited.");
   d.updated_at=new Date().toISOString();
   if(!m.id){d.created_by=app.preview?"marie":app.user.id;d.status="draft";}
   await saveRow("email_messages",d,m.id);
  }else if(kind==="invite"){
   if(app.preview)throw new Error("Connect Supabase to invite teammates.");
   if(app.role!=="admin")throw new Error("Only a workspace admin can invite new members.");
   var v={workspace_id:app.workspace.id,email:d.email.trim().toLowerCase(),invited_by:app.user.id};
   var ir=await app.client.from("workspace_invites").insert(v);if(ir.error)throw ir.error;
  }
  closeModal();if(!app.preview)await refresh();else render();
  notify(kind==="invite"?"Invitation added. Ask them to sign up with that email.":"Saved successfully"+(app.preview?" (preview only)":"")+".");
 }catch(e){notify(e.message||"Unable to save",true);}
 finally{app.busy=false;button.disabled=false;}
}
async function updateStage(id,status){
 var c=company(id);if(!c||c.status===status)return;
 try{await saveRow("companies",{status:status},id);if(!app.preview)await refresh();else render();notify("Moved to "+stageInfo(status).name+(app.preview?" (preview only)":""));}
 catch(e){notify(e.message,true);}
}
async function toggleTask(id,completed){
 var t=app.tasks.find(function(x){return String(x.id)===String(id);});if(!t)return;
 try{await saveRow("tasks",{completed:completed,completed_at:completed?new Date().toISOString():null},id);if(!app.preview)await refresh();else render();notify(completed?"Task completed.":"Task reopened.");}
 catch(e){notify(e.message,true);}
}
function showAuth(mode,message){
 if(!app.client)return;
 el("authLayer").classList.remove("hidden");
 var title=mode==="signup"?"Create your account":mode==="workspace"?"Join your team workspace":mode==="forgot"?"Reset your password":mode==="forgotSent"?"Check your email":mode==="reset"?"Choose a new password":"Sign in to your CRM";
 var sub=mode==="workspace"?"No workspace invitation has been found for this email yet. If you're setting up Home View Solutions, create the workspace. Otherwise ask the administrator to invite your exact email address.":mode==="signup"?"Use your own email. A confirmation email may be required before you can sign in.":mode==="forgot"?"Enter your CRM account email address and we'll send you a password reset link.":mode==="forgotSent"?"If that email is registered, you will receive a reset link. Check your inbox and spam folder. Open the link on this device to set a new password.":mode==="reset"?"Set a new password for your existing CRM account.":"Your builder notes and contacts are only available to authorized team members.";
 var body='<div class="auth-title">'+title+'</div><div class="auth-sub">'+sub+'</div>';
 if(message)body+='<div class="auth-error">'+encode(message)+'</div>';
 if(mode==="workspace"){
  body+='<form class="auth-form" id="workspaceForm"><label class="field">Workspace name<input name="name" value="Home View Solutions" required></label><button type="submit" class="primary-btn">Create workspace</button></form><div class="auth-switch"><button type="button" data-auth="retry">Check invitation again</button> · <button type="button" data-auth="signout">Sign out</button></div>';
 }else if(mode==="forgot"){
  body+='<form class="auth-form" id="authForm"><label class="field">Email address<input name="email" type="email" autocomplete="email" required></label><button type="submit" class="primary-btn">Send reset link</button></form><div class="auth-switch"><button type="button" data-auth="signin">Back to sign in</button></div>';
 }else if(mode==="forgotSent"){
  body+='<div class="auth-switch"><button type="button" data-auth="signin">Back to sign in</button></div>';
 }else if(mode==="reset"){
  body+='<form class="auth-form" id="authForm"><label class="field">New password<input name="password" type="password" minlength="8" autocomplete="new-password" required></label><label class="field">Confirm new password<input name="confirm_password" type="password" minlength="8" autocomplete="new-password" required></label><button type="submit" class="primary-btn">Save new password</button></form>';
 }else{
  body+='<form class="auth-form" id="authForm"><label class="field">Email address<input name="email" type="email" autocomplete="email" required></label><label class="field">Password<input name="password" type="password" minlength="6" autocomplete="'+(mode==="signup"?"new-password":"current-password")+'" required></label><button type="submit" class="primary-btn">'+(mode==="signup"?"Create account":"Sign in")+'</button></form>';
  body+='<div class="auth-switch">'+(mode==="signup"?'Already have an account? <button type="button" data-auth="signin">Sign in</button>':'New teammate? <button type="button" data-auth="signup">Create account</button> · <button type="button" data-auth="forgot">Forgot password?</button>')+'</div>';
 }
 el("authBody").innerHTML=body;el("authLayer").dataset.mode=mode;
}
async function authSubmit(e){
 e.preventDefault();var mode=el("authLayer").dataset.mode,form=e.target;
 var values=Object.fromEntries(new FormData(form).entries()),button=form.querySelector("button[type=submit]");
 button.disabled=true;
 try{
  if(mode==="workspace"){
   var r=await app.client.rpc("create_workspace",{workspace_name:values.name});
   if(r.error)throw r.error;
   await loadWorkspace();notify("Workspace created.");
  }else if(mode==="forgot"){
   var reset=await app.client.auth.resetPasswordForEmail(values.email.trim(),{redirectTo:new URL('./',window.location.href).href});
   if(reset.error)throw reset.error;
   showAuth("forgotSent");
  }else if(mode==="reset"){
   if(values.password!==values.confirm_password)throw new Error("Passwords do not match.");
   if(values.password.length<8)throw new Error("Use at least 8 characters.");
   var changed=await app.client.auth.updateUser({password:values.password});
   if(changed.error)throw changed.error;
   app.recoveryMode=false;
   await app.client.auth.signOut();
   showAuth("signin","Password updated. Sign in with your new password.");
  }else if(mode==="signup"){
   var s=await app.client.auth.signUp({email:values.email.trim(),password:values.password,options:{emailRedirectTo:new URL('./',window.location.href).href}});
   if(s.error)throw s.error;
   showAuth("signin","Account created. Check your email to confirm your address if requested, then sign in.");
  }else{
   var a=await app.client.auth.signInWithPassword({email:values.email.trim(),password:values.password});
   if(a.error)throw a.error;
   app.user=a.data.user;await loadWorkspace();
  }
 }catch(err){showAuth(mode,err.message||"Please try again.");}
 finally{button.disabled=false;}
}
async function signout(){
 if(app.client){
  if(app.channel){app.client.removeChannel(app.channel);app.channel=null;}
  if(app.alertChannel){app.client.removeChannel(app.alertChannel);app.alertChannel=null;}
  await app.client.auth.signOut();
 }app.user=null;app.member=null;app.workspace=null;app.role="";demo();render();showAuth("signin");}
function delegateClick(e){
 var nav=e.target.closest("[data-nav]");if(nav){go(nav.dataset.nav);return;}
 var act=e.target.closest("[data-action]");
 if(act){
  var action=act.dataset.action;
  if(action==="connect")openModal("connect");
  else if(action==="viewTasks")go("tasks");
  else if(action==="viewCompanies"||action==="back")go("companies");
   else if(action==="markAllAlertsRead")markAllAlertsRead().catch(function(e){notify(e.message,true);});
   else if(action==="enablePhonePush")enablePhonePush().catch(function(e){notify(e.message,true);});
   else if(action==="disablePhonePush")disablePhonePush().catch(function(e){notify(e.message,true);});
  else if(action==="closeModal")closeModal();
  return;
 }
 var modal=e.target.closest("[data-modal]");
 if(modal){
  var kind=modal.dataset.modal,record=null,id=modal.dataset.editId;
  if(id&&kind==="company")record=company(id);
  openModal(kind,record,modal.dataset.parent);return;
 }
 var openAlertItem=e.target.closest("[data-open-alert]");
 if(openAlertItem){openAlert(openAlertItem.dataset.openAlert).catch(function(err){notify(err.message,true);});return;}
 var markAlert=e.target.closest("[data-read-alert]");
 if(markAlert){markAlertRead(markAlert.dataset.readAlert).catch(function(err){notify(err.message,true);});return;}
 var editEmail=e.target.closest("[data-edit-email]");
 if(editEmail){
  var msg=app.email_messages.find(function(x){return String(x.id)===String(editEmail.dataset.editEmail);});
  if(msg&&msg.status==="draft")openModal("email",msg,null);
  return;
 }
 var editTask=e.target.closest("[data-edit-task]");
 if(editTask){openModal("task",app.tasks.find(function(x){return String(x.id)===String(editTask.dataset.editTask);}),null);return;}
 var editContact=e.target.closest("[data-edit-contact]");
 if(editContact){openModal("contact",app.contacts.find(function(x){return String(x.id)===String(editContact.dataset.editContact);}),app.selectedCompany);return;}
 var item=e.target.closest("[data-open-company]");if(item){openCompany(item.dataset.openCompany);}
}
function delegateChange(e){
 var alertSetting=e.target.closest("[data-alert-setting]");
 if(alertSetting){updateAlertSetting(alertSetting.dataset.alertSetting,alertSetting.checked);return;}
 var check=e.target.closest("[data-task-check]");if(check){toggleTask(check.dataset.taskCheck,check.checked);return;}
 var filter=e.target.closest("[data-filter]");
 if(filter){
  if(filter.dataset.filter==="status")app.filter=filter.value;
  else app.taskFilter=filter.value;
  render();
 }
}
function setupListeners(){
 document.addEventListener("click",delegateClick);
 document.addEventListener("change",delegateChange);
 document.addEventListener("input",function(e){
  if(e.target.matches("[data-search=company]")){
   app.search=e.target.value;var cursor=e.target.selectionStart;render();
   var field=el("companySearch");if(field){field.focus();try{field.setSelectionRange(cursor,cursor);}catch(err){}}
  }
 });
 document.addEventListener("keydown",function(e){if(e.key==="Escape"&&!el("modalBackdrop").classList.contains("hidden"))closeModal();if(e.key==="Enter"&&e.target.matches("[data-open-company]"))openCompany(e.target.dataset.openCompany);});
 el("modalBackdrop").addEventListener("click",function(e){if(e.target===el("modalBackdrop"))closeModal();});
 el("closeModal").addEventListener("click",closeModal);
 el("modalForm").addEventListener("submit",saveModal);
 el("primaryAction").addEventListener("click",function(){openModal(this.dataset.modal);});
 el("alertsButton").addEventListener("click",function(){go("alerts");});
 el("mobileMenu").addEventListener("click",function(){el("sidebar").classList.toggle("open");});
 el("logoutBtn").addEventListener("click",signout);
 el("authLayer").addEventListener("submit",function(e){if(e.target.matches("#authForm,#workspaceForm"))authSubmit(e);});
 el("authLayer").addEventListener("click",function(e){
  var a=e.target.closest("[data-auth]");if(!a)return;
  if(a.dataset.auth==="retry"){loadWorkspace().catch(function(err){showAuth("workspace",err.message);});}
  else if(a.dataset.auth==="signout")signout();
  else showAuth(a.dataset.auth);
 });
 var dragging=null;
 document.addEventListener("dragstart",function(e){var c=e.target.closest("[data-drag-company]");if(c){dragging=c.dataset.dragCompany;e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",dragging);}});
 document.addEventListener("dragover",function(e){var b=e.target.closest("[data-drop]");if(b){e.preventDefault();b.classList.add("drag-over");}});
 document.addEventListener("dragleave",function(e){var b=e.target.closest("[data-drop]");if(b&&!b.contains(e.relatedTarget))b.classList.remove("drag-over");});
 document.addEventListener("drop",function(e){var b=e.target.closest("[data-drop]");if(b&&dragging){e.preventDefault();b.classList.remove("drag-over");updateStage(dragging,b.dataset.drop);dragging=null;}});
 document.addEventListener("dragend",function(){dragging=null;document.querySelectorAll(".drag-over").forEach(function(x){x.classList.remove("drag-over");});});
 window.addEventListener("focus",function(){if(!app.preview&&app.workspace)refresh().catch(function(e){notify(e.message,true);});});
}
setupListeners();
initialize();
})();
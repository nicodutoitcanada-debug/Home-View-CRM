/* Home View CRM Push Worker. No assets cached: do not interfere with CRM updates. */
self.addEventListener("push",function(event){
 var url=new URL("./?alerts=1",self.registration.scope).href;
 event.waitUntil(self.registration.showNotification("Home View CRM",{
  body:"You have a new sales update. Open the CRM to view it.",
  icon:new URL("./crm-icon.png",self.registration.scope).href,
  badge:new URL("./crm-icon.png",self.registration.scope).href,
  tag:"hvs-crm-update-"+Date.now(),
  data:{url:url}
 }));
});
self.addEventListener("notificationclick",function(event){
 event.notification.close();
 var target=event.notification.data&&event.notification.data.url || new URL("./?alerts=1",self.registration.scope).href;
 event.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(function(list){
  var open=list.find(function(c){return c.url.indexOf(self.registration.scope)===0;});
  if(open)return open.focus().then(function(){return open.navigate(target);});
  return self.clients.openWindow(target);
 }));
});

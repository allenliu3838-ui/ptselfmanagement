/* tracking.js - Lightweight anonymous event tracking (P0-7)
   Events logged: page_view, record_submit, summary_view, summary_copy,
   summary_print, cta_remote_click.
   Delivery: GET /track.gif?... (Nginx access_log captures it). */

(function(){
  if(!localStorage.getItem('ks_uid')){
    localStorage.setItem('ks_uid',
      'u_' + Math.random().toString(36).slice(2,10) + Date.now().toString(36));
  }
})();

function trackEvent(event, props){
  try{
    var uid = localStorage.getItem('ks_uid') || '';
    var parts = ['uid=' + encodeURIComponent(uid),
                 'event=' + encodeURIComponent(event),
                 'ts=' + Date.now()];
    if(props){
      Object.keys(props).forEach(function(k){
        parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(props[k]));
      });
    }
    new Image().src = '/track.gif?' + parts.join('&');
    if(typeof console !== 'undefined') console.debug('[track]', event, props || {});
  }catch(_e){/* tracking must never break the app */}
}

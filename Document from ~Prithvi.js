/* ===== NIT Patna Swachh Campus · Dustbin Locator ===== */
const CAMPUS_CONFIG={name:"NIT Patna",center:[25.6208,85.1730],zoom:17,
  // Square-ish box that contains the whole campus (SW corner, NE corner)
  bounds:[[25.6192,85.1705],[25.6224,85.1749]],
  adminPin:"1234"}; // demo only – change it, and use a real backend for deployment

// Bin locations estimated from the campus map (violet crosses). Rename / refine anytime.
// fill = % full. Status is derived: >=80 Full, otherwise Available (or Maintenance if set).
const DEFAULT_BINS=[
 {id:"BIN-001",name:"West Academic Block",lat:25.621462,lng:85.171513,fill:35,maint:false,emptied:"Today 8:00 AM"},
 {id:"BIN-002",name:"Main Academic Building",lat:25.621136,lng:85.172161,fill:82,maint:false,emptied:"Yesterday 5:00 PM"},
 {id:"BIN-003",name:"North Lane / Library Side",lat:25.621547,lng:85.173070,fill:55,maint:false,emptied:"Today 8:00 AM"},
 {id:"BIN-004",name:"Engineering Ground (North)",lat:25.620959,lng:85.173219,fill:74,maint:false,emptied:"Today 7:30 AM"},
 {id:"BIN-005",name:"East Road Block",lat:25.620938,lng:85.174143,fill:20,maint:false,emptied:"Today 9:00 AM"},
 {id:"BIN-006",name:"Engineering Ground (South)",lat:25.619788,lng:85.172575,fill:0,maint:true,emptied:"Under repair"}];

const $=id=>document.getElementById(id);
const bounds=L.latLngBounds(CAMPUS_CONFIG.bounds);
const map=L.map('map',{maxBounds:bounds.pad(0.05),maxBoundsViscosity:1,minZoom:16,maxZoom:20}).setView(CAMPUS_CONFIG.center,CAMPUS_CONFIG.zoom);
map.fitBounds(bounds);map.setMinZoom(map.getZoom()-0.5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:20,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
L.rectangle(bounds,{color:'#1b7f3a',weight:2,fill:false,dashArray:'6 6'}).addTo(map);

let bins=JSON.parse(localStorage.getItem('swachhBins')||'null')||DEFAULT_BINS.map(b=>({...b}));
let userMarker=null,userAccuracy=null,currentPosition=null,binMarkers={},reportMarkers=[],admin=false,addMode=false;
const statusEl=$('status'),previewWrap=$('previewWrap'),preview=$('preview'),photoInput=$('photo');
const saveBins=()=>localStorage.setItem('swachhBins',JSON.stringify(bins));
function setStatus(m,ok=false){statusEl.textContent=m;statusEl.style.color=ok?'#1b7f3a':'#b3261e'}
function esc(v){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}

/* ---- Haversine distance (metres), as in the project report ---- */
function distance(a,b,c,d){const R=6371000,r=x=>x*Math.PI/180,dl=r(c-a),dn=r(d-b);
 const h=Math.sin(dl/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(dn/2)**2;return R*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h))}
const state=b=>b.maint?'Maintenance':b.fill>=80?'Full':'Available';
const color=b=>b.maint?'#777':b.fill>=80?'#e53935':b.fill>=70?'#f59e0b':'#2e9d50';
const fmt=m=>m<1000?Math.round(m)+' m':(m/1000).toFixed(2)+' km';

/* ---- Map markers ---- */
function drawBins(){
 Object.values(binMarkers).forEach(m=>map.removeLayer(m));binMarkers={};
 bins.forEach(b=>{const icon=L.divIcon({className:'',html:`<div class="bin-icon" style="background:${color(b)}">🗑️</div>`,iconSize:[30,30],iconAnchor:[15,15]});
  binMarkers[b.id]=L.marker([b.lat,b.lng],{icon}).addTo(map).bindPopup(`<b>${esc(b.id)} · ${esc(b.name)}</b><br>Filled: <b>${b.fill}%</b><br>Status: ${state(b)}<br>Last emptied: ${esc(b.emptied||'-')}`)});
 drawList();drawStats()}

function sortedBins(){const q=$('search').value.trim().toLowerCase();
 let l=bins.filter(b=>!q||b.id.toLowerCase().includes(q)||b.name.toLowerCase().includes(q));
 if(currentPosition)l=l.map(b=>({...b,d:distance(currentPosition.lat,currentPosition.lng,b.lat,b.lng)})).sort((x,y)=>x.d-y.d);
 return l}

function drawList(){const l=sortedBins();
 const nearest=currentPosition&&(l.find(b=>state(b)==='Available')||l[0]);
 $('binList').innerHTML=l.length?l.map(b=>`<div class="bin ${nearest&&nearest.id===b.id?'nearest':''}"><div class="bin-top"><b>${esc(b.id)} · ${esc(b.name)}${nearest&&nearest.id===b.id?' ⭐ Nearest usable':''}</b><span class="s-${state(b)}"><b>${state(b)}</b>${b.d!=null?' · '+fmt(b.d):''}</span></div>
 <div class="bar"><i style="width:${b.maint?0:b.fill}%;background:${color(b)}"></i></div><small>${b.maint?'Under maintenance':b.fill+'% full'} · Last emptied: ${esc(b.emptied||'-')}</small>
 <div class="btns"><button onclick="focusBin('${b.id}')">Show on map</button><a target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}&travelmode=walking">Directions</a><button onclick="reportBin('${b.id}')">Report full / missing</button></div></div>`).join(''):'<p class="muted">No dustbin matches your search.</p>';
 if(nearest)$('nearestMsg').textContent=`Nearest usable: ${nearest.id} (${nearest.name}) — ${fmt(nearest.d)} straight-line.`}
window.focusBin=id=>{const b=bins.find(x=>x.id===id);map.setView([b.lat,b.lng],19);binMarkers[id].openPopup();$('map').scrollIntoView({behavior:'smooth'})};
window.reportBin=id=>{$('note').value=`${id} is full / missing / damaged: `;$('note').focus()};
$('search').oninput=drawList;

/* ---- Swachh dashboard ---- */
function drawStats(){const full=bins.filter(b=>state(b)==='Full').length,m=bins.filter(b=>b.maint).length,act=bins.filter(b=>!b.maint),avg=act.length?Math.round(act.reduce((s,b)=>s+b.fill,0)/act.length):0;
 $('stats').innerHTML=`<div class="stat"><b>${bins.length}</b>Dustbins</div><div class="stat"><b>${bins.length-full-m}</b>Available</div><div class="stat"><b>${full}</b>Full</div><div class="stat"><b>${avg}%</b>Avg. fill</div>`;
 $('cleanScore').textContent=full===0?'Excellent — no full bins right now! 🌟':`${full} bin(s) need emptying. Please use another bin or report.`}
const getPts=()=>+localStorage.getItem('swachhPoints')||0,addPts=n=>{localStorage.setItem('swachhPoints',getPts()+n);$('points').textContent=getPts()};
$('points').textContent=getPts();
$('pledgeBtn').onclick=()=>{if(localStorage.getItem('swachhPledge'))return $('pledgeMsg').textContent='You have already taken the pledge. Thank you! 🇮🇳';localStorage.setItem('swachhPledge','1');addPts(20);$('pledgeMsg').style.color='#1b7f3a';$('pledgeMsg').textContent='Thank you! Swachh Bharat starts with me. 🇮🇳'};

/* ---- Locate user ---- */
function locateUser(){if(!navigator.geolocation)return setStatus('This browser does not support GPS location.');setStatus('Requesting your location…');
 navigator.geolocation.getCurrentPosition(pos=>{currentPosition={lat:pos.coords.latitude,lng:pos.coords.longitude,accuracy:pos.coords.accuracy};
  [userMarker,userAccuracy].forEach(x=>x&&map.removeLayer(x));
  const inside=bounds.contains([currentPosition.lat,currentPosition.lng]);
  if(inside){userMarker=L.circleMarker([currentPosition.lat,currentPosition.lng],{radius:9,color:'#fff',weight:3,fillColor:'#1677ff',fillOpacity:1}).addTo(map).bindPopup('You are here');
   userAccuracy=L.circle([currentPosition.lat,currentPosition.lng],{radius:currentPosition.accuracy,color:'#1677ff',weight:1,fillOpacity:.08}).addTo(map)}
  $('locationText').value=`${currentPosition.lat.toFixed(6)}, ${currentPosition.lng.toFixed(6)} (±${Math.round(currentPosition.accuracy)} m)`;
  drawList();const n=sortedBins().find(b=>state(b)==='Available');
  if(inside&&n)map.setView([n.lat,n.lng],18),binMarkers[n.id].openPopup();
  setStatus(inside?'Location captured.':'You appear to be outside the campus map area; distances are still shown.',inside)},
 ()=>setStatus('Location unavailable. Use the search box instead, or allow location permission.'),{enableHighAccuracy:true,timeout:15000,maximumAge:0})}
$('locateBtn').onclick=locateUser;

/* ---- Admin (demo) ---- */
$('adminBtn').onclick=()=>{if(!admin){if(prompt('Enter admin PIN')!==CAMPUS_CONFIG.adminPin)return alert('Wrong PIN');admin=true}
 $('adminPanel').style.display='block';drawAdmin();$('adminPanel').scrollIntoView({behavior:'smooth'})};
function drawAdmin(){$('adminBody').innerHTML=`<div class="btns"><button id="addBinBtn">➕ Add bin (click on map)</button><button id="logoutBtn">Logout</button><button id="resetBins">Reset bins</button></div>`+
 bins.map(b=>`<div class="bin"><b>${esc(b.id)} · ${esc(b.name)}</b><div class="admin-row"><label>Fill: <span id="v-${b.id}">${b.fill}</span>%<input type="range" min="0" max="100" value="${b.fill}" oninput="upd('${b.id}','fill',+this.value)"></label>
 <label>Status<select onchange="upd('${b.id}','maint',this.value==='m')"><option value="a" ${b.maint?'':'selected'}>In service</option><option value="m" ${b.maint?'selected':''}>Under maintenance</option></select></label></div>
 <div class="btns"><button onclick="upd('${b.id}','fill',0,1)">Mark emptied</button><button onclick="renameBin('${b.id}')">Rename</button><button onclick="delBin('${b.id}')">Remove</button></div></div>`).join('');
 $('logoutBtn').onclick=()=>{admin=false;$('adminPanel').style.display='none'};
 $('resetBins').onclick=()=>{if(confirm('Restore default bins?')){bins=DEFAULT_BINS.map(b=>({...b}));saveBins();drawBins();drawAdmin()}};
 $('addBinBtn').onclick=()=>{addMode=true;$('map').scrollIntoView({behavior:'smooth'});alert('Now click the exact bin position on the map.')}}
window.upd=(id,k,v,empty)=>{const b=bins.find(x=>x.id===id);b[k]=v;if(empty)b.emptied='Just now';if(k==='fill'&&!empty)b.emptied=b.emptied;saveBins();drawBins();if(empty||k==='maint')drawAdmin();else $('v-'+id).textContent=v};
window.renameBin=id=>{const b=bins.find(x=>x.id===id),n=prompt('New name',b.name);if(n){b.name=n;saveBins();drawBins();drawAdmin()}};
window.delBin=id=>{if(confirm('Remove '+id+'?')){bins=bins.filter(b=>b.id!==id);saveBins();drawBins();drawAdmin()}};
map.on('click',e=>{if(admin&&addMode){addMode=false;const name=prompt('Name / area of this dustbin?');if(!name)return;
 const n=Math.max(0,...bins.map(b=>+b.id.split('-')[1]||0))+1;bins.push({id:'BIN-'+String(n).padStart(3,'0'),name,lat:+e.latlng.lat.toFixed(6),lng:+e.latlng.lng.toFixed(6),fill:0,maint:false,emptied:'Just now'});saveBins();drawBins();drawAdmin()}
 else if(admin)console.log('Clicked:',e.latlng.lat.toFixed(6),e.latlng.lng.toFixed(6))});

/* ---- Reports (photo + note) ---- */
photoInput.onchange=()=>{const f=photoInput.files[0];if(!f){previewWrap.classList.add('hidden');return}preview.src=URL.createObjectURL(f);previewWrap.classList.remove('hidden')};
const getReports=()=>JSON.parse(localStorage.getItem('swachhReports')||'[]'),saveReports=x=>localStorage.setItem('swachhReports',JSON.stringify(x));
function drawReports(){reportMarkers.forEach(m=>map.removeLayer(m));reportMarkers=[];const reports=getReports();
 reports.forEach(r=>{const c=r.status==='Cleaned'?'#2e9d50':'#e53935';reportMarkers.push(L.circleMarker([r.lat,r.lng],{radius:7,color:'#fff',weight:2,fillColor:c,fillOpacity:1}).addTo(map).bindPopup(`<b>${esc(r.note)}</b><br>Status: ${esc(r.status)}<br>${new Date(r.createdAt).toLocaleString()}`))});
 $('reportList').innerHTML=reports.length?reports.slice().reverse().map(r=>`<article class="report"><div><span class="badge">${esc(r.status)}</span><p><b>${esc(r.note)}</b></p><small>${r.lat.toFixed(6)}, ${r.lng.toFixed(6)} · ${new Date(r.createdAt).toLocaleString()}</small></div>${r.photo?`<img src="${r.photo}" alt="Report photo">`:''}</article>`).join(''):'<p class="muted">No reports yet.</p>'}
$('reportForm').onsubmit=e=>{e.preventDefault();if(!currentPosition)return setStatus("First tap 'Find nearest dustbin' and allow GPS access.");
 const note=$('note').value.trim(),file=photoInput.files[0];
 const submit=photo=>{const r=getReports();r.push({id:Date.now()+'',lat:currentPosition.lat,lng:currentPosition.lng,note,photo,status:'Pending',createdAt:new Date().toISOString()});saveReports(r);addPts(10);drawReports();e.target.reset();previewWrap.classList.add('hidden');setStatus('Report saved on this device (+10 Swachh points). Backend/SMS not connected yet.',true)};
 if(file){const fr=new FileReader();fr.onload=()=>submit(fr.result);fr.readAsDataURL(file)}else submit(null)};
$('clearBtn').onclick=()=>{if(confirm('Delete demo reports stored in this browser?')){localStorage.removeItem('swachhReports');drawReports()}};
drawBins();drawReports();

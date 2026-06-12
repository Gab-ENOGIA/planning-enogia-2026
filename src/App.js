import { useState, useMemo, useCallback } from "react";

const LOGO_B64 = "data:image/png;base64,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";

// ── DATA ─────────────────────────────────────────────────────────
// Each row has both initial (i*) and revised (r*) dates for comparison charts
const SOURCE_DATA = [
  {pj:"PJ446-3",  gamme:"180LTV3",  etat:"SHIPPED", iArrivee:"2026-01-05",iTests:"2026-01-20",iFinProd:"2026-01-26",iDepart:"2026-01-29", arrivee:"2026-01-05",tests:"2026-01-20",finProd:"2026-01-26",depart:"2026-01-29",dA:0,dT:0,dFP:0,dD:0},
  {pj:"PJ446-4",  gamme:"180LTV3",  etat:"SHIPPED", iArrivee:"2026-01-05",iTests:"2026-01-23",iFinProd:"2026-01-27",iDepart:"2026-01-29", arrivee:"2026-01-05",tests:"2026-01-23",finProd:"2026-01-27",depart:"2026-01-29",dA:0,dT:0,dFP:0,dD:0},
  {pj:"PJ446-5",  gamme:"180LTV3",  etat:"SHIPPED", iArrivee:"2026-01-16",iTests:"2026-02-02",iFinProd:"2026-02-06",iDepart:"2026-02-24", arrivee:"2026-01-16",tests:"2026-02-02",finProd:"2026-02-06",depart:"2026-02-24",dA:0,dT:0,dFP:0,dD:0},
  {pj:"PJ462-1",  gamme:"180LTV3",  etat:"SHIPPED", iArrivee:"2026-01-27",iTests:"2026-02-11",iFinProd:"2026-02-18",iDepart:"2026-02-19", arrivee:"2026-01-27",tests:"2026-02-11",finProd:"2026-02-18",depart:"2026-02-19",dA:0,dT:0,dFP:0,dD:0},
  {pj:"PJ446-6",  gamme:"180LTV3",  etat:"SHIPPED", iArrivee:"2026-01-16",iTests:"2026-02-16",iFinProd:"2026-02-20",iDepart:"2026-02-24", arrivee:"2026-01-16",tests:"2026-02-16",finProd:"2026-02-20",depart:"2026-02-25",dA:0,dT:0,dFP:0,dD:1},
  {pj:"PJ460-1",  gamme:"100LTV3",  etat:"SHIPPED", iArrivee:"2026-02-04",iTests:"2026-02-19",iFinProd:"2026-02-24",iDepart:"2026-03-05", arrivee:"2026-02-04",tests:"2026-02-19",finProd:"2026-02-24",depart:"2026-03-05",dA:0,dT:0,dFP:0,dD:0},
  {pj:"PJ460-2",  gamme:"100LTV3",  etat:"SHIPPED", iArrivee:"2026-02-04",iTests:"2026-02-26",iFinProd:"2026-03-03",iDepart:"2026-03-05", arrivee:"2026-02-04",tests:"2026-02-26",finProd:"2026-03-03",depart:"2026-03-05",dA:0,dT:0,dFP:0,dD:0},
  {pj:"PJ468-1",  gamme:"180LTV3",  etat:"SHIPPED", iArrivee:"2026-02-16",iTests:"2026-03-05",iFinProd:"2026-03-13",iDepart:"2026-03-27", arrivee:"2026-02-16",tests:"2026-03-09",finProd:"2026-04-22",depart:"2026-04-27",dA:0,dT:4,dFP:40,dD:31},
  {pj:"SAV206",   gamme:"40LTV2R",  etat:"SHIPPED", iArrivee:"2026-02-16",iTests:"2026-03-12",iFinProd:"2026-03-17",iDepart:"2026-03-19", arrivee:"2026-03-03",tests:"2026-04-10",finProd:"2026-04-28",depart:"2026-04-30",dA:15,dT:29,dFP:42,dD:42},
  {pj:"PJ468-2",  gamme:"180LTV3",  etat:"SHIPPED", iArrivee:"2026-03-03",iTests:"2026-03-19",iFinProd:"2026-03-24",iDepart:"2026-03-27", arrivee:"2026-03-03",tests:"2026-03-23",finProd:"2026-04-23",depart:"2026-04-27",dA:0,dT:4,dFP:30,dD:31},
  {pj:"PJ468-3",  gamme:"180LTV3",  etat:"SHIPPED", iArrivee:"2026-03-03",iTests:"2026-03-23",iFinProd:"2026-03-26",iDepart:"2026-03-27", arrivee:"2026-03-03",tests:"2026-04-07",finProd:"2026-04-27",depart:"2026-04-30",dA:0,dT:15,dFP:32,dD:34},
  {pj:"PJ468-4",  gamme:"180LTV3",  etat:"SHIPPED", iArrivee:"2026-03-23",iTests:"2026-04-14",iFinProd:"2026-04-17",iDepart:"2026-04-24", arrivee:"2026-04-07",tests:"2026-04-21",finProd:"2026-04-27",depart:"2026-04-30",dA:15,dT:7,dFP:10,dD:6},
  {pj:"PJ421MT",  gamme:"CONTENEUR",etat:"SHIPPED", iArrivee:"2026-03-30",iTests:null,iFinProd:"2026-04-13",iDepart:null, arrivee:"2026-03-30",tests:null,finProd:"2026-04-30",depart:"2026-05-27",dA:0,dT:null,dFP:17,dD:null},
  {pj:"PJ468-5",  gamme:"180LTV3",  etat:"SHIPPED", iArrivee:"2026-03-23",iTests:"2026-04-22",iFinProd:"2026-04-28",iDepart:"2026-04-30", arrivee:"2026-04-07",tests:"2026-04-30",finProd:"2026-05-19",depart:"2026-05-21",dA:15,dT:8,dFP:21,dD:21},
  {pj:"PJ468-6",  gamme:"180LTV3",  etat:"SHIPPED", iArrivee:"2026-03-30",iTests:"2026-04-29",iFinProd:"2026-05-05",iDepart:"2026-05-07", arrivee:"2026-04-20",tests:"2026-05-06",finProd:"2026-05-19",depart:"2026-05-21",dA:21,dT:7,dFP:14,dD:14},
  {pj:"PJ462-2",  gamme:"180LTV3",  etat:"PROD",    iArrivee:"2026-05-18",iTests:"2026-06-16",iFinProd:"2026-06-19",iDepart:"2026-06-23", arrivee:"2026-05-19",tests:"2026-06-18",finProd:"2026-06-22",depart:"2026-06-23",dA:1,dT:2,dFP:3,dD:0},
  {pj:"PJ382-40", gamme:"40LTV3",   etat:"En fabrication", iArrivee:"2026-05-19",iTests:"2026-06-18",iFinProd:"2026-06-24",iDepart:"2026-06-26", arrivee:"2026-05-19",tests:"2026-06-22",finProd:"2026-06-25",depart:"2026-06-30",dA:0,dT:4,dFP:1,dD:4},
  {pj:"PJ382-180",gamme:"180LTV3",  etat:"PROD",    iArrivee:"2026-05-18",iTests:"2026-07-06",iFinProd:"2026-07-10",iDepart:"2026-07-17", arrivee:"2026-05-19",tests:"2026-06-25",finProd:"2026-06-29",depart:"2026-06-30",dA:1,dT:-11,dFP:-11,dD:-17},
  {pj:"PJ461-1",  gamme:"180MT",    etat:"PROD",    iArrivee:"2026-05-18",iTests:"2026-06-29",iFinProd:"2026-07-03",iDepart:"2026-07-10", arrivee:"2026-05-19",tests:"2026-06-29",finProd:"2026-07-03",depart:"2026-07-10",dA:1,dT:0,dFP:0,dD:0},
  {pj:"PJ449",    gamme:"180MT",    etat:"PROD",    iArrivee:"2026-06-15",iTests:"2026-07-08",iFinProd:"2026-07-15",iDepart:"2026-07-22", arrivee:"2026-06-01",tests:"2026-07-02",finProd:"2026-07-07",depart:"2026-07-10",dA:-14,dT:-6,dFP:-8,dD:-12},
  {pj:"PJ449 (cont)",gamme:"CONTENEUR",etat:"En fabrication",iArrivee:"2026-06-15",iTests:null,iFinProd:"2026-07-17",iDepart:"2026-07-22", arrivee:"2026-06-15",tests:null,finProd:"2026-07-17",depart:"2026-07-22",dA:0,dT:null,dFP:0,dD:0},
  {pj:"PJ420",    gamme:"100LTV2R", etat:"En fabrication", iArrivee:"2026-06-15",iTests:"2026-07-10",iFinProd:"2026-07-16",iDepart:"2026-07-20", arrivee:"2026-06-15",tests:"2026-07-06",finProd:"2026-07-09",depart:"2026-07-10",dA:0,dT:-4,dFP:-7,dD:-10},
  {pj:"PJ461-2",  gamme:"180MT",    etat:"En fabrication", iArrivee:"2026-05-18",iTests:"2026-07-02",iFinProd:"2026-07-08",iDepart:"2026-07-10", arrivee:"2026-06-15",tests:"2026-07-13",finProd:"2026-07-17",depart:"2026-07-21",dA:28,dT:11,dFP:9,dD:11},
  {pj:"PJ456",    gamme:"100LTV3",  etat:"En fabrication", iArrivee:"2026-06-29",iTests:"2026-07-16",iFinProd:"2026-07-21",iDepart:"2026-07-23", arrivee:"2026-06-29",tests:"2026-07-16",finProd:"2026-07-21",depart:"2026-07-23",dA:0,dT:0,dFP:0,dD:0},
  {pj:"PJ456 (cont)",gamme:"CONTENEUR",etat:"En fabrication",iArrivee:"2026-06-29",iTests:null,iFinProd:"2026-07-22",iDepart:"2026-07-23", arrivee:"2026-06-29",tests:null,finProd:"2026-07-22",depart:"2026-07-23",dA:0,dT:null,dFP:0,dD:0},
  {pj:"PJ446-7",  gamme:"180LTV3",  etat:"En fabrication", iArrivee:"2026-06-29",iTests:"2026-07-20",iFinProd:"2026-07-23",iDepart:"2026-07-31", arrivee:"2026-06-29",tests:"2026-07-20",finProd:"2026-07-23",depart:"2026-07-31",dA:0,dT:0,dFP:0,dD:0},
  {pj:"PJ446-8",  gamme:"180LTV3",  etat:"En fabrication", iArrivee:"2026-07-06",iTests:"2026-07-22",iFinProd:"2026-07-28",iDepart:"2026-07-31", arrivee:"2026-07-06",tests:"2026-07-22",finProd:"2026-07-28",depart:"2026-07-31",dA:0,dT:0,dFP:0,dD:0},
  {pj:"PJ446-9",  gamme:"180LTV3",  etat:"En fabrication", iArrivee:"2026-07-06",iTests:"2026-07-24",iFinProd:"2026-07-30",iDepart:"2026-07-31", arrivee:"2026-07-06",tests:"2026-07-24",finProd:"2026-07-30",depart:"2026-07-31",dA:0,dT:0,dFP:0,dD:0},
  {pj:"PJ446-10", gamme:"180LTV3",  etat:"En fabrication", iArrivee:"2026-07-20",iTests:"2026-07-28",iFinProd:"2026-07-30",iDepart:"2026-07-31", arrivee:"2026-07-20",tests:"2026-07-28",finProd:"2026-07-30",depart:"2026-07-31",dA:0,dT:0,dFP:0,dD:0},
  {pj:"PJ446-11", gamme:"180LTV3",  etat:"En fabrication", iArrivee:"2026-07-20",iTests:"2026-08-25",iFinProd:"2026-08-28",iDepart:"2026-09-01", arrivee:"2026-07-20",tests:"2026-08-25",finProd:"2026-08-28",depart:"2026-09-01",dA:0,dT:0,dFP:0,dD:0},
  {pj:"PJ446-12", gamme:"180LTV3",  etat:"En fabrication", iArrivee:"2026-08-17",iTests:"2026-08-27",iFinProd:"2026-08-31",iDepart:"2026-09-01", arrivee:"2026-08-17",tests:"2026-08-27",finProd:"2026-08-31",depart:"2026-09-01",dA:0,dT:0,dFP:0,dD:0},
  {pj:"PJ461-3",  gamme:"180MT",    etat:"En fabrication", iArrivee:"2026-08-17",iTests:"2026-09-15",iFinProd:"2026-09-21",iDepart:"2026-10-02", arrivee:"2026-08-17",tests:"2026-09-15",finProd:"2026-09-21",depart:"2026-10-02",dA:0,dT:0,dFP:0,dD:0},
  {pj:"PJ461-4",  gamme:"180MT",    etat:"En fabrication", iArrivee:"2026-08-31",iTests:"2026-09-24",iFinProd:"2026-09-29",iDepart:"2026-10-02", arrivee:"2026-08-31",tests:"2026-09-24",finProd:"2026-09-29",depart:"2026-10-02",dA:0,dT:0,dFP:0,dD:0},
  {pj:"PJ461-5",  gamme:"180MT",    etat:"En fabrication", iArrivee:"2026-08-31",iTests:"2026-09-29",iFinProd:"2026-10-01",iDepart:"2026-10-02", arrivee:"2026-08-31",tests:"2026-09-29",finProd:"2026-10-01",depart:"2026-10-02",dA:0,dT:0,dFP:0,dD:0},
  {pj:"PJ376",    gamme:"40LTV2R",  etat:"En fabrication", iArrivee:"2026-09-07",iTests:"2026-09-22",iFinProd:"2026-09-25",iDepart:"2026-09-30", arrivee:"2026-09-07",tests:"2026-09-22",finProd:"2026-09-25",depart:"2026-09-30",dA:0,dT:0,dFP:0,dD:0},
  {pj:"PJ376 (cont)",gamme:"CONTENEUR",etat:"PROD",iArrivee:null,iTests:null,iFinProd:null,iDepart:"2026-09-30", arrivee:null,tests:null,finProd:null,depart:"2026-09-30",dA:0,dT:null,dFP:null,dD:0},
  {pj:"PJ472",    gamme:"100LTV3",  etat:"En fabrication", iArrivee:"2026-09-14",iTests:"2026-10-01",iFinProd:"2026-10-06",iDepart:"2026-10-08", arrivee:"2026-09-14",tests:"2026-10-01",finProd:"2026-10-06",depart:"2026-10-08",dA:0,dT:0,dFP:0,dD:0},
  {pj:"PJ479-1",  gamme:"180MT",    etat:"NOT ORDERED", iArrivee:"2026-09-14",iTests:"2026-10-08",iFinProd:"2026-10-13",iDepart:"2026-10-16", arrivee:"2026-09-14",tests:"2026-10-08",finProd:"2026-10-13",depart:"2026-10-16",dA:0,dT:0,dFP:0,dD:0},
  {pj:"PJ479-2",  gamme:"180MT",    etat:"NOT ORDERED", iArrivee:"2026-09-14",iTests:"2026-10-12",iFinProd:"2026-10-15",iDepart:"2026-10-16", arrivee:"2026-09-14",tests:"2026-10-12",finProd:"2026-10-15",depart:"2026-10-16",dA:0,dT:0,dFP:0,dD:0},
  {pj:"PJ473",    gamme:"20LTV3",   etat:"En fabrication", iArrivee:"2026-09-28",iTests:"2026-10-14",iFinProd:"2026-10-15",iDepart:"2026-10-16", arrivee:"2026-09-28",tests:"2026-10-14",finProd:"2026-10-15",depart:"2026-10-16",dA:0,dT:0,dFP:0,dD:0},
  {pj:"PJ486",    gamme:"10LTV3",   etat:"NOT ORDERED", iArrivee:"2026-09-28",iTests:"2026-10-19",iFinProd:"2026-10-21",iDepart:"2026-10-23", arrivee:"2026-09-28",tests:"2026-10-19",finProd:"2026-10-21",depart:"2026-10-23",dA:0,dT:0,dFP:0,dD:0},
  {pj:"PJ485",    gamme:"100MT",    etat:"NOT ORDERED", iArrivee:"2026-09-28",iTests:"2026-10-26",iFinProd:"2026-10-29",iDepart:"2026-10-30", arrivee:"2026-09-28",tests:"2026-10-26",finProd:"2026-10-29",depart:"2026-10-30",dA:0,dT:0,dFP:0,dD:0},
  {pj:"PJ488",    gamme:"180LTV3",  etat:"NOT ORDERED", iArrivee:"2026-10-12",iTests:"2026-11-02",iFinProd:"2026-11-05",iDepart:"2026-11-09", arrivee:"2026-10-12",tests:"2026-11-02",finProd:"2026-11-05",depart:"2026-11-09",dA:0,dT:0,dFP:0,dD:0},
];

const GAMME_COLORS={"180LTV3":"#2563eb","100LTV3":"#7c3aed","40LTV3":"#059669","180MT":"#dc2626","100MT":"#ea580c","20LTV3":"#0891b2","10LTV3":"#65a30d","40LTV2R":"#d97706","100LTV2R":"#9333ea","CONTENEUR":"#64748b"};
const STATUS_COLORS={"SHIPPED":"#34d399","READY":"#60a5fa","PROD":"#fbbf24","En fabrication":"#a78bfa","NOT ORDERED":"#cbd5e1"};
const ETAT_META={"SHIPPED":{bg:"#d1fae5",text:"#065f46",border:"#34d399",bar:"#34d399"},"READY":{bg:"#dbeafe",text:"#1e40af",border:"#60a5fa",bar:"#60a5fa"},"PROD":{bg:"#fef3c7",text:"#92400e",border:"#fbbf24",bar:"#fbbf24"},"En fabrication":{bg:"#ede9fe",text:"#5b21b6",border:"#a78bfa",bar:"#a78bfa"},"NOT ORDERED":{bg:"#f1f5f9",text:"#64748b",border:"#cbd5e1",bar:"#cbd5e1"}};
const ALL_ETATS=Object.keys(ETAT_META);
const ALL_GAMMES=["10LTV3","20LTV3","40LTV2R","40LTV3","100LTV2R","100LTV3","100MT","180LTV3","180MT","CONTENEUR"];
const MONTHS=["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"];
const MONTHS_FULL=["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const today=new Date("2026-06-08");

function fmt(s){if(!s)return"—";var d=new Date(s);return String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0");}
function fmtFull(s){if(!s)return"—";return new Date(s).toLocaleDateString("fr-FR");}
function diffDays(a,b){if(!a||!b)return null;return Math.round((new Date(b)-new Date(a))/86400000);}
function getDominantGamme(pjs){var c={};pjs.forEach(function(p){c[p.gamme]=(c[p.gamme]||0)+1;});var b=null,n=0;Object.keys(c).forEach(function(k){if(c[k]>n){n=c[k];b=k;}});return b||"180LTV3";}
const PJ_COUNTRY={"PJ446":{country:"Corée du Sud",lat:36.5,lng:127.9,flag:"🇰🇷"},"PJ462-1":{country:"France",lat:46.2,lng:2.2,flag:"🇫🇷"},"PJ462-2":{country:"Norvège",lat:60.5,lng:8.5,flag:"🇳🇴"},"PJ460":{country:"Norvège",lat:60.5,lng:8.5,flag:"🇳🇴"},"PJ468":{country:"Allemagne",lat:51.2,lng:10.4,flag:"🇩🇪"},"PJ421MT":{country:"Royaume-Uni",lat:52.4,lng:-1.9,flag:"🇬🇧"},"PJ382":{country:"Royaume-Uni",lat:52.4,lng:-1.9,flag:"🇬🇧"},"PJ461":{country:"Singapour",lat:1.35,lng:103.8,flag:"🇸🇬"},"PJ449":{country:"Espagne",lat:40.4,lng:-3.7,flag:"🇪🇸"},"PJ420":{country:"France",lat:46.2,lng:2.2,flag:"🇫🇷"},"PJ456":{country:"Royaume-Uni",lat:52.4,lng:-1.9,flag:"🇬🇧"},"PJ376":{country:"France",lat:46.2,lng:2.2,flag:"🇫🇷"},"PJ472":{country:"Islande",lat:64.9,lng:-19.0,flag:"🇮🇸"},"PJ479":{country:"La Réunion",lat:-21.1,lng:55.5,flag:"🇷🇪"},"PJ473":{country:"Corée du Sud",lat:36.5,lng:127.9,flag:"🇰🇷"},"PJ486":{country:"France",lat:46.2,lng:2.2,flag:"🇫🇷"},"PJ485":{country:"Kenya",lat:-1.3,lng:36.8,flag:"🇰🇪"},"PJ488":{country:"Japon",lat:36.2,lng:138.3,flag:"🇯🇵"},"SAV206":{country:"Allemagne",lat:51.2,lng:10.4,flag:"🇩🇪"}};
function getCountry(pj){if(PJ_COUNTRY[pj])return PJ_COUNTRY[pj];var b=pj.replace(" (cont)","").replace(/-\d+$/,"");return PJ_COUNTRY[b]||{country:"France",lat:46.2,lng:2.2,flag:"🇫🇷"};}

function Badge({etat}){var c=ETAT_META[etat]||ETAT_META["NOT ORDERED"];return <span style={{background:c.bg,color:c.text,border:"1px solid "+c.border,borderRadius:4,padding:"1px 7px",fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>{etat}</span>;}
function MultiFilter({label,options,selected,onChange,colorMap}){return(<div style={{display:"flex",flexWrap:"wrap",gap:5,alignItems:"center"}}><span style={{fontSize:11,color:"#94a3b8",fontWeight:600,marginRight:2}}>{label}</span>{options.map(function(o){var active=selected.has(o);var c=colorMap?colorMap[o]:null;return <button key={o} onClick={function(){var s=new Set(selected);active?s.delete(o):s.add(o);onChange(s);}} style={{padding:"3px 9px",borderRadius:12,border:"1.5px solid "+(active?(c?c.border:"#2563eb"):"#e2e8f0"),background:active?(c?c.bg:"#eff6ff"):"#fff",color:active?(c?c.text:"#1e40af"):"#94a3b8",fontSize:11,fontWeight:600,cursor:"pointer"}}>{o}</button>;})}</div>);}

// ── GANTT ─────────────────────────────────────────────────────────
const GANTT_PHASES=[{key:"arrivee",label:"A",color:"#3b82f6",title:"Arrivée",duration:0},{key:"tests",label:"T",color:"#f59e0b",title:"Tests",duration:2},{key:"finProd",label:"F",color:"#10b981",title:"Fin prod",duration:0},{key:"depart",label:"D",color:"#ef4444",title:"Départ",duration:0}];
function GanttView({data,progress}){
  var [sm,setSm]=useState(0);var [vm,setVm]=useState(6);var [tt,setTt]=useState(null);var [hov,setHov]=useState(null);
  var sd=new Date(2026,sm,1),ed=new Date(2026,sm+vm,1);
  var mons=[];for(var i=0;i<vm;i++)mons.push((sm+i)%12);
  function pct(ds){if(!ds)return null;return Math.max(0,Math.min(100,(new Date(ds)-sd)/(ed-sd)*100));}
  function bpct(a,b){if(!a||!b)return null;var da=new Date(a),db=new Date(b);if(db<sd||da>ed)return null;var t=ed-sd;return{left:Math.max(0,(da-sd)/t*100),width:Math.min(100,(db-sd)/t*100)-Math.max(0,(da-sd)/t*100)};}
  return(<div style={{background:"#fff",borderRadius:8,boxShadow:"0 1px 3px rgba(0,0,0,.08)",overflow:"hidden"}}>
    <div style={{display:"flex",gap:8,padding:"10px 14px",borderBottom:"1px solid #f1f5f9",alignItems:"center",flexWrap:"wrap",background:"#f8fafc"}}>
      <span style={{fontWeight:700,color:"#64748b",fontSize:12}}>Mois :</span>
      {[1,2,3,4,6,12].map(function(n){return <button key={n} onClick={function(){setVm(n);if(sm+n>12)setSm(12-n);}} style={{padding:"3px 9px",borderRadius:6,border:"none",background:vm===n?"#2563eb":"#e2e8f0",color:vm===n?"#fff":"#475569",fontSize:11,fontWeight:600,cursor:"pointer"}}>{n}</button>;})}
      <div style={{marginLeft:"auto",display:"flex",gap:6,alignItems:"center"}}>
        <button onClick={function(){if(sm>0)setSm(function(s){return Math.max(0,s-vm);});}} style={{padding:"3px 10px",borderRadius:6,border:"1px solid #e2e8f0",fontSize:13,cursor:"pointer"}}>◀</button>
        <span style={{fontSize:12,color:"#1e40af",fontWeight:700,minWidth:150,textAlign:"center"}}>{MONTHS_FULL[sm]}{vm>1?" – "+MONTHS_FULL[Math.min(sm+vm-1,11)]:""}</span>
        <button onClick={function(){if(sm+vm<12)setSm(function(s){return Math.min(12-vm,s+vm);});}} style={{padding:"3px 10px",borderRadius:6,border:"1px solid #e2e8f0",fontSize:13,cursor:"pointer"}}>▶</button>
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"160px repeat("+vm+",1fr)",background:"#f8fafc",borderBottom:"1px solid #e2e8f0"}}>
      <div style={{padding:"6px 10px",fontSize:11,fontWeight:700,color:"#94a3b8",borderRight:"1px solid #e2e8f0"}}>Projet</div>
      {mons.map(function(m,i){var isN=m===today.getMonth();return <div key={i} style={{padding:"6px 2px",textAlign:"center",fontSize:vm>6?9:11,fontWeight:700,color:isN?"#2563eb":"#64748b",background:isN?"#eff6ff":"transparent",borderLeft:"1px solid #e2e8f0"}}>{MONTHS[m]}</div>;})}
    </div>
    {data.map(function(r,ri){
      var c=ETAT_META[r.etat]||ETAT_META["NOT ORDERED"];var mb=bpct(r.arrivee,r.depart);var pb=bpct(r.arrivee,r.tests);var pv=progress[r.pj]!==undefined?progress[r.pj]:null;
      return(<div key={r.pj+ri} style={{display:"grid",gridTemplateColumns:"160px 1fr",borderBottom:"1px solid #f1f5f9",background:hov===ri?"#f0f9ff":"#fff"}} onMouseEnter={function(){setHov(ri);}} onMouseLeave={function(){setHov(null);setTt(null);}}>
        <div style={{padding:"0 8px",display:"flex",alignItems:"center",gap:5,borderRight:"1px solid #e2e8f0",height:36,minWidth:0}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:c.bar,flexShrink:0}}/>
          <span style={{fontSize:11,fontWeight:700,color:"#1e40af",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{r.pj}</span>
          {pv!==null&&<span style={{fontSize:9,fontWeight:700,color:pv>=100?"#059669":pv>=50?"#2563eb":"#d97706",background:pv>=100?"#d1fae5":pv>=50?"#dbeafe":"#fef3c7",padding:"1px 4px",borderRadius:3,flexShrink:0}}>{pv}%</span>}
        </div>
        <div style={{position:"relative",height:36}}>
          {mons.map(function(_,i){return <div key={i} style={{position:"absolute",left:((i/vm)*100)+"%",top:0,bottom:0,width:1,background:"#f1f5f9"}}/>;})}
          {(function(){var tp=pct(today.toISOString().slice(0,10));return tp!=null?<div style={{position:"absolute",left:tp+"%",top:0,bottom:0,width:2,background:"rgba(239,68,68,.35)",zIndex:3}}/>:null;})()}
          {mb&&<div style={{position:"absolute",left:mb.left+"%",width:Math.max(mb.width,.3)+"%",top:"50%",transform:"translateY(-50%)",height:16,background:c.bar,borderRadius:4,opacity:.15,zIndex:1}}/>}
          {pb&&pv!==null&&<div style={{position:"absolute",left:pb.left+"%",width:Math.max(pb.width*(pv/100),.3)+"%",top:"50%",transform:"translateY(-50%)",height:8,background:pv>=100?"#059669":pv>=50?"#2563eb":"#f59e0b",borderRadius:4,opacity:.7,zIndex:2}}/>}
          {GANTT_PHASES.map(function(ph){var p=pct(r[ph.key]);if(p===null)return null;
            if(ph.duration>0){var eD=new Date(r[ph.key]);eD.setDate(eD.getDate()+ph.duration);var p2=pct(eD.toISOString().slice(0,10));var bw=Math.max((p2||p)-p,.5);return(<div key={ph.key} onMouseEnter={function(e){e.stopPropagation();setTt({r:r,x:e.clientX,y:e.clientY});}} onMouseLeave={function(){setTt(null);}} style={{position:"absolute",left:p+"%",width:bw+"%",top:"50%",transform:"translateY(-50%)",height:16,backgroundImage:"repeating-linear-gradient(45deg,"+ph.color+" 0px,"+ph.color+" 4px,#fff8e1 4px,#fff8e1 8px)",borderRadius:4,border:"2px solid "+ph.color,zIndex:4,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:9,fontWeight:700,color:"#92400e",textShadow:"0 0 3px #fff"}}>{ph.label}</span></div>);}
            return(<div key={ph.key} onMouseEnter={function(e){e.stopPropagation();setTt({r:r,x:e.clientX,y:e.clientY});}} onMouseLeave={function(){setTt(null);}} style={{position:"absolute",left:p+"%",top:"50%",transform:"translate(-50%,-50%)",width:20,height:20,borderRadius:"50%",background:ph.color,border:"2px solid #fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff",zIndex:4,cursor:"pointer",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}>{ph.label}</div>);
          })}
        </div>
      </div>);
    })}
    {tt&&(function(){var r=tt.r;var pv=progress[r.pj]!==undefined?progress[r.pj]:null;return(<div style={{position:"fixed",left:Math.min(tt.x+12,window.innerWidth-220),top:tt.y-10,background:"#1e293b",color:"#fff",borderRadius:8,padding:"10px 14px",fontSize:11,zIndex:999,pointerEvents:"none",boxShadow:"0 4px 20px rgba(0,0,0,.3)",minWidth:200}}><div style={{fontWeight:700,fontSize:13,marginBottom:6,color:"#93c5fd"}}>{r.pj}</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}><div><span style={{color:"#94a3b8"}}>Arrivée</span><br/><b>{fmtFull(r.arrivee)}</b></div><div><span style={{color:"#94a3b8"}}>Tests</span><br/><b>{fmtFull(r.tests)}</b></div><div><span style={{color:"#94a3b8"}}>Fin prod</span><br/><b>{fmtFull(r.finProd)}</b></div><div><span style={{color:"#94a3b8"}}>Départ</span><br/><b>{fmtFull(r.depart)}</b></div></div>{pv!==null&&<div style={{marginTop:6,paddingTop:6,borderTop:"1px solid #334155"}}><span style={{color:"#94a3b8"}}>Avancement : </span><b style={{color:pv>=100?"#34d399":pv>=50?"#60a5fa":"#fbbf24"}}>{pv}%</b></div>}<div style={{marginTop:6,paddingTop:6,borderTop:"1px solid #334155",display:"flex",justifyContent:"space-between",alignItems:"center"}}><Badge etat={r.etat}/><span style={{color:"#94a3b8"}}>{r.gamme}</span></div></div>);})()} 
    <div style={{padding:"8px 14px",borderTop:"1px solid #f1f5f9",display:"flex",gap:12,flexWrap:"wrap",background:"#f8fafc"}}>{GANTT_PHASES.map(function(ph){return(<span key={ph.key} style={{display:"flex",alignItems:"center",gap:5,fontSize:11}}>{ph.duration>0?<span style={{width:28,height:14,backgroundImage:"repeating-linear-gradient(45deg,"+ph.color+" 0px,"+ph.color+" 4px,#fff8e1 4px,#fff8e1 8px)",borderRadius:3,border:"2px solid "+ph.color,display:"inline-block"}}/>:<span style={{width:18,height:18,borderRadius:"50%",background:ph.color,border:"2px solid #fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,color:"#fff"}}>{ph.label}</span>}<span style={{color:"#64748b"}}>{ph.title}{ph.duration>0?" (2j)":""}</span></span>);})}
    </div>
  </div>);
}

// ── CALENDAR ──────────────────────────────────────────────────────
const CAL_EVENTS=[{key:"arrivee",label:"Arr.",color:"#3b82f6",duration:0},{key:"tests",label:"Test",color:"#f59e0b",duration:2},{key:"finProd",label:"FinP",color:"#10b981",duration:0},{key:"depart",label:"Dep.",color:"#ef4444",duration:0}];
function buildDayEvents(data,month,year){var de={};data.forEach(function(r){CAL_EVENTS.forEach(function(ev){if(!r[ev.key])return;var days=ev.duration>0?ev.duration:1;for(var d=0;d<days;d++){var cur=new Date(r[ev.key]);cur.setDate(cur.getDate()+d);if(cur.getMonth()!==month||cur.getFullYear()!==year)continue;var day=cur.getDate();if(!de[day])de[day]=[];var ex=false;for(var k=0;k<de[day].length;k++){if(de[day][k].pj===r.pj&&de[day][k].key===ev.key){ex=true;break;}}if(!ex)de[day].push({key:ev.key,label:ev.label,color:ev.color,duration:ev.duration,pj:r.pj,etat:r.etat,gamme:r.gamme,r:r,isStart:d===0,isEnd:d===days-1});}});});return de;}

// Calendar with narrow weekend columns
function MonthGrid({year,month,dayEvents,onDayClick,popupDay}){
  var fd=new Date(year,month,1).getDay(),adj=(fd+6)%7,dim=new Date(year,month+1,0).getDate();
  var cells=[];for(var i=0;i<adj;i++)cells.push(null);for(var d=1;d<=dim;d++)cells.push(d);
  // 7 columns: Mon(1fr) Tue(1fr) Wed(1fr) Thu(1fr) Fri(1fr) Sat(0.45fr) Sun(0.45fr)
  var colTemplate="1fr 1fr 1fr 1fr 1fr 0.45fr 0.45fr";
  var dayLabels=["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];
  return(<div>
    <div style={{display:"grid",gridTemplateColumns:colTemplate,background:"#f1f5f9",borderBottom:"1px solid #e2e8f0"}}>
      {dayLabels.map(function(d,i){var isWE=i>=5;return <div key={d} style={{textAlign:"center",padding:"3px 0",fontSize:10,fontWeight:700,color:isWE?"#94a3b8":"#64748b"}}>{d}</div>;})}
    </div>
    <div style={{display:"grid",gridTemplateColumns:colTemplate}}>
      {cells.map(function(day,ci){
        var colIdx=ci%7;var isWE=colIdx>=5;
        if(!day)return <div key={"e"+ci} style={{background:"#f8fafc",minHeight:isWE?40:56,borderRight:"1px solid #f1f5f9",borderBottom:"1px solid #f1f5f9"}}/>;
        var isToday=day===today.getDate()&&month===today.getMonth();
        var evs=dayEvents[day]||[];var isSel=popupDay===day;
        var minH=isWE?40:56;
        return(<div key={day} onClick={function(){onDayClick(day);}} style={{minHeight:minH,padding:isWE?1:2,borderRight:"1px solid #f1f5f9",borderBottom:"1px solid #f1f5f9",cursor:evs.length?"pointer":"default",background:isSel?"#eff6ff":isToday?"#fef3c7":"#fff"}}>
          <div style={{fontSize:isWE?8:10,fontWeight:700,color:isToday?"#d97706":isWE?"#94a3b8":"#475569",width:isWE?14:18,height:isWE?14:18,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:isToday?"#fbbf24":"transparent",marginBottom:1}}>{day}</div>
          {!isWE&&evs.slice(0,2).map(function(ev,ei){var isM=ev.duration>0,br=isM?(ev.isStart&&ev.isEnd?"3px":ev.isStart?"3px 0 0 3px":ev.isEnd?"0 3px 3px 0":"0"):"3px",lbl=isM?(ev.isStart?ev.label+" "+ev.pj:"↪ "+ev.pj+" (J2)"):(ev.label+" "+ev.pj);return <div key={ei} style={{background:ev.color,color:"#fff",borderRadius:br,padding:"0px 3px",fontSize:8,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:1,backgroundImage:isM?"repeating-linear-gradient(45deg,rgba(255,255,255,.2) 0px,rgba(255,255,255,.2) 2px,transparent 2px,transparent 5px)":"none"}}>{lbl}</div>;})}
          {isWE&&evs.length>0&&<div style={{width:6,height:6,borderRadius:"50%",background:"#f59e0b",margin:"0 auto"}}/>}
          {!isWE&&evs.length>2&&<div style={{fontSize:8,color:"#94a3b8",fontWeight:600}}>+{evs.length-2}</div>}
        </div>);
      })}
    </div>
  </div>);
}
function CalendarView({data}){
  var [sm,setSm]=useState(today.getMonth());var [nm,setNm]=useState(3);var [pd,setPd]=useState(null);var [pm,setPm]=useState(null);
  var year=2026,mons=[],canBack=sm>0,canFwd=sm+nm<=12;
  for(var i=0;i<nm;i++)mons.push((sm+i)%12);
  var allDayEvents=useMemo(function(){var res={};mons.forEach(function(m){res[m]=buildDayEvents(data,m,year);});return res;},[data,sm,nm]);
  var popup=pd&&pm!==null?((allDayEvents[pm]||{})[pd]||[]):[];
  return(<div style={{background:"#fff",borderRadius:8,boxShadow:"0 1px 3px rgba(0,0,0,.08)",overflow:"hidden"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 16px",background:"linear-gradient(135deg,#1e3a5f,#2563eb)"}}>
      <div style={{display:"flex",gap:6,alignItems:"center"}}>
        <button onClick={function(){if(canBack)setSm(function(m){return Math.max(0,m-nm);});}} disabled={!canBack} style={{background:"rgba(255,255,255,.2)",border:"none",color:"#fff",borderRadius:6,padding:"3px 10px",cursor:canBack?"pointer":"default",fontSize:14,fontWeight:700}}>◀</button>
        <span style={{fontWeight:700,fontSize:13,color:"#fff",minWidth:200,textAlign:"center"}}>{MONTHS_FULL[mons[0]]}{nm>1?" – "+MONTHS_FULL[mons[mons.length-1]]:""} 2026</span>
        <button onClick={function(){if(canFwd)setSm(function(m){return Math.min(12-nm,m+nm);});}} disabled={!canFwd} style={{background:"rgba(255,255,255,.2)",border:"none",color:"#fff",borderRadius:6,padding:"3px 10px",cursor:canFwd?"pointer":"default",fontSize:14,fontWeight:700}}>▶</button>
      </div>
      <div style={{display:"flex",gap:4}}><span style={{color:"rgba(255,255,255,.7)",fontSize:11,marginRight:3}}>Mois :</span>{[1,2,3,4,6].map(function(n){return <button key={n} onClick={function(){setNm(n);if(sm+n>12)setSm(12-n);}} style={{padding:"2px 8px",borderRadius:5,border:"none",background:nm===n?"#fff":"rgba(255,255,255,.2)",color:nm===n?"#1e40af":"#fff",fontSize:11,fontWeight:700,cursor:"pointer"}}>{n}</button>;})}</div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat("+nm+",1fr)",borderTop:"1px solid #e2e8f0",overflowX:"auto"}}>
      {mons.map(function(m){return(<div key={m} style={{borderRight:"1px solid #e2e8f0",minWidth:nm>3?200:0}}><div style={{padding:"6px 8px",background:"#f8fafc",borderBottom:"1px solid #e2e8f0",fontWeight:700,color:"#1e40af",fontSize:12,textAlign:"center"}}>{MONTHS_FULL[m]}</div><MonthGrid year={year} month={m} dayEvents={allDayEvents[m]||{}} popupDay={pm===m?pd:null} onDayClick={function(day){setPd(day);setPm(m);}}/></div>);})}
    </div>
    {popup.length>0&&(<div style={{margin:12,background:"#f0f9ff",borderRadius:8,padding:12,border:"1px solid #bfdbfe"}}><div style={{fontWeight:700,color:"#1e40af",marginBottom:8,fontSize:13}}>{pd} {MONTHS_FULL[pm]} 2026 — {popup.length} événement{popup.length>1?"s":""}</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{popup.map(function(ev,i){return(<div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"5px 10px",background:"#fff",borderRadius:6,border:"1px solid #e0f2fe"}}><span style={{background:ev.color,color:"#fff",borderRadius:4,padding:"2px 7px",fontSize:11,fontWeight:700}}>{ev.label}</span><span style={{fontWeight:700,color:"#1e40af",fontSize:12}}>{ev.pj}</span><span style={{color:"#64748b",fontSize:11}}>{ev.gamme}</span><span style={{marginLeft:"auto"}}><Badge etat={ev.etat}/></span><span style={{fontSize:11}}>{getCountry(ev.pj).flag}</span></div>);})}</div></div>)}
    <div style={{padding:"6px 14px",borderTop:"1px solid #f1f5f9",display:"flex",gap:10,flexWrap:"wrap",background:"#f8fafc"}}>{CAL_EVENTS.map(function(ev){return <span key={ev.key} style={{display:"flex",alignItems:"center",gap:4,fontSize:10}}><span style={{background:ev.color,color:"#fff",borderRadius:3,padding:"1px 4px",fontSize:8,fontWeight:700}}>{ev.label}</span><span style={{color:"#64748b"}}>{ev.key==="arrivee"?"Arrivée":ev.key==="tests"?"Tests (2j)":ev.key==="finProd"?"Fin prod":"Départ"}</span></span>;})} <span style={{fontSize:10,color:"#94a3b8",marginLeft:"auto"}}>Sam/Dim réduits · point jaune = événement weekend</span>
    </div>
  </div>);
}

// ── MAP ───────────────────────────────────────────────────────────
function WorldMapView({data}){
  var [sc,setSc]=useState(null);
  var byC={};data.forEach(function(p){var c=getCountry(p.pj);if(!byC[c.country])byC[c.country]={country:c.country,lat:c.lat,lng:c.lng,flag:c.flag,pjs:[]};byC[c.country].pjs.push(p);});
  var mL=Object.values(byC).map(function(c){var dG=getDominantGamme(c.pjs),fill=GAMME_COLORS[dG]||"#3b82f6",radius=Math.min(8+c.pjs.length*4,30),pc=c.pjs.map(function(p){return p.pj+" ("+p.etat+")";}).join("<br>"),popup="<b>"+c.flag+" "+c.country+"</b><br><i>"+dG+"</i><br>"+pc;return "L.circleMarker(["+c.lat+","+c.lng+"],{radius:"+radius+",fillColor:'"+fill+"',color:'"+fill+"',weight:2,fillOpacity:0.85}).addTo(map).bindPopup("+JSON.stringify(popup)+");";}).join("\n");
  var html="<!DOCTYPE html><html><head><link rel='stylesheet' href='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'/><script src='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'></scr"+"ipt><style>body{margin:0}#map{height:100vh;width:100vw}</style></head><body><div id='map'></div><script>var map=L.map('map').setView([30,20],2);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'OSM',maxZoom:18}).addTo(map);\n"+mL+"\n</scr"+"ipt></body></html>";
  var sorted=Object.values(byC).sort(function(a,b){return b.pjs.length-a.pjs.length;});var selD=sc?byC[sc]:null;
  return(<div style={{display:"flex",flexDirection:"column",gap:12}}><div style={{borderRadius:10,overflow:"hidden",height:420}}><iframe srcDoc={html} style={{width:"100%",height:"100%",border:"none"}} title="map"/></div><div style={{background:"#1e3a5f",borderRadius:8,padding:"8px 12px"}}><div style={{color:"#94a3b8",fontSize:10,fontWeight:600,marginBottom:6}}>COULEUR = GAMME DOMINANTE · TAILLE = NB D'UNITÉS</div><div style={{display:"flex",flexWrap:"wrap",gap:8}}>{Object.keys(GAMME_COLORS).map(function(g){return <span key={g} style={{display:"flex",alignItems:"center",gap:4,fontSize:10}}><span style={{width:10,height:10,borderRadius:"50%",background:GAMME_COLORS[g],display:"inline-block"}}/><span style={{color:"#cbd5e1"}}>{g}</span></span>;})}</div></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:8}}>{sorted.map(function(c){var dG=getDominantGamme(c.pjs),fill=GAMME_COLORS[dG]||"#3b82f6",isSel=sc===c.country;return(<div key={c.country} onClick={function(){setSc(isSel?null:c.country);}} style={{background:isSel?"#eff6ff":"#fff",borderRadius:8,padding:"10px 12px",cursor:"pointer",border:"1.5px solid "+(isSel?"#3b82f6":"#e2e8f0")}}><div style={{fontSize:22,marginBottom:4}}>{c.flag}</div><div style={{fontWeight:700,color:"#1e293b",fontSize:12}}>{c.country}</div><div style={{color:fill,fontWeight:700,fontSize:18}}>{c.pjs.length}</div><div style={{color:"#94a3b8",fontSize:10}}>{"unité"+(c.pjs.length>1?"s":"")+" · "+dG}</div></div>);})}</div>{selD&&(<div style={{background:"#fff",borderRadius:8,padding:14,border:"1px solid #bfdbfe"}}><div style={{fontWeight:700,fontSize:14,color:"#1e40af",marginBottom:10}}>{selD.flag} {selD.country}</div><div style={{display:"flex",flexWrap:"wrap",gap:6}}>{selD.pjs.map(function(r){return(<div key={r.pj} style={{background:"#f0f9ff",border:"1px solid #bfdbfe",borderRadius:6,padding:"6px 10px",minWidth:130}}><div style={{fontWeight:700,color:"#1e40af",fontSize:12}}>{r.pj}</div><div style={{color:"#64748b",fontSize:11}}>{r.gamme}</div><div style={{marginTop:4}}><Badge etat={r.etat}/></div><div style={{color:"#94a3b8",fontSize:10,marginTop:3}}>Départ : {fmt(r.depart)}</div></div>);})}</div></div>)}</div>);
}

// ── TABLE ─────────────────────────────────────────────────────────
function TableView({data,progress}){
  var [sel,setSel]=useState(null);var selR=sel?data.find(function(r){return r.pj===sel;}):null;
  return(<div style={{background:"#fff",borderRadius:8,overflow:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#f1f5f9",borderBottom:"2px solid #e2e8f0"}}>{["N° PJ","Gamme","Pays","État","Arrivée","Tests","Fin prod","Départ","Avanct","J rest"].map(function(h){return <th key={h} style={{padding:"8px 10px",textAlign:"left",fontWeight:600,color:"#475569",fontSize:11,whiteSpace:"nowrap"}}>{h}</th>;})}</tr></thead><tbody>{data.map(function(r,i){var dl=r.depart?diffDays(today.toISOString().slice(0,10),r.depart):null;var urgent=dl!==null&&dl>=0&&dl<=30;var done=r.etat==="SHIPPED";var ctr=getCountry(r.pj);var pval=progress[r.pj]!==undefined?progress[r.pj]:null;return(<tr key={r.pj+i} onClick={function(){setSel(sel===r.pj?null:r.pj);}} style={{borderBottom:"1px solid #f1f5f9",cursor:"pointer",background:sel===r.pj?"#eff6ff":done?"#f0fdf4":urgent?"#fffbeb":"#fff"}}><td style={{padding:"7px 10px",fontWeight:700,color:"#1e40af"}}>{r.pj}</td><td style={{padding:"7px 10px",color:"#64748b"}}>{r.gamme}</td><td style={{padding:"7px 10px"}}><span title={ctr.country}>{ctr.flag}</span></td><td style={{padding:"7px 10px"}}><Badge etat={r.etat}/></td><td style={{padding:"7px 10px",color:"#475569"}}>{fmt(r.arrivee)}</td><td style={{padding:"7px 10px",color:"#475569"}}>{fmt(r.tests)}</td><td style={{padding:"7px 10px",color:"#475569"}}>{fmt(r.finProd)}</td><td style={{padding:"7px 10px",fontWeight:600,color:done?"#059669":urgent?"#d97706":"#1e293b"}}>{fmt(r.depart)}</td><td style={{padding:"7px 10px",minWidth:90}}>{pval!==null?(<div style={{display:"flex",alignItems:"center",gap:4}}><div style={{flex:1,background:"#f1f5f9",borderRadius:8,height:6,overflow:"hidden"}}><div style={{width:pval+"%",height:"100%",background:pval>=100?"#059669":pval>=50?"#2563eb":"#f59e0b",borderRadius:8}}/></div><span style={{fontSize:10,fontWeight:700,color:pval>=100?"#059669":pval>=50?"#2563eb":"#92400e"}}>{pval}%</span></div>):<span style={{color:"#cbd5e1",fontSize:10}}>—</span>}</td><td style={{padding:"7px 10px"}}>{done?<span style={{color:"#059669",fontSize:11}}>✓</span>:dl===null?"—":dl<0?"—":<span style={{color:urgent?"#d97706":"#475569",fontWeight:urgent?700:400}}>{dl}j</span>}</td></tr>);})} </tbody></table>{selR&&(<div style={{margin:12,background:"#eff6ff",borderRadius:8,padding:14,border:"1px solid #bfdbfe"}}><div style={{fontWeight:700,fontSize:14,color:"#1e40af",marginBottom:8}}>{selR.pj} — {selR.gamme} · {getCountry(selR.pj).flag} {getCountry(selR.pj).country}</div><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>{[["Arrivée",selR.arrivee],["Tests",selR.tests],["Fin prod",selR.finProd],["Départ",selR.depart]].map(function(it){return(<div key={it[0]} style={{background:"#fff",borderRadius:6,padding:"8px 10px"}}><div style={{color:"#94a3b8",fontSize:10}}>{it[0]}</div><div style={{fontWeight:700,color:"#1e40af"}}>{it[1]?new Date(it[1]).toLocaleDateString("fr-FR"):"—"}</div></div>);})}</div></div>)}</div>);
}

// ── PIN ───────────────────────────────────────────────────────────
var PIN="2214";
function PinGate({onUnlock}){var [val,setVal]=useState(""),[ err,setErr]=useState(false);function check(){if(val===PIN){onUnlock();}else{setErr(true);setVal("");setTimeout(function(){setErr(false);},1200);}}return(<div style={{background:"#fff",borderRadius:10,padding:32,maxWidth:300,margin:"40px auto",boxShadow:"0 4px 20px rgba(0,0,0,.1)",textAlign:"center"}}><div style={{fontSize:32,marginBottom:8}}>🔒</div><div style={{fontWeight:700,fontSize:16,color:"#1e293b",marginBottom:4}}>Accès Manager</div><div style={{color:"#64748b",fontSize:12,marginBottom:20}}>Accès restreint</div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,maxWidth:180,margin:"0 auto 12px"}}>{[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map(function(k,i){return <button key={i} onClick={function(){if(k==="⌫")setVal(function(v){return v.slice(0,-1);});else if(k!=="")setVal(function(v){return v.length<4?v+k:v;});}} style={{height:44,borderRadius:8,border:"1px solid #e2e8f0",background:k===""?"transparent":"#f8fafc",fontSize:16,fontWeight:600,color:"#1e293b",cursor:k===""?"default":"pointer"}}>{k}</button>;})} </div><div style={{display:"flex",gap:6,justifyContent:"center",marginBottom:8}}>{[0,1,2,3].map(function(i){return <div key={i} style={{width:10,height:10,borderRadius:"50%",background:i<val.length?"#2563eb":"#e2e8f0"}}/>;})}</div>{err&&<div style={{color:"#ef4444",fontSize:12,fontWeight:600,marginBottom:8}}>Code incorrect ✕</div>}<button onClick={check} disabled={val.length<4} style={{padding:"8px 28px",background:val.length<4?"#e2e8f0":"#2563eb",color:val.length<4?"#94a3b8":"#fff",border:"none",borderRadius:8,fontWeight:700,cursor:val.length<4?"default":"pointer"}}>Valider</button><div style={{marginTop:8,color:"#94a3b8",fontSize:10}}>Code : 1234</div></div>);}

// ── MANAGER ───────────────────────────────────────────────────────
function KpiTile({value,label,sub,color,pjs,progress}){
  var [open,setOpen]=useState(false);
  return(<div style={{background:"#fff",borderRadius:10,boxShadow:"0 2px 8px rgba(0,0,0,.07)",borderTop:"4px solid "+(color||"#2563eb"),overflow:"hidden"}}>
    <div style={{padding:"14px 16px"}}>
      <div style={{fontSize:32,fontWeight:900,color:color||"#2563eb",lineHeight:1}}>{value}</div>
      <div style={{fontWeight:700,color:"#1e293b",fontSize:13,marginTop:4}}>{label}</div>
      {sub&&<div style={{fontSize:11,color:"#94a3b8",marginTop:2}}>{sub}</div>}
      {pjs&&pjs.length>0&&<button onClick={function(){setOpen(function(o){return !o;});}} style={{marginTop:8,padding:"2px 8px",borderRadius:5,border:"1px solid #e2e8f0",background:"#f8fafc",fontSize:10,cursor:"pointer",color:"#64748b"}}>{open?"▲ Masquer":"▼ "+pjs.length+" PJ"}</button>}
    </div>
    {open&&pjs&&(<div style={{borderTop:"1px solid #f1f5f9",padding:"6px 10px",maxHeight:160,overflowY:"auto",background:"#f8fafc"}}>
      {pjs.map(function(r){
        var pval=progress&&progress[r.pj]!==undefined?progress[r.pj]:null;
        return(<div key={r.pj} style={{display:"flex",alignItems:"center",gap:6,padding:"3px 4px",borderRadius:4,marginBottom:2,background:"#fff",border:"1px solid #f1f5f9"}}>
          <span style={{fontWeight:700,color:"#1e40af",fontSize:11,minWidth:90,flexShrink:0}}>{r.pj}</span>
          <span style={{fontSize:10,color:"#94a3b8",flexShrink:0}}>{r.gamme}</span>
          <span style={{fontSize:10}}>{getCountry(r.pj).flag}</span>
          <Badge etat={r.etat}/>
          {pval!==null&&<div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:4}}><div style={{width:40,background:"#e2e8f0",borderRadius:4,height:5}}><div style={{width:pval+"%",height:"100%",background:pval>=100?"#059669":pval>=50?"#2563eb":"#f59e0b",borderRadius:4}}/></div><span style={{fontSize:9,fontWeight:700,color:pval>=100?"#059669":"#1e40af"}}>{pval}%</span></div>}
        </div>);
      })}
    </div>)}
  </div>);
}

// Initiale vs Révisée bar chart for a single metric
function DriftChart({data,metric,label}){
  var iKey="i"+metric.charAt(0).toUpperCase()+metric.slice(1);
  var rKey=metric;
  var rows=data.filter(function(r){return r[iKey]&&r[rKey]&&r[iKey]!==r[rKey];});
  if(rows.length===0)return(<div style={{color:"#94a3b8",fontSize:12,padding:"8px 0"}}>✓ Aucune dérive sur ce critère</div>);
  var maxDelta=Math.max.apply(null,rows.map(function(r){return Math.abs(diffDays(r[iKey],r[rKey]));}).concat([1]));
  return(<div style={{display:"flex",flexDirection:"column",gap:5}}>
    <div style={{display:"flex",gap:8,fontSize:10,color:"#94a3b8",paddingLeft:100,marginBottom:2}}>
      <span style={{display:"flex",alignItems:"center",gap:3}}><span style={{width:12,height:8,background:"#93c5fd",borderRadius:2,display:"inline-block"}}/> Initiale</span>
      <span style={{display:"flex",alignItems:"center",gap:3}}><span style={{width:12,height:8,background:"#ef4444",borderRadius:2,display:"inline-block"}}/> Révisée (+retard)</span>
      <span style={{display:"flex",alignItems:"center",gap:3}}><span style={{width:12,height:8,background:"#059669",borderRadius:2,display:"inline-block"}}/> Révisée (avance)</span>
    </div>
    {rows.sort(function(a,b){return Math.abs(diffDays(b[iKey],b[rKey]))-Math.abs(diffDays(a[iKey],a[rKey]));}).map(function(r){
      var d=diffDays(r[iKey],r[rKey]);
      var abs=Math.abs(d);
      var pct=Math.min((abs/maxDelta)*100,100);
      var retard=d>0;
      return(<div key={r.pj} style={{marginBottom:4}}>
        <div style={{display:"flex",alignItems:"center",gap:6}}>
          <span style={{width:96,fontSize:11,fontWeight:700,color:"#1e40af",flexShrink:0}}>{r.pj}</span>
          <div style={{flex:1,position:"relative",height:18}}>
            {/* Initiale bar (full width reference) */}
            <div style={{position:"absolute",left:0,width:"100%",height:"100%",background:"#e0f2fe",borderRadius:3}}/>
            {/* Delta bar */}
            <div style={{position:"absolute",left:0,width:pct+"%",height:"100%",background:retard?"#ef4444":"#059669",borderRadius:3,display:"flex",alignItems:"center",paddingLeft:4}}>
              {abs>5&&<span style={{fontSize:9,color:"#fff",fontWeight:700}}>{retard?"+":""}{d}j</span>}
            </div>
          </div>
          <span style={{width:38,fontSize:10,fontWeight:700,color:retard?"#dc2626":"#059669",textAlign:"right",flexShrink:0}}>{retard?"+":""}{d}j</span>
        </div>
        <div style={{paddingLeft:102,fontSize:9,color:"#94a3b8"}}>Init: {fmtFull(r[iKey])} → Rév: {fmtFull(r[rKey])}</div>
      </div>);
    })}
  </div>);
}

function ManagerPanel({data,progress,setProgress,onRefresh,lastRefresh}){
  var todayStr=today.toISOString().slice(0,10);

  // ── Combined filters ──
  var [fMois,setFMois]=useState(new Set(["Tous"]));
  var [fGamme,setFGamme]=useState(new Set(["Toutes"]));
  var [fEtat,setFEtat]=useState(new Set(["Tous"]));
  var [activeSection,setActiveSection]=useState("kpi");
  var [driftMetric,setDriftMetric]=useState("depart");
  var [progressOpen,setProgressOpen]=useState(false);

  var gammeOptions=["Toutes"].concat(ALL_GAMMES);
  var moisOptions=["Tous"].concat(MONTHS);
  var etatOptions=["Tous"].concat(ALL_ETATS);

  var filteredData=useMemo(function(){
    return data.filter(function(r){
      if(!fMois.has("Tous")){var mArr=[];fMois.forEach(function(m){mArr.push(MONTHS.indexOf(m));});var dep=r.depart?new Date(r.depart).getMonth():-1;if(mArr.indexOf(dep)<0)return false;}
      if(!fGamme.has("Toutes")&&!fGamme.has(r.gamme))return false;
      if(!fEtat.has("Tous")&&!fEtat.has(r.etat))return false;
      return true;
    });
  },[data,fMois,fGamme,fEtat]);

  var fd=filteredData;
  var shipped=fd.filter(function(r){return r.etat==="SHIPPED";});
  var inProd=fd.filter(function(r){return ["PROD","En fabrication","READY"].indexOf(r.etat)>-1;});
  var notOrd=fd.filter(function(r){return r.etat==="NOT ORDERED";});
  var drifted=fd.filter(function(r){return r.dD>0;});
  var advance=fd.filter(function(r){return r.dD<0;});
  var onTimeList=fd.filter(function(r){return r.dD===0;});
  var upcoming=fd.filter(function(r){var d=diffDays(todayStr,r.depart);return r.depart&&d>=0&&d<=30;}).sort(function(a,b){return new Date(a.depart)-new Date(b.depart);});

  var avgDep=drifted.length?Math.round(drifted.reduce(function(s,r){return s+r.dD;},0)/drifted.length):0;
  var durs=fd.filter(function(r){return r.arrivee&&r.depart;}).map(function(r){return diffDays(r.arrivee,r.depart);});
  var avgDur=durs.length?Math.round(durs.reduce(function(s,v){return s+v;},0)/durs.length):0;
  var prods=fd.filter(function(r){return r.arrivee&&r.tests;}).map(function(r){return diffDays(r.arrivee,r.tests);});
  var avgProd=prods.length?Math.round(prods.reduce(function(s,v){return s+v;},0)/prods.length):0;

  var byMonth=Array(12).fill(0);fd.forEach(function(r){if(r.depart)byMonth[new Date(r.depart).getMonth()]++;});
  var maxBar=Math.max.apply(null,byMonth.concat([1]));

  var statusEntries=[["SHIPPED",shipped.length],["En cours",inProd.length],["NOT ORDERED",notOrd.length]].filter(function(e){return e[1]>0;});
  var gammeCounts={};fd.forEach(function(r){gammeCounts[r.gamme]=(gammeCounts[r.gamme]||0)+1;});

  function ChipFilter({label,options,selected,onChange}){
    return(<div style={{display:"flex",flexWrap:"wrap",gap:4,alignItems:"center"}}>
      <span style={{fontSize:10,color:"#94a3b8",fontWeight:700,marginRight:2}}>{label}</span>
      {options.map(function(o){
        var isTous=o==="Tous"||o==="Toutes";
        var active=isTous?selected.has(o):!selected.has(options[0])&&selected.has(o);
        return <button key={o} onClick={function(){
          if(isTous){onChange(new Set([o]));}
          else{var s=new Set(selected);s.delete(options[0]);active?s.delete(o):s.add(o);if(s.size===0)s.add(options[0]);onChange(s);}
        }} style={{padding:"2px 8px",borderRadius:10,border:"1.5px solid "+(active?"#2563eb":"#e2e8f0"),background:active?"#eff6ff":"#fff",color:active?"#1e40af":"#94a3b8",fontSize:10,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap"}}>{o}</button>;
      })}
    </div>);
  }

  var SECTIONS=[["kpi","📊 KPIs"],["drift","📉 Init vs Révisée"],["agenda","📅 Agenda"],["machines","🖥 Machines"],["avancement","🔧 Avancement"]];

  return(<div style={{display:"flex",flexDirection:"column",gap:12}}>

    {/* Header */}
    <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
      <button onClick={onRefresh} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 16px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#2563eb,#7c3aed)",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer"}}>🔄 MAJ Google Sheet</button>
      {lastRefresh&&<span style={{fontSize:11,color:"#94a3b8"}}>MAJ : {lastRefresh}</span>}
    </div>

    {/* FILTERS */}
    <div style={{background:"#fff",borderRadius:10,padding:"12px 14px",boxShadow:"0 2px 6px rgba(0,0,0,.06)"}}>
      <div style={{fontWeight:700,color:"#1e293b",fontSize:12,marginBottom:10}}>🎯 Filtres combinés</div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        <ChipFilter label="Mois" options={moisOptions} selected={fMois} onChange={setFMois}/>
        <ChipFilter label="Gamme" options={gammeOptions} selected={fGamme} onChange={setFGamme}/>
        <ChipFilter label="Statut" options={etatOptions} selected={fEtat} onChange={setFEtat}/>
      </div>
      <div style={{marginTop:8,fontSize:11,color:"#94a3b8"}}>{fd.length} unité{fd.length>1?"s":""} sélectionnée{fd.length>1?"s":""}</div>
    </div>

    {/* SECTION TABS */}
    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
      {SECTIONS.map(function(s){return <button key={s[0]} onClick={function(){setActiveSection(s[0]);}} style={{padding:"6px 14px",borderRadius:7,border:"none",background:activeSection===s[0]?"#2563eb":"#f1f5f9",color:activeSection===s[0]?"#fff":"#475569",fontWeight:activeSection===s[0]?700:400,fontSize:12,cursor:"pointer"}}>{s[1]}</button>;})}
    </div>

    {/* ── KPI ── */}
    {activeSection==="kpi"&&(<div style={{display:"flex",flexDirection:"column",gap:12}}>
      {/* Status bar */}
      {fd.length>0&&(<div style={{background:"#fff",borderRadius:10,padding:"12px 16px",boxShadow:"0 2px 6px rgba(0,0,0,.06)"}}>
        <div style={{fontWeight:700,color:"#1e293b",fontSize:13,marginBottom:8}}>Répartition des statuts</div>
        <div style={{display:"flex",height:24,borderRadius:8,overflow:"hidden",marginBottom:10}}>
          {[["SHIPPED",shipped.length,"#34d399"],["En cours",inProd.length,"#a78bfa"],["NOT ORDERED",notOrd.length,"#cbd5e1"]].filter(function(e){return e[1]>0;}).map(function(e){return <div key={e[0]} title={e[0]+": "+e[1]} style={{flex:e[1],background:e[2],display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:9,fontWeight:700,color:"#fff"}}>{e[1]>2?e[1]:""}</span></div>;})}
        </div>
        <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
          {[["Expédiées",shipped,"#34d399"],["En production",inProd,"#a78bfa"],["Non commandées",notOrd,"#94a3b8"]].map(function(g){return g[1].length>0&&(<div key={g[0]}><span style={{fontSize:11,fontWeight:700,color:g[2]}}>{g[0]} ({g[1].length})</span><div style={{display:"flex",flexWrap:"wrap",gap:2,marginTop:2}}>{g[1].map(function(r){return <span key={r.pj} style={{background:"#f8fafc",border:"1px solid #e2e8f0",color:"#1e40af",borderRadius:4,padding:"0 4px",fontSize:9,fontWeight:600}}>{r.pj} {getCountry(r.pj).flag}</span>;})}</div></div>);})}
        </div>
      </div>)}

      {/* Big KPI grid */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:10}}>
        <KpiTile value={fd.length} label="Unités sélectionnées" sub="dans le périmètre filtré" color="#2563eb" pjs={fd} progress={progress}/>
        <KpiTile value={shipped.length} label="Expédiées" sub={"Unités livrées au client"} color="#059669" pjs={shipped} progress={progress}/>
        <KpiTile value={inProd.length} label="En production / fab." sub="Unités actives en atelier" color="#d97706" pjs={inProd} progress={progress}/>
        <KpiTile value={notOrd.length} label="Non commandées" sub="Commande non encore reçue" color="#64748b" pjs={notOrd} progress={progress}/>
        <KpiTile value={drifted.length} label="En retard (départ)" sub={"Δ départ > 0j vs initial"} color="#dc2626" pjs={drifted} progress={progress}/>
        <KpiTile value={advance.length} label="En avance (départ)" sub="Δ départ < 0j vs initial" color="#059669" pjs={advance} progress={progress}/>
        <KpiTile value={Math.round((onTimeList.length/Math.max(fd.length,1))*100)+"%"} label="À l'heure" sub={onTimeList.length+" unités sans dérive"} color="#0891b2" pjs={onTimeList} progress={progress}/>
        <KpiTile value={avgDep+"j"} label="Δ retard moyen" sub={"Sur "+drifted.length+" PJ en retard"} color="#ef4444" pjs={drifted} progress={progress}/>
        <KpiTile value={avgDur+"j"} label="Durée totale moy." sub="Arrivée → Départ" color="#7c3aed" pjs={fd.filter(function(r){return r.arrivee&&r.depart;})} progress={progress}/>
        <KpiTile value={avgProd+"j"} label="Durée prod. moy." sub="Arrivée → Début tests" color="#0891b2" pjs={fd.filter(function(r){return r.arrivee&&r.tests;})} progress={progress}/>
        <KpiTile value={upcoming.length} label="Départs dans 30j" sub="Unités à expédier prochainement" color="#f59e0b" pjs={upcoming} progress={progress}/>
        <KpiTile value={fd.filter(function(r){return r.depart&&new Date(r.depart).getMonth()===today.getMonth();}).length} label="Départs ce mois" sub={MONTHS_FULL[today.getMonth()]+" 2026"} color="#3b82f6" pjs={fd.filter(function(r){return r.depart&&new Date(r.depart).getMonth()===today.getMonth();})} progress={progress}/>
      </div>

      {/* Gamme breakdown */}
      <div style={{background:"#fff",borderRadius:10,padding:"12px 16px",boxShadow:"0 2px 6px rgba(0,0,0,.06)"}}>
        <div style={{fontWeight:700,color:"#1e293b",fontSize:13,marginBottom:10}}>Répartition par gamme</div>
        {Object.entries(gammeCounts).sort(function(a,b){return b[1]-a[1];}).map(function(e){
          var col=GAMME_COLORS[e[0]]||"#64748b";
          var pjs=fd.filter(function(r){return r.gamme===e[0];});
          return(<div key={e[0]} style={{marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
              <span style={{width:80,fontSize:11,fontWeight:700,color:col,flexShrink:0}}>{e[0]}</span>
              <div style={{flex:1,background:"#f1f5f9",borderRadius:4,height:16,overflow:"hidden",position:"relative"}}>
                <div style={{width:((e[1]/Math.max(fd.length,1))*100)+"%",height:"100%",background:col,borderRadius:4}}/>
                <span style={{position:"absolute",left:4,top:2,fontSize:9,fontWeight:700,color:"#fff"}}>{e[1]} unité{e[1]>1?"s":""}</span>
              </div>
            </div>
            <div style={{paddingLeft:88,display:"flex",flexWrap:"wrap",gap:2}}>
              {pjs.map(function(r){return <span key={r.pj} style={{background:col+"18",color:col,borderRadius:3,padding:"0 4px",fontSize:9,fontWeight:600,border:"1px solid "+col+"40"}}>{r.pj} {r.dD>0?"⚠️":""}</span>;})}</div>
          </div>);
        })}
      </div>
    </div>)}

    {/* ── INIT vs RÉVISÉE ── */}
    {activeSection==="drift"&&(<div style={{background:"#fff",borderRadius:10,padding:"14px 16px",boxShadow:"0 2px 6px rgba(0,0,0,.06)"}}>
      <div style={{fontWeight:700,color:"#1e293b",fontSize:13,marginBottom:10}}>📉 Comparaison Initiale vs Révisée</div>
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {[["depart","Départ"],["tests","Tests"],["finProd","Fin prod"],["arrivee","Arrivée"]].map(function(m){return <button key={m[0]} onClick={function(){setDriftMetric(m[0]);}} style={{padding:"4px 12px",borderRadius:7,border:"none",background:driftMetric===m[0]?"#2563eb":"#f1f5f9",color:driftMetric===m[0]?"#fff":"#475569",fontWeight:driftMetric===m[0]?700:400,fontSize:12,cursor:"pointer"}}>{m[1]}</button>;})}
      </div>
      <DriftChart data={fd} metric={driftMetric} label={driftMetric}/>
    </div>)}

    {/* ── AGENDA ── */}
    {activeSection==="agenda"&&(<div style={{display:"flex",flexDirection:"column",gap:10}}>
      {/* Histogram */}
      <div style={{background:"#fff",borderRadius:10,padding:"14px 16px",boxShadow:"0 2px 6px rgba(0,0,0,.06)"}}>
        <div style={{fontWeight:700,color:"#1e293b",fontSize:13,marginBottom:10}}>Départs par mois — {fd.length} unité{fd.length>1?"s":""}</div>
        <div style={{display:"flex",gap:3,alignItems:"flex-end",height:80,marginBottom:4}}>
          {byMonth.map(function(n,i){var isCur=i===today.getMonth();return(<div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:1}}>
            <div style={{fontSize:10,fontWeight:700,color:"#64748b"}}>{n||""}</div>
            <div style={{width:"100%",height:n?((n/maxBar)*70)+"%":"0%",minHeight:n?4:0,background:i<today.getMonth()?"#cbd5e1":isCur?"#2563eb":"#93c5fd",borderRadius:"2px 2px 0 0"}}/>
            <div style={{fontSize:8,color:isCur?"#2563eb":"#94a3b8",fontWeight:isCur?700:400}}>{MONTHS[i]}</div>
          </div>);})}
        </div>
      </div>
      {/* Month cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:8}}>
        {MONTHS.map(function(m,i){
          var pjs=fd.filter(function(r){return r.depart&&new Date(r.depart).getMonth()===i;}).sort(function(a,b){return new Date(a.depart)-new Date(b.depart);});
          if(!pjs.length)return null;
          var isCur=i===today.getMonth();
          return(<div key={m} style={{background:"#fff",borderRadius:8,border:"1.5px solid "+(isCur?"#2563eb":"#e2e8f0"),boxShadow:isCur?"0 0 0 3px #dbeafe":"0 1px 3px rgba(0,0,0,.06)"}}>
            <div style={{padding:"8px 12px",background:isCur?"#eff6ff":"#f8fafc",borderBottom:"1px solid #e2e8f0",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontWeight:700,color:isCur?"#2563eb":"#475569",fontSize:12}}>{MONTHS_FULL[i]}</span>
              <span style={{background:isCur?"#2563eb":"#e2e8f0",color:isCur?"#fff":"#64748b",borderRadius:10,padding:"1px 8px",fontSize:10,fontWeight:700}}>{pjs.length} départ{pjs.length>1?"s":""}</span>
            </div>
            <div style={{padding:"8px 12px",display:"flex",flexDirection:"column",gap:4}}>
              {pjs.map(function(r){
                var dl=r.depart?diffDays(todayStr,r.depart):null;
                var dur=r.arrivee&&r.tests?diffDays(r.arrivee,r.tests):null;
                return(<div key={r.pj} style={{background:r.dD>0?"#fff7ed":r.etat==="SHIPPED"?"#f0fdf4":"#f8fafc",borderRadius:5,padding:"5px 8px",border:"1px solid "+(r.dD>0?"#fed7aa":r.etat==="SHIPPED"?"#bbf7d0":"#f1f5f9")}}>
                  <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:2}}>
                    <span style={{fontWeight:700,color:"#1e40af",fontSize:11}}>{r.pj}</span>
                    <span style={{fontSize:9,color:"#94a3b8"}}>{r.gamme}</span>
                    <span style={{fontSize:10}}>{getCountry(r.pj).flag}</span>
                    {r.dD>0&&<span style={{marginLeft:"auto",fontSize:9,fontWeight:700,color:"#dc2626",background:"#fef2f2",borderRadius:3,padding:"0 4px"}}>+{r.dD}j</span>}
                    {r.dD<0&&<span style={{marginLeft:"auto",fontSize:9,fontWeight:700,color:"#059669",background:"#f0fdf4",borderRadius:3,padding:"0 4px"}}>{r.dD}j</span>}
                  </div>
                  <div style={{display:"flex",gap:8,fontSize:9,color:"#94a3b8"}}>
                    <span>Dép: <b style={{color:"#475569"}}>{fmt(r.depart)}</b></span>
                    {dur&&<span>Prod: <b style={{color:"#475569"}}>{dur}j</b></span>}
                    {dl!==null&&dl>=0&&<span style={{color:dl<=7?"#ef4444":dl<=14?"#d97706":"#64748b",fontWeight:700}}>J-{dl}</span>}
                    {r.etat==="SHIPPED"&&<span style={{color:"#059669",fontWeight:700}}>✓ Expédié</span>}
                  </div>
                </div>);
              })}
            </div>
          </div>);
        })}
      </div>
    </div>)}

    {/* ── MACHINES ── */}
    {activeSection==="machines"&&(<div style={{display:"flex",flexDirection:"column",gap:6}}>
      <div style={{fontSize:11,color:"#94a3b8"}}>{fd.length} unité{fd.length>1?"s":""} · filtres actifs</div>
      {fd.map(function(r){
        var pval=progress[r.pj]!==undefined?progress[r.pj]:null;
        var dl=r.depart?diffDays(todayStr,r.depart):null;
        var col=GAMME_COLORS[r.gamme]||"#64748b";
        var ctr=getCountry(r.pj);
        var dur=r.arrivee&&r.tests?diffDays(r.arrivee,r.tests):null;
        return(<div key={r.pj} style={{background:"#fff",borderRadius:8,padding:"10px 14px",border:"1.5px solid "+(r.dD>0?"#fca5a5":r.etat==="SHIPPED"?"#bbf7d0":"#e2e8f0"),boxShadow:"0 1px 3px rgba(0,0,0,.05)"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:6}}>
            <span style={{fontWeight:800,color:col,fontSize:14,minWidth:100}}>{r.pj}</span>
            <span style={{fontSize:10,background:col+"18",color:col,borderRadius:4,padding:"1px 6px",fontWeight:700,border:"1px solid "+col+"30"}}>{r.gamme}</span>
            <Badge etat={r.etat}/>
            <span style={{fontSize:11}}>{ctr.flag} {ctr.country}</span>
            {r.dD>0&&<span style={{background:"#fef2f2",color:"#dc2626",borderRadius:4,padding:"1px 6px",fontSize:10,fontWeight:700,border:"1px solid #fca5a5"}}>Retard +{r.dD}j</span>}
            {r.dD<0&&<span style={{background:"#f0fdf4",color:"#059669",borderRadius:4,padding:"1px 6px",fontSize:10,fontWeight:700,border:"1px solid #bbf7d0"}}>Avance {r.dD}j</span>}
            {dl!==null&&dl>=0&&dl<=30&&<span style={{background:"#fffbeb",color:dl<=7?"#dc2626":"#d97706",borderRadius:4,padding:"1px 6px",fontSize:10,fontWeight:700,border:"1px solid #fcd34d",marginLeft:"auto"}}>J-{dl}</span>}
            {r.etat==="SHIPPED"&&<span style={{color:"#059669",fontSize:11,fontWeight:700,marginLeft:"auto"}}>✓ Expédié</span>}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:6,marginBottom:6}}>
            {[["Arrivée",r.arrivee],["Tests",r.tests],["Fin prod",r.finProd],["Départ",r.depart],["Durée prod",dur?dur+"j":"—"]].map(function(it){return(<div key={it[0]} style={{background:"#f8fafc",borderRadius:5,padding:"4px 6px",textAlign:"center"}}><div style={{fontSize:9,color:"#94a3b8"}}>{it[0]}</div><div style={{fontSize:11,fontWeight:700,color:"#1e293b"}}>{typeof it[1]==="string"?it[1]:fmt(it[1])}</div></div>);})}
          </div>
          {pval!==null&&(<div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:10,color:"#64748b",minWidth:80}}>Avancement</span>
            <div style={{flex:1,background:"#e2e8f0",borderRadius:6,height:8}}><div style={{width:pval+"%",height:"100%",background:pval>=100?"#059669":pval>=50?"#2563eb":"#f59e0b",borderRadius:6}}/></div>
            <span style={{fontSize:11,fontWeight:700,color:pval>=100?"#059669":pval>=50?"#1e40af":"#d97706"}}>{pval}%</span>
          </div>)}
        </div>);
      })}
    </div>)}

    {/* ── AVANCEMENT ── */}
    {activeSection==="avancement"&&(<div style={{background:"#fff",borderRadius:10,padding:"14px 16px",boxShadow:"0 2px 6px rgba(0,0,0,.06)"}}>
      <div style={{fontWeight:700,color:"#1e293b",fontSize:13,marginBottom:4}}>🔧 Avancement production</div>
      <div style={{fontSize:11,color:"#94a3b8",marginBottom:12}}>Cliquer sur la barre ou saisir le % manuellement. Affiché sur le Gantt et la liste publique.</div>
      {fd.filter(function(r){return r.arrivee&&r.tests;}).map(function(r){
        var pval=progress[r.pj]!==undefined?progress[r.pj]:0;
        var done=r.etat==="SHIPPED";
        var dur=diffDays(r.arrivee,r.tests);
        return(<div key={r.pj} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:done?"#f0fdf4":"#f8fafc",borderRadius:6,marginBottom:4,border:"1px solid "+(done?"#bbf7d0":"#e2e8f0")}}>
          <span style={{fontWeight:700,color:"#1e40af",fontSize:12,minWidth:110,flexShrink:0}}>{r.pj}</span>
          <span style={{color:"#94a3b8",fontSize:10,minWidth:55,flexShrink:0}}>{r.gamme}</span>
          <span style={{fontSize:9,color:"#64748b",flexShrink:0,minWidth:30}}>{dur}j</span>
          <div style={{flex:1,background:"#e2e8f0",borderRadius:10,height:10,overflow:"hidden",cursor:"pointer"}} onClick={function(e){var rect=e.currentTarget.getBoundingClientRect();var nv=Math.round(((e.clientX-rect.left)/rect.width)*100);nv=Math.max(0,Math.min(100,nv));var np=Object.assign({},progress);np[r.pj]=nv;setProgress(np);}}>
            <div style={{width:pval+"%",height:"100%",background:pval>=100?"#059669":pval>=50?"#2563eb":"#f59e0b",borderRadius:10}}/>
          </div>
          <input type="number" min={0} max={100} value={pval} onChange={function(e){var v=Math.max(0,Math.min(100,parseInt(e.target.value)||0));var np=Object.assign({},progress);np[r.pj]=v;setProgress(np);}} style={{width:46,padding:"2px 4px",borderRadius:5,border:"1px solid #cbd5e1",fontSize:12,fontWeight:700,textAlign:"center",color:pval>=100?"#059669":pval>=50?"#1e40af":"#92400e"}}/>
          <span style={{fontSize:11,color:"#64748b"}}>%</span>
        </div>);
      })}
    </div>)}

  </div>);
}

// ── MAIN ─────────────────────────────────────────────────────────
export default function App(){
  var [rawData,setRawData]=useState(SOURCE_DATA);
  var [view,setView]=useState("table");
  var [search,setSearch]=useState("");
  var [selEtats,setSelEtats]=useState(new Set(ALL_ETATS));
  var [selGammes,setSelGammes]=useState(new Set(ALL_GAMMES));
  var [selMois,setSelMois]=useState(new Set(["Tous"]));
  var [showFilters,setShowFilters]=useState(true);
  var [pinUnlocked,setPinUnlocked]=useState(false);
  var [progress,setProgress]=useState({});
  var [lastRefresh,setLastRefresh]=useState(null);
  var handleRefresh=useCallback(function(){setLastRefresh(new Date().toLocaleTimeString("fr-FR"));},[]);

  var filtered=useMemo(function(){return rawData.filter(function(r){var q=search.toLowerCase();if(q&&r.pj.toLowerCase().indexOf(q)<0&&r.gamme.toLowerCase().indexOf(q)<0)return false;if(!selEtats.has(r.etat))return false;if(!selGammes.has(r.gamme))return false;if(!selMois.has("Tous")){var mArr=[];selMois.forEach(function(m){mArr.push(MONTHS.indexOf(m));});var dep=r.depart?new Date(r.depart).getMonth():-1;if(mArr.indexOf(dep)<0)return false;}return true;});},[rawData,search,selEtats,selGammes,selMois]);

  var VIEWS=[{id:"table",label:"📋 Liste"},{id:"gantt",label:"📊 Gantt"},{id:"calendar",label:"📅 Calendrier"},{id:"map",label:"🌍 Carte"},{id:"manager",label:"🔒 Manager"}];

  return(<div style={{fontFamily:"system-ui,sans-serif",fontSize:13,background:"#f8fafc",minHeight:"100vh",padding:16}}>
    <div style={{background:"linear-gradient(135deg,#1e3a5f,#2563eb)",borderRadius:10,padding:"14px 20px",marginBottom:14,color:"#fff",display:"flex",alignItems:"center",gap:14}}>
      <img src={LOGO_B64} alt="ENOGIA" style={{height:44,objectFit:"contain",background:"white",borderRadius:6,padding:"4px 8px"}}/>
      <div style={{borderLeft:"1px solid rgba(255,255,255,.3)",paddingLeft:14}}>
        <div style={{fontWeight:700,fontSize:16}}>Planning Ordonnancement 2026</div>
        <div style={{opacity:.75,fontSize:11,marginTop:2}}>{rawData.length} unités · 08/06/2026</div>
      </div>
    </div>
    <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
      {VIEWS.map(function(v){return <button key={v.id} onClick={function(){setView(v.id);}} style={{padding:"5px 14px",borderRadius:6,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:view===v.id?(v.id==="manager"?"#7c3aed":"#2563eb"):"#e2e8f0",color:view===v.id?"#fff":"#475569"}}>{v.label}</button>;})}
    </div>
    {view==="manager"?(pinUnlocked?(<div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div style={{fontWeight:700,color:"#7c3aed",fontSize:14}}>🔓 Espace Manager</div><button onClick={function(){setPinUnlocked(false);}} style={{padding:"4px 10px",borderRadius:6,border:"1px solid #e2e8f0",background:"#fff",fontSize:11,cursor:"pointer",color:"#64748b"}}>Verrouiller</button></div><ManagerPanel data={rawData} progress={progress} setProgress={setProgress} onRefresh={handleRefresh} lastRefresh={lastRefresh}/></div>):<PinGate onUnlock={function(){setPinUnlocked(true);}}/>):(
      <div>
        <div style={{background:"#fff",borderRadius:8,padding:"10px 12px",marginBottom:12,boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:showFilters?10:0}}>
            <div style={{display:"flex",alignItems:"center",gap:10}}><input value={search} onChange={function(e){setSearch(e.target.value);}} placeholder="🔍 N° PJ ou gamme..." style={{padding:"5px 10px",borderRadius:6,border:"1px solid #cbd5e1",fontSize:12,width:160}}/><span style={{color:"#94a3b8",fontSize:11}}>{filtered.length} résultat(s)</span></div>
            <button onClick={function(){setShowFilters(function(f){return !f;});}} style={{padding:"3px 10px",borderRadius:6,border:"1px solid #e2e8f0",background:"#f8fafc",fontSize:11,cursor:"pointer",color:"#64748b"}}>{showFilters?"▲ Masquer":"▼ Filtres"}</button>
          </div>
          {showFilters&&(<div style={{display:"flex",flexDirection:"column",gap:10,paddingTop:8,borderTop:"1px solid #f1f5f9"}}>
            <MultiFilter label="État" options={ALL_ETATS} selected={selEtats} onChange={setSelEtats} colorMap={ETAT_META}/>
            <MultiFilter label="Gamme" options={ALL_GAMMES} selected={selGammes} onChange={setSelGammes}/>
            <div style={{display:"flex",flexWrap:"wrap",gap:5,alignItems:"center"}}><span style={{fontSize:11,color:"#94a3b8",fontWeight:600,marginRight:2}}>Mois</span>{["Tous"].concat(MONTHS).map(function(m){var isTous=m==="Tous",active=isTous?selMois.has("Tous"):!selMois.has("Tous")&&selMois.has(m);return <button key={m} onClick={function(){if(isTous){setSelMois(new Set(["Tous"]));}else{var s=new Set(selMois);s.delete("Tous");active?s.delete(m):s.add(m);if(s.size===0)s.add("Tous");setSelMois(s);}}} style={{padding:"3px 8px",borderRadius:12,border:"1.5px solid "+(active?"#2563eb":"#e2e8f0"),background:active?"#eff6ff":"#fff",color:active?"#1e40af":"#94a3b8",fontSize:11,fontWeight:600,cursor:"pointer"}}>{m}</button>;})}
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              <button onClick={function(){setSelEtats(new Set(ALL_ETATS));setSelGammes(new Set(ALL_GAMMES));setSelMois(new Set(["Tous"]));setSearch("");}} style={{padding:"3px 10px",borderRadius:6,border:"1px solid #e2e8f0",background:"#fff",fontSize:11,cursor:"pointer",color:"#ef4444"}}>✕ Reset</button>
              <button onClick={function(){setSelEtats(new Set(ALL_ETATS.filter(function(e){return e!=="SHIPPED"&&e!=="READY";})));}} style={{padding:"3px 10px",borderRadius:6,border:"1px solid #e2e8f0",background:"#fff",fontSize:11,cursor:"pointer",color:"#475569"}}>Masquer SHIPPED/READY</button>
              <button onClick={function(){setSelEtats(new Set(["PROD","En fabrication"]));}} style={{padding:"3px 10px",borderRadius:6,border:"1px solid #e2e8f0",background:"#fff",fontSize:11,cursor:"pointer",color:"#475569"}}>En cours seulement</button>
            </div>
          </div>)}
        </div>
        {view==="table"    && <TableView    data={filtered} progress={progress}/>}
        {view==="gantt"    && <GanttView    data={filtered} progress={progress}/>}
        {view==="calendar" && <CalendarView data={filtered}/>}
        {view==="map"      && <WorldMapView data={filtered}/>}
      </div>
    )}
  </div>);
}
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { db } from "./firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

function useSheetJS(){
  const [ready,setReady]=useState(!!window.XLSX);
  useEffect(()=>{
    if(window.XLSX){setReady(true);return;}
    const s=document.createElement("script");
    s.src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    s.onload=()=>setReady(true);
    document.head.appendChild(s);
  },[]);
  return ready;
}

const LOGO_B64 = "data:image/png;base64,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";

// ── DESIGN TOKENS ──────────────────────────────────────────────
// Palette ancrée sur le dégradé du logo ENOGIA (navy → teal)
const T = {
  navy900:"#0c2436", navy800:"#123247", navy700:"#1a4a66", navy600:"#225f82",
  teal600:"#0a7f97", teal500:"#0d9bb5", teal400:"#2bb8cf", teal100:"#e3f5f8",
  surface:"#f6f8f9", surfaceAlt:"#eef2f4", card:"#ffffff",
  ink900:"#13202b", ink700:"#3d505c", ink500:"#647784", ink300:"#a3b3bb", ink100:"#dde5e8",
  line:"#e4eaec",
  amber600:"#b45309", amber500:"#d97706", amber100:"#fef3e2",
  emerald600:"#047857", emerald500:"#059669", emerald100:"#e3f7ee",
  violet600:"#6d28d9", violet500:"#7c3aed", violet100:"#f0ebfd",
  red600:"#b91c1c", red500:"#dc2626", red100:"#fde8e8",
  shadowSm:"0 1px 2px rgba(15,40,60,.06), 0 1px 1px rgba(15,40,60,.04)",
  shadowMd:"0 4px 14px rgba(15,40,60,.08), 0 1px 3px rgba(15,40,60,.06)",
  shadowLg:"0 12px 32px rgba(15,40,60,.12), 0 2px 6px rgba(15,40,60,.06)",
  font:"'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  fontDisplay:"'Space Grotesk','Inter',-apple-system,sans-serif",
};

const PJ_META={
  "PJ376":{nomProjet:"GAEC - ADELINE",pays:"France",chefProjet:"Clément Martouzet"},
  "PJ382-40":{nomProjet:"SHEFFIELD",pays:"UK",chefProjet:"Gabriel VINCENT"},
  "PJ382-180":{nomProjet:"SHEFFIELD",pays:"UK",chefProjet:"Gabriel VINCENT"},
  "PJ420":{nomProjet:"ST GOBAIN",pays:"France",chefProjet:"Clément Martouzet"},
  "PJ430":{nomProjet:"AATF - PYROGENESYS",pays:"Nigeria",chefProjet:"Gabriel VINCENT"},
  "PJ446-1":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément Martouzet"},
  "PJ446-2":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément Martouzet"},
  "PJ446-3":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément Martouzet"},
  "PJ446-4":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément Martouzet"},
  "PJ446-5":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément Martouzet"},
  "PJ446-6":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément Martouzet"},
  "PJ446-7":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément Martouzet"},
  "PJ446-8":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément Martouzet"},
  "PJ446-9":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément Martouzet"},
  "PJ446-10":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément Martouzet"},
  "PJ446-11":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément Martouzet"},
  "PJ446-12":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément Martouzet"},
  "PJ449":{nomProjet:"ADUNA - KELSEN",pays:"Espagne",chefProjet:"Emmy BOURELLY"},
  "PJ453":{nomProjet:"INEOS",pays:"France",chefProjet:"Clément Bablon"},
  "PJ456":{nomProjet:"ADDFIELD",pays:"UK",chefProjet:"Emmy BOURELLY"},
  "PJ461-1":{nomProjet:"CHEM SOLV",pays:"Singapore",chefProjet:"Gabriel VINCENT"},
  "PJ461-2":{nomProjet:"CHEM SOLV",pays:"Singapore",chefProjet:"Gabriel VINCENT"},
  "PJ461-3":{nomProjet:"CHEM SOLV",pays:"Singapore",chefProjet:"Gabriel VINCENT"},
  "PJ461-4":{nomProjet:"CHEM SOLV",pays:"Singapore",chefProjet:"Gabriel VINCENT"},
  "PJ461-5":{nomProjet:"CHEM SOLV",pays:"Singapore",chefProjet:"Gabriel VINCENT"},
  "PJ462-1":{nomProjet:"ULMATEC OCV",pays:"Norvège",chefProjet:"Gabriel VINCENT"},
  "PJ472":{nomProjet:"HANNES",pays:"Islande",chefProjet:"Emmy BOURELLY"},
  "PJ473":{nomProjet:"RIMS",pays:"Corée",chefProjet:"Clément Martouzet"},
  "PJ476":{nomProjet:"KBS-WP1 (études)",pays:"UK",chefProjet:"Clément Bablon"},
  "PJ479-1":{nomProjet:"EDF PEI",pays:"FR-La Réunion",chefProjet:"Clément Martouzet"},
  "PJ479-2":{nomProjet:"EDF PEI",pays:"FR-La Réunion",chefProjet:"Clément Martouzet"},
  "PJ485":{nomProjet:"BIOSORRA",pays:"Kenya",chefProjet:"Clément Martouzet"},
  "PJ486":{nomProjet:"ALBRET",pays:"France",chefProjet:"Emmy BOURELLY"},
};
function getPjMeta(pj){
  if(PJ_META[pj])return PJ_META[pj];
  const prefix=pj.split("-")[0];
  const fallbackKey=Object.keys(PJ_META).find(k=>k.split("-")[0]===prefix);
  return fallbackKey?PJ_META[fallbackKey]:{nomProjet:"—",pays:"—",chefProjet:"—"};
}

const GAMME_COLORS={"180LTV3":T.teal500,"100LTV3":T.violet500,"40LTV3":T.emerald500,"180MT":T.red500,"100MT":"#c2761a","20LTV3":"#0e8fa8","10LTV3":"#6b9b1f","40LTV2R":T.amber500,"100LTV2R":"#9333ea","CONTENEUR":T.ink500};
const ETAT_META={
  "SHIPPED":{bg:T.emerald100,text:T.emerald600,border:"#8fdcb8",bar:T.emerald500,label:"Expédiée"},
  "PROD":{bg:T.amber100,text:T.amber600,border:"#f3c388",bar:T.amber500,label:"Production ENOGIA"},
  "En fabrication":{bg:T.violet100,text:T.violet600,border:"#cab4f5",bar:T.violet500,label:"Fabrication FNR"},
  "NOT ORDERED":{bg:T.surfaceAlt,text:T.ink500,border:T.ink100,bar:T.ink300,label:"Non commandée"}
};
const ALL_ETATS=Object.keys(ETAT_META);
const ALL_GAMMES=Object.keys(GAMME_COLORS);
const MONTHS=["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"];
const MONTHS_FULL=["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const today=new Date();

function parseDateAny(s){
  if(!s)return null;
  s=String(s).trim();if(!s)return null;
  const mFR={"janvier":0,"février":1,"fevrier":1,"mars":2,"avril":3,"mai":4,"juin":5,"juillet":6,"août":7,"aout":7,"septembre":8,"octobre":9,"novembre":10,"décembre":11,"decembre":11};
  let m=s.match(/(\d+)\s+([A-Za-zÀ-ÿ]+)\s+(\d{4})/i);
  if(m){const mo=mFR[m[2].toLowerCase()];if(mo!==undefined)return new Date(+m[3],mo,+m[1]);}
  m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if(m)return new Date(+m[3],+m[2]-1,+m[1]);
  const d=new Date(s);return isNaN(d)?null:d;
}
function fmt(d){if(!d)return"—";return String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0");}
function toLocalISO(d){if(!d)return null;return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function diffDays(a,b){if(!a||!b)return null;return Math.round((b-a)/86400000);}
function fmtMode(d,mode){
  if(!d)return"—";
  if(mode==="semaine"){const j=new Date(d.getFullYear(),0,1);const w=Math.ceil(((d-j)/86400000+j.getDay()+1)/7);return"S"+String(w).padStart(2,"0");}
  if(mode==="mois")return MONTHS[d.getMonth()];
  return fmt(d);
}
function guessGamme(pj){
  const n=pj.toUpperCase();
  if(n.includes("CONT"))return"CONTENEUR";
  if(n.match(/461|449|180MT/))return"180MT";
  if(n.includes("485")||n.includes("100MT"))return"100MT";
  if(n.includes("420"))return"100LTV2R";
  if(n.match(/456|472|460|100LT/))return"100LTV3";
  if(n.includes("SAV")||n.includes("40LTV2"))return"40LTV2R";
  if(n.includes("382-40")||n.includes("40LT"))return"40LTV3";
  if(n.includes("473")||n.includes("20LT"))return"20LTV3";
  if(n.includes("486")||n.includes("10LT"))return"10LTV3";
  return"180LTV3";
}

function parseMSProjectRows(rows){
  if(!rows||rows.length<2)return null;
  const header=rows[0].map(h=>(h||"").toString().toLowerCase().trim());
  const iNom=header.findIndex(h=>h.includes("nom")||h.includes("name"));
  const iDeb=header.findIndex(h=>h.includes("début")||h.includes("debut")||h.includes("start"));
  const iFin=header.findIndex(h=>h.includes("fin")||h.includes("finish")||h.includes("end"));
  const iNiv=header.findIndex(h=>h.includes("niveau")||h.includes("level")||h.includes("hiérar")||h.includes("hierar"));
  if(iNom<0||iDeb<0)return null;

  const STEP_MAP={"arrivée":"arrivee","arrivee":"arrivee","tests":"tests","fin de production":"finProd","départ":"depart","depart":"depart"};
  const out=[];let cur=null;

  for(let i=1;i<rows.length;i++){
    const row=rows[i];if(!row||row.length<2)continue;
    const nom=(row[iNom]||"").toString().trim();if(!nom)continue;
    const deb=parseDateAny(row[iDeb]);
    const fin=iFin>=0?parseDateAny(row[iFin]):null;
    const niv=iNiv>=0?parseInt(row[iNiv])||0:0;
    const nomL=nom.toLowerCase().trim();

    if(niv===1||(niv===0&&!STEP_MAP[nomL])){
      const pjM=nom.match(/PJ[\w-]+/i)||nom.match(/SAV\d+/i);
      const pjCode=pjM?pjM[0].toUpperCase():nom.split(/[-–]/)[0].trim();
      cur={pj:pjCode,nom:nom,gamme:guessGamme(pjCode),etat:"En fabrication",arrivee:null,tests:null,testsFin:null,finProd:null,depart:null};
      out.push(cur);
    } else if(cur&&STEP_MAP[nomL]){
      const k=STEP_MAP[nomL];
      cur[k]=deb;
      if(k==="tests")cur.testsFin=fin;
    }
  }
  out.forEach(p=>{
    if(p.depart){
      if(p.depart<today)p.etat="SHIPPED";
      else if(p.arrivee&&p.arrivee<=today)p.etat="PROD";
    }
  });
  const filtered=out.filter(p=>p.arrivee||p.depart);
  return filtered.map(p=>({
    pj:p.pj,gamme:p.gamme,etat:p.etat,
    arrivee:toLocalISO(p.arrivee),
    tests:toLocalISO(p.tests),
    testsFin:toLocalISO(p.testsFin),
    finProd:toLocalISO(p.finProd),
    depart:toLocalISO(p.depart),
  }));
}

function Badge({etat}){const c=ETAT_META[etat]||ETAT_META["NOT ORDERED"];return <span style={{background:c.bg,color:c.text,border:"1px solid "+c.border,borderRadius:6,padding:"3px 10px",fontSize:15,fontWeight:600,whiteSpace:"nowrap",letterSpacing:".01em"}}>{c.label||etat}</span>;}

function DropFilter({label,options,selected,onChange,getLabel}){
  const [open,setOpen]=useState(false);
  const all=options.every(o=>selected.has(o));
  const none=options.every(o=>!selected.has(o));
  const toggle=o=>{const s=new Set(selected);s.has(o)?s.delete(o):s.add(o);onChange(s);};
  const disp=o=>getLabel?getLabel(o):o;
  return(
    <div style={{position:"relative",display:"inline-block"}}>
      <button onClick={()=>setOpen(v=>!v)} style={{padding:"10px 17px",borderRadius:10,border:"1.5px solid "+(!all||open?T.teal500:T.line),background:!all?T.teal100:T.card,color:!all?T.teal600:T.ink700,fontSize:16,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap",fontFamily:T.font,transition:"border-color .15s"}}>
        {label}{!all?" ("+selected.size+")":""}<span style={{fontSize:12,color:T.ink500}}>{open?"▲":"▼"}</span>
      </button>
      {open&&<div style={{position:"fixed",background:T.card,borderRadius:12,boxShadow:T.shadowLg,border:"1px solid "+T.line,zIndex:9999,minWidth:210,maxHeight:320,display:"flex",flexDirection:"column",fontFamily:T.font}}>
        <div onClick={()=>onChange(all?new Set():new Set(options))} style={{display:"flex",alignItems:"center",gap:9,padding:"10px 14px",cursor:"pointer",borderBottom:"1px solid "+T.line,background:T.surface,flexShrink:0,borderRadius:"12px 12px 0 0"}}>
          <div style={{width:16,height:16,borderRadius:4,border:"1.5px solid "+(all?T.teal500:T.ink100),background:all?T.teal500:T.card,display:"flex",alignItems:"center",justifyContent:"center"}}>
            {all&&<span style={{color:"#fff",fontSize:13,fontWeight:700}}>✓</span>}
            {!all&&!none&&<span style={{color:T.teal600,fontSize:14,fontWeight:700}}>—</span>}
          </div>
          <span style={{fontSize:16,fontWeight:700,color:T.ink700}}>Tout sélectionner</span>
        </div>
        <div style={{overflowY:"auto",flex:1}}>
          {options.map(o=>{const a=selected.has(o);return(
            <div key={o} onClick={()=>toggle(o)} style={{display:"flex",alignItems:"center",gap:9,padding:"8px 14px",cursor:"pointer",background:a?T.teal100:T.card,borderBottom:"1px solid "+T.surface}}>
              <div style={{width:16,height:16,borderRadius:4,border:"1.5px solid "+(a?T.teal500:T.ink100),background:a?T.teal500:T.card,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{a&&<span style={{color:"#fff",fontSize:13,fontWeight:700}}>✓</span>}</div>
              <span style={{fontSize:16,color:T.ink700,fontWeight:a?600:400}}>{disp(o)}</span>
            </div>
          );})}
        </div>
        <div style={{padding:"8px 14px",borderTop:"1px solid "+T.line,display:"flex",justifyContent:"space-between",alignItems:"center",background:T.surface,flexShrink:0,borderRadius:"0 0 12px 12px"}}>
          <span style={{fontSize:14,color:T.ink500,fontWeight:500}}>{selected.size}/{options.length}</span>
          <button onClick={()=>setOpen(false)} style={{padding:"4px 14px",borderRadius:7,border:"none",background:T.teal500,color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer"}}>OK</button>
        </div>
      </div>}
    </div>
  );
}

const PHASES=[{k:"arrivee",l:"A",c:T.teal500,t:"Arrivée"},{k:"tests",l:"T",c:T.amber500,t:"Tests"},{k:"finProd",l:"F",c:T.emerald500,t:"Fin prod"},{k:"depart",l:"D",c:T.red500,t:"Départ"}];

function GanttView({data,progress,df}){
  const year=today.getFullYear();
  const yearStart=new Date(year,0,1);
  const yearEnd=new Date(year,11,31);
  const totalDays=Math.round((yearEnd-yearStart)/86400000)+1;
  const dayW=26; // px par jour — base du zoom
  const colW=200;
  const [tt,setTt]=useState(null);
  const scrollRef=React.useRef(null);
  const dayOf=d=>Math.round((d-yearStart)/86400000);
  const xOf=d=>dayOf(d)*dayW;

  // positionne le scroll sur "aujourd'hui" au premier rendu
  useEffect(()=>{
    if(scrollRef.current){
      const target=Math.max(0,xOf(today)-220);
      scrollRef.current.scrollLeft=target;
    }
  },[]);

  const scrollToDay=dIdx=>{
    if(scrollRef.current)scrollRef.current.scrollTo({left:Math.max(0,dIdx*dayW-220),behavior:"smooth"});
  };

  // graduations : un repère par début de semaine (lundi)
  const weekMarks=useMemo(()=>{
    const marks=[];
    let cur=new Date(yearStart);
    while(cur.getDay()!==1)cur=new Date(cur.getTime()+86400000);
    while(cur<=yearEnd){marks.push(new Date(cur));cur=new Date(cur.getTime()+7*86400000);}
    return marks;
  },[]);

  const bpct=(as,bs)=>{if(!as||!bs)return null;const a=new Date(as),b=new Date(bs);return{left:xOf(a),width:Math.max(xOf(b)-xOf(a),6)};};

  return(<div style={{background:T.card,borderRadius:16,overflow:"hidden",boxShadow:T.shadowMd,fontFamily:T.font}}>
    <div style={{display:"flex",gap:10,padding:"14px 18px",borderBottom:"1px solid "+T.line,alignItems:"center",flexWrap:"wrap",background:T.surface}}>
      <span style={{fontSize:16,fontWeight:700,color:T.navy800}}>Planning {year}</span>
      <span style={{fontSize:15,color:T.ink500}}>Faites glisser ou utilisez la molette pour défiler →</span>
      <button onClick={()=>scrollToDay(dayOf(today))} style={{marginLeft:"auto",padding:"6px 14px",borderRadius:9,border:"1px solid "+T.teal400,background:T.teal100,color:T.teal600,fontSize:15,fontWeight:700,cursor:"pointer"}}>📍 Aujourd'hui</button>
    </div>

    <div ref={scrollRef} style={{display:"flex",overflowX:"auto",position:"relative"}}>
      <div style={{width:colW,flexShrink:0,position:"sticky",left:0,zIndex:5,background:T.card,borderRight:"1px solid "+T.line,boxShadow:"2px 0 6px rgba(15,40,60,.04)"}}>
        <div style={{height:46,padding:"0 16px",display:"flex",alignItems:"center",fontSize:14,fontWeight:700,color:T.ink500,textTransform:"uppercase",letterSpacing:".04em",borderBottom:"1px solid "+T.line,background:T.surface}}>Projet</div>
        {data.map((r,ri)=>{
          const c=ETAT_META[r.etat]||ETAT_META["NOT ORDERED"];
          const pv=progress[r.pj];
          return(<div key={ri} style={{height:44,padding:"0 16px",display:"flex",alignItems:"center",gap:8,borderBottom:"1px solid "+T.surface}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:c.bar,flexShrink:0}}/>
            <span style={{fontSize:16,fontWeight:700,color:T.teal600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{r.pj}</span>
            {pv!=null&&<span style={{fontSize:13,fontWeight:700,color:pv>=100?T.emerald600:T.amber600,background:pv>=100?T.emerald100:T.amber100,padding:"2px 6px",borderRadius:5,flexShrink:0}}>{pv}%</span>}
          </div>);
        })}
      </div>

      <div style={{position:"relative",width:totalDays*dayW,flexShrink:0}}>
        {/* en-tête mois + semaines */}
        <div style={{height:46,position:"relative",borderBottom:"1px solid "+T.line,background:T.surface}}>
          {MONTHS_FULL.map((mn,mi)=>{const ms=new Date(year,mi,1);const me=new Date(year,mi+1,1);const w=(xOf(me)-xOf(ms));const isCur=mi===today.getMonth();
            return(<div key={mi} style={{position:"absolute",left:xOf(ms),width:w,top:0,height:22,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:isCur?T.teal600:T.ink700,borderLeft:"1px solid "+T.line,background:isCur?T.teal100:"transparent"}}>{MONTHS[mi]}</div>);
          })}
          {weekMarks.map((wm,wi)=>(
            <div key={wi} style={{position:"absolute",left:xOf(wm),top:22,height:24,width:dayW*7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:T.ink300,borderLeft:"1px solid "+T.surfaceAlt,fontWeight:500}}>{wm.getDate()}</div>
          ))}
        </div>

        {/* lignes de fond + grille */}
        {data.map((r,ri)=>{
          const c=ETAT_META[r.etat]||ETAT_META["NOT ORDERED"];
          const mb=bpct(r.arrivee,r.depart);
          return(<div key={ri} style={{height:44,position:"relative",borderBottom:"1px solid "+T.surface}}
            onMouseEnter={e=>setTt({r,x:e.clientX,y:e.clientY})} onMouseLeave={()=>setTt(null)}>
            {weekMarks.map((wm,wi)=><div key={wi} style={{position:"absolute",left:xOf(wm),top:0,bottom:0,width:1,background:T.surface}}/>)}
            {MONTHS_FULL.map((_,mi)=><div key={mi} style={{position:"absolute",left:xOf(new Date(year,mi,1)),top:0,bottom:0,width:1,background:T.line}}/>)}
            {mb&&<div style={{position:"absolute",left:mb.left,width:mb.width,top:"50%",transform:"translateY(-50%)",height:20,background:c.bar,borderRadius:6,opacity:.16,zIndex:1}}/>}
            {PHASES.map(ph=>{const dt=r[ph.k];if(!dt)return null;const x=xOf(new Date(dt));
              return(<div key={ph.k} style={{position:"absolute",left:x,top:"50%",transform:"translate(-50%,-50%)",width:24,height:24,borderRadius:"50%",background:ph.c,border:"2.5px solid #fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#fff",zIndex:4,cursor:"pointer",boxShadow:"0 2px 5px rgba(0,0,0,.18)"}}>{ph.l}</div>);
            })}
          </div>);
        })}

        {/* ligne "aujourd'hui" */}
        <div style={{position:"absolute",left:xOf(today),top:46,bottom:0,width:2,background:T.red500,opacity:.5,zIndex:3}}/>
      </div>
    </div>

    {tt&&<div style={{position:"fixed",left:Math.min(tt.x+12,window.innerWidth-230),top:tt.y-10,background:T.navy900,color:"#fff",borderRadius:10,padding:"12px 16px",fontSize:16,zIndex:9999,pointerEvents:"none",minWidth:200,fontFamily:T.font,boxShadow:T.shadowLg}}>
      <div style={{fontWeight:700,fontSize:19,marginBottom:8,color:T.teal400}}>{tt.r.pj}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
        {[["Arrivée",tt.r.arrivee],["Tests",tt.r.tests],["Fin prod",tt.r.finProd],["Départ",tt.r.depart]].map(([l,d])=><div key={l}><span style={{color:T.ink300,fontSize:14}}>{l}</span><br/><b>{fmtMode(d?new Date(d):null,df)}</b></div>)}
      </div>
      <div style={{marginTop:8,paddingTop:8,borderTop:"1px solid rgba(255,255,255,.15)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <Badge etat={tt.r.etat}/><span style={{color:T.ink300,fontSize:14}}>{tt.r.gamme}</span>
      </div>
    </div>}

    {/* mini-frise annuelle de navigation */}
    <div style={{padding:"10px 18px",borderTop:"1px solid "+T.line,background:T.surface}}>
      <div onClick={e=>{const rect=e.currentTarget.getBoundingClientRect();const ratio=(e.clientX-rect.left)/rect.width;scrollToDay(Math.round(ratio*totalDays));}}
        style={{position:"relative",height:22,borderRadius:6,background:T.surfaceAlt,cursor:"pointer",overflow:"hidden"}}>
        {MONTHS.map((mn,mi)=>{const ms=new Date(year,mi,1);const left=(dayOf(ms)/totalDays)*100;return(
          <div key={mi} style={{position:"absolute",left:left+"%",top:0,bottom:0,width:1,background:T.line}}/>
        );})}
        <div style={{position:"absolute",left:(dayOf(today)/totalDays)*100+"%",top:0,bottom:0,width:2,background:T.red500}}/>
        {MONTHS.map((mn,mi)=>{const ms=new Date(year,mi,1);const left=((dayOf(ms)+15)/totalDays)*100;return(
          <span key={mi} style={{position:"absolute",left:left+"%",top:2,fontSize:12,color:T.ink500,fontWeight:600,transform:"translateX(-50%)"}}>{mn}</span>
        );})}
      </div>
    </div>

    <div style={{padding:"10px 18px",borderTop:"1px solid "+T.line,display:"flex",gap:14,flexWrap:"wrap",background:T.surface}}>
      {PHASES.map(ph=><span key={ph.k} style={{display:"flex",alignItems:"center",gap:6,fontSize:15}}><span style={{width:18,height:18,borderRadius:"50%",background:ph.c,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#fff",fontWeight:700}}>{ph.l}</span><span style={{color:T.ink500,fontWeight:500}}>{ph.t}</span></span>)}
    </div>
  </div>);
}

function ProjectModal({pj,data,df,onClose}){
  const r=data.find(x=>x.pj===pj);
  if(!r)return null;
  const meta=getPjMeta(pj);
  const dates=PHASES.map(ph=>({...ph,date:r[ph.k]?new Date(r[ph.k]):null})).filter(p=>p.date);
  if(dates.length===0)return null;
  const minD=new Date(Math.min(...dates.map(d=>d.date)));
  const maxD=new Date(Math.max(...dates.map(d=>d.date)));
  // mois à afficher : du mois de la première étape au mois de la dernière (max 3 pour rester lisible)
  const months=[];
  let cur=new Date(minD.getFullYear(),minD.getMonth(),1);
  const end=new Date(maxD.getFullYear(),maxD.getMonth(),1);
  while(cur<=end&&months.length<3){months.push(new Date(cur));cur=new Date(cur.getFullYear(),cur.getMonth()+1,1);}

  const evByDay=(y,m)=>{
    const map={};
    dates.forEach(d=>{if(d.date.getFullYear()===y&&d.date.getMonth()===m){const day=d.date.getDate();if(!map[day])map[day]=[];map[day].push(d);}});
    return map;
  };

  return(<div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(12,36,54,.55)",zIndex:9998,display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:T.font}}>
    <div onClick={e=>e.stopPropagation()} style={{background:T.card,borderRadius:18,padding:28,maxWidth:640,width:"100%",maxHeight:"86vh",overflowY:"auto",boxShadow:T.shadowLg}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
        <div>
          <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:25,color:T.navy900}}>{pj}</div>
          <div style={{color:T.ink500,fontSize:16,marginTop:3,fontWeight:500}}>{meta.nomProjet} · {meta.pays} · {meta.chefProjet}</div>
        </div>
        <button onClick={onClose} style={{background:T.surface,border:"none",borderRadius:9,width:36,height:36,fontSize:18,cursor:"pointer",color:T.ink700,flexShrink:0}}>✕</button>
      </div>

      <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap"}}>
        <Badge etat={r.etat}/>
        <span style={{fontSize:15,color:T.ink500,alignSelf:"center"}}>{r.gamme}</span>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:24}}>
        {PHASES.map(ph=>{const d=r[ph.k]?new Date(r[ph.k]):null;return(
          <div key={ph.k} style={{background:T.surface,borderRadius:10,padding:"11px 14px",borderTop:"3px solid "+ph.c}}>
            <div style={{color:T.ink500,fontSize:13,fontWeight:600,textTransform:"uppercase",letterSpacing:".03em"}}>{ph.t}</div>
            <div style={{fontWeight:700,color:T.navy800,fontSize:19,marginTop:3}}>{d?fmtMode(d,df):"—"}</div>
          </div>
        );})}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat("+months.length+",1fr)",gap:14}}>
        {months.map((mo,mi)=>{
          const y=mo.getFullYear(),m=mo.getMonth();
          const de=evByDay(y,m);
          const fd=new Date(y,m,1).getDay();
          const adj=(fd+6)%7;
          const dim=new Date(y,m+1,0).getDate();
          const cells=[...Array(adj).fill(null),...Array.from({length:dim},(_,i)=>i+1)];
          return(<div key={mi}>
            <div style={{textAlign:"center",fontWeight:700,fontSize:14,color:T.navy800,marginBottom:8}}>{MONTHS_FULL[m]} {y}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
              {["L","M","M","J","V","S","D"].map((d,i)=><div key={i} style={{textAlign:"center",fontSize:10,fontWeight:700,color:T.ink300}}>{d}</div>)}
              {cells.map((day,ci)=>{
                if(!day)return<div key={"e"+ci}/>;
                const evs=de[day]||[];
                const isToday=day===today.getDate()&&m===today.getMonth()&&y===today.getFullYear();
                return(<div key={day} style={{aspectRatio:"1",borderRadius:7,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:evs.length?700:500,color:evs.length?"#fff":isToday?T.teal600:T.ink700,background:evs.length?evs[0].c:isToday?T.teal100:"transparent",border:isToday&&!evs.length?"1.5px solid "+T.teal400:"none",position:"relative"}}>
                  {day}
                  {evs.length>1&&<div style={{position:"absolute",bottom:1,right:2,fontSize:7,color:"#fff"}}>+{evs.length-1}</div>}
                </div>);
              })}
            </div>
          </div>);
        })}
      </div>

      <div style={{display:"flex",gap:14,marginTop:18,paddingTop:14,borderTop:"1px solid "+T.line,flexWrap:"wrap"}}>
        {PHASES.map(ph=><span key={ph.k} style={{display:"flex",alignItems:"center",gap:5,fontSize:12}}><span style={{width:13,height:13,borderRadius:4,background:ph.c}}/><span style={{color:T.ink500}}>{ph.t}</span></span>)}
      </div>
    </div>
  </div>);
}

function TableView({data,progress,df}){
  const [sel,setSel]=useState(null);
  return(<div style={{background:T.card,borderRadius:14,overflow:"auto",boxShadow:T.shadowMd,fontFamily:T.font}}>
    <table style={{width:"100%",borderCollapse:"collapse",tableLayout:"auto"}}>
      <thead><tr style={{background:T.surface,borderBottom:"2px solid "+T.line}}>
        {["N° PJ","Projet","Pays","Chef de Projet","Gamme","État","Arrivée","Tests","Fin prod","Départ","J restants"].map(h=><th key={h} style={{padding:"12px 16px",textAlign:"left",fontWeight:700,color:T.ink500,fontSize:15,whiteSpace:"nowrap",textTransform:"uppercase",letterSpacing:".04em"}}>{h}</th>)}
      </tr></thead>
      <tbody>{data.map((r,i)=>{
        const dl=r.depart?diffDays(today,new Date(r.depart)):null;
        const urgent=dl!=null&&dl>=0&&dl<=30;
        const done=r.etat==="SHIPPED";
        const pval=progress[r.pj];
        const meta=getPjMeta(r.pj);
        return(<tr key={i} onClick={()=>setSel(sel===r.pj?null:r.pj)} style={{borderBottom:"1px solid "+T.surface,cursor:"pointer",background:sel===r.pj?T.teal100:T.card,transition:"background .1s"}}>
          <td style={{padding:"13px 16px",fontWeight:700,color:T.teal600,fontSize:17,whiteSpace:"nowrap"}}>{r.pj}</td>
          <td style={{padding:"13px 16px",color:T.ink700,fontSize:16,whiteSpace:"nowrap",fontWeight:600}}>{meta.nomProjet}</td>
          <td style={{padding:"13px 16px",color:T.ink700,fontSize:16,whiteSpace:"nowrap"}}>{meta.pays}</td>
          <td style={{padding:"13px 16px",color:T.ink700,fontSize:16,whiteSpace:"nowrap"}}>{meta.chefProjet}</td>
          <td style={{padding:"13px 16px",color:T.ink500,fontSize:16,whiteSpace:"nowrap"}}>{r.gamme}</td>
          <td style={{padding:"13px 16px",whiteSpace:"nowrap"}}><Badge etat={r.etat}/></td>
          <td style={{padding:"13px 16px",color:T.ink700,fontSize:17,whiteSpace:"nowrap"}}>{fmtMode(r.arrivee?new Date(r.arrivee):null,df)}</td>
          <td style={{padding:"13px 16px",color:T.ink700,fontSize:17,whiteSpace:"nowrap"}}>{r.tests?fmtMode(new Date(r.tests),df):"—"}{r.testsFin?" → "+fmtMode(new Date(r.testsFin),df):""}</td>
          <td style={{padding:"13px 16px",color:T.ink700,fontSize:17,whiteSpace:"nowrap"}}>{fmtMode(r.finProd?new Date(r.finProd):null,df)}</td>
          <td style={{padding:"13px 16px",fontWeight:700,color:done?T.emerald600:urgent?T.amber600:T.ink900,fontSize:17,whiteSpace:"nowrap"}}>{fmtMode(r.depart?new Date(r.depart):null,df)}</td>
          <td style={{padding:"13px 16px",whiteSpace:"nowrap"}}>
            {pval!=null?<div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:48,background:T.surfaceAlt,borderRadius:5,height:7,overflow:"hidden"}}><div style={{width:pval+"%",height:"100%",background:pval>=100?T.emerald500:pval>=50?T.teal500:T.amber500}}/></div><span style={{fontSize:15,fontWeight:700,color:T.ink700}}>{pval}%</span></div>
            :done?<span style={{color:T.emerald600,fontSize:17,fontWeight:700}}>✓</span>
            :dl==null||dl<0?<span style={{color:T.ink300}}>—</span>:<span style={{color:urgent?T.amber600:T.ink700,fontWeight:urgent?700:500,fontSize:17}}>{dl}j</span>}
          </td>
        </tr>);
      })}</tbody>
    </table>
    {sel&&<ProjectModal pj={sel} data={data} df={df} onClose={()=>setSel(null)}/>}
  </div>);
}

const CAL_EV=[{k:"arrivee",l:"Arr.",c:T.teal500},{k:"tests",l:"Test",c:T.amber500},{k:"finProd",l:"FinP",c:T.emerald500},{k:"depart",l:"Dep.",c:T.red500}];
function buildDE(data,m,year){
  const de={};
  data.forEach(r=>CAL_EV.forEach(ev=>{
    if(!r[ev.k])return;
    const d=new Date(r[ev.k]);
    if(d.getMonth()!==m||d.getFullYear()!==year)return;
    const day=d.getDate();
    if(!de[day])de[day]=[];
    de[day].push({...ev,pj:r.pj,etat:r.etat});
  }));
  return de;
}
function CalendarView({data}){
  const [sm,setSm]=useState(today.getMonth());
  const [nm,setNm]=useState(2);
  const [pd,setPd]=useState(null);
  const [pm,setPm]=useState(null);
  const year=today.getFullYear();
  const mons=Array.from({length:nm},(_,i)=>(sm+i)%12);
  const allDE=useMemo(()=>{const r={};mons.forEach(m=>{r[m]=buildDE(data,m,year);});return r;},[data,sm,nm]);
  const popup=pd&&pm!=null?((allDE[pm]||{})[pd]||[]):[];
  return(<div style={{background:T.card,borderRadius:14,overflow:"hidden",boxShadow:T.shadowMd,fontFamily:T.font}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 18px",background:"linear-gradient(135deg,"+T.navy900+","+T.teal600+")"}}>
      <div style={{display:"flex",gap:6,alignItems:"center"}}>
        <button onClick={()=>setSm(m=>Math.max(0,m-nm))} style={{background:"rgba(255,255,255,.16)",border:"none",color:"#fff",borderRadius:8,padding:"5px 12px",cursor:"pointer",fontSize:19}}>◀</button>
        <span style={{fontWeight:700,fontSize:19,color:"#fff",minWidth:220,textAlign:"center"}}>{MONTHS_FULL[mons[0]]}{nm>1?" – "+MONTHS_FULL[mons[mons.length-1]]:""} {year}</span>
        <button onClick={()=>setSm(m=>Math.min(12-nm,m+nm))} style={{background:"rgba(255,255,255,.16)",border:"none",color:"#fff",borderRadius:8,padding:"5px 12px",cursor:"pointer",fontSize:19}}>▶</button>
      </div>
      <div style={{display:"flex",gap:5}}>{[1,2,3,4].map(n=><button key={n} onClick={()=>{setNm(n);if(sm+n>12)setSm(12-n);}} style={{padding:"5px 11px",borderRadius:7,border:"none",background:nm===n?"#fff":"rgba(255,255,255,.16)",color:nm===n?T.navy800:"#fff",fontSize:15,fontWeight:700,cursor:"pointer"}}>{n}</button>)}</div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat("+nm+",1fr)",overflowX:"auto"}}>
      {mons.map(m=>{
        const de=allDE[m]||{};
        const fd=new Date(year,m,1).getDay();
        const adj=(fd+6)%7;
        const dim=new Date(year,m+1,0).getDate();
        const cells=[...Array(adj).fill(null),...Array.from({length:dim},(_,i)=>i+1)];
        return(<div key={m} style={{borderRight:"1px solid "+T.line,minWidth:200}}>
          <div style={{padding:"8px",background:T.surface,borderBottom:"1px solid "+T.line,fontWeight:700,color:T.navy800,fontSize:16,textAlign:"center"}}>{MONTHS_FULL[m]}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 0.55fr 0.55fr",background:T.surfaceAlt,borderBottom:"1px solid "+T.line}}>
            {["L","M","M","J","V","S","D"].map((d,i)=><div key={i} style={{textAlign:"center",padding:"4px 0",fontSize:14,fontWeight:700,color:i>=5?T.ink300:T.ink500}}>{d}</div>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 0.55fr 0.55fr"}}>
            {cells.map((day,ci)=>{
              const isWE=ci%7>=5;
              if(!day)return<div key={"e"+ci} style={{background:T.surface,minHeight:isWE?38:58,borderBottom:"1px solid "+T.surface}}/>;
              const isT=day===today.getDate()&&m===today.getMonth()&&year===today.getFullYear();
              const evs=de[day]||[];
              const isSel=pd===day&&pm===m;
              return(<div key={day} onClick={()=>{setPd(day);setPm(m);}} style={{minHeight:isWE?38:58,padding:"3px",borderRight:"1px solid "+T.surface,borderBottom:"1px solid "+T.surface,cursor:evs.length?"pointer":"default",background:isSel?T.teal100:isT?T.amber100:T.card}}>
                <div style={{fontSize:14,fontWeight:700,color:isT?T.amber600:isWE?T.ink300:T.ink700,width:20,height:20,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:isT?"#fbbf24":"transparent"}}>{day}</div>
                {!isWE&&evs.slice(0,2).map((ev,ei)=><div key={ei} style={{background:ev.c,color:"#fff",borderRadius:4,padding:"1px 4px",fontSize:13,fontWeight:700,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",marginBottom:2}}>{ev.l} {ev.pj}</div>)}
                {!isWE&&evs.length>2&&<div style={{fontSize:13,color:T.ink300,fontWeight:600}}>+{evs.length-2}</div>}
                {isWE&&evs.length>0&&<div style={{width:6,height:6,borderRadius:"50%",background:T.amber500,margin:"3px auto"}}/>}
              </div>);
            })}
          </div>
        </div>);
      })}
    </div>
    {popup.length>0&&<div style={{margin:16,background:T.teal100,borderRadius:12,padding:14,border:"1px solid "+T.teal400}}>
      <div style={{fontWeight:700,color:T.navy800,marginBottom:8,fontSize:17}}>{pd} {MONTHS_FULL[pm]} — {popup.length} événement{popup.length>1?"s":""}</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
        {popup.map((ev,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 11px",background:T.card,borderRadius:8,border:"1px solid "+T.teal400,boxShadow:T.shadowSm}}>
          <span style={{background:ev.c,color:"#fff",borderRadius:5,padding:"2px 7px",fontSize:14,fontWeight:700}}>{ev.l}</span>
          <span style={{fontWeight:700,color:T.teal600,fontSize:16}}>{ev.pj}</span>
          <Badge etat={ev.etat}/>
        </div>)}
      </div>
    </div>}
    <div style={{padding:"9px 16px",borderTop:"1px solid "+T.line,display:"flex",gap:12,background:T.surface,flexWrap:"wrap"}}>
      {CAL_EV.map(ev=><span key={ev.k} style={{display:"flex",alignItems:"center",gap:5,fontSize:15}}><span style={{background:ev.c,color:"#fff",borderRadius:4,padding:"1px 6px",fontSize:13,fontWeight:700}}>{ev.l}</span><span style={{color:T.ink500,fontWeight:500}}>{ev.k==="arrivee"?"Arrivée":ev.k==="tests"?"Tests":ev.k==="finProd"?"Fin prod":"Départ"}</span></span>)}
    </div>
  </div>);
}

const PIN="2214";
function PinGate({onUnlock}){
  const [v,setV]=useState("");const [err,setErr]=useState(false);
  const check=()=>{if(v===PIN)onUnlock();else{setErr(true);setV("");setTimeout(()=>setErr(false),1200);}};
  return(<div style={{background:T.card,borderRadius:16,padding:36,maxWidth:300,margin:"40px auto",boxShadow:T.shadowLg,textAlign:"center",fontFamily:T.font}}>
    <div style={{fontSize:38,marginBottom:10}}>🔒</div>
    <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:22,color:T.navy800,marginBottom:18}}>Accès Manager</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,maxWidth:190,margin:"0 auto 14px"}}>
      {[1,2,3,4,5,6,7,8,9,"",0,"⌫"].map((k,i)=><button key={i} onClick={()=>{if(k==="⌫")setV(x=>x.slice(0,-1));else if(k!=="")setV(x=>x.length<4?x+k:x);}} style={{height:46,borderRadius:10,border:"1px solid "+T.line,background:k===""?"transparent":T.surface,fontSize:21,fontWeight:600,cursor:k===""?"default":"pointer",color:T.ink900}}>{k}</button>)}
    </div>
    <div style={{display:"flex",gap:7,justifyContent:"center",marginBottom:12}}>{[0,1,2,3].map(i=><div key={i} style={{width:11,height:11,borderRadius:"50%",background:i<v.length?T.teal500:T.ink100}}/>)}</div>
    {err&&<div style={{color:T.red500,fontSize:16,marginBottom:8,fontWeight:600}}>Code incorrect</div>}
    <button onClick={check} disabled={v.length<4} style={{padding:"10px 30px",background:v.length<4?T.ink100:T.teal500,color:v.length<4?T.ink300:"#fff",border:"none",borderRadius:10,fontWeight:700,fontSize:17,cursor:v.length<4?"default":"pointer"}}>Valider</button>
  </div>);
}

function ManagerPanel({data,progress,setProgress,initialData,lastInitialImport,onInitialImport,initialImporting}){
  const [fEtat,setFEtat]=useState(new Set(ALL_ETATS));
  const [fGamme,setFGamme]=useState(new Set(ALL_GAMMES));
  const [tab,setTab]=useState("derives");
  const fd=useMemo(()=>data.filter(r=>fEtat.has(r.etat)&&fGamme.has(r.gamme)),[data,fEtat,fGamme]);
  const shipped=fd.filter(r=>r.etat==="SHIPPED");
  const inProd=fd.filter(r=>["PROD","En fabrication"].includes(r.etat));
  const upcoming=fd.filter(r=>{const d=r.depart?diffDays(today,new Date(r.depart)):null;return d!=null&&d>=0&&d<=30;});
  const byMonth=Array(12).fill(0);fd.forEach(r=>{if(r.depart)byMonth[new Date(r.depart).getMonth()]++;});
  const maxBar=Math.max(...byMonth,1);
  const gammeCounts={};fd.forEach(r=>{gammeCounts[r.gamme]=(gammeCounts[r.gamme]||0)+1;});

  // ── Rapprochement Initial (figé) ↔ Révisé, par N° PJ ──────────
  const initialByPJ=useMemo(()=>{const m={};initialData.forEach(r=>{m[r.pj]=r;});return m;},[initialData]);
  const driftRows=useMemo(()=>fd.map(r=>{
    const ini=initialByPJ[r.pj];
    const mk=k=>{
      const iv=ini?ini[k]:null;
      const rv=r[k];
      const delta=(iv&&rv)?diffDays(new Date(iv),new Date(rv)):null;
      return{ini:iv||null,rev:rv||null,delta};
    };
    return{pj:r.pj,gamme:r.gamme,etat:r.etat,hasInitial:!!ini,arrivee:mk("arrivee"),tests:mk("tests"),finProd:mk("finProd"),depart:mk("depart")};
  }),[fd,initialByPJ]);
  const comparable=driftRows.filter(r=>r.hasInitial);
  const departDeltas=comparable.map(r=>r.depart.delta).filter(d=>d!=null);
  const lateCount=departDeltas.filter(d=>d>0).length;
  const onTimeOrEarlyCount=departDeltas.filter(d=>d<=0).length;
  const avgDelay=departDeltas.length?Math.round(departDeltas.reduce((a,b)=>a+b,0)/departDeltas.length):null;
  const worstDrifts=[...comparable].filter(r=>r.depart.delta!=null).sort((a,b)=>b.depart.delta-a.depart.delta).slice(0,5);

  return(<div style={{display:"flex",flexDirection:"column",gap:14,fontFamily:T.font}}>
    <div style={{background:T.card,borderRadius:14,padding:"14px 16px",boxShadow:T.shadowMd}}>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        <DropFilter label="Statut" options={ALL_ETATS} selected={fEtat} onChange={setFEtat} getLabel={o=>ETAT_META[o]?.label||o}/>
        <DropFilter label="Gamme" options={ALL_GAMMES} selected={fGamme} onChange={setFGamme}/>
        <button onClick={()=>{setFEtat(new Set(ALL_ETATS));setFGamme(new Set(ALL_GAMMES));}} style={{padding:"7px 13px",borderRadius:9,border:"1.5px solid "+T.line,background:T.card,fontSize:16,cursor:"pointer",color:T.red500,fontWeight:600}}>✕ Effacer</button>
        <span style={{fontSize:16,color:T.ink500,alignSelf:"center",fontWeight:500}}>{fd.length} unités</span>
        <div style={{marginLeft:"auto"}}>
          <ImportButton
            onImport={onInitialImport}
            busy={initialImporting}
            label="Importer planning initial"
            icon="📌"
            accent={"linear-gradient(135deg,"+T.teal600+","+T.navy700+")"}
            hasExisting={initialData.length>0}
            inputId="msp-file-initial"
            confirmMessage={"Un planning initial a déjà été importé"+(lastInitialImport?(" le "+lastInitialImport):"")+".\n\nCe planning sert de référence figée pour calculer les dérives — il ne devrait normalement être importé qu'une seule fois.\n\nÊtes-vous sûr de vouloir l'écraser ?"}
            helpText={<>Export Excel (.xlsx) avec colonnes <b>Nom, Début, Niveau hiérarchique</b>.<br/>Ce planning sera <b>figé</b> et servira de référence pour calculer les dérives par rapport au planning révisé.</>}
            warnText="📌 Ce planning devient la référence figée (dates initiales) — à importer une seule fois normalement."
          />
        </div>
      </div>
      {initialData.length>0&&<div style={{fontSize:15,color:T.teal600,marginTop:9,fontWeight:600}}>📌 Planning initial figé · {initialData.length} unités{lastInitialImport?" · importé le "+lastInitialImport:""}</div>}
      {initialData.length===0&&<div style={{fontSize:15,color:T.amber600,marginTop:9,fontWeight:600}}>⚠️ Aucun planning initial importé — les dérives ne peuvent pas être calculées.</div>}
    </div>
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
      {[["derives","📈 KPIs & Dérives"],["avancement","🔧 Avancement"]].map(([id,l])=><button key={id} onClick={()=>setTab(id)} style={{padding:"9px 18px",borderRadius:10,border:"none",background:tab===id?T.teal500:T.card,color:tab===id?"#fff":T.ink700,fontWeight:700,fontSize:16,cursor:"pointer",boxShadow:tab===id?T.shadowSm:"none"}}>{l}</button>)}
    </div>
    {tab==="derives"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12}}>
        {[[fd.length,"Total",T.teal500],[shipped.length,"Expédiées",T.emerald500],[inProd.length,"En production",T.amber500],[upcoming.length,"Départs < 30j",T.red500]].map(([v,l,c])=>(
          <div key={l} style={{background:T.card,borderRadius:12,padding:"14px 16px",borderTop:"3px solid "+c,boxShadow:T.shadowMd}}>
            <div style={{fontFamily:T.fontDisplay,fontSize:36,fontWeight:700,color:T.navy800}}>{v}</div>
            <div style={{fontSize:15,fontWeight:600,color:T.ink500,marginTop:3}}>{l}</div>
          </div>
        ))}
      </div>

      {initialData.length>0&&<>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12}}>
          {[[avgDelay==null?"—":(avgDelay>0?"+":"")+avgDelay+"j","Retard moyen départ",avgDelay>0?T.red500:T.emerald500],[lateCount,"PJ en retard",T.red500],[onTimeOrEarlyCount,"PJ à l'heure / en avance",T.emerald500],[comparable.length,"PJ comparables",T.ink500]].map(([v,l,c])=>(
            <div key={l} style={{background:T.card,borderRadius:12,padding:"14px 16px",borderTop:"3px solid "+c,boxShadow:T.shadowMd}}>
              <div style={{fontFamily:T.fontDisplay,fontSize:30,fontWeight:700,color:T.navy800}}>{v}</div>
              <div style={{fontSize:15,fontWeight:600,color:T.ink500,marginTop:3}}>{l}</div>
            </div>
          ))}
        </div>

        {worstDrifts.length>0&&<div style={{background:T.card,borderRadius:12,padding:16,boxShadow:T.shadowMd}}>
          <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:19,color:T.navy800,marginBottom:10}}>Top dérives — Départ (vs planning initial)</div>
          {worstDrifts.map(r=>{const d=r.depart.delta;const c=d>0?T.red500:d<0?T.emerald500:T.ink500;return(
            <div key={r.pj} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid "+T.surface}}>
              <span style={{fontWeight:700,color:T.teal600,fontSize:16,minWidth:100}}>{r.pj}</span>
              <span style={{color:T.ink300,fontSize:14,minWidth:60}}>{r.gamme}</span>
              <span style={{fontSize:15,color:T.ink500}}>{fmt(r.depart.ini?new Date(r.depart.ini):null)} → {fmt(r.depart.rev?new Date(r.depart.rev):null)}</span>
              <span style={{marginLeft:"auto",fontWeight:800,fontSize:17,color:c}}>{d>0?"+":""}{d}j</span>
            </div>
          );})}
        </div>}

        <div style={{background:T.card,borderRadius:12,padding:0,boxShadow:T.shadowMd,overflow:"auto"}}>
          <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:19,color:T.navy800,padding:"16px 16px 0"}}>Détail par PJ — Initial vs Révisé</div>
          <table style={{width:"100%",borderCollapse:"collapse",marginTop:10,tableLayout:"auto"}}>
            <thead><tr style={{background:T.surface,borderBottom:"2px solid "+T.line}}>
              {["N° PJ","Gamme","Arrivée","Δ","Tests","Δ","Fin prod","Δ","Départ","Δ"].map((h,i)=><th key={i} style={{padding:"9px 12px",textAlign:"left",fontWeight:700,color:T.ink500,fontSize:14,whiteSpace:"nowrap",textTransform:"uppercase",letterSpacing:".03em"}}>{h}</th>)}
            </tr></thead>
            <tbody>{driftRows.map((r,i)=>(
              <tr key={i} style={{borderBottom:"1px solid "+T.surface,background:r.hasInitial?T.card:T.surface}}>
                <td style={{padding:"9px 12px",fontWeight:700,color:T.teal600,fontSize:16,whiteSpace:"nowrap"}}>{r.pj}</td>
                <td style={{padding:"9px 12px",color:T.ink500,fontSize:15,whiteSpace:"nowrap"}}>{r.gamme}</td>
                {["arrivee","tests","finProd","depart"].map(k=>{const c=r[k];const d=c.delta;const col=d==null?T.ink300:d>0?T.red500:d<0?T.emerald500:T.ink500;return(<React.Fragment key={k}>
                  <td style={{padding:"9px 12px",fontSize:15,color:T.ink700,whiteSpace:"nowrap"}}>{c.rev?fmt(new Date(c.rev)):"—"}</td>
                  <td style={{padding:"9px 12px",fontSize:15,fontWeight:700,color:col,whiteSpace:"nowrap"}}>{d==null?"—":(d>0?"+":"")+d+"j"}</td>
                </React.Fragment>);})}
              </tr>
            ))}</tbody>
          </table>
        </div>
      </>}

      <div style={{background:T.card,borderRadius:12,padding:16,boxShadow:T.shadowMd}}>
        <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:19,color:T.navy800,marginBottom:10}}>Départs par mois</div>
        <div style={{display:"flex",gap:4,alignItems:"flex-end",height:84}}>
          {byMonth.map((n,i)=>{const iC=i===today.getMonth();return(<div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
            <div style={{fontSize:14,color:T.ink500,fontWeight:600}}>{n||""}</div>
            <div style={{width:"100%",height:n?(n/maxBar*60)+"px":"0",minHeight:n?4:0,background:i<today.getMonth()?T.ink100:iC?T.teal500:T.teal400,borderRadius:"3px 3px 0 0"}}/>
            <div style={{fontSize:13,color:iC?T.teal600:T.ink300,fontWeight:iC?700:500}}>{MONTHS[i]}</div>
          </div>);})}
        </div>
      </div>
      <div style={{background:T.card,borderRadius:12,padding:16,boxShadow:T.shadowMd}}>
        <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:19,color:T.navy800,marginBottom:10}}>Par gamme</div>
        {Object.entries(gammeCounts).sort((a,b)=>b[1]-a[1]).map(([g,n])=>{const col=GAMME_COLORS[g]||T.ink500;return(<div key={g} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <span style={{width:78,fontSize:15,fontWeight:700,color:col,flexShrink:0}}>{g}</span>
          <div style={{flex:1,background:T.surfaceAlt,borderRadius:5,height:18,overflow:"hidden",position:"relative"}}><div style={{width:((n/Math.max(fd.length,1))*100)+"%",height:"100%",background:col}}/><span style={{position:"absolute",left:8,top:1,fontSize:14,color:"#fff",fontWeight:700,lineHeight:"16px"}}>{n}</span></div>
        </div>);})}
      </div>
    </div>}
    {tab==="avancement"&&<div style={{background:T.card,borderRadius:12,padding:16,boxShadow:T.shadowMd}}>
      <div style={{fontSize:16,color:T.ink500,marginBottom:14}}>Cliquer sur la barre ou saisir le %</div>
      {fd.map(r=>{
        const pv=progress[r.pj]!=null?progress[r.pj]:r.etat==="SHIPPED"?100:0;
        return(<div key={r.pj} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid "+T.surface}}>
          <span style={{fontWeight:700,color:T.teal600,fontSize:16,minWidth:110,flexShrink:0}}>{r.pj}</span>
          <span style={{color:T.ink300,fontSize:14,minWidth:60,flexShrink:0}}>{r.gamme}</span>
          <div style={{flex:1,background:T.surfaceAlt,borderRadius:9,height:13,overflow:"hidden",cursor:"pointer"}} onClick={e=>{const rect=e.currentTarget.getBoundingClientRect();const nv=Math.max(0,Math.min(100,Math.round(((e.clientX-rect.left)/rect.width)*100)));setProgress(p=>({...p,[r.pj]:nv}));}}>
            <div style={{width:pv+"%",height:"100%",background:pv>=100?T.emerald500:pv>=50?T.teal500:T.amber500,borderRadius:9}}/>
          </div>
          <input type="number" min={0} max={100} value={pv} onChange={e=>setProgress(p=>({...p,[r.pj]:Math.max(0,Math.min(100,+e.target.value||0))}))} style={{width:54,padding:"5px 6px",borderRadius:7,border:"1px solid "+T.line,fontSize:16,fontWeight:700,textAlign:"center",fontFamily:T.font}}/>
          <span style={{fontSize:15,color:T.ink500,fontWeight:500}}>%</span>
        </div>);
      })}
    </div>}
  </div>);
}

function ImportButton({onImport, busy, label, icon, accent, helpText, warnText, confirmMessage, hasExisting, inputId}){
  const [open,setOpen]=useState(false);
  const [err,setErr]=useState("");
  useSheetJS();
  const fileInputId=inputId||"msp-file";
  const btnLabel=label||"Importer un planning MS Project";
  const btnIcon=icon||"📂";
  const bg=accent||"linear-gradient(135deg,"+T.teal500+","+T.navy700+")";

  const proceedImport=parsed=>{
    if(hasExisting&&confirmMessage){
      const ok=window.confirm(confirmMessage);
      if(!ok)return false;
    }
    onImport(parsed);
    return true;
  };

  const handleFile=async file=>{
    setErr("");
    try{
      if(file.name.endsWith(".xlsx")||file.name.endsWith(".xls")){
        if(!window.XLSX){setErr("Librairie Excel en cours de chargement, réessayez dans 2s.");return;}
        const buf=await file.arrayBuffer();
        const wb=window.XLSX.read(buf,{type:"array"});
        const ws=wb.Sheets[wb.SheetNames[0]];
        const rows=window.XLSX.utils.sheet_to_json(ws,{header:1,raw:false});
        const parsed=parseMSProjectRows(rows);
        if(!parsed||parsed.length===0){setErr("Aucun PJ reconnu. Vérifiez les colonnes Nom / Début / Niveau hiérarchique.");return;}
        if(proceedImport(parsed))setOpen(false);
      } else {
        const text=await file.text();
        const rows=text.trim().split("\n").map(l=>l.split("\t"));
        const parsed=parseMSProjectRows(rows);
        if(!parsed||parsed.length===0){setErr("Aucun PJ reconnu dans ce fichier texte.");return;}
        if(proceedImport(parsed))setOpen(false);
      }
    }catch(e){setErr("Erreur de lecture : "+e.message);}
  };

  return(<div style={{position:"relative",fontFamily:T.font}}>
    <button onClick={()=>setOpen(v=>!v)} disabled={busy} style={{padding:"9px 17px",borderRadius:10,border:"none",background:bg,color:"#fff",fontWeight:700,fontSize:16,cursor:busy?"default":"pointer",opacity:busy?.6:1,display:"flex",alignItems:"center",gap:7,boxShadow:T.shadowSm}}>
      {busy?"⏳ Mise à jour...":btnIcon+" "+btnLabel}
    </button>
    {open&&!busy&&<div style={{position:"absolute",top:"calc(100% + 8px)",right:0,background:T.card,borderRadius:14,boxShadow:T.shadowLg,border:"1px solid "+T.line,zIndex:9999,width:320,padding:18}}>
      <div style={{fontWeight:700,fontSize:19,color:T.navy800,marginBottom:8}}>{btnLabel}</div>
      <div style={{fontSize:15,color:T.ink500,marginBottom:14,lineHeight:1.6}}>
        {helpText||(<>Export Excel (.xlsx) avec colonnes <b>Nom, Début, Niveau hiérarchique</b>.<br/>Niveau 1 = PJ · Niveau 2 = Arrivée / Tests / Fin de production / Départ.</>)}
      </div>
      <div onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)handleFile(f);}}
        style={{border:"2px dashed "+T.ink100,borderRadius:11,padding:"24px 16px",background:T.surface,textAlign:"center",cursor:"pointer",marginBottom:12}}
        onClick={()=>document.getElementById(fileInputId).click()}>
        <div style={{fontSize:30,marginBottom:6}}>⬆️</div>
        <div style={{fontSize:15,color:T.ink700,fontWeight:500}}>Glisser-déposer ou cliquer</div>
        <input id={fileInputId} type="file" accept=".xlsx,.xls,.txt,.tsv" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(f)handleFile(f);}}/>
      </div>
      {err&&<div style={{color:T.red500,fontSize:15,background:T.red100,padding:"8px 12px",borderRadius:8,marginBottom:10,fontWeight:500}}>{err}</div>}
      <div style={{fontSize:14,color:T.ink300,lineHeight:1.5}}>{warnText||"⚠️ Remplace les données pour tous les visiteurs du site."}</div>
    </div>}
  </div>);
}

const DOC_REF=()=>doc(db,"planning","current");
const INITIAL_DOC_REF=()=>doc(db,"planning","initial");

export default function App(){
  const [data,setData]=useState([]);
  const [loading,setLoading]=useState(true);
  const [importing,setImporting]=useState(false);
  const [lastImport,setLastImport]=useState(null);
  const [initialData,setInitialData]=useState([]);
  const [initialImporting,setInitialImporting]=useState(false);
  const [lastInitialImport,setLastInitialImport]=useState(null);
  const [view,setView]=useState("table");
  const [selEtats,setSelEtats]=useState(new Set(ALL_ETATS));
  const [selGammes,setSelGammes]=useState(new Set(ALL_GAMMES));
  const [selMois,setSelMois]=useState(new Set(MONTHS));
  const [selPJs,setSelPJs]=useState(new Set());
  const [df,setDf]=useState("date");
  const [showF,setShowF]=useState(false);
  const [pinOk,setPinOk]=useState(false);
  const [progress,setProgress]=useState({});

  // Lecture temps réel depuis Firestore
  useEffect(()=>{
    const unsub = onSnapshot(DOC_REF(), (snap)=>{
      if(snap.exists()){
        const d = snap.data();
        setData(d.rows || []);
        setLastImport(d.lastImport || null);
      }
      setLoading(false);
    }, (err)=>{
      console.error("Erreur Firestore:", err);
      setLoading(false);
    });
    return ()=>unsub();
  },[]);

  // Lecture temps réel du planning initial (figé, Manager uniquement)
  useEffect(()=>{
    const unsub = onSnapshot(INITIAL_DOC_REF(), (snap)=>{
      if(snap.exists()){
        const d = snap.data();
        setInitialData(d.rows || []);
        setLastInitialImport(d.lastImport || null);
      }
    }, (err)=>{
      console.error("Erreur Firestore (initial):", err);
    });
    return ()=>unsub();
  },[]);

  const handleImport=useCallback(async rows=>{
    setImporting(true);
    try{
      const lastImportStr=new Date().toLocaleString("fr-FR");
      await setDoc(DOC_REF(), { rows, lastImport: lastImportStr });
      setSelPJs(new Set(rows.map(r=>r.pj)));
      // Pas besoin de setData ici : onSnapshot va le faire automatiquement pour tout le monde
    }catch(e){
      console.error(e);
      alert("Erreur lors de l'enregistrement : " + e.message);
    }
    setImporting(false);
  },[]);

  const handleInitialImport=useCallback(async rows=>{
    setInitialImporting(true);
    try{
      const lastImportStr=new Date().toLocaleString("fr-FR");
      await setDoc(INITIAL_DOC_REF(), { rows, lastImport: lastImportStr });
      // Pas besoin de setInitialData ici : onSnapshot va le faire automatiquement
    }catch(e){
      console.error(e);
      alert("Erreur lors de l'enregistrement du planning initial : " + e.message);
    }
    setInitialImporting(false);
  },[]);

  const allPJs=useMemo(()=>[...new Set(data.map(r=>r.pj))].sort(),[data]);

  const filtered=useMemo(()=>data.filter(r=>{
    if(!selEtats.has(r.etat))return false;
    if(!selGammes.has(r.gamme))return false;
    if(selMois.size<MONTHS.length){const m=r.depart?MONTHS[new Date(r.depart).getMonth()]:null;if(!m||!selMois.has(m))return false;}
    if(selPJs.size>0&&selPJs.size<allPJs.length&&!selPJs.has(r.pj))return false;
    return true;
  }),[data,selEtats,selGammes,selMois,selPJs,allPJs]);

  const VIEWS=[{id:"table",l:"📋 Liste"},{id:"gantt",l:"📊 Gantt"},{id:"calendar",l:"📅 Calendrier"}];

  return(<div style={{fontFamily:T.font,fontSize:17,background:T.surface,minHeight:"100vh",padding:20,color:T.ink900}}>
    <link rel="preconnect" href="https://fonts.googleapis.com"/>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet"/>
    <div style={{background:T.card,borderRadius:18,padding:"20px 26px",marginBottom:22,color:T.ink900,display:"flex",alignItems:"center",gap:18,flexWrap:"wrap",boxShadow:T.shadowMd,borderBottom:"3px solid "+T.teal500}}>
      <img src={LOGO_B64} alt="ENOGIA" style={{height:64,objectFit:"contain"}}/>
      <div style={{borderLeft:"1px solid "+T.line,paddingLeft:18}}>
        <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:25,letterSpacing:"-.01em",color:T.navy900}}>Planning Ordonnancement</div>
        <div style={{color:T.ink500,fontSize:16,marginTop:3,fontWeight:500}}>{loading?"Chargement...":data.length+" unités"+(lastImport?" · Import "+lastImport:" · Aucune donnée importée")}</div>
      </div>
      <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <ImportButton
          onImport={handleImport}
          busy={importing}
          hasExisting={data.length>0}
          confirmMessage={"Un planning révisé a déjà été importé"+(lastImport?(" le "+lastImport):"")+" ("+data.length+" unités).\n\nCet import va remplacer les données pour tous les visiteurs du site.\n\nÊtes-vous sûr de vouloir continuer ?"}
        />
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <span style={{fontSize:16,color:T.ink500,fontWeight:500}}>Dates :</span>
          {[["date","JJ/MM"],["semaine","SXX"],["mois","Mois"]].map(([k,l])=><button key={k} onClick={()=>setDf(k)} style={{padding:"6px 13px",borderRadius:9,border:"1px solid "+(df===k?T.teal500:T.line),background:df===k?T.teal500:T.card,color:df===k?"#fff":T.ink700,fontSize:16,fontWeight:700,cursor:"pointer"}}>{l}</button>)}
        </div>
      </div>
    </div>

    {loading?<div style={{textAlign:"center",padding:70,color:T.ink500,fontSize:19}}>⏳ Connexion à la base de données...</div>:
    data.length===0?(
      <div style={{background:T.card,borderRadius:16,padding:50,textAlign:"center",boxShadow:T.shadowMd}}>
        <div style={{fontSize:46,marginBottom:14}}>📭</div>
        <div style={{fontFamily:T.fontDisplay,fontWeight:700,color:T.navy800,marginBottom:8,fontSize:22}}>Aucune donnée importée</div>
        <div style={{color:T.ink500,fontSize:17,marginBottom:16}}>Utilisez le bouton "Importer un planning MS Project" en haut de page pour charger les données.</div>
      </div>
    ):(
      <>
        <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap",alignItems:"center"}}>
          {VIEWS.map(v=><button key={v.id} onClick={()=>setView(v.id)} style={{padding:"11px 22px",borderRadius:12,border:"none",cursor:"pointer",fontSize:19,fontWeight:700,background:view===v.id?T.teal500:T.card,color:view===v.id?"#fff":T.ink700,boxShadow:view===v.id?T.shadowSm:"none",transition:"all .12s"}}>{v.l}</button>)}
          <button onClick={()=>setView("manager")} style={{marginLeft:"auto",padding:"11px 22px",borderRadius:12,border:"none",cursor:"pointer",fontSize:19,fontWeight:700,background:view==="manager"?T.navy800:T.card,color:view==="manager"?"#fff":T.ink700,boxShadow:view==="manager"?T.shadowSm:"none",transition:"all .12s"}}>🔒 Manager</button>
        </div>

        {view==="manager"?(pinOk?
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <span style={{fontFamily:T.fontDisplay,fontWeight:700,color:T.navy800,fontSize:21}}>🔓 Espace Manager</span>
              <button onClick={()=>setPinOk(false)} style={{padding:"6px 14px",borderRadius:9,border:"1px solid "+T.line,background:T.card,fontSize:15,cursor:"pointer",color:T.ink700,fontWeight:600}}>Verrouiller</button>
            </div>
            <ManagerPanel data={data} progress={progress} setProgress={setProgress} initialData={initialData} lastInitialImport={lastInitialImport} onInitialImport={handleInitialImport} initialImporting={initialImporting}/>
          </div>
          :<PinGate onUnlock={()=>setPinOk(true)}/>)
        :(
          <>
            <div style={{background:T.card,borderRadius:14,padding:"12px 16px",marginBottom:16,boxShadow:T.shadowMd}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:showF?12:0}}>
                <span style={{color:T.ink500,fontSize:16,fontWeight:500}}>{filtered.length} résultat(s) sur {data.length}</span>
                <button onClick={()=>setShowF(f=>!f)} style={{padding:"6px 14px",borderRadius:9,border:"1px solid "+T.line,background:T.surface,fontSize:16,cursor:"pointer",color:T.ink700,fontWeight:600}}>{showF?"▲":"▼"} Filtres</button>
              </div>
              {showF&&<div style={{display:"flex",gap:8,flexWrap:"wrap",paddingTop:12,borderTop:"1px solid "+T.line}}>
                <DropFilter label="État" options={ALL_ETATS} selected={selEtats} onChange={setSelEtats} getLabel={o=>ETAT_META[o]?.label||o}/>
                <DropFilter label="Gamme" options={ALL_GAMMES} selected={selGammes} onChange={setSelGammes}/>
                <DropFilter label="Mois" options={MONTHS} selected={selMois} onChange={setSelMois}/>
                <DropFilter label="N° PJ" options={allPJs} selected={selPJs.size>0?selPJs:new Set(allPJs)} onChange={s=>setSelPJs(s)}/>
                <button onClick={()=>{setSelEtats(new Set(ALL_ETATS));setSelGammes(new Set(ALL_GAMMES));setSelMois(new Set(MONTHS));setSelPJs(new Set(allPJs));}} style={{padding:"7px 13px",borderRadius:9,border:"1.5px solid "+T.line,background:T.card,fontSize:16,cursor:"pointer",color:T.red500,fontWeight:600}}>✕ Réinitialiser</button>
                <button onClick={()=>setSelEtats(new Set(ALL_ETATS.filter(e=>e!=="SHIPPED")))} style={{padding:"7px 13px",borderRadius:9,border:"1.5px solid "+T.line,background:T.card,fontSize:16,cursor:"pointer",color:T.ink700,fontWeight:600}}>Masquer expédiées</button>
              </div>}
            </div>
            {view==="table"&&<TableView data={filtered} progress={progress} df={df}/>}
            {view==="gantt"&&<GanttView data={filtered} progress={progress} df={df}/>}
            {view==="calendar"&&<CalendarView data={filtered}/>}
          </>
        )}
      </>
    )}
  </div>);
}
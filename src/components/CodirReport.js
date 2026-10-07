import React, { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { T } from "../theme";
import { getPjMeta, SerieTag, CountryFlag, ETAT_META, PRESENCE_META, presenceKind, presenceBg, today } from "../pjMeta";
import { diffDays } from "../parsers";
import { NavIcon } from "./SharedUI";
import { FEUX, FEU_LEVELS, feuxOf, worstFeu, NOTE_LABELS, NOTE_ORDER } from "./Feux";

// ── Rapport CODIR : page de garde, synthèse du portefeuille, puis une page éditoriale par PJ ────────────────
// Exporté en PDF par l'impression du navigateur (texte vectoriel, rien n'est envoyé ailleurs). Le papier est
// toujours clair, quel que soit le thème de l'appli. Les commentaires PRIVÉS ne sortent jamais dans le rapport.
// Direction artistique : Roboto partout (police de l'appli), chiffres et titres en graisse moyenne,
// beaucoup d'air, peu de cadres (filets fins), une seule couleur d'accent (laiton) et des feux à halo.
const F_DISPLAY="'Roboto',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif";
const F_BODY=F_DISPLAY;
const C={ink:"#0E1726",ink2:"#3A4556",mute:"#6B7686",faint:"#A3ACB9",hair:"#E6E9EE",wash:"#F6F7F9",navy:"#14213D",navy2:"#1D2C4E",navy3:"#3B4F7A",brass:"#B08D57",red:"#D64541",amber:"#E3A008",green:"#2A9D6F"};
const FC={red:C.red,yellow:C.amber,green:C.green};
const TINT={red:"#FBE9E7",yellow:"#FFF3C9",green:"#E3F4EC"};
const LEV={red:"À risque",yellow:"Vigilance",green:"Bon"};
const SHORT={planning:"Planning",cash:"Cash",risques:"Risques",com:"Client"};
const MSS=[["arrivee","Arrivée"],["tests","Tests"],["finProd","Fin de production"],["depart","Départ"]];
const MONTHS=["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
const PAGE_W=1123;                       // 297 mm à 96 dpi — sert au calcul de l'échelle de l'aperçu
const FIRST_ROWS=8,NEXT_ROWS=15;         // lignes du tableau de synthèse : 1re page / suivantes

const dOf=v=>v?new Date(v):null;
const fd=d=>d?d.getDate()+" "+MONTHS[d.getMonth()]+" "+d.getFullYear():"—";
const fdm=d=>d?d.getDate()+" "+MONTHS[d.getMonth()]:"—";
const sg=d=>d==null?"—":d===0?"=":(d>0?"+":"−")+Math.abs(d)+" j";
const plural=(n,a,b)=>n>1?b:a;

// ── Petites briques ───────────────────────────────────────────────────────────────────────────────────────────
function Orb({lv,size=18}){
  if(!lv)return <span style={{width:size,height:size,borderRadius:"50%",border:"1.5px dashed "+C.faint,boxSizing:"border-box",display:"inline-block",flexShrink:0}}/>;
  const h=Math.round(size*.28);
  return <span style={{width:size,height:size,borderRadius:"50%",background:FC[lv],display:"inline-block",flexShrink:0,margin:h,boxShadow:"0 0 0 "+h+"px "+TINT[lv]}}/>;
}
const Cap=({children,style})=><div style={{fontSize:8.5,fontWeight:700,letterSpacing:".14em",textTransform:"uppercase",color:C.mute,...style}}>{children}</div>;
function Section({title,right,children,style}){
  return(<div style={style}>
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:9}}>
      <span style={{fontSize:9,fontWeight:800,letterSpacing:".2em",textTransform:"uppercase",color:C.navy2}}>{title}</span>
      <span style={{flex:1,height:1,background:C.hair}}/>
      {right&&<span style={{fontSize:9.5,color:C.mute}}>{right}</span>}
    </div>{children}</div>);
}
function Donut({v,size=62,color}){
  const r=(size-9)/2,c=2*Math.PI*r,m=size/2;
  return(<svg width={size} height={size} viewBox={"0 0 "+size+" "+size} style={{flexShrink:0}}>
    <circle cx={m} cy={m} r={r} fill="none" stroke={C.hair} strokeWidth="6"/>
    {v>0&&<circle cx={m} cy={m} r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" strokeDasharray={(c*Math.max(0,Math.min(100,v))/100)+" "+c} transform={"rotate(-90 "+m+" "+m+")"}/>}
    <text x={m} y={m} textAnchor="middle" dominantBaseline="central" fontFamily={F_DISPLAY} fontSize={size*.27} fontWeight="600" fill={C.ink}>{v}%</text>
  </svg>);
}
function Chip({children,color,bg,style}){return <span style={{display:"inline-block",background:bg,color,borderRadius:99,padding:"2px 9px",fontSize:9.5,fontWeight:800,letterSpacing:".02em",whiteSpace:"nowrap",...style}}>{children}</span>;}
const delta=d=>d==null||d===0?null:<Chip color={d>0?C.red:C.green} bg={d>0?TINT.red:TINT.green}>{sg(d)}</Chip>;

// ── Données d'un PJ pour le rapport ───────────────────────────────────────────────────────────────────────────
function pjInfo(r,{initialByPj,comments,delays,progress}){
  const meta=getPjMeta(r.pj,r);
  const feux=feuxOf(meta);
  const ini=initialByPj[r.pj]||null;
  const dl=[...(delays?.[r.pj]||[])];
  const byType={};dl.forEach(d=>{byType[d.type]=(byType[d.type]||0)+(d.days||0);});
  const types=Object.entries(byType).sort((a,b)=>b[1]-a[1]);
  const cm=(comments?.[r.pj]||[]).filter(c=>!c.private).sort((a,b)=>new Date(b.date)-new Date(a.date));
  const pv=progress&&progress[r.pj]!=null?progress[r.pj]:r.etat==="SHIPPED"?100:0;
  const dep=dOf(r.depart),tf=meta.contratTFin?dOf(meta.contratTFin):null,t0=meta.contratT0?dOf(meta.contratT0):null;
  const drift=ini&&ini.depart&&dep?diffDays(dOf(ini.depart),dep):null;
  const ecart=tf&&dep?diffDays(tf,dep):null;
  const notes=meta.notes||{};
  return{r,meta,feux,notes,ini,types,totalDelay:dl.reduce((a,d)=>a+(d.days||0),0),nDelays:dl.length,comments:cm,pv,dep,tf,t0,drift,ecart,worst:worstFeu(feux)};
}
const severity=i=>{const v=Object.values(i.feux);return v.filter(l=>l==="red").length*100+v.filter(l=>l==="yellow").length*10+(i.ecart>0?5:0);};

// ── Cadre de page ────────────────────────────────────────────────────────────────────────────────────────────
const Page=({children,bg})=><div className="codir-page" style={{width:"297mm",height:"210mm",background:bg||"#fff",display:"flex",flexDirection:"column",overflow:"hidden",boxSizing:"border-box",fontFamily:F_BODY,color:C.ink,margin:"0 auto 18px",boxShadow:"0 2px 14px rgba(15,25,50,.18)",position:"relative"}}>{children}</div>;
function TopBar(){return <div style={{height:"3.2mm",background:C.navy,flexShrink:0,position:"relative"}}><span style={{position:"absolute",left:"12mm",top:0,bottom:0,width:"26mm",background:C.brass}}/></div>;}
function Masthead({eyebrow,title,sub,right}){
  return(<div style={{padding:"5.5mm 12mm 0",display:"flex",alignItems:"flex-start",gap:18,flexShrink:0}}>
    <div style={{minWidth:0,flex:1}}>
      <div style={{fontSize:9.5,fontWeight:800,letterSpacing:".2em",textTransform:"uppercase",color:C.brass,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{eyebrow}</div>
      <div style={{fontFamily:F_DISPLAY,fontSize:25,fontWeight:500,color:C.navy,lineHeight:1.1,marginTop:3,letterSpacing:"-.01em",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{title}</div>
      {sub&&<div style={{fontSize:11.5,color:C.mute,marginTop:5,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>{sub}</div>}
    </div>
    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8,flexShrink:0}}>
      <img src={process.env.PUBLIC_URL+"/enogia-logo-color-crop.svg"} alt="ENOGIA" style={{height:24,width:"auto"}}/>
      {right}
    </div>
  </div>);
}
function Footer({label,page,total,dark}){
  const c=dark?"rgba(255,255,255,.55)":C.faint;
  return(<div style={{height:"9mm",padding:"0 12mm",display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:8.5,letterSpacing:".06em",color:c,flexShrink:0}}>
    <span style={{textTransform:"uppercase",fontWeight:700,letterSpacing:".16em"}}>ENOGIA · {label}</span><span>Confidentiel · {String(page).padStart(2,"0")} / {String(total).padStart(2,"0")}</span>
  </div>);
}

// ── Page de garde ────────────────────────────────────────────────────────────────────────────────────────────
function CoverPage({label,all,page,total}){
  const risk=all.filter(i=>i.worst==="red").length,watch=all.filter(i=>i.worst==="yellow").length,soon=all.filter(i=>i.dep&&diffDays(today,i.dep)>=0&&diffDays(today,i.dep)<=30).length;
  const st=(v,l)=><div><div style={{fontFamily:F_DISPLAY,fontSize:40,fontWeight:500,color:"#fff",lineHeight:1}}>{v}</div><div style={{fontSize:9,fontWeight:700,letterSpacing:".16em",textTransform:"uppercase",color:"rgba(255,255,255,.6)",marginTop:8}}>{l}</div></div>;
  return(<Page bg={C.navy}>
    <div style={{position:"absolute",inset:0,background:"radial-gradient(120% 90% at 85% 100%,#2C4478 0%,#1A2B52 38%,#0B1330 100%)"}}/>
    <svg style={{position:"absolute",right:"-40mm",bottom:"-55mm",opacity:.5}} width="420" height="420" viewBox="0 0 420 420" fill="none">
      {[60,110,160,210].map((r,n)=><circle key={r} cx="210" cy="210" r={r} stroke="#B08D57" strokeOpacity={.55-n*.1} strokeWidth="1.2"/>)}
    </svg>
    <div style={{position:"relative",flex:1,padding:"16mm 20mm 0",display:"flex",flexDirection:"column"}}>
      <img src={process.env.PUBLIC_URL+"/enogia-logo-white.svg"} alt="ENOGIA" style={{height:34,width:"auto",alignSelf:"flex-start"}}/>
      <div style={{marginTop:"auto",marginBottom:"22mm"}}>
        <div style={{width:"22mm",height:3,background:C.brass,marginBottom:"7mm"}}/>
        <div style={{fontSize:11,fontWeight:700,letterSpacing:".28em",textTransform:"uppercase",color:C.brass}}>Revue de portefeuille · BU ORC</div>
        <div style={{fontFamily:F_DISPLAY,fontSize:66,fontWeight:500,color:"#fff",lineHeight:1.02,marginTop:12,letterSpacing:"-.02em"}}>Comité de<br/>Direction</div>
        <div style={{fontSize:17,color:"rgba(255,255,255,.78)",marginTop:16,fontWeight:300}}>{label.replace(/^CODIR du /,"")}</div>
      </div>
      <div style={{display:"flex",gap:"16mm",paddingTop:"7mm",borderTop:"1px solid rgba(255,255,255,.2)",marginBottom:"14mm"}}>
        {st(all.length,plural(all.length,"Projet suivi","Projets suivis"))}{st(risk,"À risque")}{st(watch,"En vigilance")}{st(soon,"Départs sous 30 j")}
      </div>
    </div>
    <Footer label="Document confidentiel" page={page} total={total} dark/>
  </Page>);
}

// ── Synthèse du portefeuille ─────────────────────────────────────────────────────────────────────────────────
function takeaways(all){
  const out=[];
  const red=all.filter(i=>i.worst==="red");
  if(red.length)out.push([C.red,<><b>{red.length} {plural(red.length,"projet à risque","projets à risque")}</b> — {red.slice(0,4).map(i=>i.r.pj+" ("+FEUX.filter(([k])=>i.feux[k]==="red").map(([k])=>SHORT[k].toLowerCase()).join(", ")+")").join(" · ")}{red.length>4?" …":""}</>]);
  const late=all.filter(i=>i.ecart>0).sort((a,b)=>b.ecart-a.ecart);
  if(late.length)out.push([C.red,<><b>{late.length} {plural(late.length,"projet dépasse","projets dépassent")} la fin contractuelle</b> — le plus tendu : {late[0].r.pj}, {sg(late[0].ecart)}</>]);
  const soon=all.filter(i=>i.dep&&diffDays(today,i.dep)>=0&&diffDays(today,i.dep)<=30).sort((a,b)=>a.dep-b.dep);
  if(soon.length)out.push([C.amber,<><b>{soon.length} {plural(soon.length,"départ","départs")} sous 30 jours</b> — {soon.slice(0,4).map(i=>i.r.pj+" ("+fdm(i.dep)+")").join(" · ")}</>]);
  const ty={};all.forEach(i=>i.types.forEach(([t,d])=>{ty[t]=(ty[t]||0)+d;}));
  const top=Object.entries(ty).sort((a,b)=>b[1]-a[1])[0];
  if(top)out.push([C.navy3,<><b>Première cause de retard : {top[0]}</b> — {top[1]} j cumulés sur le périmètre</>]);
  const none=all.filter(i=>!Object.keys(i.feux).length).length;
  if(none)out.push([C.faint,<><b>{none} {plural(none,"projet non évalué","projets non évalués")}</b> — feux à renseigner dans l'onglet Santé projets</>]);
  if(!out.length)out.push([C.green,<><b>Aucun point d'alerte</b> sur le périmètre sélectionné</>]);
  return out.slice(0,5);
}
function SummaryPage({chunk,idx,label,page,total,all}){
  const first=idx===0;
  const count=(k,lv)=>all.filter(i=>(i.feux[k]||null)===lv).length;
  const risk=all.filter(i=>i.worst==="red").length,watch=all.filter(i=>i.worst==="yellow").length;
  const late=all.filter(i=>i.ecart>0).length;
  const kpi=(v,l,c)=><div style={{flex:1,paddingLeft:16,borderLeft:"1px solid "+C.hair}}><div style={{fontFamily:F_DISPLAY,fontSize:38,fontWeight:500,color:c||C.navy,lineHeight:1}}>{v}</div><Cap style={{marginTop:7}}>{l}</Cap></div>;
  const COLS="74px minmax(130px,1.5fr) 110px 100px 92px 98px repeat(4,26px)";
  return(<Page>
    <TopBar/>
    <Masthead eyebrow={label} title={first?"Synthèse du portefeuille":"Synthèse du portefeuille (suite)"} sub={<span>{all.length} {plural(all.length,"projet","projets")} · classés du plus au moins critique</span>}/>
    <div style={{flex:1,minHeight:0,padding:"6mm 12mm 0",display:"flex",flexDirection:"column",gap:"6mm"}}>
      {first&&<>
        <div style={{display:"flex",gap:0}}>
          <div style={{flex:1,paddingRight:16}}><div style={{fontFamily:F_DISPLAY,fontSize:38,fontWeight:500,color:C.navy,lineHeight:1}}>{all.length}</div><Cap style={{marginTop:7}}>Projets suivis</Cap></div>
          {kpi(risk,"À risque",C.red)}{kpi(watch,"En vigilance",C.amber)}{kpi(late,"Au-delà du contrat",late?C.red:C.green)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1.25fr",gap:"10mm"}}>
          <Section title="Répartition des feux">
            {FEUX.map(([k,lab])=>{const n=all.length||1;const none=all.filter(i=>!i.feux[k]).length;return(
              <div key={k} style={{display:"grid",gridTemplateColumns:"92px 1fr 70px",gap:10,alignItems:"center",padding:"3.5px 0",fontSize:10.5}}>
                <span style={{fontWeight:600,color:C.ink2}}>{lab.replace(" / Problèmes","").replace(" client","")}</span>
                <div style={{display:"flex",height:7,borderRadius:7,overflow:"hidden",background:C.wash}}>{["red","yellow","green"].map(lv=>count(k,lv)>0&&<div key={lv} style={{width:count(k,lv)/n*100+"%",background:FC[lv]}}/>)}</div>
                <span style={{fontSize:10,fontWeight:700,display:"flex",gap:6}}>{["red","yellow","green"].map(lv=><span key={lv} style={{color:FC[lv],opacity:count(k,lv)?1:.3}}>{count(k,lv)}</span>)}{none>0&&<span style={{color:C.faint,fontWeight:500}}>·{none}</span>}</span>
              </div>);})}
          </Section>
          <Section title="À retenir">
            {takeaways(all).map(([c,t],n)=><div key={n} style={{display:"flex",gap:10,alignItems:"flex-start",padding:"3px 0",fontSize:10.5,lineHeight:1.45,color:C.ink2}}><span style={{width:6,height:6,borderRadius:"50%",background:c,marginTop:6,flexShrink:0}}/><span>{t}</span></div>)}
          </Section>
        </div>
      </>}
      <div style={{flex:1,minHeight:0}}>
        <div style={{display:"grid",gridTemplateColumns:COLS,gap:12,alignItems:"end",padding:"0 0 6px",borderBottom:"1.5px solid "+C.navy,fontSize:8.5,fontWeight:800,letterSpacing:".14em",textTransform:"uppercase",color:C.navy2}}>
          <span>PJ</span><span>Projet</span><span>Pays</span><span>Avancement</span><span>Départ</span><span>Écart contrat</span>
          {FEUX.map(([k])=><span key={k} title={k} style={{textAlign:"center",letterSpacing:0}}>{SHORT[k][0]}</span>)}
        </div>
        {chunk.map((i,n)=>{const em=ETAT_META[i.r.etat]||ETAT_META["NOT ORDERED"];return(
          <div key={i.r.pj} style={{display:"grid",gridTemplateColumns:COLS,gap:12,alignItems:"center",padding:"6.5px 0",fontSize:11,borderBottom:"1px solid "+C.hair}}>
            <span style={{fontWeight:800,color:C.navy,letterSpacing:".01em"}}>{i.r.pj}{i.meta.numSerie&&<div style={{fontSize:8.5,fontWeight:500,color:C.mute,letterSpacing:0,marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>S/N {i.meta.numSerie}</div>}</span>
            <span style={{minWidth:0}}><div style={{fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{i.meta.nomProjet}</div><div style={{fontSize:9,color:C.mute,marginTop:1,display:"flex",alignItems:"center",gap:5}}><span style={{width:6,height:6,borderRadius:"50%",background:em.text}}/>{em.label}</div></span>
            <span style={{display:"inline-flex",alignItems:"center",gap:6,whiteSpace:"nowrap",overflow:"hidden",color:C.ink2}}>{i.meta.pays&&i.meta.pays!=="—"&&<CountryFlag pays={i.meta.pays} size={11}/>}{i.meta.pays}</span>
            <span style={{display:"flex",alignItems:"center",gap:7}}><div style={{flex:1,height:4,borderRadius:4,background:C.hair,overflow:"hidden"}}><div style={{width:i.pv+"%",height:"100%",background:i.pv>=100?C.green:C.navy2,borderRadius:4}}/></div><span style={{fontWeight:700,fontSize:10,width:28,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{i.pv}%</span></span>
            <span style={{fontVariantNumeric:"tabular-nums",color:C.ink2}}>{i.dep?fdm(i.dep)+" "+String(i.dep.getFullYear()).slice(2):"—"}</span>
            <span style={{fontWeight:800,fontVariantNumeric:"tabular-nums",color:i.ecart==null?C.faint:i.ecart>0?C.red:C.green}}>{i.ecart==null?"—":i.ecart===0?"=":sg(i.ecart)}</span>
            {FEUX.map(([k])=><span key={k} style={{textAlign:"center",lineHeight:0,display:"flex",justifyContent:"center"}}><Orb lv={i.feux[k]||null} size={11}/></span>)}
          </div>);})}
        <div style={{display:"flex",gap:16,fontSize:9,color:C.mute,alignItems:"center",marginTop:10}}>
          {FEU_LEVELS.map(([lv])=><span key={lv} style={{display:"inline-flex",alignItems:"center",gap:4}}><Orb lv={lv} size={7}/>{LEV[lv]}</span>)}
          <span style={{display:"inline-flex",alignItems:"center",gap:4}}><Orb lv={null} size={9}/>Non évalué</span>
          <span style={{marginLeft:"auto"}}>Feux : P Planning · C Cash · R Risques · C Client — Écart contrat = départ prévu − Tfin</span>
        </div>
      </div>
    </div>
    <Footer label={label} page={page} total={total}/>
  </Page>);
}

// ── Roadmap contrat / réalisation ────────────────────────────────────────────────────────────────────────────
function Roadmap({i,h=196}){
  const r=i.r,DAY=86400000,Y=n=>Math.round(n*h/196),cap1=Math.max(12,Y(24)),b1=Math.max(23,Y(40));
  const ta=dOf(r.arrivee),tt=dOf(r.tests),ttf=dOf(r.testsFin)||tt;
  const pts=[ta,tt,ttf,i.dep,i.tf].filter(Boolean).map(d=>+d);
  if(pts.length<2||(!i.tf&&!i.t0))return <div style={{color:C.faint,fontSize:11,padding:"14px 0"}}>Renseignez T0 / Tfin dans la fiche synthèse pour afficher la roadmap contractuelle.</div>;
  // Axe : de l'arrivée (−45 j) jusqu'à la fin la plus tardive (+25 j). Un T0 plus ancien est coupé (flèche ◂).
  const first=Math.min(...pts);
  const lo0=first-45*DAY,hi=Math.max(...pts)+25*DAY;
  const clipped=i.t0&&+i.t0<lo0,lo=clipped?lo0:Math.min(lo0,i.t0?+i.t0:lo0);
  const X=d=>(+d-lo)/(hi-lo)*100;
  const q=[];let cur=new Date(new Date(lo).getFullYear(),Math.floor(new Date(lo).getMonth()/3)*3,1);
  while(+cur<hi){const nx=new Date(cur.getFullYear(),cur.getMonth()+3,1);q.push({a:Math.max(+cur,lo),b:Math.min(+nx,hi),label:"T"+(Math.floor(cur.getMonth()/3)+1)+" "+cur.getFullYear()});cur=nx;}
  const band=(a,b,color,top,h,label,extra)=>{if(a==null||b==null)return null;const x=X(a),y=X(b);if(y<=x)return null;return <div style={{position:"absolute",left:x+"%",width:(y-x)+"%",top,height:h,background:color,color:"#fff",fontSize:8.5,fontWeight:800,letterSpacing:".06em",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",whiteSpace:"nowrap",...extra}}>{(y-x)>7?label:""}</div>;};
  const tx=X(today);
  const mark=(d,color,txt,top)=>d?<div style={{position:"absolute",left:X(d)+"%",top,transform:"translateX(-50%)",textAlign:"center",whiteSpace:"nowrap"}}><div style={{width:0,height:0,borderLeft:"4px solid transparent",borderRight:"4px solid transparent",borderBottom:"5px solid "+color,margin:"0 auto"}}/><div style={{fontSize:9,fontWeight:800,color,marginTop:1}}>{txt}</div></div>:null;
  const prodEnd=tt||ttf;
  return(<div>
    <div style={{position:"relative",height:h}}>
      {q.map((s,n)=><div key={n} style={{position:"absolute",left:X(s.a)+"%",width:(X(s.b)-X(s.a))+"%",top:0,bottom:0,borderLeft:n?"1px dashed "+C.hair:"none"}}><span style={{position:"absolute",top:0,left:6,fontSize:8.5,fontWeight:700,letterSpacing:".1em",textTransform:"uppercase",color:C.faint}}>{s.label}</span></div>)}
      <Cap style={{position:"absolute",top:cap1,left:0,fontSize:8}}>Contrat</Cap>
      {band(clipped?lo:i.t0,i.tf,"#C9D2E6",b1,Y(26),"T0 → Tfin",{color:C.navy2,borderRadius:clipped?"0 6px 6px 0":6})}
      {clipped&&<div style={{position:"absolute",left:0,top:b1,height:Y(26),display:"flex",alignItems:"center",fontSize:9,fontWeight:800,color:C.navy2,paddingLeft:5}}>◂ T0 {fd(i.t0)}</div>}
      {i.tf&&i.dep&&+i.dep>+i.tf&&band(i.tf,i.dep,C.red,b1,Y(26),"+"+i.ecart+" j",{borderRadius:"0 6px 6px 0"})}
      <Cap style={{position:"absolute",top:Y(104),left:0,fontSize:8}}>Réalisation</Cap>
      {band(ta,prodEnd,C.navy2,Y(120),Y(26),"PRODUCTION",{borderRadius:"6px 0 0 6px"})}
      {tt&&band(tt,ttf&&+ttf>+tt?ttf:new Date(+tt+1.5*DAY),C.amber,Y(120),Y(26),"TESTS",{})}
      {band(ttf,i.dep,C.green,Y(120),Y(26),"FINITION",{borderRadius:"0 6px 6px 0"})}
      {mark(i.tf,C.navy2,"Tfin "+fdm(i.tf),Y(68))}
      {mark(i.dep,i.ecart>0?C.red:C.green,"Départ "+fdm(i.dep),Y(148))}
      {tx>=0&&tx<=100&&<div style={{position:"absolute",left:tx+"%",top:16,bottom:14,borderLeft:"1.5px dashed "+C.brass}}><span style={{position:"absolute",bottom:-13,left:-30,width:60,textAlign:"center",fontSize:8,fontWeight:800,letterSpacing:".1em",textTransform:"uppercase",color:C.brass}}>Aujourd'hui</span></div>}
    </div>
  </div>);
}

// ── Page d'un PJ ─────────────────────────────────────────────────────────────────────────────────────────────
function PjPage({i,label,page,total,includeComments}){
  const r=i.r,m=i.meta;
  const kind=presenceKind(r.clientPresence);
  const em=ETAT_META[r.etat]||ETAT_META["NOT ORDERED"];
  const stat=(d,idx)=>{if(!d)return"none";if(d<=today)return"done";const prev=idx>0?dOf(r[MSS[idx-1][0]]):null;return(!prev||prev<=today)?"now":"next";};
  const hasPays=m.pays&&m.pays!=="—";
  const wl=i.worst;
  const codirNote=(i.notes.codir||i.notes.headline||"").trim();
  const noteItems=NOTE_ORDER.filter(k=>(i.notes[k]||"").trim()).slice(0,6);
  const kpiCol=(k,children,first)=><div key={k} style={{flex:1,minWidth:0,paddingLeft:first?0:18,borderLeft:first?"none":"1px solid "+C.hair}}>{children}</div>;
  const big=(v,c)=><div style={{fontFamily:F_DISPLAY,fontSize:27,fontWeight:500,color:c||C.navy,lineHeight:1,letterSpacing:"-.02em",whiteSpace:"nowrap"}}>{v}</div>;
  const note=t=><div style={{fontSize:9.5,color:C.mute,marginTop:4,lineHeight:1.35}}>{t}</div>;
  return(<Page>
    <TopBar/>
    <Masthead eyebrow={label} title={<span style={{display:"inline-flex",alignItems:"baseline",gap:16}}><span style={{fontSize:36,fontWeight:700,letterSpacing:"-.02em"}}>{r.pj}</span>{r.gamme&&<span style={{display:"inline-flex",alignItems:"center",gap:8,fontSize:26,fontWeight:500,color:C.navy3}}><span style={{width:11,height:11,borderRadius:"50%",background:C.brass,alignSelf:"center"}}/>{r.gamme}</span>}{m.numSerie&&<span title="N° de série" style={{alignSelf:"center",fontSize:14,fontWeight:600,color:C.navy2,background:C.wash,border:"1px solid "+C.hair,borderRadius:7,padding:"2px 10px",letterSpacing:".02em",whiteSpace:"nowrap"}}>S/N {m.numSerie}</span>}</span>}
      sub={<><span style={{fontSize:14,fontWeight:500,color:C.ink2}}>{m.nomProjet||r.pj}</span>{m.chefProjet&&m.chefProjet!=="—"&&<span>{m.chefProjet}</span>}<span style={{display:"inline-flex",alignItems:"center",gap:6,color:C.ink2,fontWeight:600}}><span style={{width:7,height:7,borderRadius:"50%",background:em.text}}/>{em.label}</span>{hasPays&&<span style={{display:"inline-flex",alignItems:"center",gap:6}}><CountryFlag pays={m.pays} size={12}/>{m.pays}</span>}</>}
      right={wl?<span style={{display:"inline-flex",alignItems:"center",gap:4,background:TINT[wl],color:FC[wl],borderRadius:99,padding:"3px 12px 3px 5px",fontSize:10.5,fontWeight:800}}><Orb lv={wl} size={7}/>&nbsp;Statut global : {LEV[wl]}</span>:null}/>
    <div style={{flex:1,minHeight:0,padding:"4mm 12mm 0",display:"flex",flexDirection:"column",gap:"4mm"}}>
      <Section title="Statut global" right={i.meta.feuxAt?"évalué le "+fd(dOf(i.meta.feuxAt)):null}>
        <div style={{display:"flex"}}>
          {FEUX.map(([k,lab],n)=>{const lv=i.feux[k]||null;return(
            <div key={k} style={{flex:1,display:"flex",alignItems:"center",gap:12,paddingLeft:n?18:0,borderLeft:n?"1px solid "+C.hair:"none"}}>
              <Orb lv={lv} size={15}/>
              <div><Cap style={{fontSize:8}}>{lab}</Cap><div style={{fontFamily:F_DISPLAY,fontSize:14,fontWeight:500,color:lv?FC[lv]:C.faint,marginTop:1}}>{lv?LEV[lv]:"Non évalué"}</div></div>
            </div>);})}
        </div>
      </Section>
      <Section title="Indicateurs clés">
        <div style={{display:"flex"}}>
          {kpiCol("av",<div style={{display:"flex",alignItems:"center",gap:14}}><Donut v={i.pv} size={52} color={i.pv>=100?C.green:C.navy2}/><div><Cap>Avancement</Cap>{note("Production chez ENOGIA")}</div></div>,true)}
          {kpiCol("dr",<><Cap style={{marginBottom:6}}>Dérive du départ</Cap>{big(i.ini?sg(i.drift):"—",i.drift>0?C.red:i.drift<0?C.green:C.navy)}{note(i.ini?(i.drift===0?"conforme au planning initial":"initial : "+fd(dOf(i.ini.depart))):"pas de planning initial")}</>)}
          {kpiCol("rt",<><Cap style={{marginBottom:6}}>Retards déclarés</Cap>{big(i.totalDelay>0?i.totalDelay+" j":"0",i.totalDelay>0?C.red:C.navy)}{note(i.totalDelay>0?i.nDelays+" "+plural(i.nDelays,"cause","causes")+" consignée"+(i.nDelays>1?"s":""):"aucun retard consigné")}</>)}
        </div>
      </Section>
      <Section title="Jalons">
        <div style={{position:"relative",display:"grid",gridTemplateColumns:"repeat(4,1fr)"}}>
          <div style={{position:"absolute",left:"12.5%",right:"12.5%",top:8,height:2,background:C.hair}}/>
          {MSS.map(([k,lab],n)=>{const d=dOf(r[k]),iv=i.ini?dOf(i.ini[k]):null,dl=d&&iv?diffDays(iv,d):null,st=stat(d,n);
            const mk=st==="done"?{background:C.navy2,border:"2px solid "+C.navy2}:st==="now"?{background:"#fff",border:"3px solid "+C.brass,boxShadow:"0 0 0 4px #F3EBDD"}:{background:"#fff",border:"2px "+(st==="none"?"dashed ":"solid ")+C.faint};
            return(<div key={k} style={{position:"relative",textAlign:"center",padding:"0 8px"}}>
              <div style={{width:17,height:17,borderRadius:"50%",boxSizing:"border-box",margin:"0 auto 6px",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:11,fontWeight:800,...mk}}>{st==="done"?"✓":""}</div>
              <Cap>{lab}</Cap>
              <div style={{fontFamily:F_DISPLAY,fontSize:15,fontWeight:500,color:C.navy,marginTop:3,whiteSpace:"nowrap"}}>{fd(d)}</div>
              {k==="tests"&&r.testsFin&&<div style={{fontSize:9.5,color:C.mute,marginTop:1}}>→ {fd(dOf(r.testsFin))}</div>}
              <div style={{marginTop:4,minHeight:17,display:"flex",justifyContent:"center",alignItems:"center",gap:7,fontSize:9.5,color:C.faint,flexWrap:"wrap"}}>
                {iv&&dl!==0&&<span style={{textDecoration:"line-through"}}>{fdm(iv)}</span>}{delta(dl)}
                {k==="tests"&&kind&&<span style={{background:presenceBg(kind),color:PRESENCE_META[kind].ink,borderRadius:99,padding:"2px 10px",fontWeight:800,fontSize:9.5}}>{PRESENCE_META[kind].label}{r.clientPresence.date?" · "+fdm(dOf(r.clientPresence.date)):""}</span>}
              </div>
            </div>);})}
        </div>
      </Section>
      <div style={{flex:1,minHeight:0,overflow:"hidden",display:"grid",gridTemplateColumns:"1.45fr 1fr",gap:"10mm"}}>
        <Section title="Contrat & roadmap" style={{minWidth:0}}>
          <div style={{display:"flex",marginBottom:8}}>
            {[["T0",i.t0?fd(i.t0):"—",C.navy],["Tfin contractuelle",i.tf?fd(i.tf):"—",C.navy],["Fin projetée",i.dep?fd(i.dep):"—",i.ecart>0?C.red:C.navy],["Écart",i.ecart==null?"—":i.ecart===0?"dans les temps":sg(i.ecart),i.ecart==null?C.faint:i.ecart>0?C.red:C.green]].map(([l,v,c],n)=>
              <div key={l} style={{flex:1,paddingLeft:n?14:0,borderLeft:n?"1px solid "+C.hair:"none",minWidth:0}}><Cap style={{fontSize:8}}>{l}</Cap><div style={{fontFamily:F_DISPLAY,fontSize:14,fontWeight:500,color:c,marginTop:2,whiteSpace:"nowrap"}}>{v}</div></div>)}
          </div>
          <Roadmap i={i} h={noteItems.length>3?142:noteItems.length>0||codirNote?160:190}/>
        </Section>
        <Section title="Risques & points d'attention" style={{minWidth:0}}>
          {i.types.length===0&&(!includeComments||i.comments.length===0)&&<div style={{display:"flex",alignItems:"center",gap:9,fontSize:11.5,color:C.mute,padding:"4px 0"}}><Orb lv="green" size={9}/>Aucun point signalé sur ce projet.</div>}
          {i.types.slice(0,4).map(([t,d])=><div key={t} style={{display:"grid",gridTemplateColumns:"1fr 74px 34px",gap:10,alignItems:"center",fontSize:11,padding:"4px 0"}}>
            <span style={{fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{t}</span><div style={{height:5,borderRadius:5,background:C.hair,overflow:"hidden"}}><div style={{width:d/i.types[0][1]*100+"%",height:"100%",background:C.red,borderRadius:5}}/></div><b style={{textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{d} j</b></div>)}
          {i.types.length>4&&<div style={{fontSize:9.5,color:C.mute,marginTop:2}}>+ {i.types.length-4} autre{i.types.length-4>1?"s":""} {plural(i.types.length-4,"cause","causes")}</div>}
          {includeComments&&i.comments.slice(0,3).map((c,n)=><div key={n} style={{marginTop:n===0&&i.types.length?10:8,borderLeft:"2px solid "+C.brass,padding:"1px 0 1px 10px"}}>
            <div style={{fontSize:10.5,color:C.ink2,lineHeight:1.42}}>{c.text.length>170?c.text.slice(0,168)+"…":c.text}</div>
            <div style={{fontSize:8.5,color:C.faint,marginTop:3,letterSpacing:".06em",textTransform:"uppercase",fontWeight:700}}>{c.author} · {fdm(dOf(c.date))}</div></div>)}
        </Section>
      </div>
      {(codirNote||noteItems.length>0)&&<Section title="Commentaires" style={{flexShrink:0}}>
        {codirNote&&<div style={{borderLeft:"3px solid "+C.brass,padding:"1px 0 1px 12px",marginBottom:noteItems.length?"3mm":0}}>
          <div style={{fontSize:8.5,fontWeight:800,letterSpacing:".14em",textTransform:"uppercase",color:C.brass}}>Commentaire CODIR</div>
          <div style={{fontSize:11,lineHeight:1.45,color:C.ink,marginTop:3,fontWeight:500,display:"-webkit-box",WebkitLineClamp:4,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{codirNote}</div>
        </div>}
        {noteItems.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"2.5mm 8mm"}}>
          {noteItems.map(k=>{const lv=i.feux[k]||null;return(<div key={k} style={{minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:6,fontSize:8,fontWeight:800,letterSpacing:".14em",textTransform:"uppercase",color:C.navy2}}>{FC[lv]?<span style={{width:6,height:6,borderRadius:"50%",background:FC[lv]}}/>:<span style={{width:6,height:6,borderRadius:2,background:C.brass}}/>}{NOTE_LABELS[k]}</div>
            <div style={{fontSize:9.5,lineHeight:1.4,color:C.ink2,marginTop:2,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{i.notes[k]}</div>
          </div>);})}
        </div>}
      </Section>}
    </div>
    <Footer label={label} page={page} total={total}/>
  </Page>);
}

// ── Dialogue : choix des PJ, aperçu, export PDF ─────────────────────────────────────────────────────────────
const PRINT_CSS=`@page{size:A4 landscape;margin:0}
@media print{
  html,body{background:#fff!important;margin:0!important}
  body>*:not(#codir-root){display:none!important}
  #codir-root{position:static!important;display:block!important;background:#fff!important;overflow:visible!important;height:auto!important}
  #codir-root .codir-noprint{display:none!important}
  #codir-root .codir-preview{overflow:visible!important;padding:0!important;background:#fff!important;height:auto!important;display:block!important}
  #codir-root .codir-pages{zoom:1!important}
  #codir-root .codir-page{margin:0!important;box-shadow:none!important;break-after:page;page-break-after:always;break-inside:avoid}
  #codir-root .codir-page:last-child{break-after:auto;page-break-after:auto}
  *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
}`;
export function CodirDialog({data,initialData,comments,delays,progress,onClose}){
  const initialByPj=useMemo(()=>{const m={};(initialData||[]).forEach(x=>{m[x.pj]=x;});return m;},[initialData]);
  const infosAll=useMemo(()=>data.map(r=>pjInfo(r,{initialByPj,comments,delays,progress})),[data,initialByPj,comments,delays,progress]);
  const [sel,setSel]=useState(()=>new Set(data.filter(r=>r.etat!=="SHIPPED").map(r=>r.pj)));
  const [q,setQ]=useState("");
  const [withCover,setWithCover]=useState(true);
  const [withSummary,setWithSummary]=useState(true);
  const [withComments,setWithComments]=useState(true);
  const [meeting,setMeeting]=useState(()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");});
  const [scale,setScale]=useState(.7);
  const prevRef=useRef(null);
  useEffect(()=>{
    const st=document.createElement("style");st.id="codir-print-style";st.textContent=PRINT_CSS;document.head.appendChild(st);
    const prevOverflow=document.body.style.overflow;document.body.style.overflow="hidden";
    const onKey=e=>{if(e.key==="Escape")onClose();};window.addEventListener("keydown",onKey);
    return()=>{st.remove();document.body.style.overflow=prevOverflow;window.removeEventListener("keydown",onKey);};
  },[onClose]);
  useEffect(()=>{
    const el=prevRef.current;if(!el)return;
    const upd=()=>setScale(Math.max(.3,Math.min(1,(el.clientWidth-40)/PAGE_W)));
    upd();const ro=typeof ResizeObserver!=="undefined"?new ResizeObserver(upd):null;ro&&ro.observe(el);return()=>ro&&ro.disconnect();
  },[]);
  const chosen=useMemo(()=>infosAll.filter(i=>sel.has(i.r.pj)).sort((a,b)=>severity(b)-severity(a)||a.r.pj.localeCompare(b.r.pj)),[infosAll,sel]);
  const listed=useMemo(()=>{const s=q.trim().toLowerCase();return infosAll.filter(i=>!s||i.r.pj.toLowerCase().includes(s)||(i.meta.nomProjet||"").toLowerCase().includes(s)||(i.meta.pays||"").toLowerCase().includes(s));},[infosAll,q]);
  const toggle=pj=>setSel(s=>{const n=new Set(s);n.has(pj)?n.delete(pj):n.add(pj);return n;});
  const setBy=f=>setSel(new Set(infosAll.filter(f).map(i=>i.r.pj)));
  const label="CODIR du "+new Date(meeting+"T12:00:00").toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"});
  const chunks=[];if(chosen.length){chunks.push(chosen.slice(0,FIRST_ROWS));for(let k=FIRST_ROWS;k<chosen.length;k+=NEXT_ROWS)chunks.push(chosen.slice(k,k+NEXT_ROWS));}
  const nCov=withCover&&chosen.length?1:0;const nSum=withSummary?chunks.length:0;const total=nCov+nSum+chosen.length;
  const chip=(on)=>({border:"1px solid "+(on?T.teal500:T.line),background:on?T.teal100:"transparent",color:on?T.teal600:T.ink500,borderRadius:8,padding:"3px 9px",fontSize:11.5,fontWeight:700,cursor:"pointer",fontFamily:T.font});
  return createPortal(
    <div id="codir-root" style={{position:"fixed",inset:0,zIndex:10050,background:T.surface,display:"flex",flexDirection:"column",fontFamily:T.font}}>
      <div className="codir-noprint" style={{display:"flex",alignItems:"center",gap:14,padding:"10px 18px",background:T.card,borderBottom:"1px solid "+T.line,flexWrap:"wrap"}}>
        <div style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:17,color:T.ink900,display:"flex",alignItems:"center",gap:9}}><NavIcon name="chart" size={18}/>Rapport CODIR</div>
        <label style={{display:"inline-flex",alignItems:"center",gap:7,fontSize:12.5,color:T.ink500,fontWeight:600}}>Date du CODIR<input type="date" value={meeting} onChange={e=>e.target.value&&setMeeting(e.target.value)} style={{padding:"4px 8px",borderRadius:8,border:"1px solid "+T.line,background:T.card,color:T.ink900,fontFamily:T.font,fontSize:12.5,colorScheme:T.mode==="dark"?"dark":"light"}}/></label>
        <label style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12.5,color:T.ink500,fontWeight:600,cursor:"pointer"}}><input type="checkbox" checked={withCover} onChange={e=>setWithCover(e.target.checked)}/>Page de garde</label>
        <label style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12.5,color:T.ink500,fontWeight:600,cursor:"pointer"}}><input type="checkbox" checked={withSummary} onChange={e=>setWithSummary(e.target.checked)}/>Page de synthèse</label>
        <label style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:12.5,color:T.ink500,fontWeight:600,cursor:"pointer"}} title="Seuls les commentaires non privés sont repris"><input type="checkbox" checked={withComments} onChange={e=>setWithComments(e.target.checked)}/>Derniers commentaires (non privés)</label>
        <span style={{marginLeft:"auto",fontSize:12.5,color:T.ink500}}>{chosen.length} projet{chosen.length>1?"s":""} · {total} page{total>1?"s":""}</span>
        <button disabled={total===0} onClick={()=>window.print()} style={{border:"none",borderRadius:9,padding:"8px 16px",fontWeight:700,fontSize:13.5,fontFamily:T.font,color:"#fff",cursor:total?"pointer":"default",background:total?"linear-gradient(135deg,"+T.teal500+","+T.navy700+")":T.ink100}}>Exporter en PDF</button>
        <button onClick={onClose} style={{border:"1px solid "+T.line,borderRadius:9,padding:"7px 14px",fontWeight:700,fontSize:13,fontFamily:T.font,background:"transparent",color:T.ink700,cursor:"pointer"}}>Fermer</button>
      </div>
      <div style={{flex:1,minHeight:0,display:"flex"}}>
        <div className="codir-noprint" style={{width:290,flexShrink:0,borderRight:"1px solid "+T.line,background:T.card,display:"flex",flexDirection:"column",minHeight:0}}>
          <div style={{padding:10,borderBottom:"1px solid "+T.line}}>
            <input type="text" value={q} onChange={e=>setQ(e.target.value)} placeholder="Rechercher un PJ, projet, pays…" style={{width:"100%",boxSizing:"border-box",padding:"6px 10px",borderRadius:8,border:"1px solid "+T.line,background:T.card,color:T.ink900,fontSize:12.5,fontFamily:T.font}}/>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:8}}>
              <button style={chip(false)} onClick={()=>setBy(()=>true)}>Tous</button>
              <button style={chip(false)} onClick={()=>setBy(i=>i.r.etat!=="SHIPPED")}>Hors expédiés</button>
              <button style={chip(false)} onClick={()=>setBy(i=>i.worst==="red")}>Feu rouge</button>
              <button style={chip(false)} onClick={()=>setBy(i=>i.worst==="red"||i.worst==="yellow")}>Rouge + jaune</button>
              <button style={chip(false)} onClick={()=>setSel(new Set())}>Aucun</button>
            </div>
            <div style={{fontSize:11.5,color:T.ink300,marginTop:6}}>{sel.size} sélectionné{sel.size>1?"s":""} sur {infosAll.length}</div>
          </div>
          <div style={{overflowY:"auto",flex:1}}>
            {listed.map(i=>{const on=sel.has(i.r.pj);return(
              <label key={i.r.pj} style={{display:"flex",alignItems:"center",gap:9,padding:"6px 12px",borderBottom:"1px solid "+T.surface,cursor:"pointer",background:on?T.teal100:"transparent"}}>
                <input type="checkbox" checked={on} onChange={()=>toggle(i.r.pj)}/>
                <div style={{minWidth:0,flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontFamily:T.fontMono,fontWeight:700,fontSize:12.5,color:T.teal600}}>{i.r.pj}</span><SerieTag pj={i.r.pj} size={10}/><CountryFlag pays={i.meta.pays} size={11}/></div>
                  <div style={{fontSize:11,color:T.ink500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{i.meta.nomProjet}</div>
                </div>
                <span style={{display:"inline-flex",gap:3}}>{FEUX.map(([k])=><span key={k} style={{width:7,height:7,borderRadius:"50%",background:i.feux[k]?FC[i.feux[k]]:T.ink100}}/>)}</span>
              </label>);})}
          </div>
        </div>
        <div ref={prevRef} className="codir-preview" style={{flex:1,minWidth:0,overflow:"auto",padding:"20px 20px 40px",background:T.mode==="dark"?"#161C24":"#E9EBEF"}}>
          {total===0?<div className="codir-noprint" style={{textAlign:"center",color:T.ink300,marginTop:80,fontSize:14}}>Sélectionnez au moins un projet à gauche.</div>:
          <div className="codir-pages" style={{zoom:scale,width:PAGE_W,margin:"0 auto"}}>
            {nCov>0&&<CoverPage label={label} all={chosen} page={1} total={total}/>}
            {withSummary&&chunks.map((ch,n)=><SummaryPage key={"s"+n} chunk={ch} idx={n} label={label} page={nCov+n+1} total={total} all={chosen}/>)}
            {chosen.map((i,n)=><PjPage key={i.r.pj} i={i} label={label} page={nCov+nSum+n+1} total={total} includeComments={withComments}/>)}
          </div>}
        </div>
      </div>
    </div>,document.body);
}

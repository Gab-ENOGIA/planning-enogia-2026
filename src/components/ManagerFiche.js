import React, { useState, useMemo } from "react";
import { T } from "../theme";
import { getPjMeta, CountryFlag, Avatar, GAMME_COLORS, ETAT_META, PresenceChip, PRESENCE_META, presenceKind, today } from "../pjMeta";
import { fmt, diffDays } from "../parsers";
import { Badge, NavIcon } from "./SharedUI";
import { CARD, EmptyNote } from "./ManagerParts";

// ── Fiche projet (Manager) ─────────────────────────────────────────────────────────────────────
// Demandé : « la fiche projet manque cruellement de style, fais-nous une fiche plus dense en
// information ». Tout ce qu'on sait d'un PJ tient maintenant sur un seul écran : bandeau d'identité,
// tuiles chiffrées, frise des 4 jalons (initial / révisé / écart), présence aux tests, retards par
// cause et fil de commentaires. Aucune donnée nouvelle : tout vient des lignes déjà chargées.
const MS=[["arrivee","Arrivée"],["tests","Tests"],["finProd","Fin de prod"],["depart","Départ"]];
const dOf=v=>v?new Date(v):null;
const fmtLong=d=>d?d.toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"}):"—";
const nf=n=>Math.round(n).toLocaleString("fr-FR");
const driftColor=d=>d==null?T.ink300:d>0?T.red500:d<0?T.emerald600:T.ink500;
const signed=d=>d==null?"—":(d>0?"+":"")+d+"j";

function Section({icon,title,right,children,pad=12}){
  return(<div style={{...CARD,padding:pad,minWidth:0}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,marginBottom:8}}>
      <div style={{display:"flex",alignItems:"center",gap:6,fontFamily:T.fontDisplay,fontWeight:600,fontSize:13.5,color:T.ink900}}>{icon&&<span style={{color:T.ink500,display:"inline-flex"}}><NavIcon name={icon} size={13}/></span>}{title}</div>
      {right}
    </div>
    {children}
  </div>);
}

function Tile({value,label,sub,color,wide}){
  return(<div style={{...CARD,padding:"6px 10px",borderTop:"2px solid "+color,minWidth:0,gridColumn:wide?"span 2":undefined}}>
    <div style={{fontFamily:T.fontDisplay,fontSize:17,fontWeight:700,color:T.ink900,lineHeight:1.1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{value}</div>
    <div style={{fontSize:10,fontWeight:700,color:T.ink500,marginTop:2,textTransform:"uppercase",letterSpacing:".04em",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{label}</div>
    {sub&&<div style={{fontSize:10.5,color:T.ink300,marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{sub}</div>}
  </div>);
}

function ProgressBar({value,height=8}){
  const c=value>=100?T.emerald500:value>=50?T.teal500:T.amber500;
  return(<div style={{background:T.surfaceAlt,borderRadius:20,height,overflow:"hidden",width:"100%"}}><div style={{width:Math.max(0,Math.min(100,value))+"%",height:"100%",background:c,borderRadius:20,transition:"width .25s ease"}}/></div>);
}

// Frise des 4 jalons : un nœud par étape, rempli quand la date est passée, avec date révisée en gras,
// date initiale barrée si elle a bougé, et l'écart en pastille colorée (rouge = glissement).
function Timeline({r,ini,kind}){
  const phaseColors={arrivee:T.teal500,tests:T.amber500,finProd:T.emerald500,depart:T.red500};
  return(<div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:0,position:"relative"}}>
    {MS.map(([k,label],i)=>{
      const rv=dOf(r[k]);const iv=ini?dOf(ini[k]):null;
      const delta=rv&&iv?diffDays(iv,rv):null;
      const past=rv&&rv<=today;
      const next=!past&&rv&&(i===0||(dOf(r[MS[i-1][0]])||0)<=today);
      const c=phaseColors[k];
      return(<div key={k} style={{position:"relative",textAlign:"center",padding:"0 6px",minWidth:0}}>
        {i>0&&<div style={{position:"absolute",top:8,left:"-50%",width:"100%",height:2,background:dOf(r[MS[i-1][0]])&&dOf(r[MS[i-1][0]])<=today&&past?phaseColors[MS[i-1][0]]:T.surfaceAlt,borderRadius:2,zIndex:0}}/>}
        <div style={{position:"relative",zIndex:1,margin:"0 auto",width:18,height:18,borderRadius:"50%",background:past?c:T.card,border:"2px solid "+(past||next?c:T.line),boxShadow:next?"0 0 0 3px "+c+"33":"none",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:10,fontWeight:800}}>{past?"✓":""}</div>
        <div style={{marginTop:4,fontSize:10,fontWeight:700,color:T.ink500,textTransform:"uppercase",letterSpacing:".04em"}}>{label}</div>
        <div style={{fontSize:13,fontWeight:800,color:T.ink900,marginTop:1}}>{rv?fmt(rv):"—"}</div>
        <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:5,marginTop:2,minHeight:17}}>
          {iv&&delta!==0&&<span style={{fontSize:10.5,color:T.ink300,textDecoration:"line-through"}}>{fmt(iv)}</span>}
          <span style={{fontSize:10.5,fontWeight:800,color:driftColor(delta),background:delta==null||delta===0?T.surface:delta>0?T.red100:T.emerald100,borderRadius:5,padding:"0 6px"}}>{delta===0?"=":signed(delta)}</span>
        </div>
        {k==="tests"&&kind&&<div style={{marginTop:3}}><PresenceChip kind={kind} date={r.clientPresence.date} compact/></div>}
      </div>);
    })}
  </div>);
}

export function ProjectFileManager({data,initialData,comments,delays,progress}){
  const [search,setSearch]=useState("");
  const [selPj,setSelPj]=useState(data[0]?.pj||null);
  const [onlyPrivate,setOnlyPrivate]=useState(false);
  const initialByPj=useMemo(()=>{const m={};(initialData||[]).forEach(x=>{m[x.pj]=x;});return m;},[initialData]);
  const pvOf=row=>progress&&progress[row.pj]!=null?progress[row.pj]:row.etat==="SHIPPED"?100:0;
  const filteredList=useMemo(()=>{
    const q=search.trim().toLowerCase();
    if(!q)return data;
    return data.filter(row=>{
      const m=getPjMeta(row.pj,row);
      return row.pj.toLowerCase().includes(q)||(m.nomProjet||"").toLowerCase().includes(q)||(m.pays||"").toLowerCase().includes(q)||(m.chefProjet||"").toLowerCase().includes(q)||(row.gamme||"").toLowerCase().includes(q);
    });
  },[data,search]);
  const r=data.find(x=>x.pj===selPj);
  const meta=r?getPjMeta(r.pj,r):null;
  const ini=r?initialByPj[r.pj]:null;
  const pjComments=useMemo(()=>{
    if(!r)return[];
    return (comments?.[r.pj]||[]).map((c,i)=>({...c,_idx:i})).sort((a,b)=>new Date(b.date)-new Date(a.date));
  },[comments,r]);
  const pjDelays=useMemo(()=>{
    if(!r)return[];
    return [...(delays?.[r.pj]||[])].sort((a,b)=>new Date(b.date)-new Date(a.date));
  },[delays,r]);
  const totalDelayDays=pjDelays.reduce((a,d)=>a+(d.days||0),0);
  const byType=useMemo(()=>{
    const m={};pjDelays.forEach(d=>{m[d.type]=(m[d.type]||0)+(d.days||0);});
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  },[pjDelays]);
  const nPrivate=pjComments.filter(c=>c.private).length;
  const shownComments=onlyPrivate?pjComments.filter(c=>c.private):pjComments;

  // Chiffres clés calculés à partir des jalons
  const kpi=useMemo(()=>{
    if(!r)return null;
    const a=dOf(r.arrivee),t=dOf(r.tests),tf=dOf(r.testsFin),fp=dOf(r.finProd),dp=dOf(r.depart);
    const di=ini?dOf(ini.depart):null;
    return{
      pv:pvOf(r),
      driftDepart:di&&dp?diffDays(di,dp):null,
      atelier:a&&dp?diffDays(a,dp):null,
      tests:t?(tf?diffDays(t,tf)+1:1):null,
      toDepart:dp?diffDays(today,dp):null,
      prod:a&&fp?diffDays(a,fp):null,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[r,ini,progress]);

  const kind=r?presenceKind(r.clientPresence):null;
  const gc=r?(GAMME_COLORS[r.gamme]||T.teal500):T.teal500;
  const em=r?(ETAT_META[r.etat]||ETAT_META["NOT ORDERED"]):null;

  return(<div style={{display:"flex",gap:12,alignItems:"flex-start",flexWrap:"wrap"}}>
    {/* ── Liste : avancement, état et compteurs visibles sans ouvrir la fiche ── */}
    <div style={{...CARD,width:250,flexShrink:0,maxHeight:"calc(100vh - 200px)",minHeight:300,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{padding:9,borderBottom:"1px solid "+T.line}}>
        <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher un PJ, projet, pays, chef, gamme…" style={{width:"100%",padding:"6px 10px",borderRadius:8,border:"1px solid "+T.line,fontSize:12.5,fontFamily:T.font,color:T.ink700,boxSizing:"border-box"}}/>
        <div style={{fontSize:11.5,color:T.ink300,marginTop:4}}>{filteredList.length} PJ</div>
      </div>
      <div style={{overflowY:"auto",flex:1}}>
        {filteredList.map(row=>{
          const m=getPjMeta(row.pj,row);
          const nCom=(comments?.[row.pj]||[]).length;
          const nDel=(delays?.[row.pj]||[]).length;
          const pk=presenceKind(row.clientPresence);
          const sel=selPj===row.pj;
          const ec=(ETAT_META[row.etat]||ETAT_META["NOT ORDERED"]);
          const pv=pvOf(row);
          return(<div key={row.pj} onClick={()=>setSelPj(row.pj)} style={{padding:"6px 10px 6px 9px",cursor:"pointer",background:sel?T.teal100:"transparent",borderLeft:"3px solid "+(sel?T.teal500:"transparent"),borderBottom:"1px solid "+T.line}}>
            <div style={{display:"flex",alignItems:"center",gap:7}}>
              <span style={{width:8,height:8,borderRadius:"50%",background:ec.text,flexShrink:0}} title={ec.label}/>
              <span style={{fontFamily:T.fontMono,fontWeight:700,color:T.teal600,fontSize:13}}>{row.pj}</span>
              <CountryFlag pays={m.pays} size={12}/>
              <span style={{marginLeft:"auto",fontSize:11,color:T.ink300,display:"inline-flex",alignItems:"center",gap:7}}>
                {pk&&<span title={"Présence aux tests : "+pk} style={{width:8,height:8,borderRadius:"50%",background:pk==="both"?"linear-gradient(90deg,"+PRESENCE_META.both.color+" 50%,"+PRESENCE_META.both.color2+" 50%)":PRESENCE_META[pk].color}}/>}
                {nCom>0&&<span style={{display:"inline-flex",alignItems:"center",gap:2}}><NavIcon name="comments" size={11}/>{nCom}</span>}
                {nDel>0&&<span style={{display:"inline-flex",alignItems:"center",gap:2,color:T.red500}}><NavIcon name="clock" size={11}/>{nDel}</span>}
              </span>
            </div>
            <div style={{fontSize:11.5,color:T.ink500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",marginTop:1}}>{m.nomProjet}</div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginTop:3}}>
              <div style={{flex:1}}><ProgressBar value={pv} height={3}/></div>
              <span style={{fontSize:10.5,fontWeight:700,color:T.ink500,width:30,textAlign:"right"}}>{pv}%</span>
              <span style={{fontSize:10.5,color:T.ink300}}>{row.depart?fmt(new Date(row.depart)):"—"}</span>
            </div>
          </div>);
        })}
        {filteredList.length===0&&<EmptyNote>Aucun résultat.</EmptyNote>}
      </div>
    </div>

    <div style={{flex:1,minWidth:340,display:"flex",flexDirection:"column",gap:10}}>
      {!r?<div style={{...CARD,padding:30,textAlign:"center",color:T.ink300}}>Sélectionnez un PJ dans la liste.</div>:<>
        {/* ── Bandeau d'identité ── */}
        <div style={{...CARD,overflow:"hidden"}}>
          <div style={{height:3,background:"linear-gradient(90deg,"+gc+","+em.text+")"}}/>
          <div style={{padding:"9px 14px",display:"flex",gap:12,flexWrap:"wrap",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{minWidth:0,flex:"1 1 280px"}}>
              <div style={{display:"flex",alignItems:"baseline",gap:10,flexWrap:"wrap"}}>
                <span style={{fontFamily:T.fontMono,fontWeight:800,fontSize:20,color:T.teal600,letterSpacing:"-.01em"}}>{r.pj}</span>
                <span style={{fontFamily:T.fontDisplay,fontWeight:600,fontSize:15,color:T.ink900}}>{meta.nomProjet}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap",marginTop:3,fontSize:12.5,color:T.ink500}}>
                <span style={{display:"inline-flex",alignItems:"center",gap:6}}><CountryFlag pays={meta.pays} size={13}/>{meta.pays}</span>
                <span style={{display:"inline-flex",alignItems:"center",gap:7}}><Avatar name={meta.chefProjet} size={18}/>{meta.chefProjet}</span>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:5}}>
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
                <Badge etat={r.etat}/>
                <span style={{display:"inline-flex",alignItems:"center",gap:6,fontSize:11.5,fontWeight:700,color:T.ink700,background:T.surface,border:"1px solid "+T.line,borderRadius:7,padding:"2px 8px"}}><span style={{width:8,height:8,borderRadius:"50%",background:gc}}/>{r.gamme}</span>
                {kind?<PresenceChip kind={kind} date={r.clientPresence.date} fontSize={11.5}/>:<span style={{fontSize:11.5,color:T.ink300}}>Pas de présence aux tests</span>}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8,width:200}}>
                <ProgressBar value={kpi.pv} height={6}/>
                <span style={{fontWeight:800,fontSize:13,color:T.ink900,minWidth:42,textAlign:"right"}}>{kpi.pv}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tuiles chiffrées ── */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(104px,1fr))",gap:8}}>
          <Tile value={signed(kpi.driftDepart)} label="Dérive départ" sub={ini?"vs planning initial":"pas de planning initial"} color={kpi.driftDepart>0?T.red500:kpi.driftDepart<0?T.emerald500:T.ink300}/>
          <Tile value={kpi.toDepart==null?"—":kpi.toDepart>=0?"J-"+kpi.toDepart:"+"+Math.abs(kpi.toDepart)+"j"} label="Avant départ" sub={r.depart?fmtLong(new Date(r.depart)):"date inconnue"} color={kpi.toDepart!=null&&kpi.toDepart<0?T.red500:kpi.toDepart!=null&&kpi.toDepart<=14?T.amber500:T.teal500}/>
          <Tile value={kpi.atelier==null?"—":kpi.atelier+"j"} label="Séjour atelier" sub="arrivée → départ" color={T.teal500}/>
          <Tile value={kpi.tests==null?"—":kpi.tests+"j"} label="Fenêtre tests" sub={r.tests?fmt(new Date(r.tests))+(r.testsFin?" → "+fmt(new Date(r.testsFin)):""):"non définie"} color={T.amber500}/>
          <Tile value={nf(r.heuresAtelier||0)+" h"} label="Atelier" sub={"Autom. "+nf(r.heuresAutom||0)+" h"} color={T.violet500}/>
          <Tile value={totalDelayDays>0?totalDelayDays+"j":"0"} label="Retards" sub={pjDelays.length+" cause"+(pjDelays.length>1?"s":"")} color={totalDelayDays>0?T.red500:T.emerald500}/>
          <Tile value={pjComments.length} label="Commentaires" sub={nPrivate>0?nPrivate+" privé"+(nPrivate>1?"s":""):"aucun privé"} color={T.ember500}/>
        </div>

        {/* ── Frise des jalons ── */}
        <Section icon="calendar" title="Jalons" right={<span style={{fontSize:12,color:T.ink300}}>révisé · initial barré · écart</span>}>
          <Timeline r={r} ini={ini} kind={kind}/>
        </Section>

        {/* ── Retards + commentaires côte à côte ── */}
        <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"flex-start"}}>
          <div style={{flex:"1 1 320px",minWidth:0}}>
            <Section icon="clock" title={"Causes de retard"+(pjDelays.length?" ("+pjDelays.length+")":"")} right={totalDelayDays>0&&<span style={{fontSize:12.5,fontWeight:800,color:T.red500,background:T.red100,borderRadius:6,padding:"2px 9px"}}>{totalDelayDays} j</span>}>
              {pjDelays.length===0?<div style={{color:T.ink300,fontSize:13.5}}>Aucune cause de retard enregistrée.</div>:<>
                <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:8}}>
                  {byType.map(([type,days])=>(
                    <div key={type} style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{width:130,fontSize:12.5,fontWeight:600,color:T.ink700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}} title={type}>{type}</span>
                      <div style={{flex:1,background:T.surfaceAlt,borderRadius:5,height:8,overflow:"hidden"}}><div style={{width:(days/byType[0][1]*100)+"%",height:"100%",background:T.red500,borderRadius:5}}/></div>
                      <span style={{width:34,textAlign:"right",fontSize:12.5,fontWeight:800,color:T.ink900}}>{days}j</span>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:5,maxHeight:220,overflowY:"auto"}}>
                  {pjDelays.map(d=>{
                    const others=d.groupPjs?d.groupPjs.filter(p=>p!==r.pj):[];
                    return(<div key={d.id} style={{background:T.surface,borderRadius:9,padding:"5px 9px",borderLeft:"3px solid "+T.red500}}>
                      <div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
                        <span style={{fontWeight:700,color:T.ink900,fontSize:12.5,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>{d.type} — {d.days}j{others.length>0&&<span style={{fontSize:11,color:T.violet600,background:T.violet100,borderRadius:5,padding:"1px 8px",fontWeight:700}}>aussi : {others.join(", ")}</span>}</span>
                        <span style={{fontSize:11.5,color:T.ink300}}>{d.author} · {new Date(d.date).toLocaleDateString("fr-FR")}</span>
                      </div>
                      {d.note&&<div style={{fontSize:12,color:T.ink500,marginTop:2}}>{d.note}</div>}
                    </div>);
                  })}
                </div>
              </>}
            </Section>
          </div>

          <div style={{flex:"1 1 320px",minWidth:0}}>
            <Section icon="comments" title={"Commentaires ("+pjComments.length+")"} right={nPrivate>0&&<button onClick={()=>setOnlyPrivate(v=>!v)} style={{border:"1px solid "+(onlyPrivate?T.amber500:T.line),background:onlyPrivate?T.amber100:"transparent",color:onlyPrivate?T.amber600:T.ink500,borderRadius:7,padding:"2px 9px",fontSize:11.5,fontWeight:700,cursor:"pointer",fontFamily:T.font}}>Privés ({nPrivate})</button>}>
              {shownComments.length===0?<div style={{color:T.ink300,fontSize:13.5}}>{onlyPrivate?"Aucun commentaire privé.":"Aucun commentaire."}</div>:
                <div style={{display:"flex",flexDirection:"column",gap:5,maxHeight:260,overflowY:"auto"}}>
                  {shownComments.map(c=>{
                    const others=c.groupPjs?c.groupPjs.filter(p=>p!==r.pj):[];
                    return(<div key={c._idx} style={{background:c.private?T.amber100:T.surface,borderRadius:9,padding:"5px 9px",borderLeft:"3px solid "+(c.private?T.amber500:T.teal500)}}>
                      <div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}>
                        <span style={{fontWeight:700,color:T.teal600,fontSize:12.5,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>{c.author}{c.private&&<span style={{fontSize:10.5,color:T.amber600,background:T.amber100,borderRadius:5,padding:"1px 6px",fontWeight:700}}>Privé</span>}{others.length>0&&<span style={{fontSize:10.5,color:T.violet600,background:T.violet100,borderRadius:5,padding:"1px 6px",fontWeight:700}}>aussi : {others.join(", ")}</span>}</span>
                        <span style={{fontSize:11.5,color:T.ink300}}>{new Date(c.date).toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}</span>
                      </div>
                      <div style={{fontSize:12.5,color:T.ink700,whiteSpace:"pre-wrap",marginTop:2}}>{c.text}</div>
                      {c.linkedDate&&<div style={{marginTop:4,fontSize:11.5,color:T.ink500,fontWeight:600}}>Lié au {fmt(new Date(c.linkedDate))}</div>}
                    </div>);
                  })}
                </div>}
            </Section>
          </div>
        </div>
      </>}
    </div>
  </div>);
}

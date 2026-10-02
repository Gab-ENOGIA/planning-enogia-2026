import React, { useState, useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { T } from "../theme";
import { getPjMeta, ETAT_META, GAMME_COLORS, today } from "../pjMeta";

// Bandeau de synthèse en haut de la page : nombre de machines expédiées depuis le 1er janvier +
// répartition de l'ensemble du portefeuille par gamme / pays / chef de projet / état. Les 4
// répartitions sont affichées en petits camemberts côte à côte (plutôt qu'un seul gros camembert
// avec des onglets pour changer de dimension) pour occuper l'espace horizontal disponible au lieu
// de laisser un grand vide à droite — demandé explicitement.
const DIMENSIONS=[
  {key:"gamme",label:"Gamme"},
  {key:"pays",label:"Pays"},
  {key:"chef",label:"Chef de projet"},
  {key:"etat",label:"État"},
];
// Palette adoucie/désaturée (demandé explicitement : "couleurs plus douces et légères pour les
// camemberts") — remplace les teintes vives d'origine par des tons mats, plus proches de l'esprit
// crème + bleu acier du reste de l'appli.
const PALETTE=["#6E99B0","#A090C4","#D1A468","#80A98A","#C4847F","#8C93C2","#6FACA3","#A3AE78","#C09468","#7391BC","#BD84A0","#6FA095"];

export function DashboardSummary({data,allData}){
  // Le compteur "expédiées depuis le 1er janvier" doit rester lié au nombre réel d'unités
  // expédiées, jamais aux filtres actifs sur la liste (demandé explicitement) — il se calcule donc
  // sur allData (le jeu de données complet) plutôt que sur data (qui suit les filtres et sert aux
  // 4 camemberts de répartition ci-dessous).
  const fullData=allData||data;
  const [collapsed,setCollapsed]=useState(()=>{
    try{return localStorage.getItem("enogia-dashboard-collapsed")==="1";}catch(e){return false;}
  });
  const toggleCollapsed=()=>{
    setCollapsed(c=>{
      const next=!c;
      try{localStorage.setItem("enogia-dashboard-collapsed",next?"1":"0");}catch(e){}
      return next;
    });
  };

  const shippedYTD=useMemo(()=>{
    const y=today.getFullYear();
    return fullData.filter(r=>r.depart&&new Date(r.depart).getFullYear()===y&&new Date(r.depart)<=today).length;
  },[fullData]);

  // Une répartition (breakdown) par dimension, calculées ensemble pour les 4 petits camemberts.
  const breakdownsByDim=useMemo(()=>{
    const out={};
    DIMENSIONS.forEach(d=>{
      const counts={};
      data.forEach(r=>{
        const meta=getPjMeta(r.pj,r);
        let key;
        if(d.key==="gamme")key=r.gamme||"Non renseigné";
        else if(d.key==="pays")key=meta.pays||"Non renseigné";
        else if(d.key==="chef")key=meta.chefProjet||"Non renseigné";
        else key=(ETAT_META[r.etat]&&ETAT_META[r.etat].label)||r.etat||"Non renseigné";
        counts[key]=(counts[key]||0)+1;
      });
      out[d.key]=Object.entries(counts).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
    });
    return out;
  },[data]);

  const colorFor=(dimKey,name,i)=>{
    if(dimKey==="gamme"&&GAMME_COLORS[name])return GAMME_COLORS[name];
    if(dimKey==="etat"){
      const entry=Object.entries(ETAT_META).find(([,v])=>v.label===name);
      if(entry)return entry[1].bar;
    }
    return PALETTE[i%PALETTE.length];
  };

  return(<div style={{paddingBottom:collapsed?14:22,marginBottom:22,borderBottom:"1px solid "+T.line,fontFamily:T.font}}>
    {/* Pas de carte ici : le bandeau est posé directement sur le fond de page (direction "Piste A"),
        séparé du reste par un simple filet. L'en-tête reste fixe, avec le contrôle d'affichage ancré à droite. */}
    <div style={{display:"flex",alignItems:"center",gap:14}}>
      <span style={{fontSize:12,fontWeight:700,color:T.ink500,textTransform:"uppercase",letterSpacing:".05em"}}>Vue d'ensemble</span>
      {collapsed&&<span style={{fontSize:13.5,color:T.ink700}}><strong style={{color:T.teal600}}>{shippedYTD}</strong> expédiée{shippedYTD>1?"s":""} en {today.getFullYear()}</span>}
      <button onClick={toggleCollapsed} title={collapsed?"Afficher la répartition":"Masquer la répartition"} style={{marginLeft:"auto",flexShrink:0,width:26,height:26,borderRadius:8,border:"none",background:"transparent",cursor:"pointer",color:T.ink300,display:"flex",alignItems:"center",justifyContent:"center"}}
        onMouseEnter={e=>{e.currentTarget.style.background=T.surface;}}
        onMouseLeave={e=>{e.currentTarget.style.background="transparent";}}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{transform:collapsed?"rotate(180deg)":"rotate(0deg)",transition:"transform .18s ease"}}>
          <polyline points="18 15 12 9 6 15"/>
        </svg>
      </button>
    </div>

    {!collapsed&&<div style={{display:"flex",alignItems:"center",gap:28,flexWrap:"wrap",marginTop:18}}>
      <div style={{display:"flex",flexDirection:"column",gap:4,minWidth:150,flexShrink:0}}>
        <div style={{fontSize:40,fontWeight:700,color:T.teal600,fontFamily:T.fontMontserrat,lineHeight:1}}>{shippedYTD}</div>
        <div style={{fontSize:13,color:T.ink500}}>machine{shippedYTD>1?"s":""} livrée{shippedYTD>1?"s":""}<br/>depuis le 1ᵉʳ janvier {today.getFullYear()}</div>
      </div>

      <div style={{width:1,alignSelf:"stretch",background:T.teal400,opacity:.3,flexShrink:0}}/>

      {/* 4 petits camemberts côte à côte (un par dimension), chacun avec sa légende compacte en
          dessous — remplace l'ancien camembert unique + onglets, qui laissait tout l'espace à
          droite vide. flex:"1 1 160px" : chaque colonne peut grandir pour occuper la largeur
          disponible, et repasse à la ligne proprement sur un écran étroit. */}
      {/* Plus de maxWidth ici (demandé explicitement : "recouvrir toute la largeur de la fenêtre") :
          flex:1 sans plafond, les 4 colonnes se partagent toute la largeur restante à parts égales. */}
      <div style={{display:"flex",gap:22,flexWrap:"wrap",flex:1,minWidth:0}}>
        {DIMENSIONS.map(d=>{
          const breakdown=breakdownsByDim[d.key];
          return(<div key={d.key} style={{flex:"1 1 150px",minWidth:150}}>
            <div style={{fontSize:11.5,fontWeight:700,color:T.ink500,textTransform:"uppercase",letterSpacing:".04em",textAlign:"center",marginBottom:8}}>{d.label}</div>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
              <div style={{width:120,height:120,flexShrink:0}}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={breakdown} dataKey="value" nameKey="name" innerRadius={38} outerRadius={60} paddingAngle={2} stroke="none">
                      {breakdown.map((entry,i)=><Cell key={entry.name} fill={colorFor(d.key,entry.name,i)}/>)}
                    </Pie>
                    {/* Tooltip custom, compact (le tooltip par défaut de Recharts était "trop grand et pas
                        assez premium") : petit cadre blanc, même langage que les cartes du reste de l'appli. */}
                    <Tooltip content={({active,payload})=>{
                      if(!active||!payload||!payload.length)return null;
                      const p=payload[0];
                      return(<div style={{background:T.card,border:"1px solid "+T.line,borderRadius:7,padding:"4px 9px",fontSize:11,fontFamily:T.font,color:T.ink900,boxShadow:T.shadowSm,display:"flex",alignItems:"center",gap:6}}>
                        <span style={{width:6,height:6,borderRadius:"50%",background:p.payload?.fill||p.color,flexShrink:0}}/>
                        <span>{p.name}</span><strong>{p.value}</strong>
                      </div>);
                    }}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Plus de défilement interne (demandé explicitement : "enlever les défilements pour les
                  légendes et les mettre visible en 1 fois") — passage en grille 2 colonnes dès que la
                  dimension compte plus de 4 valeurs, pour que tout tienne sans scroll. */}
              <div style={{display:"grid",gridTemplateColumns:breakdown.length>4?"repeat(2,1fr)":"1fr",gap:"3px 10px",width:"100%"}}>
                {breakdown.map((entry,i)=><span key={entry.name} style={{display:"flex",alignItems:"center",gap:5,fontSize:10.5,color:T.ink700,minWidth:0}}>
                  <span style={{width:6,height:6,borderRadius:"50%",background:colorFor(d.key,entry.name,i),flexShrink:0}}/>
                  <span style={{whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{entry.name}</span>
                  <strong style={{color:T.ink900,marginLeft:"auto",flexShrink:0}}>{entry.value}</strong>
                </span>)}
              </div>
            </div>
          </div>);
        })}
      </div>
    </div>}
  </div>);
}

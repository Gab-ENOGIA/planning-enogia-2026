import React, { useState, useMemo, useCallback, useEffect } from "react";
import { db } from "./firebase";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";

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

const LOGO_B64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAXoAAACFCAMAAABizcPaAAABUFBMVEX///8Ak6wAlKsAhr4Aj7cAhb8AlKkAWnwAgLodm60AV3gAWn8Ag78ASGu3x88AfrYcaowAjKkAiL0AirsAjLq+3OUAkLYAkrUAea0AcqEAlLMAdKUAfLgAdrUAbZkAcaHt9voAZIzG3OoEn6cAU3zo7vAvZ4ECnaoEoKbj8PYAZY8AjKMAUnASo6MAVYMAa6QAhasATHAAerupzOOp0dwAoJgATG/V4ukAYpCqucOYvdTJ1t0AZpkAZ56Csc4AcqpPpcVSnsiRxdS13NiNoq1qhZQAQ2AAKk9Veo0AN1kARmEmWnF4l6YAPFw+c4vAzdOQrLw3d5ZSh6Rjkax1oLhYk7UAOWGlv88AR3F8n7M1kMObuMoueJ5pnLqHudmyy9sAZKZxqs5Sm8pOqMM5msForsuAutFmtcU+prqazdZrusRqvL6Ny8vM5+ZQs61JrrlOA+94AAAOGUlEQVR4nO2dWVvbOBRAoVDWQkjYCiQgIKE1hD0hAcI+MIUplFIYKKUwtOyF8v/fRlfyIifWYmKa7yM6LyMn0rV8rMi6MjNTUaFOwkddTaA0l7oDZQv6q9Q9KFsS66XuQdmSGSp1D8qWTxtBRdLPa5/M/h1UJD1z+eSvTRRMoGat3icfNjPBBNqcDSZO+ZDcng8kzvrfwcQpIzY3Asmp5jc3gwhTTsxvbwQyUWxt/RNEmHJidmMjiHR2fWNLP2V9sp6c+Vh8lE+bW8H8eMqJZDIZwHDd2EpuB7RQKhsSTcnkh6KjfNhKJrcD6E1ZMTvTkNwpOsh2MrlVdJRyY6ehoaHY/bMENp8M5GFdTqCjhtqi1f+TBPWfAulQ+TA7U1vbUFtcjPUNUL+NAulQ+bBTCxQVAiZ6jE6o/JGYLFp9hpoPIjkoK3YbgWLUoxliPtmkX677A2uvrW3sLyLCUNJUr19R+aI53o8pRv26OeiTDcH1qiz43Ajq+1ueHGC3qYGS1FO9LzJj/cWpb7bMN8zoqd4Xe9R8/+cntp/H+ZjJEQqyYy8ea9D37z2x/ZElvviEuMzYG6bmh788qbmZE1D1uwH37WWTGRs22X9Kc1Tb6Kif1G/E/bBnmc8+Zci6zDfGA+/dS2Y+22uSPXxC85ZGlqdNWeXKSa+t/gmzRQsz5mtr43pp6YPDrKPe90tV1NLYzxJHz9DDF0uvQw75bJvod5tvfGpiUJYs5mzzXX0+2ybc4rH6pzwsyhUj12XTd+CvbSaeZ75/TO9aqnPQx6if89V0fizf/JM3IsqRM2bQd+UG/DQ9LDSf/fZc/XyB9PUwLPhp+dVOgR1k801ivplH0TNVohAkqJ75xO1Kc7O1xm6exTCrvgS/he/+n7Pme459tNzLFpofFs43mY8zTVz+decDmdmPH4YK2Pnwl+ffmSR2dzxDbzcNffTMVGaH+D3BHFmvHIaaZmb+Zf6AdP5ffqOZdV9JUWb8LcOS+lSfOPEyL0qG0YejmQY+k6z6ZrjkpBfY8NeCyOuCyDNNQwVGZicnBT2BRpZ6+KuwSVa9qOHM0Y6Pof/Wxbih2u4sO9zrQRZxW2QmXUlvAYz6xI7QzGTeBt385IwwcsNR3s36MimsDym51WKnAffMpV58KvW9w8Ull3rl+WZ/zEt87zB/bZo5ahTjbEBk4uKbVFt7xP64mmWRcWzXW4i9uLyBpf4zHDBnm5e1PVJ0b4yHWJam1ZplerOe5nuz3AUSMrscj7dw6LfUJ6yri3thXqBjw7qnnrWt+nFm3O/GzfqNvK5guOr7eS0arVOpzTmRkBs18/s5b/EYbps9kvWO7SlsEdGdiXj8y7fCZcThbkucRrIDmTtHLYcJVEhi/gtdAI/Zg9F8Hxf/hlSu9TNUVUvQE1/H1HdS5qIu8VGlh+wAb8jjQb/Ia0RzrzGVRf9XkiCPcV/ZzLtf33+jkQsevTaZLG1gHZP3ccP9is9DUK+8kU7v6pjClGPE6lxEFaInDqwh31WoPsd9Su8pv4ZBJFkYOxNU+ZxlatCFFd887jKNOM8eCZYDbk4kyzY35GVfVmHYH0dd5qcUZvrFHLPrkA9/AwjBU3n4RKX338CrJCfuBXs0WkYh8hn8TLPfrfhwILqzLk6Gfb0+2oXoY0hWbXrqjYsqaeDDXI4vXrQLMQA/FbW3MCfQeclNmodwY+QnRk1KIp8wz6GDrPCZ5NXUz5u7nNKNjb52MSXbvhnoEg15gNv0W64Po9j3vr6crO9dOFqOCNmHyPwTUw5xpd4c05T7TCrgxD6TGt9zCuFP66pY3pyLqw+c5Fy7PYUIhO2DeaX96MQCrrkgy+z27Qs8gMjfJdUzTFC4VT42CQvVo7P9E7h/3nQp9AdFIy71deLOHyxIxPf0CEb196WeniWloWYsqGzizeXw6citPMDdyslWZogEperHoaj+FrQtb0yh7wvjSxIVSxL1l1URljrRQDAOFmTe8QkFAs5x0qyoflxJPb6VPVQ9RJZOCOPOJsm4r/2SimOI76g/G3en/55I1KNQK0tEMN0Y38fl4nveLgnO5kc9qJHVmoN4K1DyrX6pQD0StTwGlfbSb3FcLN1UL567ryIu9a3ciuhc5UZLNj3Pl0IhVfU4t1NQHwq9Jep/hFg1PMDYkqkex4+x6tF/4yyx40X222N2f2UxZm648CFfi9VH2lgivMkPLaqJx4jOdo7T5ui5R6LPQmoacHUxYdcrzDTcVI8jS9XHHN+xAvWxvN2UaGzF+RbUx8z4A7RmbGV6gAu9UlFfpl3mW1c51dTFi0feOSRv0ZiQ/4gPkmErqMfhfkDpB5Tk6iEo9R11ihSUl9NDT+vsCsd1TnySgUaPhQ8K0jOh+mqWtmVOmCVV8W/fRoSXfh59I2WKqoc8T64ealH1uCBXP2XHZ4sUNOXRmSgyvz124pOTvpHsq5/iKxWqb29zufesMx1aCikTE6+Uz9+8lsKonxJfHowtR/3r1wrq7fgkkXSrj02x0ETTNnzsxK8ivUTiM53i+sIUabm6w2HCa6IfiPgQHwpJ8rFzd/rmSZSqJ2rE0bB6uJV0rgdPSuqjlnrrVBYGS2buNelr1BxLx1B9mvYMsp9TyZkgUa0T2EATnQ7VHhO98SMWKpgB+YRke57nVK6QmGFfoHQLdRr0EPUr4EOqPmrf2gpoWSecrldIZ3/Qg2M7/lldVf5N82AO36oqgfpUh2O+42fh9+eFTx4hkukG1OOs7bRCZYUTwjXl6nE8Uz2uXiVVD0FDRn6RB8kxzdn+AqqT+HNwDfxFuAnUEqn/2dlt0dlZ8O10NCq3zSJ+ogOXOIuIyH6rBKy+tVX6tmwaS4iY6nFkuXqcuZi+q5wijznIeUJ0OF3gIr21p3CmFWFDs60gPzUc890d+RO9cez1xBci322+hIT5SloNTk8syWpNg5xlKK20+lQPLSNi9ZmIE/TCLpIbcik701yrsFbKMR/On+hPfYt/I3voV4B6nDyoqYdcT5ieAdMQbxlKy20KkREENX23ijJIpnorzc4voEjVwzkV1Atr3VRadN+4vzGOo5yln2BRqLANeAWJ24W8Hu4BqJHOqKCeZiOXEFkmJEOCIlImKWS7vA9t9H4S9SkopVpVrmFV2B8UttWH3b+8aVh5+SSqsvedgjyiDSnUNFpxTbn6NisRXCWRJdWvmEoXUBT/TDLQhzZr1ONiyv7UvH98oD989SnbfGXK9cVKXUSuOg/hZrNzMRO42xO87QoWg9SU1VqFWstQaif1U+LqJG9cpuVLfhJpkWJiXjhF8qlsbiM946q/fmXhmm4yEfcOvgpVkgeWDc3dkLyiMQEVZbVWodYyKUKpQ6zyisQ0b0+KHAhHwSUknBN0UoLk02xKP5ZcMPSsmnt/aixeIebT6VDeNrICVUrTN+kRySS65RUNyPbk6iEcTUiuOjjJiU07SSDt+06PBLM9TThNxz8heoqJ04n4LaFnuFIHT73xqp5Sc8t8uhiSm84nJH3eO5D1bGe39EdiTOB6cvU4nKkeTZDIPxG3Lq1g67gKw7Fg3JOsxxomcNBp/mC6yRedwmf0apg9Vx63Nab6eubDZff+vQqtEckM6yIVpovZn6l2HnQjIaykPgyhnDI+Cl97Rl7tNk9st0XmB92r+OtMJgM7N1YujWmnDaxV9084k3mhmQmmZT6I6RlP/Z016B+czy5a/ZuvVn/BCVzTdVWYD7lAoj4sC3bLqK+4MV16Y+YvzAq4nfbEqwH5kH6JrOC4z9YYW+W3tJ4BUCV8zel2/TvKnfPRhW/xigkSy7WzpvUkTH7IBtRSUI9r2YuEG0lkRh4hJa1vdqaC5kBOa/41hBn1lRz1hqm+HtkfXbh37xVoq/b1r7vZvXolYISqH8FFuXocyVEPRkSRK0fypuf2kUpxg7D9GLzBFUecG3fLO5OtHnrGUb9mDnrnGbvs37zvIU/I3IDXGg6WeijKIt1CLWZp/CCIPDJyjfLbo+uREU51HGak3pmLb3A1Rj1p6XkWSz2u/4qj/t5Ub39w5df8xIW/WZ7BuL2+qedB1cMioEYWhywVHvMiewa9uUshzxDtd5yeXN8yD8GKR/jINV2hlFfLGtPJLRzcVXjyOAi8s6ORFMMH1R3iDRANl0GKdWiwL6zkVHeo7AZovDAG32MG16xjX+I7tPgiWHtPsA6vmLcmEjo7OrX4Yrgn5q1B396hLr7bT/KqKeTX+1GMdaQsPnyt/5c7xQLiR61Bv6omPty9ikrZ5xfCKDPoDXlCDRsW13o1GQQIzN+bBzdy8eEbPcMHxAOoR7TcLh/0q0/OWzX5rGHzv8xyvWgHCban9EQTJPfp0bS5RdFeydvIwlS+0k/WgLkfTVsP2Xq++Fd6wAfPr3TafMimagq33+geXM2dnuGfgd/pNKIlnvj6W2EAzVNJp3/TQrvnoK+p1zPNc5FOm5nsO+sVrUN9zaMW/3yk0/SfDx7mHx/EbTXFgNLmov6xwPw7PeKfFWQu6o0C8Xq/4JkxzPnmLk885z2uJjgezPXNu0GGd4N6kn9+Huj65pY1P6iH/J/gAZF/vGfN6yH/R6D/cceHwfc2j5IWmkD55Zi/l9fWBIhjfk1eWRMga+SPEjDv9TT/h/ltmh/Ve8N/GGQNelTqnpQd99p8qdDmS8WDnudLBZ1v9NqmBID4tF7Pl4CHNDb/S15PEzj3afvNuObPMpq2/xxE80cx0mk90ZeGez3dlIrferopEUhPN6ViTU83peJXWqexJUInU6XiQT9jS8W9fgteKtKl7kDZgvSgLxV6SV8y9JspjUajebn8D5miRKz6OLL0AAAAAElFTkSuQmCC";

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
  font:"'Roboto',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  fontDisplay:"'Abel','Roboto',-apple-system,sans-serif",
};

const PJ_META={
  "PJ376":{nomProjet:"GAEC - ADELINE",pays:"France",chefProjet:"Clément MARTOUZET"},
  "PJ382-40":{nomProjet:"SHEFFIELD",pays:"UK",chefProjet:"Gabriel VINCENT"},
  "PJ382-180":{nomProjet:"SHEFFIELD",pays:"UK",chefProjet:"Gabriel VINCENT"},
  "PJ420":{nomProjet:"ST GOBAIN",pays:"France",chefProjet:"Clément MARTOUZET"},
  "PJ430":{nomProjet:"AATF - PYROGENESYS",pays:"Nigeria",chefProjet:"Gabriel VINCENT"},
  "PJ446-1":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ446-2":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ446-3":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ446-4":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ446-5":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ446-6":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ446-7":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ446-8":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ446-9":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ446-10":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ446-11":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ446-12":{nomProjet:"ULSAN",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ449":{nomProjet:"ADUNA - KELSEN",pays:"Espagne",chefProjet:"Emmy BOURELLY"},
  "PJ453":{nomProjet:"INEOS",pays:"France",chefProjet:"Clément BABLON"},
  "PJ456":{nomProjet:"ADDFIELD",pays:"UK",chefProjet:"Emmy BOURELLY"},
  "PJ461-1":{nomProjet:"CHEM SOLV",pays:"Singapore",chefProjet:"Gabriel VINCENT"},
  "PJ461-2":{nomProjet:"CHEM SOLV",pays:"Singapore",chefProjet:"Gabriel VINCENT"},
  "PJ461-3":{nomProjet:"CHEM SOLV",pays:"Singapore",chefProjet:"Gabriel VINCENT"},
  "PJ461-4":{nomProjet:"CHEM SOLV",pays:"Singapore",chefProjet:"Gabriel VINCENT"},
  "PJ461-5":{nomProjet:"CHEM SOLV",pays:"Singapore",chefProjet:"Gabriel VINCENT"},
  "PJ462-1":{nomProjet:"ULMATEC OCV",pays:"Norvège",chefProjet:"Gabriel VINCENT"},
  "PJ472":{nomProjet:"HANNES",pays:"Islande",chefProjet:"Emmy BOURELLY"},
  "PJ473":{nomProjet:"RIMS",pays:"Corée",chefProjet:"Clément MARTOUZET"},
  "PJ476":{nomProjet:"KBS-WP1 (études)",pays:"UK",chefProjet:"Clément BABLON"},
  "PJ479-1":{nomProjet:"EDF PEI",pays:"FR-La Réunion",chefProjet:"Clément MARTOUZET"},
  "PJ479-2":{nomProjet:"EDF PEI",pays:"FR-La Réunion",chefProjet:"Clément MARTOUZET"},
  "PJ485":{nomProjet:"BIOSORRA",pays:"Kenya",chefProjet:"Clément MARTOUZET"},
  "PJ486":{nomProjet:"ALBRET",pays:"France",chefProjet:"Emmy BOURELLY"},
  "PJ488":{nomProjet:"KAGOSHIMA",pays:"Japon",chefProjet:"Gabriel VINCENT"},
};
function getPjMeta(pj){
  if(PJ_META[pj])return PJ_META[pj];
  const prefix=pj.split("-")[0];
  const fallbackKey=Object.keys(PJ_META).find(k=>k.split("-")[0]===prefix);
  return fallbackKey?PJ_META[fallbackKey]:{nomProjet:"—",pays:"—",chefProjet:"—"};
}
function initials(name){
  if(!name||name==="—")return"—";
  const parts=name.trim().split(/\s+/);
  if(parts.length<2)return name.slice(0,3).toUpperCase();
  const prenom=parts[0],nom=parts[parts.length-1];
  return(prenom[0]+nom.slice(0,2)).toUpperCase();
}
const COUNTRY_ISO={
  "France":"fr","UK":"gb","Nigeria":"ng","Corée":"kr","Espagne":"es",
  "Singapore":"sg","Norvège":"no","Islande":"is","Kenya":"ke",
  "FR-La Réunion":"re","Japon":"jp",
};
function PersonIcon({size,color}){
  const s=size||14;
  return(<svg width={s} height={s} viewBox="0 0 24 24" fill="none" style={{flexShrink:0}}>
    <circle cx="12" cy="7.5" r="4.5" fill={color||"currentColor"}/>
    <path d="M4 21c0-4.42 3.58-8 8-8s8 3.58 8 8" fill={color||"currentColor"}/>
  </svg>);
}
function CountryFlag({pays,size}){
  const iso=COUNTRY_ISO[pays];
  const h=size||14;
  if(!iso)return null;
  return <img src={"https://flagcdn.com/h20/"+iso+".png"} alt={pays} style={{height:h,width:"auto",minWidth:h*1.3,borderRadius:2,verticalAlign:"middle",boxShadow:"0 0 0 1px rgba(0,0,0,.06)",background:T.surfaceAlt}}
    onError={e=>{e.target.style.display="none";}}/>;
}

const GAMME_COLORS={"180LTV3":T.teal500,"100LTV3":T.violet500,"40LTV3":T.emerald500,"180MT":T.red500,"100MT":"#c2761a","20LTV3":"#0e8fa8","10LTV3":"#6b9b1f","40LTV2R":T.amber500,"100LTV2R":"#9333ea","CONTENEUR":T.ink500};
const ETAT_META={
  "SHIPPED":{bg:T.emerald100,text:T.emerald600,border:"#8fdcb8",bar:T.emerald500,label:"Expédiée"},
  "PROD":{bg:T.teal100,text:T.teal600,border:"#9bdce8",bar:T.teal500,label:"Production ENOGIA"},
  "En fabrication":{bg:"#fde9d2",text:"#c2630a",border:"#f5c690",bar:"#e8821a",label:"Fabrication FNR"},
  "STOCKAGE_EXT":{bg:"#e2e8f0",text:"#475569",border:"#cbd5e1",bar:"#64748b",label:"Stockage Externe"},
  "NOT ORDERED":{bg:"#fde4e1",text:"#c0392b",border:"#f4b8b1",bar:"#e8736a",label:"Non commandée"},
  "A_DEFINIR":{bg:T.surfaceAlt,text:T.ink500,border:T.ink100,bar:T.ink300,label:"À définir"}
};
const ALL_ETATS=Object.keys(ETAT_META);
const ASSIGNABLE_ETATS=ALL_ETATS.filter(e=>e!=="A_DEFINIR");
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

function parseWorkHours(s){
  if(!s)return 0;
  const m=String(s).replace(",",".").match(/([\d.]+)/);
  return m?parseFloat(m[1]):0;
}
function parseMSProjectRows(rows,affectationRows){
  if(!rows||rows.length<2)return null;
  const header=rows[0].map(h=>(h||"").toString().toLowerCase().trim());
  const iNom=header.findIndex(h=>h.includes("nom")||h.includes("name"));
  const iDeb=header.findIndex(h=>h.includes("début")||h.includes("debut")||h.includes("start"));
  const iFin=header.findIndex(h=>h.includes("fin")||h.includes("finish")||h.includes("end"));
  const iNiv=header.findIndex(h=>h.includes("niveau")||h.includes("level")||h.includes("hiérar")||h.includes("hierar"));
  if(iNom<0||iDeb<0)return null;

  // Préparation des lignes d'affectation (charge de travail par tâche/ressource), si fournies
  let affIdx=0,aHeader=null,aNom=-1,aRes=-1,aTrav=-1;
  if(affectationRows&&affectationRows.length>1){
    aHeader=affectationRows[0].map(h=>(h||"").toString().toLowerCase().trim());
    aNom=aHeader.findIndex(h=>h.includes("tâche")||h.includes("tache"));
    aRes=aHeader.findIndex(h=>h.includes("ressource"));
    aTrav=aHeader.findIndex(h=>h==="travail"||(h.includes("travail")&&!h.includes("%")&&!h.includes("achevé")));
  }
  const STEP_NAMES_FR=["arrivée","production","tests","fin de production","départ"];
  const nextAffectationFor=stepNameFR=>{
    // Avance dans Table_affectation tant que le nom de tâche correspond bien à l'étape attendue (alignement séquentiel)
    if(aNom<0||!affectationRows)return null;
    if(affIdx>=affectationRows.length-1)return null;
    const row=affectationRows[affIdx+1];
    if(!row)return null;
    const nom=(row[aNom]||"").toString().trim().toLowerCase();
    if(nom!==stepNameFR)return null; // désynchronisé : on ne consomme pas, on abandonne le suivi pour ce PJ
    affIdx++;
    return{ressource:(row[aRes]||"").toString().trim(),heures:parseWorkHours(row[aTrav])};
  };

  const STEP_MAP={"arrivée":"arrivee","arrivee":"arrivee","tests":"tests","fin de production":"finProd","départ":"depart","depart":"depart"};
  const out=[];let cur=null;

  for(let i=1;i<rows.length;i++){
    const row=rows[i];if(!row||row.length<2)continue;
    const nom=(row[iNom]||"").toString().trim();if(!nom)continue;
    const deb=parseDateAny(row[iDeb]);
    const fin=iFin>=0?parseDateAny(row[iFin]):null;
    const niv=iNiv>=0?parseInt(row[iNiv])||0:0;
    const nomL=nom.toLowerCase().trim();

    if(niv===1||(niv===0&&!STEP_MAP[nomL]&&nomL!=="production")){
      const pjM=nom.match(/PJ[\w-]+/i)||nom.match(/SAV\d+/i);
      const pjCode=pjM?pjM[0].toUpperCase():nom.split(/[-–]/)[0].trim();
      cur={pj:pjCode,nom:nom,gamme:guessGamme(pjCode),etat:"A_DEFINIR",arrivee:null,tests:null,testsFin:null,finProd:null,depart:null,
        heuresAtelier:0,heuresAutom:0,production:null};
      out.push(cur);
    } else if(cur&&(STEP_MAP[nomL]||nomL==="production")){
      const k=STEP_MAP[nomL];
      if(k){cur[k]=deb;if(k==="tests")cur.testsFin=fin;}
      if(nomL==="production")cur.production=deb;
      const aff=nextAffectationFor(nomL);
      if(aff){
        const r=aff.ressource.toLowerCase();
        if(r.includes("atelier"))cur.heuresAtelier+=aff.heures;
        else if(r.includes("autom"))cur.heuresAutom+=aff.heures;
      }
    }
  }
  // L'état n'est plus calculé automatiquement : il démarre à "À définir" et c'est au Manager de le fixer manuellement.
  const filtered=out.filter(p=>p.arrivee||p.depart);
  return filtered.map(p=>({
    pj:p.pj,gamme:p.gamme,etat:p.etat,
    arrivee:toLocalISO(p.arrivee),
    tests:toLocalISO(p.tests),
    testsFin:toLocalISO(p.testsFin),
    finProd:toLocalISO(p.finProd),
    depart:toLocalISO(p.depart),
    heuresAtelier:p.heuresAtelier,
    heuresAutom:p.heuresAutom,
  }));
}

function Badge({etat}){const c=ETAT_META[etat]||ETAT_META["NOT ORDERED"];return <span style={{background:c.bg,color:c.text,border:"1px solid "+c.border,borderRadius:6,padding:"3px 10px",fontSize:15,fontWeight:600,whiteSpace:"nowrap",letterSpacing:".01em"}}>{c.label||etat}</span>;}

function DropFilter({label,options,selected,onChange,getLabel,icon}){
  const [open,setOpen]=useState(false);
  const [pos,setPos]=useState({top:0,left:0});
  const btnRef=React.useRef(null);
  const all=options.every(o=>selected.has(o));
  const none=options.every(o=>!selected.has(o));
  const toggle=o=>{const s=new Set(selected);s.has(o)?s.delete(o):s.add(o);onChange(s);};
  const disp=o=>getLabel?getLabel(o):o;
  const openMenu=()=>{
    if(btnRef.current){
      const r=btnRef.current.getBoundingClientRect();
      setPos({top:r.bottom+4,left:Math.min(r.left,window.innerWidth-230)});
    }
    setOpen(v=>!v);
  };
  return(
    <span style={{position:"relative",display:"inline-block"}} onClick={e=>e.stopPropagation()}>
      <button ref={btnRef} onClick={openMenu} style={icon?{padding:"3px 5px",borderRadius:6,border:"none",background:!all?T.teal100:"transparent",color:!all?T.teal600:T.ink300,fontSize:13,cursor:"pointer",display:"inline-flex",alignItems:"center",verticalAlign:"middle",marginLeft:4}:{padding:"10px 17px",borderRadius:10,border:"1.5px solid "+(!all||open?T.teal500:T.line),background:!all?T.teal100:T.card,color:!all?T.teal600:T.ink700,fontSize:16,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap",fontFamily:T.font,transition:"border-color .15s"}}>
        {icon?(!all?"▼("+selected.size+")":"▼"):(<>{label}{!all?" ("+selected.size+")":""}<span style={{fontSize:12,color:T.ink500}}>{open?"▲":"▼"}</span></>)}
      </button>
      {open&&<>
        <div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,zIndex:9998}}/>
        <div style={{position:"fixed",top:pos.top,left:pos.left,background:T.card,borderRadius:12,boxShadow:T.shadowLg,border:"1px solid "+T.line,zIndex:9999,minWidth:210,maxHeight:320,display:"flex",flexDirection:"column",fontFamily:T.font}}>
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
        </div>
      </>}
    </span>
  );
}

const PHASES=[{k:"arrivee",l:"A",c:T.teal500,t:"Arrivée"},{k:"tests",l:"T",c:T.amber500,t:"Tests"},{k:"finProd",l:"F",c:T.emerald500,t:"Fin prod"},{k:"depart",l:"D",c:T.red500,t:"Départ"}];

function GanttView({data,progress,df}){
  const year=today.getFullYear();
  const yearStart=new Date(year,0,1);
  const yearEnd=new Date(year,11,31);
  const totalDays=Math.round((yearEnd-yearStart)/86400000)+1;
  const [dayW,setDayW]=useState(26); // px par jour — ajustable via le zoom
  const ZOOM_LEVELS=[10,14,18,26,36,50];
  const zoomOut=()=>setDayW(w=>{const i=ZOOM_LEVELS.indexOf(w);return ZOOM_LEVELS[Math.max(0,i-1)]||ZOOM_LEVELS[0];});
  const zoomIn=()=>setDayW(w=>{const i=ZOOM_LEVELS.indexOf(w);return ZOOM_LEVELS[Math.min(ZOOM_LEVELS.length-1,i+1)]||ZOOM_LEVELS[ZOOM_LEVELS.length-1];});
  const colW=240;
  const rowH=54;
  const [tt,setTt]=useState(null);
  const scrollRef=React.useRef(null);
  const topScrollRef=React.useRef(null);
  const dayOf=d=>Math.round((d-yearStart)/86400000);
  const xOf=d=>dayOf(d)*dayW;

  // positionne le scroll sur "aujourd'hui" au premier rendu
  useEffect(()=>{
    if(scrollRef.current){
      const target=Math.max(0,xOf(today)-220);
      scrollRef.current.scrollLeft=target;
      if(topScrollRef.current)topScrollRef.current.scrollLeft=target;
    }
  },[]);

  // synchronisation bidirectionnelle entre la barre de scroll du haut (factice) et le contenu réel
  const syncFromTop=()=>{if(scrollRef.current&&topScrollRef.current)scrollRef.current.scrollLeft=topScrollRef.current.scrollLeft;};
  const syncFromBottom=()=>{if(scrollRef.current&&topScrollRef.current)topScrollRef.current.scrollLeft=scrollRef.current.scrollLeft;};

  const scrollToDay=dIdx=>{
    if(scrollRef.current){
      const target=Math.max(0,dIdx*dayW-220);
      scrollRef.current.scrollTo({left:target,behavior:"smooth"});
      if(topScrollRef.current)topScrollRef.current.scrollTo({left:target,behavior:"smooth"});
    }
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
      <div style={{display:"flex",gap:4,marginLeft:"auto"}}>
        <button onClick={zoomOut} disabled={dayW<=ZOOM_LEVELS[0]} style={{padding:"6px 12px",borderRadius:9,border:"1px solid "+T.line,background:T.card,color:dayW<=ZOOM_LEVELS[0]?T.ink300:T.ink700,fontSize:17,fontWeight:700,cursor:dayW<=ZOOM_LEVELS[0]?"default":"pointer"}}>−</button>
        <button onClick={zoomIn} disabled={dayW>=ZOOM_LEVELS[ZOOM_LEVELS.length-1]} style={{padding:"6px 12px",borderRadius:9,border:"1px solid "+T.line,background:T.card,color:dayW>=ZOOM_LEVELS[ZOOM_LEVELS.length-1]?T.ink300:T.ink700,fontSize:17,fontWeight:700,cursor:dayW>=ZOOM_LEVELS[ZOOM_LEVELS.length-1]?"default":"pointer"}}>+</button>
      </div>
      <button onClick={()=>scrollToDay(dayOf(today))} style={{padding:"6px 14px",borderRadius:9,border:"1px solid "+T.teal400,background:T.teal100,color:T.teal600,fontSize:15,fontWeight:700,cursor:"pointer"}}>📍 Aujourd'hui</button>
    </div>

    <div ref={topScrollRef} onScroll={syncFromTop} style={{overflowX:"auto",overflowY:"hidden",height:16}}>
      <div style={{width:colW+totalDays*dayW,height:1}}/>
    </div>

    <div ref={scrollRef} onScroll={syncFromBottom} style={{display:"flex",overflowX:"auto",position:"relative"}}>
      <div style={{width:colW,flexShrink:0,position:"sticky",left:0,zIndex:5,background:T.card,borderRight:"1px solid "+T.line,boxShadow:"2px 0 6px rgba(15,40,60,.04)"}}>
        <div style={{height:46,padding:"0 16px",display:"flex",alignItems:"center",fontSize:14,fontWeight:700,color:T.ink500,textTransform:"uppercase",letterSpacing:".04em",borderBottom:"1px solid "+T.line,background:T.surface}}>Projet</div>
        {data.map((r,ri)=>{
          const c=ETAT_META[r.etat]||ETAT_META["NOT ORDERED"];
          const pv=progress[r.pj];
          const meta=getPjMeta(r.pj);
          return(<div key={ri} style={{height:rowH,padding:"6px 16px",display:"flex",flexDirection:"column",justifyContent:"center",gap:2,borderBottom:"1px solid "+T.surface}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:c.bar,flexShrink:0}}/>
              <span style={{fontSize:16,fontWeight:700,color:T.teal600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{r.pj}</span>
              {pv!=null&&<span style={{fontSize:13,fontWeight:700,color:pv>=100?T.emerald600:T.amber600,background:pv>=100?T.emerald100:T.amber100,padding:"2px 6px",borderRadius:5,flexShrink:0}}>{pv}%</span>}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:6,paddingLeft:16,overflow:"hidden"}}>
              <CountryFlag pays={meta.pays} size={11}/>
              <span style={{fontSize:13,color:T.ink500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{meta.nomProjet} <span style={{fontStyle:"italic",fontSize:11,color:T.ink300}}>({r.gamme})</span></span>
            </div>
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
          return(<div key={ri} style={{height:rowH,position:"relative",borderBottom:"1px solid "+T.surface}}
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

function ProjectModal({pj,data,df,onClose,comments,addComment,deleteComment}){
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
          <div style={{color:T.ink500,fontSize:16,marginTop:3,fontWeight:500,display:"flex",alignItems:"center",gap:6}}>{meta.nomProjet} · <CountryFlag pays={meta.pays} size={14}/> {meta.pays} · {meta.chefProjet}</div>
        </div>
        <button onClick={onClose} style={{background:T.surface,border:"none",borderRadius:9,width:36,height:36,fontSize:18,cursor:"pointer",color:T.ink700,flexShrink:0}}>✕</button>
      </div>

      <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap",alignItems:"center"}}>
        <Badge etat={r.etat}/>
        <span style={{fontSize:15,color:T.ink500,alignSelf:"center"}}>{r.gamme}</span>
        {r.clientPresence?.present&&<span style={{display:"flex",alignItems:"center",gap:5,fontSize:14,background:"#fde4e1",color:T.red500,borderRadius:7,padding:"4px 10px",fontWeight:700}}><PersonIcon size={14} color={T.red500}/> Client/NOBO présent{r.clientPresence.date?" — "+fmt(new Date(r.clientPresence.date)):""}</span>}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:24}}>
        {PHASES.map(ph=>{const d=r[ph.k]?new Date(r[ph.k]):null;const showPresence=ph.k==="tests"&&r.clientPresence?.present;return(
          <div key={ph.k} style={{background:T.surface,borderRadius:10,padding:"11px 14px",borderTop:"3px solid "+ph.c,position:"relative"}}>
            <div style={{color:T.ink500,fontSize:13,fontWeight:600,textTransform:"uppercase",letterSpacing:".03em"}}>{ph.t}</div>
            <div style={{fontWeight:700,color:T.navy800,fontSize:19,marginTop:3}}>{d?fmtMode(d,df):"—"}</div>
            {showPresence&&<span title="Client/NOBO présent" style={{position:"absolute",top:-8,right:-8,fontSize:15,background:"#fde4e1",border:"1.5px solid "+T.red500,borderRadius:"50%",width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center"}}><PersonIcon size={13} color={T.red500}/></span>}
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

      <ProjectComments pj={pj} comments={comments?.[pj]||[]} addComment={addComment} deleteComment={deleteComment}/>
    </div>
  </div>);
}

function ProjectComments({pj,comments,addComment,deleteComment}){
  const [author,setAuthor]=useState("");
  const [text,setText]=useState("");
  const [err,setErr]=useState("");
  const [deleteTarget,setDeleteTarget]=useState(null); // index original du commentaire à supprimer
  const [pinInput,setPinInput]=useState("");
  const submit=async ()=>{
    if(!author.trim()){setErr("Le nom est obligatoire pour publier un commentaire.");return;}
    if(!text.trim())return;
    setErr("");
    const ok=await addComment(pj,author,text);
    if(ok)setText("");
  };
  const confirmDelete=async ()=>{
    const ok=await deleteComment(pj,deleteTarget,pinInput);
    if(ok){setDeleteTarget(null);setPinInput("");}
  };
  const withIndex=comments.map((c,i)=>({...c,_idx:i}));
  const sorted=[...withIndex].sort((a,b)=>new Date(b.date)-new Date(a.date));
  return(<div style={{marginTop:20,paddingTop:16,borderTop:"1px solid "+T.line}}>
    <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:17,color:T.navy800,marginBottom:10}}>💬 Commentaires ({comments.length})</div>
    <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:14}}>
      <input type="text" value={author} onChange={e=>{setAuthor(e.target.value);setErr("");}} placeholder="Votre nom (obligatoire)" maxLength={40}
        style={{padding:"8px 12px",borderRadius:8,border:"1px solid "+(err?T.red500:T.line),fontSize:14,fontFamily:T.font,color:T.ink700}}/>
      {err&&<span style={{fontSize:13,color:T.red500}}>{err}</span>}
      <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Ajouter un commentaire..." rows={3} maxLength={1000}
        style={{padding:"8px 12px",borderRadius:8,border:"1px solid "+T.line,fontSize:14,fontFamily:T.font,color:T.ink700,resize:"vertical"}}/>
      <button onClick={submit} disabled={!text.trim()} style={{alignSelf:"flex-end",padding:"8px 18px",borderRadius:8,border:"none",background:text.trim()?T.teal500:T.surfaceAlt,color:text.trim()?"#fff":T.ink300,fontSize:14,fontWeight:700,cursor:text.trim()?"pointer":"default"}}>Publier</button>
    </div>
    {sorted.length>0&&<div style={{display:"flex",flexDirection:"column",gap:10,maxHeight:300,overflowY:"auto"}}>
      {sorted.map(c=>(
        <div key={c._idx} style={{background:T.surface,borderRadius:10,padding:"10px 14px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4,gap:8}}>
            <span style={{fontWeight:700,color:T.teal600,fontSize:14}}>{c.author}</span>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:12,color:T.ink300}}>{new Date(c.date).toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}</span>
              <button onClick={()=>{setDeleteTarget(c._idx);setPinInput("");}} title="Supprimer" style={{background:"none",border:"none",color:T.ink300,cursor:"pointer",fontSize:14,padding:0}}>✕</button>
            </div>
          </div>
          <div style={{fontSize:14,color:T.ink700,whiteSpace:"pre-wrap"}}>{c.text}</div>
          {deleteTarget===c._idx&&<div style={{marginTop:8,paddingTop:8,borderTop:"1px solid "+T.line,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
            <input type="password" value={pinInput} onChange={e=>setPinInput(e.target.value)} placeholder="Code Manager" style={{padding:"6px 10px",borderRadius:7,border:"1px solid "+T.line,fontSize:13,fontFamily:T.font,width:120}}/>
            <button onClick={confirmDelete} style={{padding:"6px 12px",borderRadius:7,border:"none",background:T.red500,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Confirmer la suppression</button>
            <button onClick={()=>setDeleteTarget(null)} style={{padding:"6px 12px",borderRadius:7,border:"1px solid "+T.line,background:T.card,color:T.ink700,fontSize:13,cursor:"pointer"}}>Annuler</button>
          </div>}
        </div>
      ))}
    </div>}
  </div>);
}

function CommentsView({data,comments,addComment,deleteComment}){
  const [author,setAuthor]=useState("");
  const [selectedPj,setSelectedPj]=useState("");
  const [text,setText]=useState("");
  const [filterPj,setFilterPj]=useState("");
  const [err,setErr]=useState("");
  const [deleteTarget,setDeleteTarget]=useState(null); // {pj,idx}
  const [pinInput,setPinInput]=useState("");

  const allComments=useMemo(()=>{
    const out=[];
    Object.entries(comments).forEach(([pj,list])=>list.forEach((c,idx)=>out.push({...c,pj,_idx:idx})));
    return out.sort((a,b)=>new Date(b.date)-new Date(a.date));
  },[comments]);
  const filtered=filterPj?allComments.filter(c=>c.pj===filterPj):allComments;

  const submit=async ()=>{
    if(!author.trim()){setErr("Le nom est obligatoire pour publier un commentaire.");return;}
    if(!text.trim()||!selectedPj)return;
    setErr("");
    const ok=await addComment(selectedPj,author,text);
    if(ok)setText("");
  };
  const confirmDelete=async ()=>{
    const ok=await deleteComment(deleteTarget.pj,deleteTarget.idx,pinInput);
    if(ok){setDeleteTarget(null);setPinInput("");}
  };

  return(<div style={{display:"flex",flexDirection:"column",gap:16,fontFamily:T.font}}>
    <div style={{background:T.card,borderRadius:14,padding:20,boxShadow:T.shadowMd}}>
      <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:21,color:T.navy900,marginBottom:14}}>💬 Ajouter un commentaire</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,marginBottom:10}}>
        <div>
          <label style={{fontSize:13,color:T.ink500,fontWeight:600,display:"block",marginBottom:5}}>N° PJ concerné</label>
          <select value={selectedPj} onChange={e=>setSelectedPj(e.target.value)} style={{padding:"9px 12px",borderRadius:8,border:"1px solid "+T.line,fontSize:15,fontFamily:T.font,color:T.ink700,background:T.surface,width:"100%"}}>
            <option value="">— Choisir un PJ —</option>
            {data.map(d=><option key={d.pj} value={d.pj}>{d.pj}</option>)}
          </select>
        </div>
        <div>
          <label style={{fontSize:13,color:T.ink500,fontWeight:600,display:"block",marginBottom:5}}>Votre nom (obligatoire)</label>
          <input type="text" value={author} onChange={e=>{setAuthor(e.target.value);setErr("");}} placeholder="Votre nom" maxLength={40}
            style={{padding:"9px 12px",borderRadius:8,border:"1px solid "+(err?T.red500:T.line),fontSize:15,fontFamily:T.font,color:T.ink700,width:"100%"}}/>
        </div>
      </div>
      {err&&<div style={{fontSize:13,color:T.red500,marginBottom:8}}>{err}</div>}
      <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Ajouter un commentaire..." rows={3} maxLength={1000}
        style={{padding:"9px 12px",borderRadius:8,border:"1px solid "+T.line,fontSize:15,fontFamily:T.font,color:T.ink700,resize:"vertical",width:"100%",marginBottom:10}}/>
      <div style={{display:"flex",justifyContent:"flex-end"}}>
        <button onClick={submit} disabled={!text.trim()||!selectedPj} style={{padding:"9px 20px",borderRadius:9,border:"none",background:text.trim()&&selectedPj?T.teal500:T.surfaceAlt,color:text.trim()&&selectedPj?"#fff":T.ink300,fontSize:15,fontWeight:700,cursor:text.trim()&&selectedPj?"pointer":"default"}}>Publier</button>
      </div>
    </div>

    <div style={{background:T.card,borderRadius:14,padding:20,boxShadow:T.shadowMd}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:19,color:T.navy900}}>Tous les commentaires ({filtered.length})</div>
        <select value={filterPj} onChange={e=>setFilterPj(e.target.value)} style={{padding:"7px 11px",borderRadius:8,border:"1px solid "+T.line,fontSize:14,fontFamily:T.font,color:T.ink700,background:T.surface}}>
          <option value="">Tous les PJ</option>
          {data.map(d=><option key={d.pj} value={d.pj}>{d.pj}</option>)}
        </select>
      </div>
      {filtered.length===0&&<div style={{color:T.ink300,fontSize:15,textAlign:"center",padding:"30px 0"}}>Aucun commentaire pour l'instant.</div>}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map(c=>{
          const isTarget=deleteTarget&&deleteTarget.pj===c.pj&&deleteTarget.idx===c._idx;
          return(<div key={c.pj+"-"+c._idx} style={{background:T.surface,borderRadius:10,padding:"12px 16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:5,flexWrap:"wrap",gap:6}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontWeight:700,color:T.teal600,fontSize:15}}>{c.pj}</span>
                <span style={{fontWeight:700,color:T.navy800,fontSize:14}}>{c.author}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:12,color:T.ink300}}>{new Date(c.date).toLocaleString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}</span>
                <button onClick={()=>{setDeleteTarget({pj:c.pj,idx:c._idx});setPinInput("");}} title="Supprimer" style={{background:"none",border:"none",color:T.ink300,cursor:"pointer",fontSize:14,padding:0}}>✕</button>
              </div>
            </div>
            <div style={{fontSize:14,color:T.ink700,whiteSpace:"pre-wrap"}}>{c.text}</div>
            {isTarget&&<div style={{marginTop:8,paddingTop:8,borderTop:"1px solid "+T.line,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
              <input type="password" value={pinInput} onChange={e=>setPinInput(e.target.value)} placeholder="Code Manager" style={{padding:"6px 10px",borderRadius:7,border:"1px solid "+T.line,fontSize:13,fontFamily:T.font,width:120}}/>
              <button onClick={confirmDelete} style={{padding:"6px 12px",borderRadius:7,border:"none",background:T.red500,color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Confirmer la suppression</button>
              <button onClick={()=>setDeleteTarget(null)} style={{padding:"6px 12px",borderRadius:7,border:"1px solid "+T.line,background:T.card,color:T.ink700,fontSize:13,cursor:"pointer"}}>Annuler</button>
            </div>}
          </div>);
        })}
      </div>
    </div>
  </div>);
}

const TABLE_COLUMNS=[
  {id:"projet",label:"Projet"},
  {id:"pays",label:"Pays"},
  {id:"chef",label:"Chef de Projet"},
  {id:"gamme",label:"Gamme"},
  {id:"etat",label:"État"},
  {id:"arrivee",label:"Arrivée"},
  {id:"tests",label:"Tests"},
  {id:"finprod",label:"Fin prod"},
  {id:"depart",label:"Départ"},
  {id:"avancement",label:"Avancement"},
];
function ColumnPicker({hidden,setHidden}){
  const [open,setOpen]=useState(false);
  const [pos,setPos]=useState({top:0,left:0});
  const btnRef=React.useRef(null);
  const toggle=id=>{const s=new Set(hidden);s.has(id)?s.delete(id):s.add(id);setHidden(s);};
  const openMenu=()=>{
    if(btnRef.current){const r=btnRef.current.getBoundingClientRect();setPos({top:r.bottom+4,left:Math.min(r.left,window.innerWidth-230)});}
    setOpen(v=>!v);
  };
  return(<span style={{position:"relative",display:"inline-block"}}>
    <button ref={btnRef} onClick={openMenu} style={{padding:"7px 14px",borderRadius:9,border:"1px solid "+T.line,background:hidden.size>0?T.teal100:T.card,color:hidden.size>0?T.teal600:T.ink700,fontSize:15,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>⚙ Colonnes{hidden.size>0?" ("+(TABLE_COLUMNS.length-hidden.size)+"/"+TABLE_COLUMNS.length+")":""}</button>
    {open&&<>
      <div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,zIndex:9998}}/>
      <div style={{position:"fixed",top:pos.top,left:pos.left,background:T.card,borderRadius:12,boxShadow:T.shadowLg,border:"1px solid "+T.line,zIndex:9999,minWidth:200,maxHeight:340,overflowY:"auto",fontFamily:T.font}}>
        <div style={{padding:"9px 14px",fontSize:13,fontWeight:700,color:T.ink500,textTransform:"uppercase",letterSpacing:".03em",borderBottom:"1px solid "+T.line,background:T.surface}}>Colonnes visibles</div>
        {TABLE_COLUMNS.map(c=>{const visible=!hidden.has(c.id);return(
          <div key={c.id} onClick={()=>toggle(c.id)} style={{display:"flex",alignItems:"center",gap:9,padding:"9px 14px",cursor:"pointer",borderBottom:"1px solid "+T.surface}}>
            <div style={{width:16,height:16,borderRadius:4,border:"1.5px solid "+(visible?T.teal500:T.ink100),background:visible?T.teal500:T.card,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{visible&&<span style={{color:"#fff",fontSize:13,fontWeight:700}}>✓</span>}</div>
            <span style={{fontSize:15,color:T.ink700,fontWeight:visible?600:400}}>{c.label}</span>
          </div>
        );})}
      </div>
    </>}
  </span>);
}
const DEFAULT_COL_WIDTHS_PCT={pj:8,projet:12,pays:9,chef:8,gamme:7,etat:11,arrivee:8,tests:12,finprod:8,depart:8,avancement:9};
function ResizeHandle({colId,nextColId,colWidths,setColWidths}){
  const onMouseDown=e=>{
    e.preventDefault();
    const startX=e.clientX;
    const table=e.target.closest("table");
    const tableW=table?table.getBoundingClientRect().width:1000;
    const startW=colWidths[colId];
    const startNextW=nextColId?colWidths[nextColId]:null;
    const onMove=ev=>{
      const deltaPct=((ev.clientX-startX)/tableW)*100;
      setColWidths(w=>{
        const next={...w};
        const newW=Math.max(5,startW+deltaPct);
        if(nextColId&&startNextW!=null){
          // Transfère la largeur entre la colonne courante et la suivante, la somme totale reste constante
          const newNextW=Math.max(5,startNextW-deltaPct);
          const actualDelta=newW-startW;
          next[colId]=startW+actualDelta;
          next[nextColId]=startNextW-actualDelta;
        }else{
          next[colId]=newW;
        }
        return next;
      });
    };
    const onUp=()=>{window.removeEventListener("mousemove",onMove);window.removeEventListener("mouseup",onUp);};
    window.addEventListener("mousemove",onMove);
    window.addEventListener("mouseup",onUp);
  };
  return <div onMouseDown={onMouseDown} style={{position:"absolute",right:-3,top:0,bottom:0,width:6,cursor:"col-resize",zIndex:3}}/>;
}
function TableView({data,progress,df,selEtats,setSelEtats,selGammes,setSelGammes,allPJs,selPJs,setSelPJs,allProjets,selProjets,setSelProjets,allPays,selPays,setSelPays,allChefs,selChefs,setSelChefs,selMoisArrivee,setSelMoisArrivee,selMoisTests,setSelMoisTests,selMoisFinProd,setSelMoisFinProd,selMoisDepart,setSelMoisDepart,comments,addComment,deleteComment}){
  const [sel,setSel]=useState(null);
  const [hiddenCols,setHiddenCols]=useState(new Set());
  const [colWidths,setColWidths]=useState(DEFAULT_COL_WIDTHS_PCT);
  const show=id=>!hiddenCols.has(id);
  const cw=id=>(colWidths[id]||DEFAULT_COL_WIDTHS_PCT[id])+"%";
  // Liste ordonnée des colonnes actuellement visibles, pour savoir quelle est "la suivante" lors du redimensionnement
  const visibleColOrder=["pj","projet","pays","chef","gamme","etat","arrivee","tests","finprod","depart","avancement"].filter(id=>id==="pj"||show(id));
  const nextVisible=id=>{const i=visibleColOrder.indexOf(id);return i>=0&&i<visibleColOrder.length-1?visibleColOrder[i+1]:null;};
  const thBase={padding:"10px 14px",textAlign:"left",fontWeight:700,color:T.ink500,fontSize:15,whiteSpace:"nowrap",textTransform:"uppercase",letterSpacing:".04em",position:"relative",overflow:"hidden"};
  return(<div style={{background:T.card,borderRadius:14,boxShadow:T.shadowMd,fontFamily:T.font}}>
    <div style={{padding:"10px 14px",borderBottom:"1px solid "+T.line,display:"flex",justifyContent:"flex-end",alignItems:"center"}}>
      <ColumnPicker hidden={hiddenCols} setHidden={setHiddenCols}/>
    </div>
    <div style={{overflowX:"auto",overflowY:"visible"}}>
    <table style={{width:"100%",borderCollapse:"collapse",tableLayout:"fixed"}}>
      <colgroup>
        <col style={{width:cw("pj")}}/>
        {show("projet")&&<col style={{width:cw("projet")}}/>}
        {show("pays")&&<col style={{width:cw("pays")}}/>}
        {show("chef")&&<col style={{width:cw("chef")}}/>}
        {show("gamme")&&<col style={{width:cw("gamme")}}/>}
        {show("etat")&&<col style={{width:cw("etat")}}/>}
        {show("arrivee")&&<col style={{width:cw("arrivee")}}/>}
        {show("tests")&&<col style={{width:cw("tests")}}/>}
        {show("finprod")&&<col style={{width:cw("finprod")}}/>}
        {show("depart")&&<col style={{width:cw("depart")}}/>}
        {show("avancement")&&<col style={{width:cw("avancement")}}/>}
      </colgroup>
      <thead><tr style={{background:T.surface,borderBottom:"2px solid "+T.line,position:"sticky",top:0,zIndex:10}}>
        <th style={thBase}>N° PJ {allPJs&&<DropFilter label="" icon options={allPJs} selected={selPJs||new Set(allPJs)} onChange={setSelPJs}/>}<ResizeHandle colId="pj" nextColId={nextVisible("pj")} colWidths={colWidths} setColWidths={setColWidths}/></th>
        {show("projet")&&<th style={thBase}>Projet {allProjets&&<DropFilter label="" icon options={allProjets} selected={selProjets||new Set(allProjets)} onChange={setSelProjets}/>}<ResizeHandle colId="projet" nextColId={nextVisible("projet")} colWidths={colWidths} setColWidths={setColWidths}/></th>}
        {show("pays")&&<th style={thBase}>Pays {allPays&&<DropFilter label="" icon options={allPays} selected={selPays||new Set(allPays)} onChange={setSelPays}/>}<ResizeHandle colId="pays" nextColId={nextVisible("pays")} colWidths={colWidths} setColWidths={setColWidths}/></th>}
        {show("chef")&&<th style={thBase}>Chef de Projet {allChefs&&<DropFilter label="" icon options={allChefs} selected={selChefs||new Set(allChefs)} onChange={setSelChefs} getLabel={o=>initials(o)+" — "+o}/>}<ResizeHandle colId="chef" nextColId={nextVisible("chef")} colWidths={colWidths} setColWidths={setColWidths}/></th>}
        {show("gamme")&&<th style={thBase}>Gamme {setSelGammes&&<DropFilter label="" icon options={ALL_GAMMES} selected={selGammes} onChange={setSelGammes}/>}<ResizeHandle colId="gamme" nextColId={nextVisible("gamme")} colWidths={colWidths} setColWidths={setColWidths}/></th>}
        {show("etat")&&<th style={thBase}>État {setSelEtats&&<DropFilter label="" icon options={ALL_ETATS} selected={selEtats} onChange={setSelEtats} getLabel={o=>ETAT_META[o]?.label||o}/>}<ResizeHandle colId="etat" nextColId={nextVisible("etat")} colWidths={colWidths} setColWidths={setColWidths}/></th>}
        {show("arrivee")&&<th style={thBase}>Arrivée {setSelMoisArrivee&&<DropFilter label="" icon options={MONTHS} selected={selMoisArrivee} onChange={setSelMoisArrivee}/>}<ResizeHandle colId="arrivee" nextColId={nextVisible("arrivee")} colWidths={colWidths} setColWidths={setColWidths}/></th>}
        {show("tests")&&<th style={thBase}>Tests {setSelMoisTests&&<DropFilter label="" icon options={MONTHS} selected={selMoisTests} onChange={setSelMoisTests}/>}<ResizeHandle colId="tests" nextColId={nextVisible("tests")} colWidths={colWidths} setColWidths={setColWidths}/></th>}
        {show("finprod")&&<th style={thBase}>Fin prod {setSelMoisFinProd&&<DropFilter label="" icon options={MONTHS} selected={selMoisFinProd} onChange={setSelMoisFinProd}/>}<ResizeHandle colId="finprod" nextColId={nextVisible("finprod")} colWidths={colWidths} setColWidths={setColWidths}/></th>}
        {show("depart")&&<th style={thBase}>Départ {setSelMoisDepart&&<DropFilter label="" icon options={MONTHS} selected={selMoisDepart} onChange={setSelMoisDepart}/>}<ResizeHandle colId="depart" nextColId={nextVisible("depart")} colWidths={colWidths} setColWidths={setColWidths}/></th>}
        {show("avancement")&&<th style={thBase}>Avancement<ResizeHandle colId="avancement" nextColId={nextVisible("avancement")} colWidths={colWidths} setColWidths={setColWidths}/></th>}
      </tr></thead>
      <tbody>{data.map((r,i)=>{
        const dl=r.depart?diffDays(today,new Date(r.depart)):null;
        const urgent=dl!=null&&dl>=0&&dl<=30;
        const done=r.etat==="SHIPPED";
        const pval=progress[r.pj];
        const meta=getPjMeta(r.pj);
        return(<tr key={i} onClick={()=>setSel(sel===r.pj?null:r.pj)} style={{borderBottom:"1px solid "+T.surface,cursor:"pointer",background:sel===r.pj?T.teal100:T.card,transition:"background .1s"}}>
          <td style={{padding:"13px 16px",fontWeight:700,color:T.teal600,fontSize:17,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.pj}</td>
          {show("projet")&&<td style={{padding:"13px 16px",color:T.ink700,fontSize:16,whiteSpace:"nowrap",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis"}}>{meta.nomProjet}</td>}
          {show("pays")&&<td style={{padding:"13px 16px",color:T.ink700,fontSize:16,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}><span style={{display:"inline-flex",alignItems:"center",gap:6}}><CountryFlag pays={meta.pays} size={13}/> {meta.pays}</span></td>}
          {show("chef")&&<td style={{padding:"13px 16px",color:T.ink700,fontSize:16,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{initials(meta.chefProjet)}</td>}
          {show("gamme")&&<td style={{padding:"13px 16px",color:T.ink500,fontSize:16,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{r.gamme}</td>}
          {show("etat")&&<td style={{padding:"13px 16px",whiteSpace:"nowrap",overflow:"hidden"}}><Badge etat={r.etat}/></td>}
          {show("arrivee")&&<td style={{padding:"13px 16px",color:T.ink700,fontSize:17,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{fmtMode(r.arrivee?new Date(r.arrivee):null,df)}</td>}
          {show("tests")&&<td style={{padding:"13px 16px",color:T.ink700,fontSize:17,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
            {r.tests?fmtMode(new Date(r.tests),df):"—"}{r.testsFin?" → "+fmtMode(new Date(r.testsFin),df):""}
            {r.clientPresence?.present&&<span title={"Client/NOBO présent"+(r.clientPresence.date?" le "+r.clientPresence.date:"")} style={{marginLeft:7,fontSize:13,background:"#fde4e1",color:T.red500,borderRadius:5,padding:"2px 6px",fontWeight:700,display:"inline-flex",alignItems:"center",gap:4}}><PersonIcon size={12} color={T.red500}/>{r.clientPresence.date?" "+fmt(new Date(r.clientPresence.date)):""}</span>}
          </td>}
          {show("finprod")&&<td style={{padding:"13px 16px",color:T.ink700,fontSize:17,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{fmtMode(r.finProd?new Date(r.finProd):null,df)}</td>}
          {show("depart")&&<td style={{padding:"13px 16px",fontWeight:700,color:done?T.emerald600:urgent?T.amber600:T.ink900,fontSize:17,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{fmtMode(r.depart?new Date(r.depart):null,df)}</td>}
          {show("avancement")&&<td style={{padding:"13px 16px",whiteSpace:"nowrap",overflow:"hidden"}}>
            {pval!=null?<div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:48,background:T.surfaceAlt,borderRadius:5,height:7,overflow:"hidden"}}><div style={{width:pval+"%",height:"100%",background:pval>=100?T.emerald500:pval>=50?T.teal500:T.amber500}}/></div><span style={{fontSize:15,fontWeight:700,color:T.ink700}}>{pval}%</span></div>
            :<span style={{color:T.ink300}}>—</span>}
          </td>}
        </tr>);
      })}</tbody>
    </table>
    </div>
    {sel&&<ProjectModal pj={sel} data={data} df={df} onClose={()=>setSel(null)} comments={comments} addComment={addComment} deleteComment={deleteComment}/>}
  </div>);
}

// Palette cyclique pour distinguer chaque machine (PJ) dans le calendrier
const PJ_PALETTE=["#0d9bb5","#7c3aed","#d97706","#059669","#dc2626","#9333ea","#0e8fa8","#65a30d","#c2761a","#2563eb","#be185d","#0f766e","#b45309","#4338ca","#16a34a"];
function usePjColors(data){
  return useMemo(()=>{
    const pjs=[...new Set(data.map(r=>r.pj))].sort();
    const m={};
    pjs.forEach((pj,i)=>{m[pj]=PJ_PALETTE[i%PJ_PALETTE.length];});
    return m;
  },[data]);
}
function getWeekStatus(r,weekStart,weekEnd){
  const a=r.arrivee?new Date(r.arrivee):null;
  const t1=r.tests?new Date(r.tests):null;
  const t2=r.testsFin?new Date(r.testsFin):t1;
  const fp=r.finProd?new Date(r.finProd):null;
  const dp=r.depart?new Date(r.depart):null;
  if(!a&&!dp)return null;
  if(dp&&dp<weekStart)return null; // déjà parti, rien à afficher

  const within=d=>d&&d>=weekStart&&d<weekEnd;
  const overlaps=(s,e)=>s&&e&&s<weekEnd&&e>=weekStart;
  const milestones=[];
  if(within(a))milestones.push("Arrivée");
  if(within(t1)||within(t2)||overlaps(t1,t2))milestones.push("Tests");
  if(within(fp))milestones.push("Fin prod");
  if(within(dp))milestones.push("Départ");

  if(milestones.length>1)return milestones.join(" + ");
  if(milestones.length===1)return milestones[0];
  // "Production" uniquement entre l'arrivée et la fin de production (pas après)
  if(a&&a<weekEnd&&(fp?fp>=weekStart:true)&&(dp?dp>=weekStart:true))return"Production";
  return null;
}
const SEGMENT_STYLE={
  "Arrivée":{c:"#574b3f",bold:false},
  "Production":{c:"#215275",bold:false},
  "Tests":{c:"#f2ba5e",bold:true},
  "Fin prod":{c:"#4f7d5d",bold:true},
  "Départ":{c:"#f78934",bold:true},
};
function weekStartOf(d){const x=new Date(d);const day=(x.getDay()+6)%7;x.setDate(x.getDate()-day);x.setHours(0,0,0,0);return x;}

function getDayStatus(r,day,excludedDates){
  const dayEnd=new Date(day);dayEnd.setDate(dayEnd.getDate()+1);
  const status=getWeekStatus(r,day,dayEnd);
  if(!status)return null;
  const isWeekend=day.getDay()===0||day.getDay()===6;
  const isExcluded=excludedDates&&excludedDates.includes(toLocalISO(day));
  if(!isWeekend&&!isExcluded)return status;
  // Le week-end ou un jour exclu manuellement : pas de Production ni de Tests (le week-end seulement pour Tests), mais les jalons ponctuels restent affichés
  const milestones=status.split(" + ").filter(m=>{
    if(m==="Production")return false; // toujours exclu si week-end OU exclusion manuelle
    if(m==="Tests"&&isWeekend)return false;
    return true;
  });
  return milestones.length?milestones.join(" + "):null;
}
function CalendarView({data,onSelectPj,mode,setMode,anchor,setAnchor,dayAnchor,setDayAnchor,closurePeriods,productionExclusions}){
  const isClosurePeriod=(colStart,colEnd)=>{
    if(!closurePeriods||!closurePeriods.length)return false;
    return closurePeriods.some(p=>{
      const ps=new Date(p.start),pe=new Date(p.end);pe.setHours(23,59,59,999);
      return colStart<pe&&colEnd>=ps;
    });
  };
  const rowH=54;
  const [zoomLevel,setZoomLevel]=useState(1); // 0=zoomé (peu de colonnes, larges), 1=normal, 2=dézoomé (plus de colonnes, étroites)
  const WEEK_COUNTS=[5,8,14,24];
  const DAY_COUNTS=[9,14,21,35];
  const nWeeks=WEEK_COUNTS[zoomLevel];
  const nDays=DAY_COUNTS[zoomLevel];
  const zoomIn=()=>setZoomLevel(z=>Math.max(0,z-1));
  const zoomOut=()=>setZoomLevel(z=>Math.min(WEEK_COUNTS.length-1,z+1));
  const pjColors=usePjColors(data);

  const weeks=useMemo(()=>{
    const out=[];
    for(let i=0;i<nWeeks;i++){const s=new Date(anchor);s.setDate(s.getDate()+i*7);out.push(s);}
    return out;
  },[anchor,nWeeks]);
  const days=useMemo(()=>{
    const out=[];
    for(let i=0;i<nDays;i++){const d=new Date(dayAnchor);d.setDate(d.getDate()+i);out.push(d);}
    return out;
  },[dayAnchor,nDays]);

  const cols=mode==="week"?weeks:days;
  const pjs=useMemo(()=>[...new Set(data.map(r=>r.pj))].sort((a,b)=>{
    const ra=data.find(r=>r.pj===a),rb=data.find(r=>r.pj===b);
    const da=ra&&ra.arrivee?new Date(ra.arrivee):new Date(9999,0,1);
    const db=rb&&rb.arrivee?new Date(rb.arrivee):new Date(9999,0,1);
    return da-db;
  }),[data]);
  const weekNum=d=>{const j=new Date(d.getFullYear(),0,1);return Math.ceil(((d-j)/86400000+j.getDay()+1)/7);};
  const todayWeekIdx=weeks.findIndex(w=>{const e=new Date(w);e.setDate(e.getDate()+7);return today>=w&&today<e;});
  const todayDayIdx=days.findIndex(d=>d.toDateString()===today.toDateString());
  const DAY_NAMES=["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];

  const goPrev=()=>{
    if(mode==="week")setAnchor(a=>{const n=new Date(a);n.setDate(n.getDate()-7*4);return n;});
    else setDayAnchor(a=>{const n=new Date(a);n.setDate(n.getDate()-7);return n;});
  };
  const goNext=()=>{
    if(mode==="week")setAnchor(a=>{const n=new Date(a);n.setDate(n.getDate()+7*4);return n;});
    else setDayAnchor(a=>{const n=new Date(a);n.setDate(n.getDate()+7);return n;});
  };
  const goToday=()=>{
    if(mode==="week")setAnchor(weekStartOf(today));
    else{const d=new Date(today);d.setHours(0,0,0,0);setDayAnchor(d);}
  };

  // Déplace la fenêtre affichée d'un nombre de jours donné (positif = vers le futur)
  const shiftByDays=days=>{
    if(mode==="week"){
      const weeksShift=Math.round(days/7);
      if(weeksShift===0)return;
      setAnchor(a=>{const n=new Date(a);n.setDate(n.getDate()+weeksShift*7);return n;});
    }else{
      const daysShift=Math.round(days);
      if(daysShift===0)return;
      setDayAnchor(a=>{const n=new Date(a);n.setDate(n.getDate()+daysShift);return n;});
    }
  };

  // Glissement à la souris (clic-glisser) pour naviguer
  const dragRef=React.useRef({active:false,startX:0,colW:mode==="week"?92:64});
  const onMouseDownDrag=e=>{
    dragRef.current={active:true,startX:e.clientX,colW:mode==="week"?92:64};
  };
  const onMouseMoveDrag=e=>{
    if(!dragRef.current.active)return;
    const dx=e.clientX-dragRef.current.startX;
    const threshold=dragRef.current.colW; // une colonne entière de déplacement avant de faire avancer la vue
    if(Math.abs(dx)>=threshold){
      const unitsShift=mode==="week"?Math.sign(-dx)*7:Math.sign(-dx);
      shiftByDays(unitsShift);
      dragRef.current.startX=e.clientX;
    }
  };
  const onMouseUpDrag=()=>{dragRef.current.active=false;};

  // Molette horizontale (ou verticale convertie) pour naviguer
  const wheelAccum=React.useRef(0);
  const onWheelNav=e=>{
    // Ne capture que le défilement horizontal (trackpad/molette latérale) ; le scroll vertical classique reste libre pour faire défiler la page
    if(Math.abs(e.deltaX)<=Math.abs(e.deltaY))return;
    e.preventDefault();
    wheelAccum.current+=e.deltaX;
    const step=mode==="week"?92:64;
    if(Math.abs(wheelAccum.current)>=step){
      const unitsShift=mode==="week"?Math.sign(wheelAccum.current)*7:Math.sign(wheelAccum.current);
      shiftByDays(unitsShift);
      wheelAccum.current=0;
    }
  };

  return(<div style={{background:T.card,borderRadius:14,overflow:"hidden",boxShadow:T.shadowMd,fontFamily:T.font}}>
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 18px",borderBottom:"1px solid "+T.line,background:T.surface,flexWrap:"wrap"}}>
      <div style={{display:"flex",gap:4,background:T.surfaceAlt,borderRadius:9,padding:3}}>
        <button onClick={()=>setMode("week")} style={{padding:"6px 14px",borderRadius:7,border:"none",background:mode==="week"?T.card:"transparent",color:mode==="week"?T.navy800:T.ink500,fontWeight:700,fontSize:15,cursor:"pointer",boxShadow:mode==="week"?T.shadowSm:"none"}}>Semaine</button>
        <button onClick={()=>setMode("day")} style={{padding:"6px 14px",borderRadius:7,border:"none",background:mode==="day"?T.card:"transparent",color:mode==="day"?T.navy800:T.ink500,fontWeight:700,fontSize:15,cursor:"pointer",boxShadow:mode==="day"?T.shadowSm:"none"}}>Jour</button>
      </div>
      <button onClick={goPrev} style={{padding:"6px 13px",borderRadius:9,border:"1px solid "+T.line,background:T.card,fontSize:17,cursor:"pointer",color:T.ink700}}>◀</button>
      <span style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:18,color:T.navy800,minWidth:220,textAlign:"center"}}>
        {mode==="week"
          ?"Sem. "+weekNum(weeks[0])+" → "+weekNum(weeks[weeks.length-1])+", "+weeks[0].getFullYear()
          :days[0].toLocaleDateString("fr-FR",{day:"numeric",month:"short"})+" → "+days[days.length-1].toLocaleDateString("fr-FR",{day:"numeric",month:"short",year:"numeric"})}
      </span>
      <button onClick={goNext} style={{padding:"6px 13px",borderRadius:9,border:"1px solid "+T.line,background:T.card,fontSize:17,cursor:"pointer",color:T.ink700}}>▶</button>
      <span style={{fontSize:14,color:T.ink300}}>Glissez ou utilisez la molette pour défiler →</span>
      <div style={{display:"flex",gap:4,marginLeft:"auto"}}>
        <button onClick={zoomOut} disabled={zoomLevel>=WEEK_COUNTS.length-1} style={{padding:"6px 12px",borderRadius:9,border:"1px solid "+T.line,background:T.card,color:zoomLevel>=WEEK_COUNTS.length-1?T.ink300:T.ink700,fontSize:17,fontWeight:700,cursor:zoomLevel>=WEEK_COUNTS.length-1?"default":"pointer"}}>−</button>
        <button onClick={zoomIn} disabled={zoomLevel<=0} style={{padding:"6px 12px",borderRadius:9,border:"1px solid "+T.line,background:T.card,color:zoomLevel<=0?T.ink300:T.ink700,fontSize:17,fontWeight:700,cursor:zoomLevel<=0?"default":"pointer"}}>+</button>
      </div>
      <button onClick={goToday} style={{padding:"6px 14px",borderRadius:9,border:"1px solid "+T.teal400,background:T.teal100,color:T.teal600,fontSize:15,fontWeight:700,cursor:"pointer"}}>📍 Aujourd'hui</button>
    </div>

    <div onMouseDown={onMouseDownDrag} onMouseMove={onMouseMoveDrag} onMouseUp={onMouseUpDrag} onMouseLeave={onMouseUpDrag} onWheel={onWheelNav}
      style={{overflowX:"auto",cursor:"grab",userSelect:"none"}}>
      <div style={{display:"grid",gridTemplateColumns:"210px "+(mode==="week"
        ?"repeat("+cols.length+",minmax(92px,1fr))"
        :cols.map(d=>(d.getDay()===0||d.getDay()===6)?"minmax(34px,0.55fr)":"minmax(64px,1fr)").join(" ")
      )}}>
        <div style={{padding:"6px 14px",fontSize:13,fontWeight:700,color:T.ink300,background:T.surface,borderBottom:"1px solid "+T.line,borderRight:"1px solid "+T.line,position:"sticky",left:0,top:0,zIndex:12}}/>
        {(()=>{
          // Regroupe les colonnes consécutives par mois pour afficher une bande "Mois Année" au-dessus
          const groups=[];
          cols.forEach((c,i)=>{
            const m=c.getMonth(),y=c.getFullYear();
            const last=groups[groups.length-1];
            if(last&&last.m===m&&last.y===y)last.span++;
            else groups.push({m,y,span:1});
          });
          return groups.map((g,gi)=>(
            <div key={gi} style={{gridColumn:"span "+g.span,padding:"6px 4px",textAlign:"center",fontSize:14,fontWeight:700,color:g.m===today.getMonth()&&g.y===today.getFullYear()?T.teal600:T.ink500,background:g.m===today.getMonth()&&g.y===today.getFullYear()?T.teal100:T.surface,borderBottom:"1px solid "+T.line,borderLeft:"1px solid "+T.line,position:"sticky",top:0,zIndex:10}}>{MONTHS_FULL[g.m]} {g.y}</div>
          ));
        })()}
        <div style={{padding:"9px 14px",fontSize:14,fontWeight:700,color:T.ink500,textTransform:"uppercase",letterSpacing:".03em",background:T.surface,borderBottom:"1px solid "+T.line,borderRight:"1px solid "+T.line,position:"sticky",left:0,top:33,zIndex:12}}>Machine</div>
        {mode==="week"?weeks.map((w,wi)=>{
          const we=new Date(w);we.setDate(we.getDate()+7);
          const closed=isClosurePeriod(w,we);
          return(<div key={wi} style={{padding:"9px 4px",textAlign:"center",fontSize:14,fontWeight:700,color:wi===todayWeekIdx?"#fff":closed?T.ink300:T.ink500,background:wi===todayWeekIdx?T.teal500:closed?"#e2e2e2":T.surface,borderBottom:"1px solid "+T.line,borderLeft:"1px solid "+T.line,boxShadow:wi===todayWeekIdx?"inset 0 -3px 0 "+T.navy900:"none",position:"sticky",top:33,zIndex:10}}>S{weekNum(w)}{closed&&" 🏖️"}</div>);
        }):days.map((d,di)=>{
          const isWE=d.getDay()===0||d.getDay()===6;
          const dEnd=new Date(d);dEnd.setDate(dEnd.getDate()+1);
          const closed=isClosurePeriod(d,dEnd);
          return(<div key={di} style={{padding:"6px 2px",textAlign:"center",background:di===todayDayIdx?T.teal500:closed?"#e2e2e2":isWE?T.surfaceAlt:T.surface,borderBottom:"1px solid "+T.line,borderLeft:"1px solid "+T.line,boxShadow:di===todayDayIdx?"inset 0 -3px 0 "+T.navy900:"none",position:"sticky",top:33,zIndex:10}}>
            <div style={{fontSize:12,fontWeight:600,color:di===todayDayIdx?"rgba(255,255,255,.85)":T.ink300}}>S{weekNum(d)}</div>
            <div style={{fontSize:13,fontWeight:600,color:di===todayDayIdx?"rgba(255,255,255,.85)":closed?T.ink300:T.ink300}}>{DAY_NAMES[d.getDay()]}</div>
            <div style={{fontSize:17,fontWeight:700,color:di===todayDayIdx?"#fff":closed?T.ink300:T.ink700}}>{d.getDate()}</div>
          </div>);
        })}

        {pjs.map((pj,pjIdx)=>{
          const r=data.find(x=>x.pj===pj);
          const color=pjColors[pj]||T.ink500;
          const meta=getPjMeta(pj);
          const rowBg=pjIdx%2===0?T.card:T.surface;
          return(<React.Fragment key={pj}>
            <div onClick={()=>onSelectPj&&onSelectPj(pj)} style={{padding:"6px 14px",display:"flex",flexDirection:"column",justifyContent:"center",gap:2,height:rowH,borderBottom:"1px solid "+T.surface,borderRight:"1px solid "+T.line,background:rowBg,position:"sticky",left:0,cursor:"pointer",overflow:"hidden"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:color,flexShrink:0}}/>
                <span style={{fontSize:16,fontWeight:700,color:T.teal600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pj}</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6,paddingLeft:16,overflow:"hidden"}}>
                <CountryFlag pays={meta.pays} size={11}/>
                <span style={{fontSize:14,color:T.ink500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{meta.nomProjet} <span style={{fontStyle:"italic",fontSize:11,color:T.ink300}}>({r.gamme})</span></span>
              </div>
            </div>
            {mode==="week"?weeks.map((w,wi)=>{
              const we=new Date(w);we.setDate(we.getDate()+7);
              const status=getWeekStatus(r,w,we);
              const isTodayCol=wi===todayWeekIdx;
              const closed=isClosurePeriod(w,we);
              const cellBg=closed?"#e2e2e2":isTodayCol?"rgba(13,155,181,.08)":rowBg;
              if(!status)return<div key={wi} style={{height:rowH,borderBottom:"1px solid "+T.surface,borderLeft:"1px solid "+T.line,background:cellBg}}/>;
              const lastMilestone=status.split(" + ").pop();
              const st=SEGMENT_STYLE[lastMilestone]||SEGMENT_STYLE["Production"];
              const presenceDate=r.clientPresence?.present&&r.clientPresence.date?new Date(r.clientPresence.date):null;
              const showPresence=presenceDate&&presenceDate>=w&&presenceDate<we;
              return(<div key={wi} onClick={()=>onSelectPj&&onSelectPj(pj)} style={{height:rowH,borderBottom:"1px solid "+T.surface,borderLeft:"1px solid "+T.line,padding:3,cursor:"pointer",position:"relative",background:cellBg}}>
                <div title={status+(showPresence?" · Client/NOBO présent":"")} style={{height:"100%",background:st.c,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:status.includes("+")?11:13,fontWeight:st.bold?700:600,color:"#fff",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",padding:"0 4px",opacity:closed?0.45:1}}>{status}</div>
                {showPresence&&<span style={{position:"absolute",top:-8,right:-8,fontSize:20,background:T.red500,border:"2px solid #fff",borderRadius:"50%",width:30,height:30,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:T.shadowMd,zIndex:5}}><PersonIcon size={18} color="#fff"/></span>}
              </div>);
            }):days.map((d,di)=>{
              const isWE=d.getDay()===0||d.getDay()===6;
              const status=getDayStatus(r,d,productionExclusions?.[pj]);
              const isTodayCol=di===todayDayIdx;
              const dEnd=new Date(d);dEnd.setDate(dEnd.getDate()+1);
              const closed=isClosurePeriod(d,dEnd);
              const cellBg=closed?"#e2e2e2":isTodayCol?"rgba(13,155,181,.12)":isWE?(pjIdx%2===0?"#eef1f4":"#e4e8eb"):rowBg;
              if(!status)return<div key={di} style={{height:rowH,borderBottom:"1px solid "+T.surface,borderLeft:"1px solid "+T.line,background:cellBg}}/>;
              const lastMilestone=status.split(" + ").pop();
              const st=SEGMENT_STYLE[lastMilestone]||SEGMENT_STYLE["Production"];
              const showPresence=r.clientPresence?.present&&r.clientPresence.date&&new Date(r.clientPresence.date).toDateString()===d.toDateString();
              return(<div key={di} onClick={()=>onSelectPj&&onSelectPj(pj)} style={{height:rowH,borderBottom:"1px solid "+T.surface,borderLeft:"1px solid "+T.line,padding:3,cursor:"pointer",background:cellBg,position:"relative"}}>
                <div title={status+(showPresence?" · Client/NOBO présent":"")} style={{height:"100%",background:st.c,borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:status.includes("+")?9:10.5,fontWeight:st.bold?700:600,color:"#fff",overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis",padding:"0 2px",opacity:closed?0.45:1}}>{status}</div>
                {showPresence&&<span style={{position:"absolute",top:-7,right:-7,fontSize:17,background:T.red500,border:"2px solid #fff",borderRadius:"50%",width:24,height:24,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:T.shadowMd,zIndex:5}}><PersonIcon size={14} color="#fff"/></span>}
              </div>);
            })}
          </React.Fragment>);
        })}
      </div>
    </div>

    <div style={{padding:"11px 18px",borderTop:"1px solid "+T.line,display:"flex",gap:16,flexWrap:"wrap",background:T.surface,alignItems:"center"}}>
      <span style={{fontSize:14,fontWeight:700,color:T.ink500,textTransform:"uppercase",letterSpacing:".03em"}}>Étapes :</span>
      {Object.entries(SEGMENT_STYLE).map(([label,st])=><span key={label} style={{display:"flex",alignItems:"center",gap:6,fontSize:15}}>
        <span style={{width:14,height:14,borderRadius:4,background:st.c}}/>
        <span style={{color:T.ink700,fontWeight:500}}>{label}</span>
      </span>)}
      <span style={{fontSize:14,color:T.ink300,marginLeft:"auto"}}>Point coloré = machine · Couleur du segment = étape · Clic = détail</span>
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

// Filtre de période (mois et/ou année) réutilisable sur chaque graphique temporel
function PeriodFilter({yearsAvailable,year,setYear,month,setMonth,showMonth=true}){
  return(<div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
    <select value={year||""} onChange={e=>setYear(e.target.value?+e.target.value:null)} style={{padding:"4px 8px",borderRadius:7,border:"1px solid "+T.line,fontSize:12,fontFamily:T.font,color:T.ink700,background:T.card}}>
      <option value="">Toutes années</option>
      {yearsAvailable.map(y=><option key={y} value={y}>{y}</option>)}
    </select>
    {showMonth&&<select value={month==null?"":month} onChange={e=>setMonth(e.target.value===""?null:+e.target.value)} style={{padding:"4px 8px",borderRadius:7,border:"1px solid "+T.line,fontSize:12,fontFamily:T.font,color:T.ink700,background:T.card}}>
      <option value="">Tous les mois</option>
      {MONTHS.map((m,i)=><option key={i} value={i}>{m}</option>)}
    </select>}
  </div>);
}
function ManagerPanel({data,progress,setProgress,initialData,lastInitialImport,onInitialImport,initialImporting,etatChoice,setEtatFor,saveProgress,savingProgress,progressSaved,tab,setTab,clientPresence,setClientPresenceFor,closurePeriods,setClosurePeriods,productionExclusions,toggleProductionExclusion}){
  const [fEtat,setFEtat]=useState(new Set(ALL_ETATS));
  const [kpiStep,setKpiStep]=useState("depart");
  const [chargeYear,setChargeYear]=useState(null);
  const [chargeMonth,setChargeMonth]=useState(null);
  const [satYear,setSatYear]=useState(null);
  const [satMonth,setSatMonth]=useState(null);
  const [driftMoisYear,setDriftMoisYear]=useState(null);
  const yearsInData=useMemo(()=>{
    const ys=new Set();
    data.forEach(r=>["arrivee","tests","finProd","depart"].forEach(k=>{if(r[k])ys.add(new Date(r[k]).getFullYear());}));
    return [...ys].sort();
  },[data]);
  const STEP_LABELS={arrivee:"Arrivée",tests:"Tests",finProd:"Fin de production",depart:"Départ"};
  const [fGamme,setFGamme]=useState(new Set(ALL_GAMMES));
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
  const stepDeltas=comparable.map(r=>r[kpiStep].delta).filter(d=>d!=null);
  const lateCount=stepDeltas.filter(d=>d>0).length;
  const onTimeOrEarlyCount=stepDeltas.filter(d=>d<=0).length;
  const avgDelay=stepDeltas.length?Math.round(stepDeltas.reduce((a,b)=>a+b,0)/stepDeltas.length):null;
  const worstDrifts=[...comparable].filter(r=>r[kpiStep].delta!=null).sort((a,b)=>b[kpiStep].delta-a[kpiStep].delta).slice(0,5);
  const onTimeRate=stepDeltas.length?Math.round((onTimeOrEarlyCount/stepDeltas.length)*100):null;

  // ── AXE 1 : Promesse vs Réalité ────────────────────────────────
  // Jours de retard cumulés sur tout le portefeuille comparable (somme, pas moyenne), pour l'étape sélectionnée
  const totalDelayDays=stepDeltas.filter(d=>d>0).reduce((a,b)=>a+b,0);
  const totalGainDays=stepDeltas.filter(d=>d<0).reduce((a,b)=>a+Math.abs(b),0);
  // Occurrences par mois : initial (promesse) vs révisé (réalité), sur le même axe de mois (mois de la date INITIALE), pour l'étape sélectionnée
  const promiseVsReality=useMemo(()=>{
    const m={};
    comparable.forEach(r=>{
      const step=r[kpiStep];
      if(!step.ini)return;
      const mo=MONTHS[new Date(step.ini).getMonth()];
      if(!m[mo])m[mo]={mois:mo,promis:0,realise:0};
      m[mo].promis++;
      const revMo=step.rev?MONTHS[new Date(step.rev).getMonth()]:null;
      if(revMo===mo)m[mo].realise++;
    });
    const order=MONTHS;
    return order.filter(mo=>m[mo]).map(mo=>m[mo]);
  },[comparable,kpiStep]);

  // ── AXE 2 : Fiabilité de l'engagement ──────────────────────────
  const zeroDriftCount=stepDeltas.filter(d=>d===0).length;
  const reliabilityRate=stepDeltas.length?Math.round((zeroDriftCount/stepDeltas.length)*100):null;
  const driftBuckets=useMemo(()=>{
    const buckets=[
      {label:"À l'heure / avance",min:-Infinity,max:0,c:T.emerald500,n:0},
      {label:"Léger retard (1-15j)",min:0,max:15,c:T.amber500,n:0},
      {label:"Retard important (15-30j)",min:15,max:30,c:"#e8821a",n:0},
      {label:"Retard critique (30j+)",min:30,max:Infinity,c:T.red500,n:0},
    ];
    stepDeltas.forEach(d=>{
      const b=buckets.find(b=>d>b.min&&d<=b.max)||(d<=0?buckets[0]:buckets[buckets.length-1]);
      if(b)b.n++;
    });
    return buckets.filter(b=>b.n>0);
  },[stepDeltas]);

  // ── AXE 3 : Trajectoire de la dérive (le retard s'aggrave-t-il ou se résorbe-t-il au fil des jalons ?) ─
  const trajectory=useMemo(()=>{
    const steps=[["arrivee","Arrivée"],["tests","Tests"],["finProd","Fin prod"],["depart","Départ"]];
    return steps.map(([k,label])=>{
      const deltas=comparable.map(r=>r[k].delta).filter(d=>d!=null);
      const moyenne=deltas.length?Math.round((deltas.reduce((a,b)=>a+b,0)/deltas.length)*10)/10:null;
      return{jalon:label,moyenne};
    });
  },[comparable]);

  // ── Comparaison Initial vs Révisé par PJ — pour l'étape sélectionnée, en barres groupées ─
  // On exprime les deux dates en "jour de l'année" pour pouvoir les comparer visuellement sur un même axe
  const yearStart=new Date(today.getFullYear(),0,1);
  const dayOfYear=d=>Math.round((d-yearStart)/86400000);
  const pjCompareChart=useMemo(()=>{
    return comparable.filter(r=>r[kpiStep].ini&&r[kpiStep].rev).map(r=>({
      pj:r.pj,
      initial:dayOfYear(new Date(r[kpiStep].ini)),
      revise:dayOfYear(new Date(r[kpiStep].rev)),
      delta:r[kpiStep].delta,
      dateIni:r[kpiStep].ini,
      dateRev:r[kpiStep].rev,
    })).sort((a,b)=>a.initial-b.initial);
  },[comparable,kpiStep]);

  // ── Durée totale de production (Arrivée → Départ) : initial vs révisé ──
  const dureeCompare=useMemo(()=>{
    const rows=comparable.filter(r=>r.arrivee.ini&&r.depart.ini&&r.arrivee.rev&&r.depart.rev).map(r=>({
      pj:r.pj,
      dureeIni:diffDays(new Date(r.arrivee.ini),new Date(r.depart.ini)),
      dureeRev:diffDays(new Date(r.arrivee.rev),new Date(r.depart.rev)),
    }));
    const avgIni=rows.length?Math.round(rows.reduce((a,b)=>a+b.dureeIni,0)/rows.length):null;
    const avgRev=rows.length?Math.round(rows.reduce((a,b)=>a+b.dureeRev,0)/rows.length):null;
    return{rows,avgIni,avgRev,ecart:avgIni!=null&&avgRev!=null?avgRev-avgIni:null};
  },[comparable]);

  // ── Tableau détaillé : écart sur les 4 jalons pour chaque PJ comparable ──
  // ── Axe 1 : dérive moyenne par gamme ──────────────────────────
  const driftByGamme=useMemo(()=>{
    const m={};
    comparable.forEach(r=>{
      if(r.depart.delta==null)return;
      if(!m[r.gamme])m[r.gamme]={sum:0,n:0};
      m[r.gamme].sum+=r.depart.delta;m[r.gamme].n++;
    });
    return Object.entries(m).map(([gamme,v])=>({gamme,moyenne:Math.round((v.sum/v.n)*10)/10,n:v.n})).sort((a,b)=>b.moyenne-a.moyenne);
  },[comparable]);

  // ── Axe 2 : dérive moyenne par mois de départ révisé ──────────
  const driftByMonth=useMemo(()=>{
    const m={};
    comparable.forEach(r=>{
      if(r.depart.delta==null||!r.depart.rev)return;
      const dt=new Date(r.depart.rev);
      if(driftMoisYear&&dt.getFullYear()!==driftMoisYear)return;
      const mo=MONTHS[dt.getMonth()];
      if(!m[mo])m[mo]={sum:0,n:0};
      m[mo].sum+=r.depart.delta;m[mo].n++;
    });
    return MONTHS.filter(mo=>m[mo]).map(mo=>({mois:mo,moyenne:Math.round((m[mo].sum/m[mo].n)*10)/10,n:m[mo].n}));
  },[comparable,driftMoisYear]);

  // ── Axe 4 : dérive moyenne par jalon (où le retard se creuse) ─
  const driftByMilestone=useMemo(()=>{
    const keys=[["arrivee","Arrivée"],["tests","Tests"],["finProd","Fin prod"],["depart","Départ"]];
    return keys.map(([k,label])=>{
      const deltas=comparable.map(r=>r[k].delta).filter(d=>d!=null);
      const moyenne=deltas.length?Math.round((deltas.reduce((a,b)=>a+b,0)/deltas.length)*10)/10:null;
      return{jalon:label,moyenne,n:deltas.length};
    });
  },[comparable]);

  // ── Axe 5 : tendance — dérive moyenne mois par mois, dans l'ordre chronologique ─
  const driftTrend=useMemo(()=>{
    const order=["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"];
    return driftByMonth.slice().sort((a,b)=>order.indexOf(a.mois)-order.indexOf(b.mois));
  },[driftByMonth]);

  // ── Explorateur libre : dimension + métrique au choix ─────────
  const [exploreDim,setExploreDim]=useState("gamme");
  const [exploreMetric,setExploreMetric]=useState("count");
  const DIM_GETTERS={
    gamme:r=>r.gamme,
    etat:r=>ETAT_META[r.etat]?.label||r.etat,
    pays:r=>getPjMeta(r.pj).pays,
    chef:r=>initials(getPjMeta(r.pj).chefProjet),
    moisDepart:r=>r.depart?MONTHS[new Date(r.depart).getMonth()]:"—",
  };
  const exploreData=useMemo(()=>{
    const getter=DIM_GETTERS[exploreDim];
    const groups={};
    fd.forEach(r=>{
      const key=getter(r);
      if(!groups[key])groups[key]={key,count:0,driftSum:0,driftN:0,durSum:0,durN:0};
      groups[key].count++;
      const driftRow=driftRows.find(d=>d.pj===r.pj);
      if(driftRow&&driftRow.depart.delta!=null){groups[key].driftSum+=driftRow.depart.delta;groups[key].driftN++;}
      if(r.arrivee&&r.depart){const dur=diffDays(new Date(r.arrivee),new Date(r.depart));groups[key].durSum+=dur;groups[key].durN++;}
    });
    return Object.values(groups).map(g=>({
      key:g.key,
      count:g.count,
      drift:g.driftN?Math.round((g.driftSum/g.driftN)*10)/10:null,
      duree:g.durN?Math.round(g.durSum/g.durN):null,
    })).sort((a,b)=>b.count-a.count);
  },[fd,exploreDim,driftRows]);
  const exploreMetricInfo={
    count:{key:"count",label:"Nombre de PJ",fmt:v=>v},
    drift:{key:"drift",label:"Dérive moyenne départ (j)",fmt:v=>v==null?"—":v},
    duree:{key:"duree",label:"Durée moyenne production (j)",fmt:v=>v==null?"—":v},
  };

  // ── Nouveaux KPI : volumétrie, durée moyenne, charge mensuelle ─
  const dureeProdValues=fd.map(r=>r.arrivee&&r.depart?diffDays(new Date(r.arrivee),new Date(r.depart)):null).filter(d=>d!=null);
  const avgDureeProd=dureeProdValues.length?Math.round(dureeProdValues.reduce((a,b)=>a+b,0)/dureeProdValues.length):null;
  const chargeByMonthMulti=useMemo(()=>{
    const steps=[["arrivee","Arrivée",T.teal500],["tests","Tests",T.amber500],["finProd","Fin prod",T.emerald500],["depart","Départ",T.red500]];
    const m={};
    MONTHS.forEach(mo=>{m[mo]={mois:mo};steps.forEach(([k,l])=>{m[mo][l]=0;});m[mo]["Production"]=0;});
    fd.forEach(r=>{
      steps.forEach(([k,l])=>{if(r[k]){const dt=new Date(r[k]);if(chargeYear&&dt.getFullYear()!==chargeYear)return;const mo=MONTHS[dt.getMonth()];m[mo][l]++;}});
      // Production : la machine est en fabrication ce mois-là si le mois chevauche [arrivée, fin prod]
      if(r.arrivee&&r.finProd){
        const start=new Date(r.arrivee),end=new Date(r.finProd);
        const targetYear=chargeYear||start.getFullYear();
        MONTHS.forEach((mo,mi)=>{
          const monthStart=new Date(targetYear,mi,1),monthEnd=new Date(targetYear,mi+1,1);
          if(start<monthEnd&&end>=monthStart)m[mo]["Production"]++;
        });
      }
    });
    return MONTHS.filter(mo=>Object.values(m[mo]).some(v=>typeof v==="number"&&v>0)).map(mo=>m[mo]);
  },[fd,chargeYear]);

  // ── Charge de travail Atelier / Autom par PJ (heures issues de l'import Excel) ──
  const CAPA_ATELIER_SEM=210; // 6 personnes × 35h/semaine
  const CAPA_AUTOM_SEM=35;    // 1 poste × 35h/semaine
  const workloadByPJ=useMemo(()=>{
    return fd.filter(r=>r.heuresAtelier||r.heuresAutom).map(r=>({
      pj:r.pj,gamme:r.gamme,
      heuresAtelier:r.heuresAtelier||0,
      heuresAutom:r.heuresAutom||0,
    })).sort((a,b)=>b.heuresAtelier-a.heuresAtelier);
  },[fd]);
  const totalHeuresAtelier=workloadByPJ.reduce((a,r)=>a+r.heuresAtelier,0);
  const totalHeuresAutom=workloadByPJ.reduce((a,r)=>a+r.heuresAutom,0);

  // Saturation hebdomadaire : répartit la charge Atelier sur [Arrivée→Fin prod] et Autom sur [Tests→TestsFin], semaine par semaine
  const saturationByWeek=useMemo(()=>{
    const weekly={}; // clé = lundi de la semaine en ISO, valeur = {atelier,autom}
    const addToWeeks=(start,end,totalHeures,type)=>{
      if(!start||!end||!totalHeures)return;
      const s=new Date(start),e=new Date(end);
      const totalMs=Math.max(e-s,86400000); // au moins 1 jour pour éviter division par 0
      let cur=weekStartOf(s);
      while(cur<=e){
        const weekEnd=new Date(cur);weekEnd.setDate(weekEnd.getDate()+7);
        const segStart=Math.max(cur,s),segEnd=Math.min(weekEnd,e);
        const overlapMs=Math.max(0,segEnd-segStart);
        const share=overlapMs/totalMs*totalHeures;
        const key=toLocalISO(cur);
        if(!weekly[key])weekly[key]={atelier:0,autom:0,weekStart:new Date(cur)};
        weekly[key][type]+=share;
        cur=weekEnd;
      }
    };
    fd.forEach(r=>{
      if(r.arrivee&&r.finProd)addToWeeks(r.arrivee,r.finProd,r.heuresAtelier,"atelier");
      if(r.tests&&r.testsFin)addToWeeks(r.tests,r.testsFin,r.heuresAutom,"autom");
    });
    return Object.values(weekly)
      .filter(w=>(!satYear||w.weekStart.getFullYear()===satYear)&&(satMonth==null||w.weekStart.getMonth()===satMonth))
      .sort((a,b)=>a.weekStart-b.weekStart).map(w=>({
      semaine:fmt(w.weekStart),
      semaineMois:fmt(w.weekStart)+" "+MONTHS[w.weekStart.getMonth()],
      mois:MONTHS[w.weekStart.getMonth()],
      atelier:Math.round(w.atelier),
      autom:Math.round(w.autom),
      satAtelier:Math.round((w.atelier/CAPA_ATELIER_SEM)*100),
      satAutom:Math.round((w.autom/CAPA_AUTOM_SEM)*100),
    }));
  },[fd,satYear,satMonth]);

  const countByPays=useMemo(()=>{
    const m={};
    fd.forEach(r=>{const p=getPjMeta(r.pj).pays;m[p]=(m[p]||0)+1;});
    return Object.entries(m).map(([pays,n])=>({pays,n})).sort((a,b)=>b.n-a.n);
  },[fd]);
  const countByEtat=useMemo(()=>{
    return ALL_ETATS.map(e=>({etat:ETAT_META[e].label,n:fd.filter(r=>r.etat===e).length,c:ETAT_META[e].bar})).filter(d=>d.n>0);
  },[fd]);

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
      {[["derives","📈 KPIs & Dérives"],["avancement","🔧 Avancement"],["statut","🏷️ Statut & État"],["vacances","🏖️ Vacances"],["production","🏭 Production"]].map(([id,l])=><button key={id} onClick={()=>setTab(id)} style={{padding:"9px 18px",borderRadius:10,border:"none",background:tab===id?T.teal500:T.card,color:tab===id?"#fff":T.ink700,fontWeight:700,fontSize:16,cursor:"pointer",boxShadow:tab===id?T.shadowSm:"none"}}>{l}</button>)}
    </div>
    {tab==="derives"&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12}}>
        {[[fd.length,"Total",T.teal500],[shipped.length,"Expédiées",T.emerald500],[inProd.length,"En production",T.amber500],[upcoming.length,"Départs < 30j",T.red500],[avgDureeProd==null?"—":avgDureeProd+"j","Durée moy. production",T.violet500]].map(([v,l,c])=>(
          <div key={l} style={{background:T.card,borderRadius:12,padding:"14px 16px",borderTop:"3px solid "+c,boxShadow:T.shadowMd}}>
            <div style={{fontFamily:T.fontDisplay,fontSize:36,fontWeight:700,color:T.navy800}}>{v}</div>
            <div style={{fontSize:15,fontWeight:600,color:T.ink500,marginTop:3}}>{l}</div>
          </div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(380px,1fr))",gap:14}}>
        {countByEtat.length>0&&<div style={{background:T.card,borderRadius:12,padding:16,boxShadow:T.shadowMd}}>
          <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:17,color:T.navy800,marginBottom:4}}>Répartition par état</div>
          <div style={{fontSize:13,color:T.ink300,marginBottom:10}}>Volumétrie actuelle du portefeuille</div>
          <ResponsiveContainer width="100%" height={Math.max(160,countByEtat.length*40)}>
            <BarChart data={countByEtat} layout="vertical" margin={{left:10,right:20}}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.surface}/>
              <XAxis type="number" allowDecimals={false} tick={{fontSize:12,fill:T.ink500}}/>
              <YAxis type="category" dataKey="etat" width={130} tick={{fontSize:13,fill:T.ink700,fontWeight:600}}/>
              <Tooltip contentStyle={{fontFamily:T.font,fontSize:13,borderRadius:8}}/>
              <Bar dataKey="n" radius={[0,6,6,0]}>
                {countByEtat.map((d,i)=><Cell key={i} fill={d.c}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>}

        {countByPays.length>0&&<div style={{background:T.card,borderRadius:12,padding:16,boxShadow:T.shadowMd}}>
          <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:17,color:T.navy800,marginBottom:4}}>Répartition par pays</div>
          <div style={{fontSize:13,color:T.ink300,marginBottom:10}}>Destinations des machines du portefeuille</div>
          <ResponsiveContainer width="100%" height={Math.max(160,countByPays.length*36)}>
            <BarChart data={countByPays} layout="vertical" margin={{left:10,right:20}}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.surface}/>
              <XAxis type="number" allowDecimals={false} tick={{fontSize:12,fill:T.ink500}}/>
              <YAxis type="category" dataKey="pays" width={90} tick={{fontSize:13,fill:T.ink700,fontWeight:600}}/>
              <Tooltip contentStyle={{fontFamily:T.font,fontSize:13,borderRadius:8}}/>
              <Bar dataKey="n" radius={[0,6,6,0]} fill={T.teal500}/>
            </BarChart>
          </ResponsiveContainer>
        </div>}

        {fd.length>0&&<div style={{background:T.card,borderRadius:12,padding:16,boxShadow:T.shadowMd,gridColumn:"1 / -1"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
            <div>
              <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:17,color:T.navy800,marginBottom:4}}>Charge prévisionnelle par étape et par mois</div>
              <div style={{fontSize:13,color:T.ink300,marginBottom:10}}>Nombre de machines à chaque étape chaque mois — Production = machines en fabrication ce mois-là</div>
            </div>
            <PeriodFilter yearsAvailable={yearsInData} year={chargeYear} setYear={setChargeYear} showMonth={false}/>
          </div>
          {chargeByMonthMulti.length>0?<ResponsiveContainer width="100%" height={260}>
            <BarChart data={chargeByMonthMulti}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.surface}/>
              <XAxis dataKey="mois" tick={{fontSize:12,fill:T.ink700,fontWeight:600}}/>
              <YAxis allowDecimals={false} tick={{fontSize:12,fill:T.ink500}}/>
              <Tooltip contentStyle={{fontFamily:T.font,fontSize:13,borderRadius:8}}/>
              <Legend wrapperStyle={{fontSize:13}}/>
              <Bar dataKey="Arrivée" fill={T.teal500} radius={[4,4,0,0]}/>
              <Bar dataKey="Production" fill="#5eccc9" radius={[4,4,0,0]}/>
              <Bar dataKey="Tests" fill={T.amber500} radius={[4,4,0,0]}/>
              <Bar dataKey="Fin prod" fill={T.emerald500} radius={[4,4,0,0]}/>
              <Bar dataKey="Départ" fill={T.red500} radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>:<div style={{padding:"40px 0",textAlign:"center",color:T.ink300,fontSize:14}}>Aucune donnée pour cette période</div>}
        </div>}

        {workloadByPJ.length>0&&<div style={{background:T.card,borderRadius:12,padding:16,boxShadow:T.shadowMd,gridColumn:"1 / -1"}}>
          <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:17,color:T.navy800,marginBottom:4}}>🔧 Charge de travail Atelier / Autom</div>
          <div style={{fontSize:13,color:T.ink300,marginBottom:14}}>Heures de travail par PJ, issues de l'import Excel (feuille Table_affectation)</div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:16}}>
            {[[totalHeuresAtelier+"h","Total Atelier",T.teal500],[totalHeuresAutom+"h","Total Autom",T.violet500],[workloadByPJ.length,"PJ avec charge connue",T.ink500]].map(([v,l,c])=>(
              <div key={l} style={{background:T.surface,borderRadius:10,padding:"12px 16px",borderTop:"3px solid "+c}}>
                <div style={{fontFamily:T.fontDisplay,fontSize:26,fontWeight:700,color:T.navy800}}>{v}</div>
                <div style={{fontSize:13,color:T.ink500,marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(380px,1fr))",gap:14}}>
            <div style={{background:T.surface,borderRadius:10,padding:14,overflow:"auto",maxHeight:380}}>
              <div style={{fontSize:14,fontWeight:700,color:T.navy800,marginBottom:8}}>Détail par PJ</div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr style={{borderBottom:"1px solid "+T.line,position:"sticky",top:0,background:T.surface}}>
                  {["N° PJ","Gamme","Atelier","Autom"].map(h=><th key={h} style={{padding:"6px 10px",textAlign:h==="N° PJ"||h==="Gamme"?"left":"right",fontWeight:700,color:T.ink500,fontSize:12,textTransform:"uppercase"}}>{h}</th>)}
                </tr></thead>
                <tbody>{workloadByPJ.map(r=>(
                  <tr key={r.pj} style={{borderBottom:"1px solid "+T.surfaceAlt}}>
                    <td style={{padding:"7px 10px",fontWeight:700,color:T.teal600}}>{r.pj}</td>
                    <td style={{padding:"7px 10px",color:T.ink500}}>{r.gamme}</td>
                    <td style={{padding:"7px 10px",textAlign:"right",fontWeight:600,color:T.navy800}}>{r.heuresAtelier}h</td>
                    <td style={{padding:"7px 10px",textAlign:"right",fontWeight:600,color:T.violet600}}>{r.heuresAutom}h</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>

            {workloadByPJ.length>0&&<>
              <div style={{background:T.surface,borderRadius:10,padding:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:T.navy800,marginBottom:4}}>Taux de saturation hebdomadaire</div>
                    <div style={{fontSize:12,color:T.ink300,marginBottom:8}}>Atelier (capacité {CAPA_ATELIER_SEM}h/sem.) vs Autom (capacité {CAPA_AUTOM_SEM}h/sem.)</div>
                  </div>
                  <PeriodFilter yearsAvailable={yearsInData} year={satYear} setYear={setSatYear} month={satMonth} setMonth={setSatMonth}/>
                </div>
                {saturationByWeek.length>0?<ResponsiveContainer width="100%" height={220}>
                  <LineChart data={saturationByWeek}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.line}/>
                    <XAxis dataKey="semaineMois" tick={{fontSize:10.5,fill:T.ink500}} angle={-35} textAnchor="end" height={55}/>
                    <YAxis tick={{fontSize:12,fill:T.ink500}} tickFormatter={v=>v+"%"}/>
                    <Tooltip formatter={(v,n)=>[v+"%",n]} contentStyle={{fontFamily:T.font,fontSize:13,borderRadius:8}}/>
                    <Legend wrapperStyle={{fontSize:13}}/>
                    <Line type="monotone" dataKey="satAtelier" name="Atelier" stroke={T.teal500} strokeWidth={3} dot={{r:4,fill:T.teal500}}/>
                    <Line type="monotone" dataKey="satAutom" name="Autom" stroke={T.violet500} strokeWidth={3} dot={{r:4,fill:T.violet500}}/>
                  </LineChart>
                </ResponsiveContainer>:<div style={{padding:"40px 0",textAlign:"center",color:T.ink300,fontSize:14}}>Aucune donnée pour cette période</div>}
              </div>

              <div style={{background:T.surface,borderRadius:10,padding:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:T.navy800,marginBottom:4}}>Heures de travail hebdomadaires</div>
                    <div style={{fontSize:12,color:T.ink300,marginBottom:8}}>Volume brut d'heures Atelier et Autom, semaine par semaine</div>
                  </div>
                  <PeriodFilter yearsAvailable={yearsInData} year={satYear} setYear={setSatYear} month={satMonth} setMonth={setSatMonth}/>
                </div>
                {saturationByWeek.length>0?<ResponsiveContainer width="100%" height={220}>
                  <LineChart data={saturationByWeek}>
                    <CartesianGrid strokeDasharray="3 3" stroke={T.line}/>
                    <XAxis dataKey="semaineMois" tick={{fontSize:10.5,fill:T.ink500}} angle={-35} textAnchor="end" height={55}/>
                    <YAxis tick={{fontSize:12,fill:T.ink500}} tickFormatter={v=>v+"h"}/>
                    <Tooltip formatter={(v,n)=>[v+"h",n]} contentStyle={{fontFamily:T.font,fontSize:13,borderRadius:8}}/>
                    <Legend wrapperStyle={{fontSize:13}}/>
                    <Line type="monotone" dataKey="atelier" name="Atelier" stroke={T.teal500} strokeWidth={3} dot={{r:4,fill:T.teal500}}/>
                    <Line type="monotone" dataKey="autom" name="Autom" stroke={T.violet500} strokeWidth={3} dot={{r:4,fill:T.violet500}}/>
                  </LineChart>
                </ResponsiveContainer>:<div style={{padding:"40px 0",textAlign:"center",color:T.ink300,fontSize:14}}>Aucune donnée pour cette période</div>}
              </div>
            </>}
          </div>
        </div>}

        <div style={{background:T.card,borderRadius:12,padding:16,boxShadow:T.shadowMd}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8,marginBottom:10}}>
            <div>
              <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:17,color:T.navy800}}>Explorateur libre</div>
              <div style={{fontSize:13,color:T.ink300}}>Choisissez ce que vous voulez analyser</div>
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              <select value={exploreDim} onChange={e=>setExploreDim(e.target.value)} style={{padding:"6px 10px",borderRadius:8,border:"1px solid "+T.line,fontSize:13,fontFamily:T.font,color:T.ink700,background:T.surface}}>
                <option value="gamme">Par gamme</option>
                <option value="etat">Par état</option>
                <option value="pays">Par pays</option>
                <option value="chef">Par chef de projet</option>
                <option value="moisDepart">Par mois de départ</option>
              </select>
              <select value={exploreMetric} onChange={e=>setExploreMetric(e.target.value)} style={{padding:"6px 10px",borderRadius:8,border:"1px solid "+T.line,fontSize:13,fontFamily:T.font,color:T.ink700,background:T.surface}}>
                <option value="count">Nombre de PJ</option>
                <option value="drift">Dérive moyenne départ</option>
                <option value="duree">Durée moyenne production</option>
              </select>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={Math.max(180,exploreData.length*36)}>
            <BarChart data={exploreData} layout="vertical" margin={{left:10,right:20}}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.surface}/>
              <XAxis type="number" tick={{fontSize:12,fill:T.ink500}}/>
              <YAxis type="category" dataKey="key" width={100} tick={{fontSize:13,fill:T.ink700,fontWeight:600}}/>
              <Tooltip formatter={(v,n,p)=>[v,exploreMetricInfo[exploreMetric].label]} contentStyle={{fontFamily:T.font,fontSize:13,borderRadius:8}}/>
              <Bar dataKey={exploreMetric} radius={[0,6,6,0]} fill={T.violet500}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {initialData.length>0&&<>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12}}>
          {[[avgDelay==null?"—":(avgDelay>0?"+":"")+avgDelay+"j","Retard moyen départ",avgDelay>0?T.red500:T.emerald500],[lateCount,"PJ en retard",T.red500],[onTimeOrEarlyCount,"PJ à l'heure / en avance",T.emerald500],[onTimeRate==null?"—":onTimeRate+"%","Taux de respect délais",onTimeRate>=70?T.emerald500:onTimeRate>=40?T.amber500:T.red500],[comparable.length,"PJ comparables",T.ink500]].map(([v,l,c])=>(
            <div key={l} style={{background:T.card,borderRadius:12,padding:"14px 16px",borderTop:"3px solid "+c,boxShadow:T.shadowMd}}>
              <div style={{fontFamily:T.fontDisplay,fontSize:30,fontWeight:700,color:T.navy800}}>{v}</div>
              <div style={{fontSize:15,fontWeight:600,color:T.ink500,marginTop:3}}>{l}</div>
            </div>
          ))}
        </div>

        <div style={{background:T.card,borderRadius:14,padding:"18px 20px",boxShadow:T.shadowMd,border:"1px solid "+T.line}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10,marginBottom:2}}>
            <div>
              <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:21,color:T.navy900}}>📊 Vue CODIR — Promesse vs Réalité</div>
              <div style={{fontSize:14,color:T.ink500}}>Impact cumulé de l'écart entre le planning initial et le planning révisé</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,background:T.surface,borderRadius:10,padding:"6px 10px"}}>
              <span style={{fontSize:13,color:T.ink500,fontWeight:600}}>Étape analysée :</span>
              <div style={{display:"flex",gap:4}}>
                {Object.entries(STEP_LABELS).map(([k,l])=><button key={k} onClick={()=>setKpiStep(k)} style={{padding:"6px 12px",borderRadius:8,border:"none",background:kpiStep===k?T.teal500:T.card,color:kpiStep===k?"#fff":T.ink700,fontSize:13,fontWeight:600,cursor:"pointer"}}>{l}</button>)}
              </div>
            </div>
          </div>
          <div style={{marginBottom:16}}/>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:12,marginBottom:18}}>
            {[[totalDelayDays+"j","Retard cumulé généré ("+STEP_LABELS[kpiStep]+")",T.red500],[totalGainDays+"j","Avance cumulée gagnée",T.emerald500],[reliabilityRate==null?"—":reliabilityRate+"%","PJ tenus à la date promise",T.teal500],[dureeCompare.ecart==null?"—":(dureeCompare.ecart>0?"+":"")+dureeCompare.ecart+"j","Écart durée moy. production",dureeCompare.ecart>0?T.red500:T.emerald500]].map(([v,l,c])=>(
              <div key={l} style={{background:T.surface,borderRadius:10,padding:"12px 16px",borderTop:"3px solid "+c}}>
                <div style={{fontFamily:T.fontDisplay,fontSize:28,fontWeight:700,color:T.navy800}}>{v}</div>
                <div style={{fontSize:13,color:T.ink500,marginTop:2}}>{l}</div>
              </div>
            ))}
          </div>

          {promiseVsReality.length>0&&<div style={{background:T.surface,borderRadius:10,padding:14,marginBottom:14}}>
            <div style={{fontSize:14,fontWeight:700,color:T.navy800,marginBottom:8}}>{STEP_LABELS[kpiStep]} promis (initial) vs maintenus dans le mois (révisé)</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={promiseVsReality}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.line}/>
                <XAxis dataKey="mois" tick={{fontSize:12,fill:T.ink700,fontWeight:600}}/>
                <YAxis allowDecimals={false} tick={{fontSize:12,fill:T.ink500}}/>
                <Tooltip contentStyle={{fontFamily:T.font,fontSize:13,borderRadius:8}}/>
                <Legend wrapperStyle={{fontSize:13}}/>
                <Line type="monotone" dataKey="promis" name="Promis (initial)" stroke={T.ink300} strokeWidth={2.5} strokeDasharray="5 4" dot={{r:4,fill:T.ink300}}/>
                <Line type="monotone" dataKey="realise" name="Maintenu dans le mois" stroke={T.teal500} strokeWidth={3} dot={{r:5,fill:T.teal500}}/>
              </LineChart>
            </ResponsiveContainer>
          </div>}

          {pjCompareChart.length>0&&<div style={{background:T.surface,borderRadius:10,padding:16,marginBottom:14}}>
            <div style={{fontSize:14,fontWeight:700,color:T.navy800,marginBottom:4}}>Date de {STEP_LABELS[kpiStep].toLowerCase()} par PJ — Initial vs Révisé</div>
            <div style={{fontSize:12,color:T.ink300,marginBottom:12}}>Chaque ligne relie la date promise à la date réelle — la longueur et la couleur indiquent l'ampleur du glissement</div>
            {(()=>{
              const rowHd=34,labelW=78,leftPad=20,rightPad=20,topPad=28,bottomPad=4;
              const minD=Math.min(...pjCompareChart.map(p=>Math.min(p.initial,p.revise)));
              const maxD=Math.max(...pjCompareChart.map(p=>Math.max(p.initial,p.revise)));
              const pad=Math.max((maxD-minD)*0.08,3);
              const domainMin=minD-pad,domainMax=maxD+pad;
              const span=Math.max(domainMax-domainMin,1);
              const chartW=720;
              const plotW=chartW-labelW-leftPad-rightPad;
              const chartH=pjCompareChart.length*rowHd+topPad+bottomPad;
              const xOf=v=>labelW+leftPad+((v-domainMin)/span)*plotW;
              // graduations : un repère par début de mois dans la plage couverte
              const monthTicks=[];
              const dStart=new Date(yearStart);dStart.setDate(dStart.getDate()+Math.floor(domainMin));
              let curM=new Date(dStart.getFullYear(),dStart.getMonth(),1);
              const dEnd=new Date(yearStart);dEnd.setDate(dEnd.getDate()+Math.ceil(domainMax));
              while(curM<=dEnd){monthTicks.push(new Date(curM));curM=new Date(curM.getFullYear(),curM.getMonth()+1,1);}
              return(<div style={{overflowX:"auto"}}>
                <svg width="100%" height={chartH} viewBox={"0 0 "+chartW+" "+chartH} preserveAspectRatio="xMinYMin meet" style={{minWidth:600,fontFamily:T.font}}>
                  {/* grille de fond : repères mensuels */}
                  {monthTicks.map((mt,i)=>{const dv=dayOfYear(mt);const x=xOf(dv);if(x<labelW||x>chartW-2)return null;return(
                    <g key={i}>
                      <line x1={x} x2={x} y1={topPad-6} y2={chartH-bottomPad} stroke={T.line} strokeWidth={1} strokeDasharray="3 3"/>
                      <text x={x} y={topPad-12} fontSize={10.5} fontWeight={700} fill={T.ink300} textAnchor="middle">{MONTHS[mt.getMonth()]}</text>
                    </g>
                  );})}
                  {/* lignes alternées pour la lisibilité */}
                  {pjCompareChart.map((p,i)=>i%2===0&&<rect key={"bg"+i} x={0} y={topPad+i*rowHd} width={chartW} height={rowHd} fill={T.card} opacity={0.5}/>)}

                  {pjCompareChart.map((p,i)=>{
                    const y=topPad+i*rowHd+rowHd/2;
                    const x1=xOf(p.initial),x2=xOf(p.revise);
                    const late=p.delta>0;
                    const dotColor=late?T.red500:p.delta<0?T.emerald500:T.ink500;
                    const dIni=new Date(yearStart);dIni.setDate(dIni.getDate()+p.initial);
                    const dRev=new Date(yearStart);dRev.setDate(dRev.getDate()+p.revise);
                    return(<g key={p.pj}>
                      <text x={6} y={y+4} fontSize={13} fontWeight={700} fill={T.teal600}>{p.pj}</text>
                      <line x1={Math.min(x1,x2)} x2={Math.max(x1,x2)} y1={y} y2={y} stroke={dotColor} strokeWidth={2.5} strokeOpacity={0.35}/>
                      <circle cx={x1} cy={y} r={5} fill="#fff" stroke={T.ink300} strokeWidth={2}/>
                      <circle cx={x2} cy={y} r={6} fill={dotColor}/>
                      <text x={x2} y={y-11} fontSize={10.5} fontWeight={700} fill={dotColor} textAnchor="middle">{p.delta===0?"=":(p.delta>0?"+":"")+p.delta+"j"}</text>
                    </g>);
                  })}
                </svg>
              </div>);
            })()}
            <div style={{display:"flex",gap:18,marginTop:12,paddingTop:12,borderTop:"1px solid "+T.line,flexWrap:"wrap"}}>
              <span style={{display:"flex",alignItems:"center",gap:6,fontSize:13,color:T.ink500}}><span style={{width:11,height:11,borderRadius:"50%",background:"#fff",border:"2px solid "+T.ink300,display:"inline-block"}}/>Date initiale</span>
              <span style={{display:"flex",alignItems:"center",gap:6,fontSize:13,color:T.ink500}}><span style={{width:11,height:11,borderRadius:"50%",background:T.red500,display:"inline-block"}}/>Révisée — retard</span>
              <span style={{display:"flex",alignItems:"center",gap:6,fontSize:13,color:T.ink500}}><span style={{width:11,height:11,borderRadius:"50%",background:T.emerald500,display:"inline-block"}}/>Révisée — avance</span>
            </div>
          </div>}

          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:14,marginBottom:14}}>
            {driftBuckets.length>0&&<div style={{background:T.surface,borderRadius:10,padding:14}}>
              <div style={{fontSize:14,fontWeight:700,color:T.navy800,marginBottom:8}}>Répartition par sévérité du retard</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={driftBuckets} layout="vertical" margin={{left:10,right:20}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.line}/>
                  <XAxis type="number" allowDecimals={false} tick={{fontSize:11,fill:T.ink500}}/>
                  <YAxis type="category" dataKey="label" width={140} tick={{fontSize:12,fill:T.ink700}}/>
                  <Tooltip contentStyle={{fontFamily:T.font,fontSize:13,borderRadius:8}}/>
                  <Bar dataKey="n" radius={[0,6,6,0]}>
                    {driftBuckets.map((d,i)=><Cell key={i} fill={d.c}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>}

            {trajectory.some(t=>t.moyenne!=null)&&<div style={{background:T.surface,borderRadius:10,padding:14}}>
              <div style={{fontSize:14,fontWeight:700,color:T.navy800,marginBottom:8}}>Trajectoire de la dérive le long de la chaîne</div>
              <div style={{fontSize:12,color:T.ink300,marginBottom:6}}>Le retard s'aggrave-t-il ou se résorbe-t-il entre l'arrivée et le départ ?</div>
              <ResponsiveContainer width="100%" height={150}>
                <LineChart data={trajectory}>
                  <CartesianGrid strokeDasharray="3 3" stroke={T.line}/>
                  <XAxis dataKey="jalon" tick={{fontSize:12,fill:T.ink700,fontWeight:600}}/>
                  <YAxis tick={{fontSize:11,fill:T.ink500}}/>
                  <Tooltip contentStyle={{fontFamily:T.font,fontSize:13,borderRadius:8}}/>
                  <Line type="monotone" dataKey="moyenne" stroke={T.teal500} strokeWidth={3} dot={{r:5,fill:T.teal500}}/>
                </LineChart>
              </ResponsiveContainer>
            </div>}

            {dureeCompare.rows.length>0&&<div style={{background:T.surface,borderRadius:10,padding:14}}>
              <div style={{fontSize:14,fontWeight:700,color:T.navy800,marginBottom:4}}>Durée de production : initial vs révisé</div>
              <div style={{fontSize:12,color:T.ink300,marginBottom:8}}>Moyenne sur le portefeuille comparable (Arrivée → Départ)</div>
              <div style={{display:"flex",gap:20,alignItems:"baseline"}}>
                <div><div style={{fontFamily:T.fontDisplay,fontSize:26,fontWeight:700,color:T.ink500}}>{dureeCompare.avgIni}j</div><div style={{fontSize:12,color:T.ink300}}>Initial</div></div>
                <div style={{fontSize:20,color:T.ink300}}>→</div>
                <div><div style={{fontFamily:T.fontDisplay,fontSize:26,fontWeight:700,color:dureeCompare.ecart>0?T.red500:T.emerald500}}>{dureeCompare.avgRev}j</div><div style={{fontSize:12,color:T.ink300}}>Révisé</div></div>
              </div>
            </div>}
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(380px,1fr))",gap:14}}>
          {driftByGamme.length>0&&<div style={{background:T.card,borderRadius:12,padding:16,boxShadow:T.shadowMd}}>
            <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:17,color:T.navy800,marginBottom:4}}>Dérive moyenne par gamme</div>
            <div style={{fontSize:13,color:T.ink300,marginBottom:10}}>Écart moyen (jours) entre départ initial et révisé, par gamme</div>
            <ResponsiveContainer width="100%" height={Math.max(180,driftByGamme.length*38)}>
              <BarChart data={driftByGamme} layout="vertical" margin={{left:10,right:20}}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.surface}/>
                <XAxis type="number" tick={{fontSize:12,fill:T.ink500}}/>
                <YAxis type="category" dataKey="gamme" width={90} tick={{fontSize:13,fill:T.ink700,fontWeight:600}}/>
                <Tooltip formatter={(v,n,p)=>[v+"j (n="+p.payload.n+")","Dérive moyenne"]} contentStyle={{fontFamily:T.font,fontSize:13,borderRadius:8}}/>
                <Bar dataKey="moyenne" radius={[0,6,6,0]}>
                  {driftByGamme.map((d,i)=><Cell key={i} fill={d.moyenne>0?T.red500:T.emerald500}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>}

          {driftByMilestone.some(d=>d.moyenne!=null)&&<div style={{background:T.card,borderRadius:12,padding:16,boxShadow:T.shadowMd}}>
            <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:17,color:T.navy800,marginBottom:4}}>Dérive moyenne par jalon</div>
            <div style={{fontSize:13,color:T.ink300,marginBottom:10}}>Où le retard se creuse le plus dans la chaîne de production</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={driftByMilestone}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.surface}/>
                <XAxis dataKey="jalon" tick={{fontSize:13,fill:T.ink700,fontWeight:600}}/>
                <YAxis tick={{fontSize:12,fill:T.ink500}}/>
                <Tooltip formatter={(v,n,p)=>[v+"j (n="+p.payload.n+")","Dérive moyenne"]} contentStyle={{fontFamily:T.font,fontSize:13,borderRadius:8}}/>
                <Bar dataKey="moyenne" radius={[6,6,0,0]}>
                  {driftByMilestone.map((d,i)=><Cell key={i} fill={d.moyenne>0?T.amber500:T.emerald500}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>}

          {comparable.length>0&&<div style={{background:T.card,borderRadius:12,padding:16,boxShadow:T.shadowMd}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
              <div>
                <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:17,color:T.navy800,marginBottom:4}}>Dérive moyenne par mois de départ</div>
                <div style={{fontSize:13,color:T.ink300,marginBottom:10}}>Périodes où les retards sont les plus fréquents — la situation s'améliore-t-elle dans le temps ?</div>
              </div>
              <select value={driftMoisYear||""} onChange={e=>setDriftMoisYear(e.target.value?+e.target.value:null)} style={{padding:"4px 8px",borderRadius:7,border:"1px solid "+T.line,fontSize:12,fontFamily:T.font,color:T.ink700,background:T.card,height:30}}>
                <option value="">Toutes années</option>
                {yearsInData.map(y=><option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {driftTrend.length>0?<ResponsiveContainer width="100%" height={220}>
              <LineChart data={driftTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.surface}/>
                <XAxis dataKey="mois" tick={{fontSize:12,fill:T.ink700,fontWeight:600}}/>
                <YAxis tick={{fontSize:12,fill:T.ink500}}/>
                <Tooltip formatter={(v,n,p)=>[v+"j (n="+p.payload.n+")","Dérive moyenne"]} contentStyle={{fontFamily:T.font,fontSize:13,borderRadius:8}}/>
                <Line type="monotone" dataKey="moyenne" stroke={T.violet500} strokeWidth={3} dot={({cx,cy,payload})=><circle key={payload.mois} cx={cx} cy={cy} r={5} fill={payload.moyenne>0?T.red500:T.emerald500}/>}/>
              </LineChart>
            </ResponsiveContainer>:<div style={{padding:"40px 0",textAlign:"center",color:T.ink300,fontSize:14}}>Aucune donnée pour cette période</div>}
          </div>}

        </div>

        {worstDrifts.length>0&&<div style={{background:T.card,borderRadius:12,padding:14,boxShadow:T.shadowMd,maxWidth:520}}>
          <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:16,color:T.navy800,marginBottom:8}}>Top 5 dérives — {STEP_LABELS[kpiStep]} (vs planning initial)</div>
          {worstDrifts.map(r=>{const d=r[kpiStep].delta;const c=d>0?T.red500:d<0?T.emerald500:T.ink500;return(
            <div key={r.pj} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid "+T.surface}}>
              <span style={{fontWeight:700,color:T.teal600,fontSize:14,minWidth:85}}>{r.pj}</span>
              <span style={{color:T.ink300,fontSize:12,minWidth:50}}>{r.gamme}</span>
              <span style={{fontSize:13,color:T.ink500}}>{fmt(r[kpiStep].ini?new Date(r[kpiStep].ini):null)} → {fmt(r[kpiStep].rev?new Date(r[kpiStep].rev):null)}</span>
              <span style={{marginLeft:"auto",fontWeight:800,fontSize:15,color:c}}>{d>0?"+":""}{d}j</span>
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
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14,flexWrap:"wrap"}}>
        <span style={{fontSize:16,color:T.ink500}}>Cliquer sur la barre ou saisir le %</span>
        <button onClick={saveProgress} disabled={savingProgress} style={{marginLeft:"auto",padding:"9px 18px",borderRadius:10,border:"none",background:progressSaved?T.emerald500:T.teal500,color:"#fff",fontSize:15,fontWeight:700,cursor:savingProgress?"default":"pointer",opacity:savingProgress?0.7:1,display:"flex",alignItems:"center",gap:7}}>
          {progressSaved?"✓ Enregistré":savingProgress?"Enregistrement...":"💾 Valider l'avancement"}
        </button>
      </div>
      <div style={{fontSize:13,color:T.amber600,background:T.amber100,padding:"8px 12px",borderRadius:8,marginBottom:14}}>
        ⚠️ Les modifications restent temporaires jusqu'au clic sur « Valider » — sans validation, elles seront perdues si la page est actualisée.
      </div>
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
      <div style={{marginTop:14,display:"flex",justifyContent:"flex-end"}}>
        <button onClick={saveProgress} disabled={savingProgress} style={{padding:"9px 18px",borderRadius:10,border:"none",background:progressSaved?T.emerald500:T.teal500,color:"#fff",fontSize:15,fontWeight:700,cursor:savingProgress?"default":"pointer",opacity:savingProgress?0.7:1}}>
          {progressSaved?"✓ Enregistré":savingProgress?"Enregistrement...":"💾 Valider l'avancement"}
        </button>
      </div>
    </div>}
    {tab==="statut"&&<div style={{background:T.card,borderRadius:12,padding:16,boxShadow:T.shadowMd}}>
      <div style={{fontSize:16,color:T.ink500,marginBottom:16}}>
        Choisissez l'état de chaque machine. Il n'y a pas de calcul automatique — l'état affiché partout sur le site est exactement celui sélectionné ici, et le changement est immédiatement visible par tous les utilisateurs.
      </div>
      {data.map(r=>{
        const current=etatChoice[r.pj]||"A_DEFINIR";
        const presence=clientPresence[r.pj]||{present:false,date:""};
        return(<div key={r.pj} style={{padding:"11px 0",borderBottom:"1px solid "+T.surface}}>
          <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
            <span style={{fontWeight:700,color:T.teal600,fontSize:16,minWidth:110,flexShrink:0}}>{r.pj}</span>
            <span style={{color:T.ink300,fontSize:14,minWidth:60,flexShrink:0}}>{r.gamme}</span>
            <Badge etat={current}/>
            <div style={{display:"flex",gap:6,marginLeft:"auto",flexWrap:"wrap"}}>
              {ASSIGNABLE_ETATS.map(e=>{const m=ETAT_META[e];const active=current===e;return(
                <button key={e} onClick={()=>setEtatFor(r.pj,e)} style={{padding:"6px 12px",borderRadius:8,border:"1.5px solid "+(active?m.bar:T.line),background:active?m.bar:T.card,color:active?"#fff":T.ink700,fontSize:13,fontWeight:600,cursor:"pointer"}}>{m.label}</button>
              );})}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12,marginTop:10,paddingLeft:122,flexWrap:"wrap"}}>
            <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
              <div onClick={()=>setClientPresenceFor(r.pj,{...presence,present:!presence.present})} style={{width:46,height:26,borderRadius:13,background:presence.present?T.teal500:T.surfaceAlt,position:"relative",transition:"background .15s"}}>
                <div style={{width:21,height:21,borderRadius:"50%",background:"#fff",position:"absolute",top:2.5,left:presence.present?23:2.5,transition:"left .15s",boxShadow:T.shadowSm}}/>
              </div>
              <span style={{fontSize:15,color:T.ink700,fontWeight:700,display:"inline-flex",alignItems:"center",gap:6}}><PersonIcon size={15} color={T.ink700}/> Présence client / NOBO aux tests</span>
            </label>
            {presence.present&&(()=>{
              const minD=r.tests?toLocalISO(new Date(r.tests)):null;
              const maxD=r.testsFin?toLocalISO(new Date(r.testsFin)):minD;
              const noTestsDates=!minD;
              return(<>
                <input type="date" value={presence.date||""} min={minD||undefined} max={maxD||undefined} disabled={noTestsDates}
                  onChange={e=>{
                    const v=e.target.value;
                    if(!v){setClientPresenceFor(r.pj,{...presence,date:""});return;}
                    if(minD&&v<minD){setClientPresenceFor(r.pj,{...presence,date:minD});return;}
                    if(maxD&&v>maxD){setClientPresenceFor(r.pj,{...presence,date:maxD});return;}
                    setClientPresenceFor(r.pj,{...presence,date:v});
                  }}
                  style={{padding:"7px 11px",borderRadius:8,border:"1.5px solid "+T.teal500,fontSize:14,fontFamily:T.font,color:T.ink700,fontWeight:600,opacity:noTestsDates?0.5:1}}/>
                {noTestsDates&&<span style={{fontSize:13,color:T.red500,fontWeight:600}}>Période de Tests non définie pour ce PJ — date impossible à saisir</span>}
                {!noTestsDates&&<span style={{fontSize:12,color:T.ink300}}>Doit être comprise entre {fmt(new Date(r.tests))} et {fmt(new Date(maxD))}</span>}
              </>);
            })()}
          </div>
        </div>);
      })}
    </div>}

    {tab==="vacances"&&<ClosurePeriodsManager closurePeriods={closurePeriods} setClosurePeriods={setClosurePeriods}/>}
    {tab==="production"&&<ProductionCalendarManager data={data} productionExclusions={productionExclusions} toggleProductionExclusion={toggleProductionExclusion}/>}
  </div>);
}

function ClosurePeriodsManager({closurePeriods,setClosurePeriods}){
  const [newStart,setNewStart]=useState("");
  const [newEnd,setNewEnd]=useState("");
  const [newLabel,setNewLabel]=useState("");
  const addPeriod=()=>{
    if(!newStart||!newEnd)return;
    if(newEnd<newStart){alert("La date de fin doit être après la date de début.");return;}
    const next=[...closurePeriods,{start:newStart,end:newEnd,label:newLabel.trim()||"Fermeture"}];
    setClosurePeriods(next);
    setNewStart("");setNewEnd("");setNewLabel("");
  };
  const removePeriod=i=>{
    const next=closurePeriods.filter((_,idx)=>idx!==i);
    setClosurePeriods(next);
  };
  return(<div style={{background:T.card,borderRadius:12,padding:16,boxShadow:T.shadowMd,marginTop:16}}>
    <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:18,color:T.navy800,marginBottom:4}}>🏖️ Périodes de fermeture (vacances)</div>
    <div style={{fontSize:14,color:T.ink500,marginBottom:14}}>
      Les semaines/jours concernés seront grisés dans le Calendrier pour tous les utilisateurs.
    </div>
    {closurePeriods.length>0&&<div style={{marginBottom:14}}>
      {closurePeriods.map((p,i)=>(
        <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid "+T.surface}}>
          <span style={{fontSize:14,fontWeight:700,color:T.navy800,minWidth:120}}>{p.label}</span>
          <span style={{fontSize:14,color:T.ink500}}>{fmt(new Date(p.start))} → {fmt(new Date(p.end))}</span>
          <button onClick={()=>removePeriod(i)} style={{marginLeft:"auto",padding:"5px 11px",borderRadius:7,border:"1px solid "+T.line,background:T.card,color:T.red500,fontSize:13,fontWeight:600,cursor:"pointer"}}>✕ Retirer</button>
        </div>
      ))}
    </div>}
    <div style={{display:"flex",gap:8,alignItems:"flex-end",flexWrap:"wrap",paddingTop:10,borderTop:closurePeriods.length>0?"1px solid "+T.line:"none"}}>
      <div>
        <label style={{fontSize:12,color:T.ink500,fontWeight:600,display:"block",marginBottom:4}}>Libellé</label>
        <input type="text" value={newLabel} onChange={e=>setNewLabel(e.target.value)} placeholder="Ex: Vacances été" style={{padding:"7px 10px",borderRadius:8,border:"1px solid "+T.line,fontSize:14,fontFamily:T.font,width:140}}/>
      </div>
      <div>
        <label style={{fontSize:12,color:T.ink500,fontWeight:600,display:"block",marginBottom:4}}>Du</label>
        <input type="date" value={newStart} onChange={e=>setNewStart(e.target.value)} style={{padding:"7px 10px",borderRadius:8,border:"1px solid "+T.line,fontSize:14,fontFamily:T.font}}/>
      </div>
      <div>
        <label style={{fontSize:12,color:T.ink500,fontWeight:600,display:"block",marginBottom:4}}>Au</label>
        <input type="date" value={newEnd} onChange={e=>setNewEnd(e.target.value)} style={{padding:"7px 10px",borderRadius:8,border:"1px solid "+T.line,fontSize:14,fontFamily:T.font}}/>
      </div>
      <button onClick={addPeriod} disabled={!newStart||!newEnd} style={{padding:"8px 16px",borderRadius:8,border:"none",background:newStart&&newEnd?T.teal500:T.surfaceAlt,color:newStart&&newEnd?"#fff":T.ink300,fontSize:14,fontWeight:700,cursor:newStart&&newEnd?"pointer":"default"}}>+ Ajouter</button>
    </div>
  </div>);
}

function ProductionCalendarManager({data,productionExclusions,toggleProductionExclusion}){
  const [selectedPj,setSelectedPj]=useState("");
  const r=data.find(x=>x.pj===selectedPj);
  const prodRange=useMemo(()=>{
    if(!r||!r.arrivee||!r.finProd)return null;
    return{start:new Date(r.arrivee),end:new Date(r.finProd)};
  },[r]);
  const [viewMonth,setViewMonth]=useState(null);
  useEffect(()=>{
    if(prodRange)setViewMonth(new Date(prodRange.start.getFullYear(),prodRange.start.getMonth(),1));
  },[prodRange]);

  const excluded=productionExclusions[selectedPj]||[];
  const isProdDay=d=>{
    if(!prodRange)return false;
    if(d.getDay()===0||d.getDay()===6)return false;
    return d>=prodRange.start&&d<=prodRange.end;
  };

  const monthGrid=useMemo(()=>{
    if(!viewMonth)return[];
    const y=viewMonth.getFullYear(),m=viewMonth.getMonth();
    const firstDay=new Date(y,m,1);
    const adj=(firstDay.getDay()+6)%7;
    const dim=new Date(y,m+1,0).getDate();
    const cells=[...Array(adj).fill(null),...Array.from({length:dim},(_,i)=>new Date(y,m,i+1))];
    return cells;
  },[viewMonth]);

  const canGoPrev=prodRange&&viewMonth&&new Date(viewMonth.getFullYear(),viewMonth.getMonth()-1,1)>=new Date(prodRange.start.getFullYear(),prodRange.start.getMonth(),1);
  const canGoNext=prodRange&&viewMonth&&new Date(viewMonth.getFullYear(),viewMonth.getMonth()+1,1)<=new Date(prodRange.end.getFullYear(),prodRange.end.getMonth(),1);

  return(<div style={{background:T.card,borderRadius:12,padding:16,boxShadow:T.shadowMd,marginTop:16}}>
    <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:18,color:T.navy800,marginBottom:4}}>🏭 Désactiver des jours de Production</div>
    <div style={{fontSize:14,color:T.ink500,marginBottom:14}}>
      Cliquez sur un jour pour l'exclure de l'affichage « Production » dans le Calendrier (mode Jour) — utile pour un jour férié ponctuel ou une journée sans activité réelle.
    </div>
    <select value={selectedPj} onChange={e=>setSelectedPj(e.target.value)} style={{padding:"8px 12px",borderRadius:8,border:"1px solid "+T.line,fontSize:15,fontFamily:T.font,color:T.ink700,background:T.surface,marginBottom:14}}>
      <option value="">— Choisir un PJ —</option>
      {data.map(d=><option key={d.pj} value={d.pj}>{d.pj}</option>)}
    </select>
    {selectedPj&&!prodRange&&<div style={{fontSize:14,color:T.red500}}>Période de Production non définie (Arrivée/Fin de prod manquante) pour ce PJ.</div>}
    {prodRange&&viewMonth&&<div style={{maxWidth:340}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <button onClick={()=>setViewMonth(new Date(viewMonth.getFullYear(),viewMonth.getMonth()-1,1))} disabled={!canGoPrev} style={{padding:"5px 11px",borderRadius:8,border:"1px solid "+T.line,background:T.card,color:canGoPrev?T.ink700:T.ink300,fontSize:15,cursor:canGoPrev?"pointer":"default"}}>◀</button>
        <span style={{fontWeight:700,color:T.navy800,fontSize:15}}>{MONTHS_FULL[viewMonth.getMonth()]} {viewMonth.getFullYear()}</span>
        <button onClick={()=>setViewMonth(new Date(viewMonth.getFullYear(),viewMonth.getMonth()+1,1))} disabled={!canGoNext} style={{padding:"5px 11px",borderRadius:8,border:"1px solid "+T.line,background:T.card,color:canGoNext?T.ink700:T.ink300,fontSize:15,cursor:canGoNext?"pointer":"default"}}>▶</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,marginBottom:4}}>
        {["L","M","M","J","V","S","D"].map((d,i)=><div key={i} style={{textAlign:"center",fontSize:11,fontWeight:700,color:T.ink300}}>{d}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
        {monthGrid.map((d,i)=>{
          if(!d)return<div key={"e"+i}/>;
          const iso=toLocalISO(d);
          const isProd=isProdDay(d);
          const isExcluded=excluded.includes(iso);
          return(<button key={iso} disabled={!isProd} onClick={()=>toggleProductionExclusion(selectedPj,iso)}
            style={{aspectRatio:"1",borderRadius:8,border:"none",fontSize:13,fontWeight:700,cursor:isProd?"pointer":"default",
              background:isExcluded?T.red500:isProd?"#7a92a3":T.surfaceAlt,
              color:isExcluded||isProd?"#fff":T.ink300,
              opacity:isProd?1:0.5}}>
            {d.getDate()}
          </button>);
        })}
      </div>
      <div style={{display:"flex",gap:14,marginTop:12,fontSize:12,color:T.ink500}}>
        <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:11,height:11,borderRadius:4,background:"#7a92a3",display:"inline-block"}}/>Production active</span>
        <span style={{display:"flex",alignItems:"center",gap:5}}><span style={{width:11,height:11,borderRadius:4,background:T.red500,display:"inline-block"}}/>Désactivé</span>
      </div>
    </div>}
  </div>);
}

function ImportButton({onImport, busy, label, icon, accent, helpText, warnText, confirmMessage, hasExisting, inputId}){
  const [open,setOpen]=useState(false);
  const [err,setErr]=useState("");
  const [indice,setIndice]=useState("");
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
    onImport(parsed,indice.trim());
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
        // Feuille optionnelle "Table_affectation" : charge de travail par tâche/ressource (Atelier/Autom)
        const affSheetName=wb.SheetNames.find(n=>n.toLowerCase().includes("affectation"));
        const affRows=affSheetName?window.XLSX.utils.sheet_to_json(wb.Sheets[affSheetName],{header:1,raw:false}):null;
        const parsed=parseMSProjectRows(rows,affRows);
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
      <div style={{marginBottom:12}}>
        <label style={{fontSize:13,color:T.ink500,fontWeight:600,display:"block",marginBottom:5}}>Indice du document (ex: H)</label>
        <input type="text" value={indice} onChange={e=>setIndice(e.target.value)} maxLength={4} placeholder="H"
          style={{padding:"7px 11px",borderRadius:8,border:"1.5px solid "+T.line,fontSize:15,fontFamily:T.font,color:T.ink700,fontWeight:600,width:80}}/>
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
const OVERRIDES_DOC_REF=()=>doc(db,"planning","overrides");
const COMMENTS_DOC_REF=()=>doc(db,"planning","comments");

export default function App(){
  const [data,setData]=useState([]);
  const [loading,setLoading]=useState(true);
  const [importing,setImporting]=useState(false);
  const [lastImport,setLastImport]=useState(null);
  const [docIndice,setDocIndice]=useState("");
  const [initialData,setInitialData]=useState([]);
  const [initialImporting,setInitialImporting]=useState(false);
  const [lastInitialImport,setLastInitialImport]=useState(null);
  const [view,setView]=useState("table");
  const [calMode,setCalMode]=useState("week");
  const [calAnchor,setCalAnchor]=useState(()=>weekStartOf(today));
  const [calDayAnchor,setCalDayAnchor]=useState(()=>{const d=new Date(today);d.setHours(0,0,0,0);return d;});
  const [managerTab,setManagerTab]=useState("derives");
  const [selEtats,setSelEtats]=useState(new Set(ALL_ETATS));
  const [selGammes,setSelGammes]=useState(new Set(ALL_GAMMES));
  const [selMoisArrivee,setSelMoisArrivee]=useState(new Set(MONTHS));
  const [selMoisTests,setSelMoisTests]=useState(new Set(MONTHS));
  const [selMoisFinProd,setSelMoisFinProd]=useState(new Set(MONTHS));
  const [selMoisDepart,setSelMoisDepart]=useState(new Set(MONTHS));
  const [selPJs,setSelPJs]=useState(null);
  const [selProjets,setSelProjets]=useState(null);
  const [selPays,setSelPays]=useState(null);
  const [selChefs,setSelChefs]=useState(null);
  const [df,setDf]=useState("date");
  const [pinOk,setPinOk]=useState(false);
  const [progress,setProgress]=useState({});
  const [calSel,setCalSel]=useState(null);
  const [etatChoice,setEtatChoice]=useState({});
  const [clientPresence,setClientPresence]=useState({});
  const [closurePeriods,setClosurePeriods]=useState([]);
  const [productionExclusions,setProductionExclusions]=useState({});
  const [comments,setComments]=useState({});

  // Lecture temps réel depuis Firestore
  useEffect(()=>{
    const unsub = onSnapshot(DOC_REF(), (snap)=>{
      if(snap.exists()){
        const d = snap.data();
        setData(d.rows || []);
        setLastImport(d.lastImport || null);
        setDocIndice(d.indice || "");
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

  // Lecture temps réel des états choisis manuellement par le Manager (pas de calcul automatique)
  useEffect(()=>{
    const unsub = onSnapshot(OVERRIDES_DOC_REF(), (snap)=>{
      if(snap.exists()){
        const d = snap.data();
        setEtatChoice(d.etatChoice || {});
        setProgress(d.progress || {});
        setClientPresence(d.clientPresence || {});
        setClosurePeriods(d.closurePeriods || []);
        setProductionExclusions(d.productionExclusions || {});
      }
    }, (err)=>{
      console.error("Erreur Firestore (overrides):", err);
    });
    return ()=>unsub();
  },[]);

  const setClosurePeriodsAndSave=useCallback(async next=>{
    try{
      await setDoc(OVERRIDES_DOC_REF(), { closurePeriods:next }, { merge:true });
    }catch(e){
      console.error(e);
      alert("Erreur lors de l'enregistrement : " + e.message);
    }
  },[]);

  const toggleProductionExclusion=useCallback(async (pj,dateIso)=>{
    const current=productionExclusions[pj]||[];
    const next=current.includes(dateIso)?current.filter(d=>d!==dateIso):[...current,dateIso];
    const nextAll={...productionExclusions,[pj]:next};
    try{
      await setDoc(OVERRIDES_DOC_REF(), { productionExclusions:nextAll }, { merge:true });
    }catch(e){
      console.error(e);
      alert("Erreur lors de l'enregistrement : " + e.message);
    }
  },[productionExclusions]);

  // Lecture temps réel des commentaires par PJ
  useEffect(()=>{
    const unsub = onSnapshot(COMMENTS_DOC_REF(), (snap)=>{
      if(snap.exists())setComments(snap.data().byPj || {});
    }, (err)=>{
      console.error("Erreur Firestore (comments):", err);
    });
    return ()=>unsub();
  },[]);

  const addComment=useCallback(async (pj,author,text)=>{
    if(!author.trim()||!text.trim())return false;
    const current=comments[pj]||[];
    const next=[...current,{author:author.trim(),text:text.trim(),date:new Date().toISOString()}];
    const nextAll={...comments,[pj]:next};
    try{
      await setDoc(COMMENTS_DOC_REF(), { byPj:nextAll }, { merge:true });
      return true;
    }catch(e){
      console.error(e);
      alert("Erreur lors de l'enregistrement du commentaire : " + e.message);
      return false;
    }
  },[comments]);

  const deleteComment=useCallback(async (pj,index,pin)=>{
    if(pin!==PIN){alert("Code incorrect.");return false;}
    const current=comments[pj]||[];
    const next=current.filter((_,i)=>i!==index);
    const nextAll={...comments,[pj]:next};
    try{
      await setDoc(COMMENTS_DOC_REF(), { byPj:nextAll }, { merge:true });
      return true;
    }catch(e){
      console.error(e);
      alert("Erreur lors de la suppression : " + e.message);
      return false;
    }
  },[comments]);

  const setClientPresenceFor=useCallback(async (pj,value)=>{
    const next={...clientPresence,[pj]:value};
    try{
      await setDoc(OVERRIDES_DOC_REF(), { clientPresence:next }, { merge:true });
    }catch(e){
      console.error(e);
      alert("Erreur lors de l'enregistrement : " + e.message);
    }
  },[clientPresence]);

  const setEtatFor=useCallback(async (pj,etat)=>{
    const next={...etatChoice,[pj]:etat};
    try{
      await setDoc(OVERRIDES_DOC_REF(), { etatChoice:next }, { merge:true });
    }catch(e){
      console.error(e);
      alert("Erreur lors de l'enregistrement : " + e.message);
    }
  },[etatChoice]);

  const [savingProgress,setSavingProgress]=useState(false);
  const [progressSaved,setProgressSaved]=useState(false);
  const saveProgress=useCallback(async ()=>{
    setSavingProgress(true);
    try{
      await setDoc(OVERRIDES_DOC_REF(), { progress }, { merge:true });
      setProgressSaved(true);
      setTimeout(()=>setProgressSaved(false),2500);
    }catch(e){
      console.error(e);
      alert("Erreur lors de l'enregistrement : " + e.message);
    }
    setSavingProgress(false);
  },[progress]);

  const handleImport=useCallback(async (rows,indice)=>{
    setImporting(true);
    try{
      const lastImportStr=new Date().toLocaleString("fr-FR");
      await setDoc(DOC_REF(), { rows, lastImport: lastImportStr, indice: indice||"" });
      setSelPJs(rows.length?new Set(rows.map(r=>r.pj)):null);
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
  const allProjets=useMemo(()=>[...new Set(data.map(r=>getPjMeta(r.pj).nomProjet))].sort(),[data]);
  const allPays=useMemo(()=>[...new Set(data.map(r=>getPjMeta(r.pj).pays))].sort(),[data]);
  const allChefs=useMemo(()=>[...new Set(data.map(r=>getPjMeta(r.pj).chefProjet))].sort(),[data]);

  // L'état affiché vient exclusivement du choix manuel du Manager (etatChoice), sinon "À définir"
  const dataWithOverrides=useMemo(()=>data.map(r=>({...r,etat:etatChoice[r.pj]||r.etat||"A_DEFINIR",clientPresence:clientPresence[r.pj]||null})),[data,etatChoice,clientPresence]);

  const filtered=useMemo(()=>dataWithOverrides.filter(r=>{
    if(!selEtats.has(r.etat))return false;
    if(!selGammes.has(r.gamme))return false;
    if(selPJs&&!selPJs.has(r.pj))return false;
    const meta=getPjMeta(r.pj);
    if(selProjets&&!selProjets.has(meta.nomProjet))return false;
    if(selPays&&!selPays.has(meta.pays))return false;
    if(selChefs&&!selChefs.has(meta.chefProjet))return false;
    if(selMoisArrivee.size<MONTHS.length){const m=r.arrivee?MONTHS[new Date(r.arrivee).getMonth()]:null;if(!m||!selMoisArrivee.has(m))return false;}
    if(selMoisTests.size<MONTHS.length){const m=r.tests?MONTHS[new Date(r.tests).getMonth()]:null;if(!m||!selMoisTests.has(m))return false;}
    if(selMoisFinProd.size<MONTHS.length){const m=r.finProd?MONTHS[new Date(r.finProd).getMonth()]:null;if(!m||!selMoisFinProd.has(m))return false;}
    if(selMoisDepart.size<MONTHS.length){const m=r.depart?MONTHS[new Date(r.depart).getMonth()]:null;if(!m||!selMoisDepart.has(m))return false;}
    return true;
  }),[dataWithOverrides,selEtats,selGammes,selPJs,allPJs,selProjets,allProjets,selPays,allPays,selChefs,allChefs,selMoisArrivee,selMoisTests,selMoisFinProd,selMoisDepart]);

  const VIEWS=[{id:"table",l:"📋 Liste"},{id:"gantt",l:"📊 Gantt"},{id:"calendar",l:"📅 Calendrier"},{id:"comments",l:"💬 Commentaires"}];

  return(<div style={{fontFamily:T.font,fontSize:17,background:T.surface,minHeight:"100vh",padding:20,color:T.ink900}}>
    <style>{"*{box-sizing:border-box;}"}</style>
    <link rel="preconnect" href="https://fonts.googleapis.com"/>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&family=Abel&display=swap" rel="stylesheet"/>
    <div style={{background:T.card,borderRadius:18,padding:"20px 26px",marginBottom:22,color:T.ink900,display:"flex",alignItems:"center",gap:18,flexWrap:"wrap",boxShadow:T.shadowMd,borderBottom:"3px solid "+T.teal500}}>
      <img src={LOGO_B64} alt="ENOGIA" style={{height:64,objectFit:"contain"}}/>
      <div style={{borderLeft:"1px solid "+T.line,paddingLeft:18}}>
        <div style={{fontFamily:T.fontDisplay,fontWeight:700,fontSize:36,letterSpacing:"-.01em",color:T.navy900}}>Planning Ordonnancement</div>
        <div style={{display:"flex",alignItems:"center",gap:10,marginTop:3,flexWrap:"wrap"}}>
          <span style={{color:T.ink500,fontSize:16,fontWeight:500}}>{loading?"Chargement...":data.length+" unités"+(lastImport?" · Import "+lastImport:" · Aucune donnée importée")}</span>
          {docIndice&&<span style={{background:T.teal500,color:"#fff",borderRadius:7,padding:"3px 11px",fontSize:14,fontWeight:700}}>Indice {docIndice}</span>}
        </div>
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
          {[["date","Jours"],["semaine","Semaines"],["mois","Mois"]].map(([k,l])=><button key={k} onClick={()=>setDf(k)} style={{padding:"6px 13px",borderRadius:9,border:"1px solid "+(df===k?T.teal500:T.line),background:df===k?T.teal500:T.card,color:df===k?"#fff":T.ink700,fontSize:16,fontWeight:700,cursor:"pointer"}}>{l}</button>)}
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
            <ManagerPanel data={dataWithOverrides} progress={progress} setProgress={setProgress} initialData={initialData} lastInitialImport={lastInitialImport} onInitialImport={handleInitialImport} initialImporting={initialImporting}
              etatChoice={etatChoice} setEtatFor={setEtatFor} saveProgress={saveProgress} savingProgress={savingProgress} progressSaved={progressSaved}
              tab={managerTab} setTab={setManagerTab} clientPresence={clientPresence} setClientPresenceFor={setClientPresenceFor}
              closurePeriods={closurePeriods} setClosurePeriods={setClosurePeriodsAndSave}
              productionExclusions={productionExclusions} toggleProductionExclusion={toggleProductionExclusion}/>
          </div>
          :<PinGate onUnlock={()=>setPinOk(true)}/>)
        :(
          <>
            {view==="table"&&<TableView data={filtered} progress={progress} df={df}
              selEtats={selEtats} setSelEtats={setSelEtats}
              selGammes={selGammes} setSelGammes={setSelGammes}
              allPJs={allPJs} selPJs={selPJs} setSelPJs={setSelPJs}
              allProjets={allProjets} selProjets={selProjets} setSelProjets={setSelProjets}
              allPays={allPays} selPays={selPays} setSelPays={setSelPays}
              allChefs={allChefs} selChefs={selChefs} setSelChefs={setSelChefs}
              selMoisArrivee={selMoisArrivee} setSelMoisArrivee={setSelMoisArrivee}
              selMoisTests={selMoisTests} setSelMoisTests={setSelMoisTests}
              selMoisFinProd={selMoisFinProd} setSelMoisFinProd={setSelMoisFinProd}
              selMoisDepart={selMoisDepart} setSelMoisDepart={setSelMoisDepart}
              comments={comments} addComment={addComment} deleteComment={deleteComment}/>}
            {view==="gantt"&&<GanttView data={filtered} progress={progress} df={df}/>}
            {view==="calendar"&&<CalendarView data={filtered} onSelectPj={setCalSel}
              mode={calMode} setMode={setCalMode} anchor={calAnchor} setAnchor={setCalAnchor}
              dayAnchor={calDayAnchor} setDayAnchor={setCalDayAnchor} closurePeriods={closurePeriods}
              productionExclusions={productionExclusions}/>}
            {view==="comments"&&<CommentsView data={filtered} comments={comments} addComment={addComment} deleteComment={deleteComment}/>}
          </>
        )}
      </>
    )}
    {calSel&&<ProjectModal pj={calSel} data={dataWithOverrides} df={df} onClose={()=>setCalSel(null)} comments={comments} addComment={addComment} deleteComment={deleteComment}/>}
  </div>);
}
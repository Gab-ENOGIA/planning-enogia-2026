// Les logos ENOGIA sont désormais de vrais fichiers SVG dans /public (enogia-logo-white.svg, enogia-logo-color.svg)

// ── DESIGN TOKENS ──────────────────────────────────────────────
// Palette ancrée sur le dégradé du logo ENOGIA (navy → teal) + un accent "braise"
// qui évoque le cycle thermique ORC (froid → chaud) pour les statuts urgents.
// Deux jeux de tokens (clair / sombre) + tokens néomorphisme (ombres duales douces).

const SHARED = {
  navy900:"#0c2436", navy800:"#15374d", navy700:"#20506e", navy600:"#2c6485",
  thermalGradient:"linear-gradient(90deg,#0c2436 0%,#2394a8 60%,#4fb2c4 100%)",
  thermalGradientHot:"linear-gradient(90deg,#0c2436 0%,#2394a8 45%,#c97848 100%)",
  font:"'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
  fontDisplay:"'Space Grotesk','Inter',-apple-system,sans-serif",
  fontMono:"'JetBrains Mono','SF Mono',Consolas,monospace",
};

const LIGHT = {
  ...SHARED,
  mode:"light",
  teal600:"#0e7f92", teal500:"#2394a8", teal400:"#4fb2c4", teal100:"#e8f5f7",
  surface:"#eef1f4", surfaceAlt:"#e7ebee", card:"#f2f4f6",
  ink900:"#16232e", ink700:"#445561", ink500:"#6c7d89", ink300:"#aab7bf", ink100:"#e1e7ea",
  line:"#dfe5e8",
  amber600:"#ad5e12", amber500:"#c8811f", amber100:"#faf0e2",
  emerald600:"#177a5f", emerald500:"#2f9c7b", emerald100:"#e6f5ef",
  violet600:"#6b4aa8", violet500:"#8163bb", violet100:"#f1edf9",
  red600:"#ad3535", red500:"#c74747", red100:"#fbeaea",
  ember600:"#a85528", ember500:"#c97848", ember100:"#faede4",
  shadowSm:"0 1px 2px rgba(15,40,60,.045), 0 1px 1px rgba(15,40,60,.03)",
  shadowMd:"0 4px 14px rgba(15,40,60,.06), 0 1px 3px rgba(15,40,60,.045)",
  shadowLg:"0 12px 32px rgba(15,40,60,.09), 0 2px 6px rgba(15,40,60,.045)",
  neuOut:"7px 7px 15px rgba(163,178,191,.55), -7px -7px 15px rgba(255,255,255,.85)",
  neuOutSm:"4px 4px 9px rgba(163,178,191,.5), -4px -4px 9px rgba(255,255,255,.85)",
  neuIn:"inset 5px 5px 10px rgba(163,178,191,.55), inset -5px -5px 10px rgba(255,255,255,.85)",
  neuInSm:"inset 3px 3px 6px rgba(163,178,191,.5), inset -3px -3px 6px rgba(255,255,255,.85)",
};

const DARK = {
  ...SHARED,
  mode:"dark",
  teal600:"#5fc4d8", teal500:"#3aa8bd", teal400:"#67c1d3", teal100:"#173842",
  surface:"#1a222b", surfaceAlt:"#212b35", card:"#1e2830",
  ink900:"#eef2f4", ink700:"#c3ccd2", ink500:"#8fa0a9", ink300:"#5b6b74", ink100:"#2a343d",
  line:"#2c3742",
  amber600:"#e3a44e", amber500:"#c8811f", amber100:"#3a2c17",
  emerald600:"#5cd1a8", emerald500:"#2f9c7b", emerald100:"#153228",
  violet600:"#b09be0", violet500:"#8163bb", violet100:"#2a2440",
  red600:"#e58080", red500:"#c74747", red100:"#3a1e1e",
  ember600:"#eba274", ember500:"#c97848", ember100:"#3a2517",
  shadowSm:"0 1px 2px rgba(0,0,0,.35), 0 1px 1px rgba(0,0,0,.25)",
  shadowMd:"0 4px 14px rgba(0,0,0,.4), 0 1px 3px rgba(0,0,0,.3)",
  shadowLg:"0 12px 32px rgba(0,0,0,.5), 0 2px 6px rgba(0,0,0,.35)",
  neuOut:"7px 7px 15px rgba(0,0,0,.55), -7px -7px 15px rgba(255,255,255,.035)",
  neuOutSm:"4px 4px 9px rgba(0,0,0,.5), -4px -4px 9px rgba(255,255,255,.03)",
  neuIn:"inset 5px 5px 10px rgba(0,0,0,.55), inset -5px -5px 10px rgba(255,255,255,.03)",
  neuInSm:"inset 3px 3px 6px rgba(0,0,0,.5), inset -3px -3px 6px rgba(255,255,255,.03)",
};

// T est un objet MUTABLE (même référence tout le temps) : setThemeMode() modifie ses champs en place.
// Comme tous les composants lisent T.xxx à chaque rendu, un changement de darkMode dans App()
// (qui force un re-rendu global) suffit à propager les nouvelles couleurs partout, sans avoir
// à faire transiter le thème par props/contexte dans chaque fichier.
export const T = { ...LIGHT };

export function setThemeMode(dark){
  Object.assign(T, dark ? DARK : LIGHT);
}

export function isDarkMode(){
  return T.mode==="dark";
}

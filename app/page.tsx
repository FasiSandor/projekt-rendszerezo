'use client';

import {ChangeEvent,useEffect,useMemo,useRef,useState} from 'react';

type Accent='cyan'|'violet'|'pink'|'orange'|'green'|'blue';
type Project={
  id:string;name:string;category:string;chats:number;accent:Accent;
  status:'Aktív'|'Fejlesztés'|'Rendezendő'|'Parkoló';
  summary:string;next:string;last:string;tags:string[];favorite?:boolean;archived?:boolean;
};
type ChatItem={
  id:string;title:string;preview:string;searchText?:string;updated:string;source:'import'|'manual';
  assignedProjectId?:string;topicId?:string;archived?:boolean;projectRef?:string|null;
};
type Topic={id:string;projectId:string;name:string;createdAt:string};
type ImportLog={id:string;date:string;fileName:string;total:number;added:number;updated:number;unchanged:number;assigned:number};
type CloudStatus={connected:boolean;authConfigured:boolean;database:string;region?:string;schemaReady?:boolean;error?:string};

const starter:Project[]=[
{id:'ertesites',name:'Értesítési Központ',category:'APP FEJLESZTÉS',chats:16,accent:'blue',status:'Aktív',summary:'Gmail, Messenger, iMessage és naptárkapcsolatok.',next:'iMessage + sebesség',last:'Ma',tags:['Gmail','Messenger','Naptár'],favorite:true},
{id:'suly',name:'Súlynapló',category:'APP FEJLESZTÉS',chats:10,accent:'pink',status:'Aktív',summary:'Trendek, heti átlagok és személyes statisztikák.',next:'statisztikák bővítése',last:'Tegnap',tags:['PWA','Trend','Grafikon'],favorite:true},
{id:'recept',name:'ReceptRendelő',category:'GASZTRO',chats:14,accent:'orange',status:'Fejlesztés',summary:'Családi, saját és különleges receptek egy helyen.',next:'megosztási logika',last:'2 napja',tags:['Recept','AI','Gyűjtemény']},
{id:'mota',name:'MOTA-System',category:'MOTA',chats:28,accent:'violet',status:'Aktív',summary:'Tanulás, számonkérő, MOTA-English és PhD-vonal.',next:'új modul',last:'Ma',tags:['Oktatás','PhD','AI'],favorite:true},
{id:'matek',name:'Matematika',category:'OKTATÁS',chats:31,accent:'cyan',status:'Rendezendő',summary:'Több egymásra épülő matekos beszélgetés egy témakörben.',next:'hasonló chatek rendezése',last:'3 napja',tags:['Feladatlap','Vizsga','Pénzügy']},
{id:'ff',name:'Szakdolgozat – FF Zrt.',category:'TANULMÁNY / PHD',chats:9,accent:'green',status:'Aktív',summary:'Pénzügyi audit, értelmezés és dolgozati fejezetek.',next:'3.8–3.9 összeállítása',last:'5 napja',tags:['Audit','Elemzés']}
];

const cats=[
['Oktatás','Matematika · Vendéglátás · IKT','blue','⌘'],
['MOTA','MOTA-System · Learning · English','violet','◉'],
['App fejlesztések','Naptár · ReceptRendelő · Súlynapló','cyan','</>'],
['Gasztro','Illéssy · Receptek · Receptgyűjtők','orange','♨'],
['Tanulmány / PhD','Szakdolgozat · Kutatás · PhD terv','pink','◇'],
['Magán','Autó · Vásárlás · Egyéb','green','⌂'],
['Ötletek','Új appok · Később · Kísérletek','orange','✦'],
['Lezárt / parkoló','Archivált · Lezárt · Régi','blue','□']
] as const;

function conversationTexts(c:any){
  try{
    const nodes=Object.values(c?.mapping||{}) as any[];
    const userTexts:string[]=[];
    for(const node of nodes){
      const m=node?.message;
      if(m?.author?.role!=='user') continue;
      const parts=m?.content?.parts;
      if(Array.isArray(parts)){
        const t=parts.filter((x:any)=>typeof x==='string').join(' ').replace(/\s+/g,' ').trim();
        if(t) userTexts.push(t);
      }
    }
    const joined=userTexts.join(' · ');
    return {preview:(userTexts.at(-1)||'').slice(0,220),searchText:joined.slice(0,2600)};
  }catch{}
  return {preview:'',searchText:''};
}

function normalizeText(v:string){
  return (v||'').toLocaleLowerCase('hu-HU')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9]+/g,' ').trim();
}
const conceptGroups=[
  ['illesi','illessy','illesy','illessy','gasztro kupa','szakacsverseny','versenyfogas'],
  ['mota','mota system','mota english','mota learning'],
  ['szakdoga','szakdolgozat','dolgozat'],
  ['matek','matematika','szamolas','szamitas'],
  ['naptar','calendar','esemeny'],
  ['ertesites','notification','gmail','messenger','imessage'],
  ['recept','receptura','etel','fozes','gasztro'],
  ['testsuly','suly','fogyas','kilogramm']
].map(g=>g.map(normalizeText));

function levenshtein(a:string,b:string){
  if(a===b)return 0;
  if(!a.length)return b.length;if(!b.length)return a.length;
  const row=Array.from({length:b.length+1},(_,i)=>i);
  for(let i=1;i<=a.length;i++){
    let prev=row[0];row[0]=i;
    for(let j=1;j<=b.length;j++){
      const tmp=row[j];
      row[j]=Math.min(row[j]+1,row[j-1]+1,prev+(a[i-1]===b[j-1]?0:1));
      prev=tmp;
    }
  }
  return row[b.length];
}
function expandedQuery(q:string){
  const n=normalizeText(q);
  const tokens=n.split(' ').filter(Boolean);
  const expanded=new Set(tokens);
  for(const token of tokens){
    for(const group of conceptGroups){
      if(group.some(x=>x===token||x.includes(token)||token.includes(x)))group.forEach(x=>x.split(' ').forEach(y=>expanded.add(y)));
    }
  }
  return [...expanded];
}
function fuzzyScore(q:string,text:string){
  const nq=normalizeText(q); if(!nq)return 1;
  const nt=normalizeText(text); if(!nt)return 0;
  if(nt.includes(nq))return 100;
  const qTokens=expandedQuery(q);
  const tTokens=nt.split(' ').filter(Boolean);
  let score=0;
  for(const qt of qTokens){
    let best=0;
    for(const tt of tTokens){
      if(tt===qt){best=12;break}
      if(tt.includes(qt)||qt.includes(tt)){best=Math.max(best,9);continue}
      const max=Math.max(tt.length,qt.length);
      if(max>=4){
        const d=levenshtein(qt,tt);
        const sim=1-d/max;
        if(sim>=.72)best=Math.max(best,Math.round(sim*8));
      }
    }
    score+=best;
  }
  return score;
}
const stopWords=new Set(['hogy','vagy','volt','van','egy','az','es','is','de','meg','majd','kell','ezt','azt','itt','ott','nem','igen','ami','ahol','amikor','lesz','lett','csak','mar','mert','mint','ilyen','olyan','szerintem','akkor','most','ennek','annak','the','and','for','with','from','this','that']);

function chatKeywords(c:ChatItem){
  const raw=normalizeText(c.title+' '+c.preview+' '+(c.searchText||''));
  const words=raw.split(' ').filter(w=>w.length>=4&&!stopWords.has(w));
  const freq=new Map<string,number>();
  for(const w of words)freq.set(w,(freq.get(w)||0)+1);
  return [...freq.entries()].sort((a,b)=>b[1]-a[1]).slice(0,16).map(x=>x[0]);
}
function similarity(a:ChatItem,b:ChatItem){
  if(a.assignedProjectId&&b.assignedProjectId&&a.assignedProjectId!==b.assignedProjectId)return 0;
  const A=new Set(chatKeywords(a)),B=new Set(chatKeywords(b));
  if(!A.size||!B.size)return 0;
  let common=0;for(const x of A)if(B.has(x))common++;
  const union=new Set([...A,...B]).size;
  let score=common/union;
  const ta=normalizeText(a.title),tb=normalizeText(b.title);
  if(ta&&tb&&(ta.includes(tb)||tb.includes(ta)))score+=.35;
  for(const group of conceptGroups){
    const ah=group.some(x=>normalizeText(a.title+' '+a.preview).includes(x));
    const bh=group.some(x=>normalizeText(b.title+' '+b.preview).includes(x));
    if(ah&&bh){score+=.22;break}
  }
  return score;
}
function findDuplicateGroups(chats:ChatItem[]){
  const active=chats.filter(c=>!c.archived);
  const used=new Set<string>(),out:ChatItem[][]=[];
  for(const seed of active){
    if(used.has(seed.id))continue;
    const a=normalizeText(seed.title);
    const matches=active.filter(c=>{
      if(c.id===seed.id||used.has(c.id))return false;
      const b=normalizeText(c.title);
      const exact=!!a&&a===b;
      const close=a.length>5&&b.length>5&&levenshtein(a,b)/Math.max(a.length,b.length)<=.18;
      return exact||close||similarity(seed,c)>=.62;
    }).slice(0,7);
    if(matches.length){const g=[seed,...matches].sort((x,y)=>y.updated.localeCompare(x.updated));g.forEach(c=>used.add(c.id));out.push(g)}
  }
  return out.sort((a,b)=>b.length-a.length);
}

function makeClusters(chats:ChatItem[]){
  const pool=[...chats].sort((a,b)=>b.updated.localeCompare(a.updated));
  const used=new Set<string>();
  const out:{id:string;label:string;items:ChatItem[];confidence:number;projectId?:string}[]=[];
  for(const seed of pool){
    if(used.has(seed.id))continue;
    const candidates=pool.filter(c=>c.id!==seed.id&&!used.has(c.id))
      .map(c=>({c,score:similarity(seed,c)})).filter(x=>x.score>=.18)
      .sort((a,b)=>b.score-a.score).slice(0,9);
    if(!candidates.length)continue;
    const items=[seed,...candidates.map(x=>x.c)];
    items.forEach(c=>used.add(c.id));
    const freq=new Map<string,number>();
    items.forEach(c=>chatKeywords(c).slice(0,8).forEach(w=>freq.set(w,(freq.get(w)||0)+1)));
    const top=[...freq.entries()].sort((a,b)=>b[1]-a[1]).filter(x=>x[1]>=2).slice(0,3).map(x=>x[0]);
    const projectIds=items.map(x=>x.assignedProjectId).filter(Boolean) as string[];
    const projectId=projectIds.length?projectIds.sort((a,b)=>projectIds.filter(x=>x===b).length-projectIds.filter(x=>x===a).length)[0]:undefined;
    const confidence=Math.min(98,Math.round((candidates.reduce((a,x)=>a+x.score,0)/candidates.length)*100+45));
    out.push({id:seed.id,label:top.join(' · ')||seed.title,items,confidence,projectId});
  }
  return out.sort((a,b)=>b.items.length-a.items.length);
}

function parseChatDate(v:any){
  if(v===null||v===undefined||v==='')return new Date().toISOString();
  if(typeof v==='number'){
    const ms=v<1e12?v*1000:v;
    const d=new Date(ms);return Number.isNaN(d.getTime())?new Date().toISOString():d.toISOString();
  }
  const numeric=Number(v);
  if(typeof v==='string'&&v.trim()!==''&&Number.isFinite(numeric)){
    const ms=numeric<1e12?numeric*1000:numeric;
    const d=new Date(ms);return Number.isNaN(d.getTime())?new Date().toISOString():d.toISOString();
  }
  const ms=Date.parse(String(v));
  return Number.isNaN(ms)?new Date().toISOString():new Date(ms).toISOString();
}
function niceDate(v:any){
  const n=typeof v==='number'?(v<1e12?v*1000:v):Date.parse(v);
  if(!n||Number.isNaN(n))return '—';
  return new Intl.DateTimeFormat('hu-HU',{year:'numeric',month:'short',day:'numeric'}).format(new Date(n));
}
function suggestDestination(chat:ChatItem,projects:Project[],topics:Topic[]){
  const hay=chat.title+' '+chat.preview+' '+(chat.searchText||'');
  const ranked=projects.filter(p=>!p.archived).map(p=>{
    const q=[p.name,p.category,p.summary,...p.tags].join(' ');
    const score=fuzzyScore(q,hay)+fuzzyScore(p.name,hay)*.8;
    return {project:p,score};
  }).sort((a,b)=>b.score-a.score);
  const best=ranked[0];
  if(!best||best.score<=0)return null;
  const confidence=Math.min(98,Math.round(42+best.score*2.5));
  const topicRank=topics.filter(t=>t.projectId===best.project.id).map(t=>({topic:t,score:fuzzyScore(t.name,hay)})).sort((a,b)=>b.score-a.score);
  const bestTopic=topicRank[0]?.score>0?topicRank[0]:null;
  const topicConfidence=bestTopic?Math.min(96,Math.round(38+bestTopic.score*3)):0;
  const reasons=[best.project.name,...best.project.tags.filter(t=>fuzzyScore(t,hay)>0).slice(0,2)];
  return {projectId:best.project.id,projectName:best.project.name,confidence,topicId:bestTopic?.topic.id,topicName:bestTopic?.topic.name,topicConfidence,reasons:[...new Set(reasons)].slice(0,3)};
}

function inferProject(title:string,preview:string,projects:Project[]){
  const hay=(title+' '+preview).toLowerCase();
  const rules:{id:string;words:string[]}[]=[
    {id:'matek',words:['matek','matematika','számítás','adóigazgat','pénzügy','portfólió optimaliz']},
    {id:'mota',words:['mota','phd','english','számonkér','tanmenet','kréta']},
    {id:'ff',words:['ff zrt','szakdolgozat','osztalék','audit','rédei-fém']},
    {id:'recept',words:['recept','étel','illes','illess','tányér','versenyfogás','harcsa','gasztro']},
    {id:'suly',words:['súly','testsúly','fogyás','heti átlag']},
    {id:'ertesites',words:['értesítés','gmail','messenger','naptár','imessage']}
  ];
  let best:{id:string;score:number}|null=null;
  for(const rule of rules){
    const score=rule.words.reduce((a,w)=>a+(hay.includes(w)?1:0),0);
    if(score && (!best||score>best.score))best={id:rule.id,score};
  }
  return best && projects.some(p=>p.id===best!.id)?best.id:undefined;
}

export default function Home(){
 const [projects,setProjects]=useState<Project[]>(starter);
 const [chats,setChats]=useState<ChatItem[]>([]);
 const [topics,setTopics]=useState<Topic[]>([]);
 const [query,setQuery]=useState('');
 const [filter,setFilter]=useState<'Összes'|'Aktív'|'Kedvenc'|'Legutóbbi'>('Összes');
 const [selected,setSelected]=useState<Project|null>(null);
 const [composer,setComposer]=useState<'project'|'chat'|null>(null);
 const [name,setName]=useState('');
 const [toast,setToast]=useState('');
 const [showImport,setShowImport]=useState(false);
 const [showChats,setShowChats]=useState(false);
 const [clusterMode,setClusterMode]=useState(false);
 const [inboxMode,setInboxMode]=useState(false);
 const [selectedChatIds,setSelectedChatIds]=useState<string[]>([]);
 const [showArchived,setShowArchived]=useState(false);
 const [showProjectArchive,setShowProjectArchive]=useState(false);
 const [showCloud,setShowCloud]=useState(false);
 const [cloudStatus,setCloudStatus]=useState<CloudStatus|null>(null);
 const [cloudLoading,setCloudLoading]=useState(false);
 const [importLogs,setImportLogs]=useState<ImportLog[]>([]);
 const [importSummary,setImportSummary]=useState<{total:number;added:number;updated:number;unchanged:number;assigned:number}|null>(null);
 const fileRef=useRef<HTMLInputElement>(null);
 const backupRef=useRef<HTMLInputElement>(null);

 useEffect(()=>{
   const p=localStorage.getItem('chathub-projects-v2');
   const c=localStorage.getItem('chathub-chats-v2');
   const t=localStorage.getItem('chathub-topics-v1');
   const l=localStorage.getItem('chathub-import-log-v1');
   if(p){try{setProjects(JSON.parse(p))}catch{}}
   if(c){try{setChats(JSON.parse(c))}catch{}}
   if(t){try{setTopics(JSON.parse(t))}catch{}}
   if(l){try{setImportLogs(JSON.parse(l))}catch{}}
 },[]);
 useEffect(()=>{localStorage.setItem('chathub-projects-v2',JSON.stringify(projects))},[projects]);
 useEffect(()=>{localStorage.setItem('chathub-chats-v2',JSON.stringify(chats))},[chats]);
 useEffect(()=>{localStorage.setItem('chathub-topics-v1',JSON.stringify(topics))},[topics]);
 useEffect(()=>{localStorage.setItem('chathub-import-log-v1',JSON.stringify(importLogs))},[importLogs]);
 useEffect(()=>{void refreshCloudStatus()},[]);
 async function refreshCloudStatus(){
   setCloudLoading(true);
   try{
     const r=await fetch('/api/cloud/status',{cache:'no-store'});
     const data=await r.json();
     setCloudStatus(data);
   }catch{setCloudStatus({connected:false,authConfigured:false,database:'Neon',error:'Kapcsolódási hiba'})}
   finally{setCloudLoading(false)}
 }

 const visible=useMemo(()=>projects.map(p=>({
   p,score:fuzzyScore(query,p.name+' '+p.category+' '+p.summary+' '+p.tags.join(' '))
 })).filter(({p,score})=>{
   if(showProjectArchive?!p.archived:p.archived)return false;
   if(query.trim()&&score<=0)return false;
   if(filter==='Aktív'&&!(p.status==='Aktív'||p.status==='Fejlesztés'))return false;
   if(filter==='Kedvenc'&&!p.favorite)return false;
   if(filter==='Legutóbbi'&&!(p.last==='Ma'||p.last==='Tegnap'))return false;
   return true;
 }).sort((a,b)=>query.trim()?b.score-a.score:0).map(x=>x.p),[projects,query,filter,showProjectArchive]);

 const clusters=useMemo(()=>makeClusters(chats.filter(c=>!c.archived)),[chats]);
 const duplicateGroups=useMemo(()=>findDuplicateGroups(chats),[chats]);
 const inboxCount=chats.filter(c=>!c.archived&&!c.assignedProjectId).length;
 const smartSuggestions=useMemo(()=>chats.filter(c=>!c.archived&&!c.assignedProjectId).map(c=>({chat:c,s:suggestDestination(c,projects,topics)})).filter(x=>x.s).sort((a,b)=>(b.s?.confidence||0)-(a.s?.confidence||0)),[chats,projects,topics]);
 const safeSuggestionCount=smartSuggestions.filter(x=>(x.s?.confidence||0)>=72).length;

 const chatResults=useMemo(()=>chats.map(c=>({
   c,score:fuzzyScore(query,c.title+' '+c.preview+' '+(c.searchText||''))
 })).filter(x=>(showArchived?!!x.c.archived:!x.c.archived)&&(!inboxMode||!x.c.assignedProjectId)&&(!query.trim()||x.score>0))
   .sort((a,b)=>query.trim()?b.score-a.score:b.c.updated.localeCompare(a.c.updated))
   .map(x=>x.c),[chats,query,showArchived,inboxMode]);

 function flash(t:string){setToast(t);setTimeout(()=>setToast(''),1700)}
 function create(){
   const v=name.trim(); if(!v)return;
   if(composer==='project'){
     const p:Project={id:crypto.randomUUID(),name:v,category:'ÚJ PROJEKT',chats:0,accent:'cyan',status:'Aktív',summary:'Új projekt. A részletek később finomíthatók.',next:'első beszélgetés indítása',last:'Ma',tags:['Új']};
     setProjects(x=>[p,...x]);flash('Projekt létrehozva');
   }else{
     const c:ChatItem={id:crypto.randomUUID(),title:v,preview:'Kézzel létrehozott beszélgetés-bejegyzés',updated:new Date().toISOString(),source:'manual',assignedProjectId:selected?.id};
     setChats(x=>[c,...x]);
     if(selected)setProjects(xs=>xs.map(p=>p.id===selected.id?{...p,chats:p.chats+1,last:'Ma'}:p));
     flash('Új chat-bejegyzés létrehozva');
   }
   setName('');setComposer(null);
 }
 function updateSelected(patch:Partial<Project>){
   if(!selected)return;const next={...selected,...patch};
   setProjects(ps=>ps.map(p=>p.id===selected.id?next:p));setSelected(next);
 }
 function archiveProject(id:string,value=true){
   setProjects(ps=>ps.map(p=>p.id===id?{...p,archived:value,status:value?'Parkoló':p.status}:p));setSelected(null);flash(value?'Projekt archiválva':'Projekt visszaállítva');
 }
 function remove(id:string){
   const linked=chats.filter(c=>c.assignedProjectId===id).length;
   const msg=linked?'Ehhez a projekthez '+linked+' chat tartozik.\n\nOK = projekt törlése, a chatek a Beérkezőbe kerülnek.':'Biztosan törlöd ezt a projektet a katalógusból?';
   if(!confirm(msg))return;
   setProjects(x=>x.filter(p=>p.id!==id));setTopics(ts=>ts.filter(t=>t.projectId!==id));
   setChats(x=>x.map(c=>c.assignedProjectId===id?{...c,assignedProjectId:undefined,topicId:undefined}:c));setSelected(null);flash('Projekt törölve · chatek a Beérkezőben');
 }
 async function importFile(e:ChangeEvent<HTMLInputElement>){
   const file=e.target.files?.[0]; if(!file)return;
   try{
     const raw=JSON.parse(await file.text());
     const list=Array.isArray(raw)?raw:Array.isArray(raw?.conversations)?raw.conversations:null;
     if(!list)throw new Error('Nem conversations.json');
     const existing=new Map(chats.map(c=>[c.id,c]));
     let added=0,updatedCount=0,unchanged=0;
     const parsed:ChatItem[]=list.map((c:any,i:number)=>{
       const title=(c?.title||'Névtelen beszélgetés').toString();
       const {preview,searchText}=conversationTexts(c);
       const id=(c?.id||c?.conversation_id||('import-'+i)).toString();
       const old=existing.get(id);
       const autoProject=old?.assignedProjectId||inferProject(title,searchText||preview,projects);
       const fresh:ChatItem={
         id,title,preview,searchText,
         updated:parseChatDate(c?.update_time||c?.create_time),
         source:'import',assignedProjectId:autoProject,projectRef:c?.project_id||old?.projectRef||null,
         topicId:old?.topicId,archived:old?.archived
       };
       if(!old)added++;
       else{
         const changed=old.title!==fresh.title||old.preview!==fresh.preview||old.searchText!==fresh.searchText||old.updated!==fresh.updated;
         if(changed)updatedCount++;else unchanged++;
       }
       return fresh;
     });
     const unique=new Map<string,ChatItem>();
     for(const c of chats)unique.set(c.id,c);
     for(const c of parsed)unique.set(c.id,c);
     const next=[...unique.values()];
     setChats(next);
     const counts=new Map<string,number>();
     next.filter(c=>!c.archived).forEach(c=>{if(c.assignedProjectId)counts.set(c.assignedProjectId,(counts.get(c.assignedProjectId)||0)+1)});
     setProjects(ps=>ps.map(p=>counts.has(p.id)?{...p,chats:counts.get(p.id)||0}:p));
     const assigned=parsed.filter(c=>c.assignedProjectId).length;
     const summary={total:parsed.length,added,updated:updatedCount,unchanged,assigned};
     setImportSummary(summary);
     const log:ImportLog={id:crypto.randomUUID(),date:new Date().toISOString(),fileName:file.name,total:parsed.length,added,updated:updatedCount,unchanged,assigned};
     setImportLogs(xs=>[log,...xs].slice(0,12));
     setShowImport(false);setShowChats(true);
     flash(added?added+' új chat hozzáadva':updatedCount?updatedCount+' chat frissítve':'Nincs új változás');
   }catch{
     alert('Ezt a fájlt nem tudtam conversations.json-ként beolvasni.');
   }finally{
     if(fileRef.current)fileRef.current.value='';
   }
 }
 function assignChat(chatId:string,projectId:string){
   setChats(cs=>cs.map(c=>c.id===chatId?{...c,assignedProjectId:projectId||undefined,topicId:projectId?c.topicId:undefined}:c));
 }
 function acceptSuggestion(chatId:string){
   const chat=chats.find(c=>c.id===chatId);if(!chat)return;
   const sug=suggestDestination(chat,projects,topics);if(!sug)return;
   setChats(cs=>cs.map(c=>c.id===chatId?{...c,assignedProjectId:sug.projectId,topicId:sug.topicConfidence>=72?sug.topicId:undefined}:c));
   flash('Chat rendezve → '+sug.projectName);
 }
 function autoArrangeSafe(){
   const suggestions=new Map<string,ReturnType<typeof suggestDestination>>();
   chats.filter(c=>!c.archived&&!c.assignedProjectId).forEach(c=>suggestions.set(c.id,suggestDestination(c,projects,topics)));
   let count=0;
   setChats(cs=>cs.map(c=>{
     const sug=suggestions.get(c.id);
     if(!sug||sug.confidence<72)return c;
     count++;
     return {...c,assignedProjectId:sug.projectId,topicId:sug.topicConfidence>=78?sug.topicId:undefined};
   }));
   flash(count?count+' biztos találat automatikusan rendezve':'Nincs elég biztos automatikus találat');
 }
 function assignCluster(ids:string[],projectId:string){
   if(!projectId)return;
   const set=new Set(ids);
   setChats(cs=>cs.map(c=>set.has(c.id)?{...c,assignedProjectId:projectId}:c));
   flash(ids.length+' chat a projekthez rendelve');
 }
 function makeTopic(projectId:string,label:string,ids:string[]){
   if(!projectId)return;
   const clean=label.split('·')[0].trim().replace(/\b\w/g,m=>m.toLocaleUpperCase('hu-HU')).slice(0,42)||'Új téma';
   const existing=topics.find(t=>t.projectId===projectId&&normalizeText(t.name)===normalizeText(clean));
   const topic=existing||{id:crypto.randomUUID(),projectId,name:clean,createdAt:new Date().toISOString()};
   if(!existing)setTopics(ts=>[topic,...ts]);
   const set=new Set(ids);
   setChats(cs=>cs.map(c=>set.has(c.id)?{...c,assignedProjectId:projectId,topicId:topic.id}:c));
   flash(ids.length+' chat → '+topic.name);
 }
 function assignTopic(chatId:string,topicId:string){
   const topic=topics.find(t=>t.id===topicId);
   setChats(cs=>cs.map(c=>c.id===chatId?{...c,topicId:topicId||undefined,assignedProjectId:topic?.projectId||c.assignedProjectId}:c));
 }
 function toggleChatSelection(id:string){setSelectedChatIds(xs=>xs.includes(id)?xs.filter(x=>x!==id):[...xs,id])}
 function bulkProject(projectId:string){
   if(!projectId||!selectedChatIds.length)return;
   const ids=new Set(selectedChatIds);
   setChats(cs=>cs.map(c=>ids.has(c.id)?{...c,assignedProjectId:projectId,topicId:undefined}:c));
   flash(selectedChatIds.length+' chat áthelyezve');setSelectedChatIds([]);
 }
 function bulkArchive(value:boolean){
   if(!selectedChatIds.length)return;
   const ids=new Set(selectedChatIds);
   setChats(cs=>cs.map(c=>ids.has(c.id)?{...c,archived:value}:c));
   flash(selectedChatIds.length+(value?' chat archiválva':' chat visszaállítva'));setSelectedChatIds([]);
 }
 function archiveDuplicateGroup(group:ChatItem[]){
   const keep=[...group].sort((a,b)=>b.updated.localeCompare(a.updated))[0];
   const ids=new Set(group.filter(c=>c.id!==keep.id).map(c=>c.id));
   setChats(cs=>cs.map(c=>ids.has(c.id)?{...c,archived:true}:c));flash((group.length-1)+' régebbi duplikátum archiválva');
 }
 function bulkDelete(){
   if(!selectedChatIds.length||!confirm('Biztosan törlöd a kijelölt chat-bejegyzéseket a katalógusból?'))return;
   const ids=new Set(selectedChatIds);setChats(cs=>cs.filter(c=>!ids.has(c.id)));setSelectedChatIds([]);flash('Kijelölt chatek törölve');
 }
 function addTopic(projectId:string){
   const v=prompt('Új téma neve');if(!v?.trim())return;
   setTopics(ts=>[{id:crypto.randomUUID(),projectId,name:v.trim(),createdAt:new Date().toISOString()},...ts]);flash('Téma létrehozva');
 }
 function renameTopic(id:string){
   const t=topics.find(x=>x.id===id);if(!t)return;
   const v=prompt('Téma új neve',t.name);if(!v?.trim())return;
   setTopics(ts=>ts.map(x=>x.id===id?{...x,name:v.trim()}:x));flash('Téma átnevezve');
 }
 function deleteTopic(id:string){
   const t=topics.find(x=>x.id===id);if(!t||!confirm('Törlöd ezt a témát? A chatek a projektben maradnak.'))return;
   setTopics(ts=>ts.filter(x=>x.id!==id));setChats(cs=>cs.map(c=>c.topicId===id?{...c,topicId:undefined}:c));flash('Téma törölve');
 }
 function exportBackup(){
   const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),projects,chats,topics},null,2)],{type:'application/json'});
   const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='chathub-backup.json';a.click();URL.revokeObjectURL(url);flash('Biztonsági mentés elkészült');
 }
 async function importBackup(e:ChangeEvent<HTMLInputElement>){
   const file=e.target.files?.[0];if(!file)return;
   try{
     const data=JSON.parse(await file.text());
     if(!Array.isArray(data.projects)||!Array.isArray(data.chats)||!Array.isArray(data.topics))throw new Error();
     setProjects(data.projects);setChats(data.chats);setTopics(data.topics);flash('Biztonsági mentés visszaállítva');
   }catch{alert('Ez nem érvényes ChatHub biztonsági mentés.')}
   finally{if(backupRef.current)backupRef.current.value=''}
 }
 const selectedChats=selected?chats.filter(c=>c.assignedProjectId===selected.id&&!c.archived):[];
 const selectedTopics=selected?topics.filter(t=>t.projectId===selected.id):[];

 return <main className="shell">
   <div className="aurora a1"/><div className="aurora a2"/><div className="grid"/>

   <header className="top">
     <div className="brand"><img src="/icon.svg" alt="ChatHub"/><b>Chat<span>Hub</span></b></div>
     <nav>
       <button className={!showChats?'on':''} onClick={()=>{setShowChats(false);setClusterMode(false);setInboxMode(false)}}>⌂ Kezdőlap</button>
       <button onClick={()=>{setShowChats(false);setClusterMode(false);setInboxMode(false)}}>Projektek</button>
       <button className={showChats&&!clusterMode&&!inboxMode?'on':''} onClick={()=>{setShowChats(true);setClusterMode(false);setInboxMode(false)}}>Chatek</button>
       <button className={showChats&&inboxMode?'on':''} onClick={()=>{setShowChats(true);setClusterMode(false);setInboxMode(true)}}>Beérkező {inboxCount?'('+inboxCount+')':''}</button>
       <button className={showChats&&clusterMode?'on':''} onClick={()=>{setShowChats(true);setClusterMode(true);setInboxMode(false)}}>Rendetlenség</button>
     </nav>
     <div className="tools"><button className={'cloudTop '+(cloudStatus?.connected?'ready':'')} onClick={()=>{setShowCloud(true);void refreshCloudStatus()}} title="Felhőszinkron">{cloudLoading?'…':cloudStatus?.connected?'☁✓':'☁'}</button><button>⚙</button><i/></div>
   </header>

   {!showChats ? <>
   <section className="hero">
     <div><small>✦ PROJEKT RENDSZEREZŐ</small><h1>Jó munkát ma is!</h1><p>Minden projekted és ChatGPT beszélgetésed egy helyen.</p></div>
     <div className="heroBtns"><button className="primary" onClick={()=>setComposer('project')}>＋ Új projekt</button><button className="soft" onClick={()=>setShowImport(true)}>⇩ ChatGPT import</button></div>
   </section>

   <section className="search smartSearch"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Írj nevet, témát vagy csak egy foszlányt…"/><kbd>⌘ K</kbd></section>
   {query.trim()&&<div className="searchHint"><b>Intelligens keresés</b><span>Elgépelést, ékezetet, névváltozatot és témarészletet is próbál felismerni.</span></div>}
   <div className="tags">{['matematika','Illéssy','OAuth','túrógombóc','401 hiba','PhD','recept','MOTA'].map(x=><button key={x} onClick={()=>setQuery(x)}>{x}</button>)}</div>

   {query.trim()&&chatResults.length>0&&<section className="quickHits">
      <div className="quickHead"><div><small>LEGJOBB BESZÉLGETÉS-TALÁLATOK</small><b>{chatResults.length} találat</b></div><button onClick={()=>setShowChats(true)}>Mind megnyitása →</button></div>
      <div className="quickHitGrid">{chatResults.slice(0,3).map(c=><button key={c.id} onClick={()=>setShowChats(true)}>
        <strong>{c.title}</strong><span>{c.preview||'Tartalmi egyezés'}</span>
      </button>)}</div>
   </section>}
   <section className="stats">
     <Stat icon="▱" n={projects.filter(p=>!p.archived).length} label="Projekt" c="blue"/>
     <Stat icon="•••" n={chats.filter(c=>!c.archived).length||projects.reduce((a,p)=>a+p.chats,0)} label="Chat" c="cyan"/>
     <Stat icon="⇥" n={inboxCount} label="Beérkező" c="green"/>
     <Stat icon="✦" n={duplicateGroups.length} label="Duplikáció" c="orange"/>
   </section>

   {importSummary&&<section className="importBanner"><div><small>LEGUTÓBBI IMPORT</small><b>{importSummary.total} beszélgetés</b><span><strong>+{importSummary.added} új</strong> · {importSummary.updated} frissült · {importSummary.unchanged} változatlan · {importSummary.total-importSummary.assigned} rendezetlen</span></div><button onClick={()=>setShowChats(true)}>Chatek rendezése →</button></section>}

   <Head title={showProjectArchive?'Archivált projektek':'Aktív projektek'} sub={showProjectArchive?'Lezárt és parkolópályás munkák':'A legfontosabb munkáid most'}/>
   <div className="projectMode"><button className={!showProjectArchive?'on':''} onClick={()=>setShowProjectArchive(false)}>Aktív</button><button className={showProjectArchive?'on':''} onClick={()=>setShowProjectArchive(true)}>Archív</button></div>
   <div className="filters">{(['Összes','Aktív','Kedvenc','Legutóbbi'] as const).map(x=><button key={x} className={filter===x?'on':''} onClick={()=>setFilter(x)}>{x}</button>)}</div>

   <section className="cards">
    {visible.map(p=><article key={p.id} className={'card '+p.accent} onClick={()=>setSelected(p)}>
      <div className="glow"/><div className="ico">▱</div><button className="dots">•••</button>
      <div className="cardTitle"><div><h3>{p.name}</h3><em/> <small>{p.status}</small></div><span>{p.last}</span></div>
      <p>{p.summary}</p><div className="badges">{p.tags.map(t=><b key={t}>{t}</b>)}</div>
      <div className="next">Beszélgetések: <strong>{chats.filter(c=>c.assignedProjectId===p.id).length||p.chats}</strong> · Következő: <strong>{p.next}</strong></div>
    </article>)}
   </section>

   <Head title="Projekt kategóriák" sub="A teljes munkaterület tematikusan"/>
   <section className="catGrid">{cats.map(c=><article className={'cat '+c[2]} key={c[0]}>
      <div className="catTop"><i>{c[3]}</i><div><h3>{c[0]}</h3><p>{c[1]}</p></div><span>›</span></div>
   </article>)}</section>

   <section className="inboxCard"><i>⇥</i><div><small>BEÉRKEZŐ</small><h3>{inboxCount?inboxCount+' chat még nincs projekthez rendelve':'Minden chat a helyén van'}</h3><p>{safeSuggestionCount?safeSuggestionCount+' beszélgetésnél már elég biztos az automatikus javaslat.':'Ide kerül minden olyan beszélgetés, amelynél még nem biztos, hova tartozik.'}</p></div><div className="inboxActions">{safeSuggestionCount>0&&<button className="smartAuto" onClick={autoArrangeSafe}>✦ Biztosak rendezése ({safeSuggestionCount})</button>}<button onClick={()=>{setShowChats(true);setClusterMode(false);setInboxMode(true)}}>Rendezem</button></div></section>
   <section className="messy"><i>✦</i><div><small>RENDETLENSÉG-FIGYELŐ</small><h3>{duplicateGroups.length?duplicateGroups.length+' lehetséges duplikáció · ':''}{clusters.length?clusters.length+' hasonló témacsoport':(inboxCount||13)+' rendezetlen beszélgetés'}</h3><p>A rendszer külön jelzi a duplikációkat és a tartalmilag összetartozó chateket.</p></div><button onClick={()=>{setShowChats(true);setClusterMode(true);setInboxMode(false)}}>Megnézem</button></section>
   </> : <>
    <section className="hero compactHero">
      <div><small>✦ {clusterMode?'RENDETLENSÉG / KLASZTEREK':inboxMode?'BEÉRKEZŐ':'BESZÉLGETÉSKATALÓGUS'}</small><h1>{clusterMode?'Kapcsolódó csetek':inboxMode?'Rendezetlen chatek':'Chatek'}</h1><p>{clusterMode?(clusters.length?clusters.length+' valószínű témacsoport':'Import után itt jelennek meg a hasonló csetek'):inboxMode?(inboxCount?inboxCount+' chat vár besorolásra':'Minden rendezve'):(chats.length?chats.length+' importált vagy rögzített beszélgetés':'Még nincs importált beszélgetés.')}</p></div>
      <div className="heroBtns"><button className="primary" onClick={()=>setShowImport(true)}>⇩ Import</button><button className="soft" onClick={()=>setClusterMode(!clusterMode)}>{clusterMode?'□ Chatlista':'✦ Klaszterek'}</button><button className="soft" onClick={()=>setShowArchived(!showArchived)}>{showArchived?'↩ Aktív':'◌ Archív'}</button></div>
    </section>
    {!clusterMode?<>
      <section className="search smartSearch"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Pl. „az a harcsás versenyfogás tejföl pöttyel”"/><kbd>{chatResults.length}</kbd></section>
      {query.trim()&&<div className="searchHint"><b>Foszlánykeresés aktív</b><span>Nem kell pontos cím: írj le annyit, amire emlékszel.</span></div>}
      {inboxMode&&inboxCount>0&&<section className="smartInbox"><div><small>✦ OKOS RENDEZÉS</small><b>{safeSuggestionCount} biztos · {Math.max(0,smartSuggestions.length-safeSuggestionCount)} ellenőrzendő</b><span>Csak a magas megbízhatóságú találatokat rendezi automatikusan.</span></div>{safeSuggestionCount>0&&<button onClick={autoArrangeSafe}>Biztos találatok rendezése</button>}</section>}
      {selectedChatIds.length>0&&<section className="bulkBar"><b>{selectedChatIds.length} kijelölve</b><select defaultValue="" onChange={e=>bulkProject(e.target.value)}><option value="">Áthelyezés projektbe…</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select><button onClick={()=>bulkArchive(!showArchived)}>{showArchived?'↩ Visszaállítás':'◌ Archiválás'}</button><button className="dangerMini" onClick={bulkDelete}>⌫ Törlés</button><button onClick={()=>setSelectedChatIds([])}>×</button></section>}
      <section className="chatList">
        {chatResults.length===0?<div className="emptyState"><div>⇩</div><h3>{showArchived?'Nincs archivált beszélgetés':'Importáld a ChatGPT előzményeidet'}</h3><p>{showArchived?'Az archivált beszélgetések itt jelennek meg.':<>A ChatGPT adatexportból a <b>conversations.json</b> fájlt válaszd ki. A feldolgozás a böngésződben történik.</>}</p>{!showArchived&&<button className="primary" onClick={()=>setShowImport(true)}>Import indítása</button>}</div>:
        chatResults.map(c=>{
          const p=projects.find(p=>p.id===c.assignedProjectId);
          const suggestion=!c.assignedProjectId?suggestDestination(c,projects,topics):null;
          return <article className={'chatRow '+(selectedChatIds.includes(c.id)?'selectedRow':'')} key={c.id}>
            <div className="chatSelectCol"><input type="checkbox" checked={selectedChatIds.includes(c.id)} onChange={()=>toggleChatSelection(c.id)}/><div className={'chatDot '+(p?.accent||'blue')}>•••</div></div>
            <div className="chatCopy"><h3>{c.title}</h3><p>{c.preview||'Nincs rövid előnézet.'}</p><small>{niceDate(c.updated)} · {c.source==='import'?'ChatGPT export':'Kézi'} {c.topicId?'· '+(topics.find(t=>t.id===c.topicId)?.name||'Téma'):''}</small><div className="chatLinks">{c.source==='import'&&<a href={'https://chatgpt.com/c/'+c.id} target="_blank" rel="noreferrer">Megnyitás ChatGPT-ben ↗</a>}</div></div>
            <div className="chatSelectors">
              {inboxMode&&suggestion&&<div className={'suggestBox '+(suggestion.confidence>=72?'high':'medium')}><div><small>JAVASLAT · {suggestion.confidence}%</small><b>{suggestion.projectName}</b>{suggestion.topicName&&suggestion.topicConfidence>=55&&<span>→ {suggestion.topicName} ({suggestion.topicConfidence}%)</span>}<em>{suggestion.reasons.join(' · ')}</em></div><button onClick={()=>acceptSuggestion(c.id)}>Elfogadom</button></div>}
              <select value={c.assignedProjectId||''} onChange={e=>assignChat(c.id,e.target.value)}>
                <option value="">Rendezetlen</option>{projects.filter(p=>!p.archived).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {c.assignedProjectId&&<select value={c.topicId||''} onChange={e=>assignTopic(c.id,e.target.value)}>
                <option value="">Nincs téma</option>{topics.filter(t=>t.projectId===c.assignedProjectId).map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
              </select>}
            </div>
          </article>
        })}
      </section>
    </>:<section className="clusterList">
      {duplicateGroups.length>0&&<div className="duplicateSection"><div className="duplicateHead"><small>DUPLIKÁCIÓFIGYELŐ</small><b>{duplicateGroups.length} gyanús csoport</b></div>{duplicateGroups.slice(0,6).map((g,i)=><article className="duplicateCard" key={g[0].id}><div><span>{String(i+1).padStart(2,'0')}</span><div><b>{g[0].title}</b><small>{g.length} nagyon hasonló beszélgetés</small></div></div><div className="duplicateItems">{g.slice(0,4).map(c=><p key={c.id}><strong>{niceDate(c.updated)}</strong>{c.title}</p>)}</div><button onClick={()=>archiveDuplicateGroup(g)}>Régebbiek archiválása</button></article>)}</div>}
      {clusters.length===0?<div className="emptyState"><div>✦</div><h3>Még nincs mit csoportosítani</h3><p>Importáld a ChatGPT előzményeidet. Legalább két hasonló beszélgetésnél már megjelenik egy témaklaszter.</p><button className="primary" onClick={()=>setShowImport(true)}>Import indítása</button></div>:
      clusters.map((cl,i)=>{
        const suggested=projects.find(p=>p.id===cl.projectId);
        return <article className="clusterCard" key={cl.id}>
          <div className="clusterTop"><div className="clusterNum">0{i+1}</div><div><small>VALÓSZÍNŰ TÉMACSOPORT · {cl.confidence}%</small><h3>{cl.label}</h3><p>{cl.items.length} beszélgetés kapcsolódhat egymáshoz</p></div></div>
          <div className="clusterChats">{cl.items.slice(0,6).map(c=><div key={c.id}><span>•••</span><b>{c.title}</b><small>{niceDate(c.updated)}</small></div>)}</div>
          <div className="clusterAction">
            <div><small>Javasolt projekt</small><strong>{suggested?.name||'Még nincs biztos javaslat'}</strong></div>
            <div className="clusterButtons">
              <select defaultValue={cl.projectId||''} onChange={e=>assignCluster(cl.items.map(x=>x.id),e.target.value)}><option value="">Projekt választása…</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
              {cl.projectId&&<button onClick={()=>makeTopic(cl.projectId!,cl.label,cl.items.map(x=>x.id))}>＋ Téma létrehozása</button>}
            </div>
          </div>
        </article>
      })}
    </section>}
   </>}

   <div className="dock"><button className={!showChats?'on':''} onClick={()=>{setShowChats(false);setClusterMode(false);setInboxMode(false)}}>⌂<small>Kezdőlap</small></button><button className={showChats&&inboxMode?'on':''} onClick={()=>{setShowChats(true);setClusterMode(false);setInboxMode(true)}}>⇥<small>Beérkező</small></button><button className="plus" onClick={()=>setComposer('project')}>＋</button><button className={showChats&&!clusterMode&&!inboxMode?'on':''} onClick={()=>{setShowChats(true);setClusterMode(false);setInboxMode(false)}}>□<small>Chatek</small></button><button className={showChats&&clusterMode?'on':''} onClick={()=>{setShowChats(true);setClusterMode(true);setInboxMode(false)}}>✦<small>Rend</small></button></div>

   {selected&&<div className="overlay" onClick={()=>setSelected(null)}><section className="sheet" onClick={e=>e.stopPropagation()}>
      <button className="x" onClick={()=>setSelected(null)}>×</button>
      <div className={'sheetHero '+selected.accent}><small>{selected.category}</small><h2>{selected.name}</h2><p>{selected.summary}</p></div>
      <div className="sheetBtns"><button className="primary" onClick={()=>setComposer('chat')}>＋ Új chat</button><button className="soft" onClick={()=>updateSelected({favorite:!selected.favorite})}>{selected.favorite?'★ Kedvenc':'☆ Kedvencekhez'}</button></div>
      <div className="projectEditor"><label><span>Projekt neve</span><input value={selected.name} onChange={e=>updateSelected({name:e.target.value})}/></label><label><span>Kategória</span><select value={selected.category} onChange={e=>updateSelected({category:e.target.value})}>{['OKTATÁS','MOTA','APP FEJLESZTÉS','GASZTRO','TANULMÁNY / PHD','MAGÁN','ÖTLETEK','LEZÁRT / PARKOLÓ'].map(x=><option key={x}>{x}</option>)}</select></label><label><span>Állapot</span><select value={selected.status} onChange={e=>updateSelected({status:e.target.value as Project['status']})}>{['Aktív','Fejlesztés','Rendezendő','Parkoló'].map(x=><option key={x}>{x}</option>)}</select></label><label className="wide"><span>Következő lépés</span><input value={selected.next} onChange={e=>updateSelected({next:e.target.value})}/></label></div>
      <div className="info"><div><span>Importált / hozzárendelt chatek</span><b>{selectedChats.length}</b></div><div><span>Témák</span><b>{selectedTopics.length}</b></div><div><span>Következő</span><b>{selected.next}</b></div></div>
      {selectedTopics.length>0&&<div className="topicGrid">{selectedTopics.map(t=>{
        const n=selectedChats.filter(c=>c.topicId===t.id).length;
        return <button key={t.id} onClick={()=>{setQuery(t.name);setShowChats(true);setSelected(null)}}><i>◇</i><span><b>{t.name}</b><small>{n} chat</small></span></button>
      })}</div>}
      {selectedChats.filter(c=>!c.topicId).slice(0,4).map(c=><div className="miniChat" key={c.id}><b>{c.title}</b><span>{niceDate(c.updated)}</span></div>)}
      {selectedChats.length>4&&<button className="soft fullBtn" onClick={()=>{setQuery(selected.name.split(' ')[0]);setShowChats(true);setSelected(null)}}>Összes beszélgetés megnyitása</button>}
      <div className="dangerActions">{selected.archived?<button className="soft" onClick={()=>archiveProject(selected.id,false)}>↩ Projekt visszaállítása</button>:<button className="soft" onClick={()=>archiveProject(selected.id,true)}>◌ Projekt archiválása</button>}<button className="delete" onClick={()=>remove(selected.id)}>⌫ Törlés a katalógusból</button></div>
   </section></div>}

   {composer&&<div className="overlay" onClick={()=>setComposer(null)}><section className="composer" onClick={e=>e.stopPropagation()}>
      <div className="bigIco">＋</div><h2>{composer==='project'?'Új projekt':'Új beszélgetés'}</h2>
      <p>{composer==='project'?'Adj nevet a projektnek. Később kategóriát, linkeket és beszélgetéseket rendelhetsz hozzá.':'Adj rövid címet a beszélgetésnek. Ha projektből indítottad, automatikusan oda kerül.'}</p>
      <input autoFocus value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')create()}} placeholder={composer==='project'?'Például: Matematika':'Például: Valószínűség feladatok'}/>
      <div className="composerBtns"><button className="soft" onClick={()=>setComposer(null)}>Mégse</button><button className="primary" onClick={create}>Létrehozás</button></div>
   </section></div>}

   {showCloud&&<div className="overlay" onClick={()=>setShowCloud(false)}><section className="composer cloudModal" onClick={e=>e.stopPropagation()}>
      <div className="bigIco">☁</div><h2>ChatHub felhő</h2>
      <p>A Neon lesz a közös adatbázisod, hogy később ugyanazt a rendszerezést lásd iPhone-on, iPaden és Macen is.</p>
      <div className="cloudSteps">
        <div className={cloudStatus?.connected?'done':'wait'}><i>{cloudStatus?.connected?'✓':'1'}</i><span><b>Neon adatbázis</b><small>{cloudLoading?'Ellenőrzés…':cloudStatus?.connected?'Kapcsolódva · adatbázisséma kész':cloudStatus?.error||'Még nincs kapcsolat'}</small></span></div>
        <div className={cloudStatus?.authConfigured?'done':'wait'}><i>{cloudStatus?.authConfigured?'✓':'2'}</i><span><b>Neon Auth</b><small>{cloudStatus?.authConfigured?'Belépés konfigurálva':'Következő lépés: biztonságos belépés bekötése'}</small></span></div>
        <div className={cloudStatus?.connected&&cloudStatus?.authConfigured?'done':'wait'}><i>{cloudStatus?.connected&&cloudStatus?.authConfigured?'✓':'3'}</i><span><b>Többeszközös szinkron</b><small>{cloudStatus?.connected&&cloudStatus?.authConfigured?'Indítható':'Az Auth után aktiválható'}</small></span></div>
      </div>
      <div className="cloudLocal"><span>Helyi adatok</span><b>{projects.length} projekt · {chats.length} chat · {topics.length} téma</b><small>Ezeket nem törlöm. Az első felhőszinkron előtt helyi biztonsági másolat marad.</small></div>
      <div className="composerBtns"><button className="soft" onClick={()=>void refreshCloudStatus()}>↻ Ellenőrzés</button><button className="primary" onClick={()=>setShowCloud(false)}>Rendben</button></div>
   </section></div>}

   {showImport&&<div className="overlay" onClick={()=>setShowImport(false)}><section className="composer importModal" onClick={e=>e.stopPropagation()}>
      <div className="bigIco">⇩</div><h2>ChatGPT előzmények importja</h2>
      <p>A ChatGPT adatexport ZIP-jéből válaszd ki a <b>conversations.json</b> fájlt. Első alkalommal felépíti a katalógust, később pedig <b>inkrementálisan frissít</b>: az új és módosult chateket beolvassa, a már kézzel kialakított projekt-, téma- és archív besorolást megtartja.</p>
      <div className="privacyBox"><b>Helyben dolgozik</b><span>A fájlt ez a verzió nem tölti fel szerverre; a feldolgozás és mentés a böngésződben történik.</span></div>
      {importLogs.length>0&&<div className="importHistory"><div className="historyHead"><b>Korábbi importok</b><span>utolsó {Math.min(importLogs.length,5)}</span></div>{importLogs.slice(0,5).map(l=><div className="historyRow" key={l.id}><div><strong>{niceDate(l.date)}</strong><span>{l.fileName}</span></div><div><b>+{l.added}</b><span>{l.updated} frissült · {l.unchanged} változatlan</span></div></div>)}</div>}
      <input ref={fileRef} className="fileInput" type="file" accept=".json,application/json" onChange={importFile}/>
      <div className="backupStrip"><div><b>ChatHub biztonsági mentés</b><span>Projektjeid, témáid és rendezésed külön JSON-fájlba menthető.</span></div><div><button className="soft" onClick={exportBackup}>⇩ Mentés</button><button className="soft" onClick={()=>backupRef.current?.click()}>⇧ Visszaállítás</button></div></div>
      <input ref={backupRef} className="fileInput" type="file" accept=".json,application/json" onChange={importBackup}/>
      <div className="composerBtns"><button className="soft" onClick={()=>setShowImport(false)}>Mégse</button><button className="primary" onClick={()=>fileRef.current?.click()}>{importLogs.length?'ChatGPT export frissítése':'ChatGPT fájl kiválasztása'}</button></div>
   </section></div>}

   {toast&&<div className="toast">{toast}</div>}
 </main>
}

function Head({title,sub}:{title:string,sub:string}){return <div className="head"><div><h2>{title}</h2><p>{sub}</p></div><button>Összes ›</button></div>}
function Stat({icon,n,label,c}:{icon:string,n:number,label:string,c:string}){return <article className={'stat '+c}><i>{icon}</i><div><b>{n}</b><span>{label}</span></div></article>}

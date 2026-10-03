'use client';

import {ChangeEvent,useEffect,useMemo,useRef,useState} from 'react';

type Accent='cyan'|'violet'|'pink'|'orange'|'green'|'blue';
type Project={
  id:string;name:string;category:string;chats:number;accent:Accent;
  status:'Aktív'|'Fejlesztés'|'Rendezendő'|'Parkoló';
  summary:string;next:string;last:string;tags:string[];favorite?:boolean;
};
type ChatItem={
  id:string;title:string;preview:string;updated:string;source:'import'|'manual';
  assignedProjectId?:string;projectRef?:string|null;
};

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

function textFromConversation(c:any){
  try{
    const nodes=Object.values(c?.mapping||{}) as any[];
    for(const node of nodes.reverse()){
      const m=node?.message;
      if(m?.author?.role!=='user') continue;
      const parts=m?.content?.parts;
      if(Array.isArray(parts)){
        const s=parts.filter((x:any)=>typeof x==='string').join(' ').replace(/\s+/g,' ').trim();
        if(s) return s.slice(0,220);
      }
    }
  }catch{}
  return '';
}
function niceDate(v:any){
  const n=typeof v==='number'?v*1000:Date.parse(v);
  if(!n||Number.isNaN(n))return '—';
  return new Intl.DateTimeFormat('hu-HU',{year:'numeric',month:'short',day:'numeric'}).format(new Date(n));
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
 const [query,setQuery]=useState('');
 const [filter,setFilter]=useState<'Összes'|'Aktív'|'Kedvenc'|'Legutóbbi'>('Összes');
 const [selected,setSelected]=useState<Project|null>(null);
 const [composer,setComposer]=useState<'project'|'chat'|null>(null);
 const [name,setName]=useState('');
 const [toast,setToast]=useState('');
 const [showImport,setShowImport]=useState(false);
 const [showChats,setShowChats]=useState(false);
 const [importSummary,setImportSummary]=useState<{total:number;assigned:number}|null>(null);
 const fileRef=useRef<HTMLInputElement>(null);

 useEffect(()=>{
   const p=localStorage.getItem('chathub-projects-v2');
   const c=localStorage.getItem('chathub-chats-v2');
   if(p){try{setProjects(JSON.parse(p))}catch{}}
   if(c){try{setChats(JSON.parse(c))}catch{}}
 },[]);
 useEffect(()=>{localStorage.setItem('chathub-projects-v2',JSON.stringify(projects))},[projects]);
 useEffect(()=>{localStorage.setItem('chathub-chats-v2',JSON.stringify(chats))},[chats]);

 const visible=useMemo(()=>projects.filter(p=>{
   const text=(p.name+' '+p.category+' '+p.summary+' '+p.tags.join(' ')).toLowerCase();
   if(!text.includes(query.toLowerCase()))return false;
   if(filter==='Aktív')return p.status==='Aktív'||p.status==='Fejlesztés';
   if(filter==='Kedvenc')return !!p.favorite;
   if(filter==='Legutóbbi')return p.last==='Ma'||p.last==='Tegnap';
   return true;
 }),[projects,query,filter]);

 const chatResults=useMemo(()=>chats.filter(c=>{
   const q=query.toLowerCase().trim();
   return !q||(c.title+' '+c.preview).toLowerCase().includes(q);
 }).sort((a,b)=>b.updated.localeCompare(a.updated)),[chats,query]);

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
 function remove(id:string){
   if(!confirm('Biztosan törlöd ezt a projektet a katalógusból?'))return;
   setProjects(x=>x.filter(p=>p.id!==id));setChats(x=>x.map(c=>c.assignedProjectId===id?{...c,assignedProjectId:undefined}:c));setSelected(null);flash('Projekt törölve');
 }
 async function importFile(e:ChangeEvent<HTMLInputElement>){
   const file=e.target.files?.[0]; if(!file)return;
   try{
     const raw=JSON.parse(await file.text());
     const list=Array.isArray(raw)?raw:Array.isArray(raw?.conversations)?raw.conversations:null;
     if(!list)throw new Error('Nem conversations.json');
     const parsed:ChatItem[]=list.map((c:any,i:number)=>{
       const title=(c?.title||'Névtelen beszélgetés').toString();
       const preview=textFromConversation(c);
       const assignedProjectId=inferProject(title,preview,projects);
       return {
         id:(c?.id||c?.conversation_id||('import-'+i)).toString(),
         title,preview,updated:new Date((c?.update_time||c?.create_time||0)*1000||Date.now()).toISOString(),
         source:'import' as const,assignedProjectId,projectRef:c?.project_id||null
       };
     });
     const unique=new Map<string,ChatItem>();
     for(const c of [...chats,...parsed])unique.set(c.id,c);
     const next=[...unique.values()];
     setChats(next);
     const counts=new Map<string,number>();
     parsed.forEach(c=>{if(c.assignedProjectId)counts.set(c.assignedProjectId,(counts.get(c.assignedProjectId)||0)+1)});
     setProjects(ps=>ps.map(p=>counts.has(p.id)?{...p,chats:Math.max(p.chats,counts.get(p.id)||0)}:p));
     const assigned=parsed.filter(c=>c.assignedProjectId).length;
     setImportSummary({total:parsed.length,assigned});
     setShowImport(false);setShowChats(true);
     flash(parsed.length+' chat importálva');
   }catch{
     alert('Ezt a fájlt nem tudtam conversations.json-ként beolvasni.');
   }finally{
     if(fileRef.current)fileRef.current.value='';
   }
 }
 function assignChat(chatId:string,projectId:string){
   setChats(cs=>cs.map(c=>c.id===chatId?{...c,assignedProjectId:projectId||undefined}:c));
 }
 const selectedChats=selected?chats.filter(c=>c.assignedProjectId===selected.id):[];

 return <main className="shell">
   <div className="aurora a1"/><div className="aurora a2"/><div className="grid"/>

   <header className="top">
     <div className="brand"><img src="/icon.svg" alt="ChatHub"/><b>Chat<span>Hub</span></b></div>
     <nav>
       <button className={!showChats?'on':''} onClick={()=>setShowChats(false)}>⌂ Kezdőlap</button>
       <button onClick={()=>setShowChats(false)}>Projektek</button>
       <button className={showChats?'on':''} onClick={()=>setShowChats(true)}>Chatek</button>
       <button onClick={()=>setShowImport(true)}>Import</button>
       <button>Rendetlenség</button>
     </nav>
     <div className="tools"><button>◌</button><button>⚙</button><i/></div>
   </header>

   {!showChats ? <>
   <section className="hero">
     <div><small>✦ PROJEKT RENDSZEREZŐ</small><h1>Jó munkát ma is!</h1><p>Minden projekted és ChatGPT beszélgetésed egy helyen.</p></div>
     <div className="heroBtns"><button className="primary" onClick={()=>setComposer('project')}>＋ Új projekt</button><button className="soft" onClick={()=>setShowImport(true)}>⇩ ChatGPT import</button></div>
   </section>

   <section className="search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Keresés projektekben, beszélgetésekben, jegyzetekben..."/><kbd>⌘ K</kbd></section>
   <div className="tags">{['matematika','Illéssy','OAuth','túrógombóc','401 hiba','PhD','recept','MOTA'].map(x=><button key={x} onClick={()=>setQuery(x)}>{x}</button>)}</div>

   <section className="stats">
     <Stat icon="▱" n={projects.length} label="Projekt" c="blue"/>
     <Stat icon="•••" n={chats.length||projects.reduce((a,p)=>a+p.chats,0)} label="Chat" c="cyan"/>
     <Stat icon="≋" n={projects.filter(p=>p.last==='Ma').length} label="Aktív ma" c="green"/>
     <Stat icon="★" n={projects.filter(p=>p.favorite).length} label="Kedvenc" c="orange"/>
   </section>

   {importSummary&&<section className="importBanner"><div><small>LEGUTÓBBI IMPORT</small><b>{importSummary.total} beszélgetés</b><span>{importSummary.assigned} automatikusan projekthez rendelve · {importSummary.total-importSummary.assigned} még rendezetlen</span></div><button onClick={()=>setShowChats(true)}>Chatek rendezése →</button></section>}

   <Head title="Aktív projektek" sub="A legfontosabb munkáid most"/>
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

   <section className="messy"><i>✦</i><div><small>RENDETLENSÉG-FIGYELŐ</small><h3>{chats.filter(c=>!c.assignedProjectId).length||13} rendezetlen beszélgetés vár besorolásra</h3><p>A rendszer cím és tartalom alapján javaslatot ad a projekthez.</p></div><button onClick={()=>setShowChats(true)}>Megnézem</button></section>
   </> : <>
    <section className="hero compactHero">
      <div><small>✦ BESZÉLGETÉSKATALÓGUS</small><h1>Chatek</h1><p>{chats.length?chats.length+' importált vagy rögzített beszélgetés':'Még nincs importált beszélgetés.'}</p></div>
      <div className="heroBtns"><button className="primary" onClick={()=>setShowImport(true)}>⇩ Import</button><button className="soft" onClick={()=>{setSelected(null);setComposer('chat')}}>＋ Új chat</button></div>
    </section>
    <section className="search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Keresés a beszélgetések között..."/><kbd>{chatResults.length}</kbd></section>
    <section className="chatList">
      {chatResults.length===0?<div className="emptyState"><div>⇩</div><h3>Importáld a ChatGPT előzményeidet</h3><p>A ChatGPT adatexportból a <b>conversations.json</b> fájlt válaszd ki. A feldolgozás a böngésződben történik.</p><button className="primary" onClick={()=>setShowImport(true)}>Import indítása</button></div>:
      chatResults.map(c=>{
        const p=projects.find(p=>p.id===c.assignedProjectId);
        return <article className="chatRow" key={c.id}>
          <div className={'chatDot '+(p?.accent||'blue')}>•••</div>
          <div className="chatCopy"><h3>{c.title}</h3><p>{c.preview||'Nincs rövid előnézet.'}</p><small>{niceDate(c.updated)} · {c.source==='import'?'ChatGPT export':'Kézi'}</small></div>
          <select value={c.assignedProjectId||''} onChange={e=>assignChat(c.id,e.target.value)}>
            <option value="">Rendezetlen</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </article>
      })}
    </section>
   </>}

   <div className="dock"><button className={!showChats?'on':''} onClick={()=>setShowChats(false)}>⌂<small>Kezdőlap</small></button><button onClick={()=>setShowChats(false)}>▱<small>Projektek</small></button><button className="plus" onClick={()=>setComposer('project')}>＋</button><button className={showChats?'on':''} onClick={()=>setShowChats(true)}>□<small>Chatek</small></button><button onClick={()=>setShowImport(true)}>⇩<small>Import</small></button></div>

   {selected&&<div className="overlay" onClick={()=>setSelected(null)}><section className="sheet" onClick={e=>e.stopPropagation()}>
      <button className="x" onClick={()=>setSelected(null)}>×</button>
      <div className={'sheetHero '+selected.accent}><small>{selected.category}</small><h2>{selected.name}</h2><p>{selected.summary}</p></div>
      <div className="sheetBtns"><button className="primary" onClick={()=>setComposer('chat')}>＋ Új chat</button><button className="soft" onClick={()=>setProjects(xs=>xs.map(p=>p.id===selected.id?{...p,favorite:!p.favorite}:p))}>{selected.favorite?'★ Kedvenc':'☆ Kedvencekhez'}</button></div>
      <div className="info"><div><span>Importált / hozzárendelt chatek</span><b>{selectedChats.length}</b></div><div><span>Állapot</span><b>{selected.status}</b></div><div><span>Következő</span><b>{selected.next}</b></div></div>
      {selectedChats.slice(0,4).map(c=><div className="miniChat" key={c.id}><b>{c.title}</b><span>{niceDate(c.updated)}</span></div>)}
      {selectedChats.length>4&&<button className="soft fullBtn" onClick={()=>{setQuery(selected.name.split(' ')[0]);setShowChats(true);setSelected(null)}}>Összes beszélgetés megnyitása</button>}
      <button className="delete" onClick={()=>remove(selected.id)}>⌫ Törlés a katalógusból</button>
   </section></div>}

   {composer&&<div className="overlay" onClick={()=>setComposer(null)}><section className="composer" onClick={e=>e.stopPropagation()}>
      <div className="bigIco">＋</div><h2>{composer==='project'?'Új projekt':'Új beszélgetés'}</h2>
      <p>{composer==='project'?'Adj nevet a projektnek. Később kategóriát, linkeket és beszélgetéseket rendelhetsz hozzá.':'Adj rövid címet a beszélgetésnek. Ha projektből indítottad, automatikusan oda kerül.'}</p>
      <input autoFocus value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')create()}} placeholder={composer==='project'?'Például: Matematika':'Például: Valószínűség feladatok'}/>
      <div className="composerBtns"><button className="soft" onClick={()=>setComposer(null)}>Mégse</button><button className="primary" onClick={create}>Létrehozás</button></div>
   </section></div>}

   {showImport&&<div className="overlay" onClick={()=>setShowImport(false)}><section className="composer importModal" onClick={e=>e.stopPropagation()}>
      <div className="bigIco">⇩</div><h2>ChatGPT előzmények importja</h2>
      <p>A ChatGPT adatexport ZIP-jéből válaszd ki a <b>conversations.json</b> fájlt. Az app beolvassa a beszélgetések címét, utolsó dátumát és egy rövid saját előnézetet, majd megpróbálja projektekhez sorolni őket.</p>
      <div className="privacyBox"><b>Helyben dolgozik</b><span>A fájlt ez a verzió nem tölti fel szerverre; a feldolgozás és mentés a böngésződben történik.</span></div>
      <input ref={fileRef} className="fileInput" type="file" accept=".json,application/json" onChange={importFile}/>
      <div className="composerBtns"><button className="soft" onClick={()=>setShowImport(false)}>Mégse</button><button className="primary" onClick={()=>fileRef.current?.click()}>Fájl kiválasztása</button></div>
   </section></div>}

   {toast&&<div className="toast">{toast}</div>}
 </main>
}

function Head({title,sub}:{title:string,sub:string}){return <div className="head"><div><h2>{title}</h2><p>{sub}</p></div><button>Összes ›</button></div>}
function Stat({icon,n,label,c}:{icon:string,n:number,label:string,c:string}){return <article className={'stat '+c}><i>{icon}</i><div><b>{n}</b><span>{label}</span></div></article>}

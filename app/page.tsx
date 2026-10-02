'use client';

import {useEffect,useMemo,useState} from 'react';

type Accent='cyan'|'violet'|'pink'|'orange'|'green'|'blue';
type Project={
  id:string;name:string;category:string;chats:number;accent:Accent;
  status:'Aktív'|'Fejlesztés'|'Rendezendő'|'Parkoló';
  summary:string;next:string;last:string;tags:string[];favorite?:boolean;
};

const starter:Project[]=[
{id:'ertesites',name:'Értesítési Központ',category:'APP FEJLESZTÉS',chats:16,accent:'blue',status:'Aktív',summary:'Gmail, Messenger, iMessage és naptárkapcsolatok.',next:'iMessage + sebesség',last:'Ma',tags:['Gmail','Messenger','Naptár'],favorite:true},
{id:'suly',name:'Súlynapló',category:'APP FEJLESZTÉS',chats:10,accent:'pink',status:'Aktív',summary:'Trendek, heti átlagok és személyes statisztikák.',next:'statisztikák bővítése',last:'Tegnap',tags:['PWA','Trend','Grafikon'],favorite:true},
{id:'recept',name:'ReceptRendelő',category:'GASZTRO',chats:14,accent:'orange',status:'Fejlesztés',summary:'Családi, saját és különleges receptek egy helyen.',next:'megosztási logika',last:'2 napja',tags:['Recept','AI','Gyűjtemény']},
{id:'mota',name:'MOTA-System',category:'MOTA',chats:28,accent:'violet',status:'Aktív',summary:'Tanulás, számonkérő, MOTA-English és PhD-vonal.',next:'új modul',last:'Ma',tags:['Oktatás','PhD','AI'],favorite:true},
{id:'matek',name:'Matematika',category:'OKTATÁS',chats:31,accent:'cyan',status:'Rendezendő',summary:'Több egymásra épülő matekos beszélgetés egy témakörben.',next:'13 hasonló chat rendezése',last:'3 napja',tags:['Feladatlap','Vizsga','Pénzügy']},
{id:'ff',name:'Szakdolgozat – FF Zrt.',category:'TANULMÁNY / PHD',chats:9,accent:'green',status:'Aktív',summary:'Pénzügyi audit, értelmezés és dolgozati fejezetek.',next:'3.8–3.9 összeállítása',last:'5 napja',tags:['Audit','Elemzés']}
];

const cats=[
['Oktatás','86 chat','Matematika · Vendéglátás · IKT','blue','⌘'],
['MOTA','74 chat','MOTA-System · Learning · English','violet','◉'],
['App fejlesztések','52 chat','Naptár · ReceptRendelő · Súlynapló','cyan','</>'],
['Gasztro','41 chat','Illéssy · Receptek · Receptgyűjtők','orange','♨'],
['Tanulmány / PhD','29 chat','Szakdolgozat · Kutatás · PhD terv','pink','◇'],
['Magán','22 chat','Autó · Vásárlás · Egyéb','green','⌂'],
['Ötletek','33 chat','Új appok · Később · Kísérletek','orange','✦'],
['Lezárt / parkoló','47 chat','Archivált · Lezárt · Régi','blue','□']
] as const;

export default function Home(){
 const [projects,setProjects]=useState<Project[]>(starter);
 const [query,setQuery]=useState('');
 const [filter,setFilter]=useState<'Összes'|'Aktív'|'Kedvenc'|'Legutóbbi'>('Összes');
 const [selected,setSelected]=useState<Project|null>(null);
 const [composer,setComposer]=useState<'project'|'chat'|null>(null);
 const [name,setName]=useState('');
 const [toast,setToast]=useState('');

 useEffect(()=>{
   const x=localStorage.getItem('chathub-projects-v1');
   if(x){try{setProjects(JSON.parse(x))}catch{}}
 },[]);
 useEffect(()=>{localStorage.setItem('chathub-projects-v1',JSON.stringify(projects))},[projects]);

 const visible=useMemo(()=>projects.filter(p=>{
   const text=(p.name+' '+p.category+' '+p.summary+' '+p.tags.join(' ')).toLowerCase();
   if(!text.includes(query.toLowerCase()))return false;
   if(filter==='Aktív')return p.status==='Aktív'||p.status==='Fejlesztés';
   if(filter==='Kedvenc')return !!p.favorite;
   if(filter==='Legutóbbi')return p.last==='Ma'||p.last==='Tegnap';
   return true;
 }),[projects,query,filter]);

 function flash(t:string){setToast(t);setTimeout(()=>setToast(''),1700)}
 function create(){
   const v=name.trim(); if(!v)return;
   if(composer==='project'){
     const p:Project={id:crypto.randomUUID(),name:v,category:'ÚJ PROJEKT',chats:0,accent:'cyan',status:'Aktív',summary:'Új projekt. A részletek később finomíthatók.',next:'első beszélgetés indítása',last:'Ma',tags:['Új']};
     setProjects(x=>[p,...x]);flash('Projekt létrehozva');
   }else{
     flash('Új chat előkészítve: '+v);
     if(selected)setProjects(xs=>xs.map(p=>p.id===selected.id?{...p,chats:p.chats+1,last:'Ma'}:p));
   }
   setName('');setComposer(null);
 }
 function remove(id:string){
   if(!confirm('Biztosan törlöd ezt a projektet a katalógusból?'))return;
   setProjects(x=>x.filter(p=>p.id!==id));setSelected(null);flash('Projekt törölve');
 }

 return <main className="shell">
   <div className="aurora a1"/><div className="aurora a2"/><div className="grid"/>

   <header className="top">
     <div className="brand"><img src="/icon.svg" alt="ChatHub"/><b>Chat<span>Hub</span></b></div>
     <nav><button className="on">⌂ Kezdőlap</button><button>Projektek</button><button>Chatek</button><button>Naptár</button><button>Rendetlenség</button></nav>
     <div className="tools"><button>◌</button><button>⚙</button><i/></div>
   </header>

   <section className="hero">
     <div><small>✦ PROJEKT RENDSZEREZŐ</small><h1>Jó munkát ma is!</h1><p>Minden projekted és ChatGPT beszélgetésed egy helyen.</p></div>
     <div className="heroBtns"><button className="primary" onClick={()=>setComposer('project')}>＋ Új projekt</button><button className="soft" onClick={()=>setComposer('chat')}>＋ Új chat</button></div>
   </section>

   <section className="search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Keresés projektekben, beszélgetésekben, jegyzetekben..."/><kbd>⌘ K</kbd></section>
   <div className="tags">{['matematika','Illéssy','OAuth','túrógombóc','401 hiba','PhD','recept','MOTA'].map(x=><button key={x} onClick={()=>setQuery(x)}>{x}</button>)}</div>

   <section className="stats">
     <Stat icon="▱" n={projects.length} label="Projekt" c="blue"/>
     <Stat icon="•••" n={projects.reduce((a,p)=>a+p.chats,0)} label="Chat" c="cyan"/>
     <Stat icon="≋" n={projects.filter(p=>p.last==='Ma').length} label="Aktív ma" c="green"/>
     <Stat icon="★" n={projects.filter(p=>p.favorite).length} label="Kedvenc" c="orange"/>
   </section>

   <Head title="Aktív projektek" sub="A legfontosabb munkáid most"/>
   <div className="filters">{(['Összes','Aktív','Kedvenc','Legutóbbi'] as const).map(x=><button key={x} className={filter===x?'on':''} onClick={()=>setFilter(x)}>{x}</button>)}</div>

   <section className="cards">
    {visible.map(p=><article key={p.id} className={'card '+p.accent} onClick={()=>setSelected(p)}>
      <div className="glow"/><div className="ico">▱</div><button className="dots">•••</button>
      <div className="cardTitle"><div><h3>{p.name}</h3><em/> <small>{p.status}</small></div><span>{p.last}</span></div>
      <p>{p.summary}</p><div className="badges">{p.tags.map(t=><b key={t}>{t}</b>)}</div>
      <div className="next">Következő: <strong>{p.next}</strong></div>
    </article>)}
   </section>

   <Head title="Projekt kategóriák" sub="A teljes munkaterület tematikusan"/>
   <section className="catGrid">{cats.map(c=><article className={'cat '+c[3]} key={c[0]}>
      <div className="catTop"><i>{c[4]}</i><div><h3>{c[0]}</h3><p>{c[1]}</p></div><span>›</span></div>
      <div className="catText">{c[2]}</div>
   </article>)}</section>

   <section className="messy"><i>✦</i><div><small>RENDETLENSÉG-FIGYELŐ</small><h3>13 kapcsolódó matekos beszélgetést találtam</h3><p>Ezek közül több valószínűleg ugyanannak a munkának a folytatása.</p></div><button onClick={()=>setQuery('matematika')}>Megnézem</button></section>

   <div className="dock"><button className="on">⌂<small>Kezdőlap</small></button><button>▱<small>Projektek</small></button><button className="plus" onClick={()=>setComposer('project')}>＋</button><button>□<small>Chatek</small></button><button>•••<small>További</small></button></div>

   {selected&&<div className="overlay" onClick={()=>setSelected(null)}><section className="sheet" onClick={e=>e.stopPropagation()}>
      <button className="x" onClick={()=>setSelected(null)}>×</button>
      <div className={'sheetHero '+selected.accent}><small>{selected.category}</small><h2>{selected.name}</h2><p>{selected.summary}</p></div>
      <div className="sheetBtns"><button className="primary" onClick={()=>{setComposer('chat');flash('Új chat ehhez a projekthez')}}>＋ Új chat</button><button className="soft" onClick={()=>setProjects(xs=>xs.map(p=>p.id===selected.id?{...p,favorite:!p.favorite}:p))}>{selected.favorite?'★ Kedvenc':'☆ Kedvencekhez'}</button></div>
      <div className="info"><div><span>Beszélgetések</span><b>{selected.chats}</b></div><div><span>Állapot</span><b>{selected.status}</b></div><div><span>Következő</span><b>{selected.next}</b></div></div>
      <button className="delete" onClick={()=>remove(selected.id)}>⌫ Törlés a katalógusból</button>
   </section></div>}

   {composer&&<div className="overlay" onClick={()=>setComposer(null)}><section className="composer" onClick={e=>e.stopPropagation()}>
      <div className="bigIco">＋</div><h2>{composer==='project'?'Új projekt':'Új beszélgetés'}</h2>
      <p>{composer==='project'?'Adj nevet a projektnek. Később kategóriát, linkeket és beszélgetéseket rendelhetsz hozzá.':'Adj rövid címet a beszélgetésnek.'}</p>
      <input autoFocus value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')create()}} placeholder={composer==='project'?'Például: Matematika':'Például: Valószínűség feladatok'}/>
      <div className="composerBtns"><button className="soft" onClick={()=>setComposer(null)}>Mégse</button><button className="primary" onClick={create}>Létrehozás</button></div>
   </section></div>}

   {toast&&<div className="toast">{toast}</div>}
 </main>
}

function Head({title,sub}:{title:string,sub:string}){return <div className="head"><div><h2>{title}</h2><p>{sub}</p></div><button>Összes ›</button></div>}
function Stat({icon,n,label,c}:{icon:string,n:number,label:string,c:string}){return <article className={'stat '+c}><i>{icon}</i><div><b>{n}</b><span>{label}</span></div></article>}

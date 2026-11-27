// Local, provenance-preserving coherence experiment. No text generation.
function tokens(s){return String(s).normalize("NFKC").toLowerCase().match(/[\p{L}\p{N}]+/gu)||[]}

function corpusIndex(documents,lang="en"){
  const seg=new Intl.Segmenter(lang,{granularity:"sentence"});
  const rows=[], postings=new Map(), seen=new Set();
  for(const doc of documents){
    if(!doc.id||seen.has(doc.id))throw Error("Corpus work IDs must be unique");
    seen.add(doc.id);
    let body=String(doc.text);
    const header=body.match(/^\s*\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK.*\*\*\*.*$/mi);
    if(header)body=body.slice(header.index+header[0].length);
    const footer=body.match(/^\s*\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK.*\*\*\*.*$/mi);
    if(footer)body=body.slice(0,footer.index);
    const sentences=Array.from(seg.segment(body),x=>x.segment.trim()).filter(Boolean);
    for(let i=0;i<sentences.length-1;i++){
      const a=sentences[i], b=sentences[i+1], words=tokens(a);
      if(!words.length||tokens(b).length<4||!/[.!?…][”"'’)]?$/.test(b))continue;
      const row={work:doc.id,title:doc.title||doc.id,url:doc.url||null,position:i,matched:a,text:b,words};
      const idx=rows.push(row)-1;
      for(const w of new Set(words)){if(!postings.has(w))postings.set(w,[]);postings.get(w).push(idx)}
    }
  }
  return {rows,postings,works:seen.size}
}

function candidates(index,previous,used,{minWords=3,limit=64,scanLimit=20000}={}){
  const query=tokens(previous), hits=[];
  if(query.length<minWords)return {hits,truncated:false};
  const posting=index.postings.get(query.at(-1))||[];
  let scanned=0;
  for(const id of posting){
    if(scanned++>=scanLimit)break;
    const row=index.rows[id];
    if(used.has(row.work)||row.words.length<minWords)continue;
    let best=0;
    for(let p=0;p<row.words.length;p++){
      if(row.words[p]!==query.at(-1))continue;
      let k=1;
      while(k<query.length&&k<=p&&row.words[p-k]===query[query.length-1-k])k++;
      best=Math.max(best,k);
    }
    if(best>=minWords)hits.push({...row,matchWords:best,queryWords:query.length,phrase:query.slice(-best).join(" ")});
  }
  hits.sort((a,b)=>b.matchWords-a.matchWords);
  return {hits:hits.slice(0,limit),truncated:posting.length>scanLimit||hits.length>limit};
}

function coherenceScore(path,candidate,goal=""){
  const stop=new Set("a an the of in to and or for with on by from as is are was were be been being that this it at not but have has had i he she they we you my his her their its our".split(" "));
  const content=s=>new Set(tokens(s).filter(w=>w.length>2&&!stop.has(w)));
  const similarity=(a,b)=>{let n=0;for(const x of a)if(b.has(x))n++;return n/Math.sqrt(Math.max(1,a.size*b.size))};
  const next=content(candidate.text), prev=content(path.at(-1).text), context=content(path.slice(-4).map(x=>x.text).join(" "));
  const topic=content(goal);
  const repeated=path.some(x=>tokens(x.text).join(" ")===tokens(candidate.text).join(" "));
  if(repeated)return -Infinity;
  const pronoun=/^(he|she|they|it|his|her|their|its|these|those|this|that)\b/i.test(candidate.text);
  return 1.4*similarity(next,prev)+0.8*similarity(next,context)+0.9*similarity(next,topic)+0.35*(candidate.matchWords/candidate.queryWords)-(pronoun?0.18:0);
}

async function compose(index,{seed,seedWork=null,length=8,width=6,minWords=3,goal="",mode="beam",signal,onDepth=()=>{},yieldStep=()=>Promise.resolve()}={}){
  if(!String(seed||"").trim())throw Error("A seed sentence is required");
  length=Math.min(30,Math.max(2,Math.floor(Number(length)||8)));
  width=Math.min(16,Math.max(1,Math.floor(Number(width)||6)));
  minWords=Math.min(20,Math.max(1,Math.floor(Number(minWords)||3)));
  const start={path:[{text:String(seed).trim(),work:seedWork}],used:new Set(seedWork?[seedWork]:[]),score:0};
  let beam=[start], best=start, truncated=false, expanded=0;
  for(let depth=1;depth<length;depth++){
    if(signal?.aborted)break;
    const next=[];
    for(const node of beam){
      const batch=candidates(index,node.path.at(-1).text,node.used,{minWords});
      truncated ||= batch.truncated;
      for(const candidate of batch.hits){
        const score=coherenceScore(node.path,candidate,goal);
        if(!Number.isFinite(score))continue;
        expanded++;
        next.push({path:[...node.path,candidate],used:new Set([...node.used,candidate.work]),score:node.score+score});
        if(mode==="baseline")break;
      }
    }
    if(!next.length)break;
    if(mode!=="baseline")next.sort((a,b)=>b.score-a.score);
    beam=next.slice(0,mode==="beam"?width:1);
    best=beam[0];
    onDepth({depth:best.path.length,target:length,expanded,truncated});
    await yieldStep();
  }
  return {sentences:best.path,score:best.score,reason:signal?.aborted?"stopped":best.path.length===length?"complete":"exhausted",expanded,truncated};
}

export { tokens, corpusIndex, candidates, coherenceScore, compose };

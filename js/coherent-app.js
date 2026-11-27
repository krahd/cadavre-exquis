import { corpusIndex, compose } from "./coherent.js";
const $=id=>document.getElementById(id);
let controller=null, evidence=null;
const yieldStep=()=>new Promise(resolve=>setTimeout(resolve,0));
$("corpus").addEventListener("change",()=>{
  $("seedWork").replaceChildren(new Option("External or user-written seed",""));
  Array.from($("corpus").files).forEach((f,i)=>$("seedWork").add(new Option(f.name,String(i))));
});
$("stop").addEventListener("click",()=>controller?.abort());
$("experiment").addEventListener("submit",async e=>{
  e.preventDefault();
  if(controller)return;
  const files=Array.from($("corpus").files);
  if(files.length<2){$("status").textContent="Select at least two distinct works.";return}
  if(files.reduce((n,f)=>n+f.size,0)>50*1024*1024){$("status").textContent="Corpus exceeds 50 MB.";return}
  const seed=$("seed").value.trim();
  if(!seed){$("status").textContent="Enter a starting sentence.";return}
  const seedWork=$("seedWork").value||null,language=$("language").value;
  const options={seed,seedWork,length:Number($("length").value),width:Number($("width").value),minWords:Number($("minimum").value),goal:$("goal").value.trim()};
  controller=new AbortController();evidence=null;$("download").disabled=true;
  $("run").disabled=true;$("stop").disabled=false;$("results").replaceChildren();
  const inputs=Array.from($("experiment").querySelectorAll("input,textarea,select"));
  inputs.forEach(el=>el.disabled=true);
  try{
    $("status").textContent="Reading and indexing corpus…";await yieldStep();
    const docs=[];
    for(const [i,f] of files.entries()){
      if(controller.signal.aborted)break;
      const bytes=await f.arrayBuffer();
      const sha256=globalThis.crypto?.subtle?Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),b=>b.toString(16).padStart(2,"0")).join(""):null;
      if(sha256&&docs.some(d=>d.sha256===sha256))throw Error("Duplicate file content: "+f.name);
      docs.push({id:String(i),title:f.name,text:new TextDecoder("utf-8",{fatal:true}).decode(bytes),sha256});
    }
    if(controller.signal.aborted){$("status").textContent="Stopped.";return}
    const index=corpusIndex(docs,language);
    if(!index.rows.length)throw Error("No qualifying sentence pairs found.");
    evidence={schema:1,language,options,corpus:docs.map(({id,title,sha256})=>({id,title,sha256})),pairs:index.rows.length,runs:[]};
    for(const [mode,label] of [["baseline","First match"],["greedy","Coherence-ranked greedy"],["beam","Coherence beam search"]]){
      if(controller.signal.aborted)break;
      $("status").textContent=label+" — searching "+index.rows.length+" sentence pairs";
      const result=await compose(index,{...options,mode,signal:controller.signal,yieldStep,onDepth:p=>{$("status").textContent=label+": "+p.depth+"/"+p.target+" sentences; "+p.expanded+" expansions";}});
      evidence.runs.push({mode,...result});render(label,result);
    }
    $("download").disabled=!evidence.runs.length;
    $("status").textContent=controller.signal.aborted?"Stopped — partial results retained.":"Comparison complete. Inspect the passages and their provenance.";
  }catch(err){$("status").textContent=err.message||String(err)}
  finally{controller=null;$("run").disabled=false;$("stop").disabled=true;inputs.forEach(el=>el.disabled=false)}
});
function render(label,result){
  const article=document.createElement("article");
  const heading=document.createElement("h2");heading.textContent=label;article.append(heading);
  const meta=document.createElement("small");meta.textContent=result.reason+" · "+result.sentences.length+" sentences · "+result.expanded+" expansions · "+(result.truncated?"candidate limits reached":"no candidate limits reached");article.append(meta);
  const text=document.createElement("p");text.className="passage-text";text.textContent=result.sentences.map(x=>x.text).join(" ");article.append(text);
  for(const [i,s] of result.sentences.entries()){
    if(i===0)continue;
    const details=document.createElement("details"),summary=document.createElement("summary"),p=document.createElement("p");
    summary.textContent=(i+1)+". "+s.title+" · "+s.matchWords+"/"+s.queryWords+" words matched";
    p.textContent="Predecessor (sentence "+(s.position+1)+"): "+s.matched+"\nSuccessor: "+s.text;p.style.whiteSpace="pre-wrap";
    details.append(summary,p);article.append(details);
  }
  $("results").append(article);
}
$("download").addEventListener("click",()=>{
  if(!evidence)return;
  const u=URL.createObjectURL(new Blob([JSON.stringify(evidence,null,2)],{type:"application/json"}));
  const a=document.createElement("a");a.href=u;a.download="cadavre-coherence-experiment.json";a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
});

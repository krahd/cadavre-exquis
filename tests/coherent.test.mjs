import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
// The original static app has no package.json; import the ES module without changing its runtime.
const source=await readFile(new URL("../js/coherent.js",import.meta.url),"utf8");
const {corpusIndex,candidates,compose}=await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));
const docs=[
{id:"A",text:"The river flows towards the sea. The ocean is a vast body of water."},
{id:"B",text:"The river flows towards the sea. The river carries sediment towards the coast."},
{id:"C",text:"The river carries sediment towards the coast. The coast changes through the movement of sediment."},
{id:"D",text:"The coast changes through the movement of sediment. These changes shape the coastal landscape."}
];
const index=corpusIndex(docs),seed="The river flows towards the sea.";
const baseline=await compose(index,{seed,length:4,mode:"baseline"});
const beam=await compose(index,{seed,length:4,mode:"beam"});
assert.equal(baseline.sentences.length,2);
assert.equal(beam.sentences.length,4);
assert.equal(beam.reason,"complete");
assert.equal(new Set(beam.sentences.slice(1).map(s=>s.work)).size,3);
for(const s of beam.sentences.slice(1))assert.ok(docs.find(d=>d.id===s.work).text.includes(s.text));
assert.equal(candidates(index,seed,new Set(["A","B"])).hits.length,0);
assert.equal((await compose(index,{seed,signal:{aborted:true}})).reason,"stopped");
assert.equal(candidates(index,"Completely unrelated.",new Set()).hits.length,0);
assert.equal(candidates(index,seed,new Set(),{limit:1}).truncated,true);
console.log("Coherence search synthetic regression passed.");

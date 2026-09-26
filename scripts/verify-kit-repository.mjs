#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
const root=path.resolve(path.dirname(new URL(import.meta.url).pathname),"..");let failures=0;
const required=["README.md","GETTING_STARTED.md","UPGRADE_GUIDE.md","VERSION","LICENSE","NOTICE.md","PUBLIC_SOURCE.json","CONTRIBUTING.md","SECURITY.md","models/catalog.json","scripts/init-project.mjs","scripts/upgrade-project.mjs"];
for(const item of required){if(fs.existsSync(path.join(root,item)))console.log(`[OK] ${item}`);else{console.log(`[FAIL] ${item}`);failures+=1}}
for(const blocked of ["docs/WORK","docs/agent_sessions","docs/history"]){if(fs.existsSync(path.join(root,blocked))){console.log(`[FAIL] private path present: ${blocked}`);failures+=1}}
function walk(dir,result=[]){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p,result);else if(e.isFile()&&p.endsWith(".mjs"))result.push(p)}return result}
for(const file of walk(path.join(root,"scripts"))){const r=spawnSync(process.execPath,["--check",file],{encoding:"utf8"});if(r.status!==0){console.log(`[FAIL] syntax: ${path.relative(root,file)}`);failures+=1}}
if(failures)process.exit(1);console.log("Public kit repository verification completed.");

/* Zet de webapp klaar voor de iOS-app: kopieert wat index.html laadt naar www/ (Capacitor neemt die map mee in de app).
   De webversie zelf heeft geen build-stap; dit is alleen voor de app. */
import {cpSync,rmSync,mkdirSync,existsSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..','..'),out=join(root,'www');
rmSync(out,{recursive:true,force:true});mkdirSync(out);
const skip=new Set(['col.js','polder.js','heuvel.js','.DS_Store']);
for(const p of ['index.html','manifest.webmanifest','css','js','icons','models']){
  if(!existsSync(join(root,p)))throw new Error('ontbreekt: '+p);
  cpSync(join(root,p),join(out,p),{recursive:true,filter:s=>!skip.has(s.split(/[\\/]/).pop())});
}
console.log('www/ klaar');

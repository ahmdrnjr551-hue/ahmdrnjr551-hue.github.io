import {describe,it,expect} from 'vitest';
import {storedZip,readStoredZip,crcBlob} from '../../apps/web/src/browser/zip';
describe('streamed local portable backup',()=>{
 it('produces standard CRC32',async()=>expect(await crcBlob(new Blob(['123456789']))).toBe(0xcbf43926));
 it('round trips Unicode project metadata and original bytes',async()=>{const p=new Blob(['{"name":"سلام"}']),source=new Blob([new Uint8Array([0,1,2,255])]);const zip=await storedZip([{name:'project.json',blob:p},{name:'media/source.mp4',blob:source}]);const read=await readStoredZip(zip);expect(await read[0].blob.text()).toBe(await p.text());expect(new Uint8Array(await read[1].blob.arrayBuffer())).toEqual(new Uint8Array([0,1,2,255]));});
 it('rejects path traversal/unknown names instead of extracting them',async()=>{await expect(storedZip([{name:'../.env',blob:new Blob(['bad'])}])).rejects.toThrow('Invalid');});
 it('rejects corrupted checksums without accepting partial source',async()=>{const zip=await storedZip([{name:'project.json',blob:new Blob(['hello'])}]);const bytes=new Uint8Array(await zip.arrayBuffer());bytes[43]^=1;await expect(readStoredZip(new Blob([bytes]))).rejects.toThrow('checksum');});
 it('rejects duplicate manifest files',async()=>{const zip=await storedZip([{name:'project.json',blob:new Blob(['a'])},{name:'project.json',blob:new Blob(['a'])}]);await expect(readStoredZip(zip)).rejects.toThrow('duplicate');});
 it('rejects truncated/non-ZIP data',async()=>{await expect(readStoredZip(new Blob(['abc']))).rejects.toThrow();const zip=await storedZip([{name:'project.json',blob:new Blob(['a'])}]);await expect(readStoredZip(zip.slice(0,zip.size-15))).rejects.toThrow();});
 it('refuses deflate/encryption instead of risking ZIP bombs',async()=>{const zip=await storedZip([{name:'project.json',blob:new Blob(['a'])}]);const b=new Uint8Array(await zip.arrayBuffer());const d=new DataView(b.buffer);for(let i=0;i<b.length-46;i++)if(d.getUint32(i,true)===0x02014b50){d.setUint16(i+10,8,true);break;}await expect(readStoredZip(new Blob([b]))).rejects.toThrow('uncompressed');});
 it('bounds file/entry counts',async()=>{await expect(storedZip(Array.from({length:50},(_,i)=>({name:'media/id'+i+'.mp4',blob:new Blob(['x'])})))).rejects.toThrow();});
});

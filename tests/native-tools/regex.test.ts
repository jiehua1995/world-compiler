import { afterEach,expect,it,vi } from 'vitest';
afterEach(()=>vi.unstubAllGlobals());
it('regex worker preserves native replacement syntax and bounds expansion',async()=>{
 const postMessage=vi.fn();const scope={postMessage,onmessage:undefined as unknown as (event:unknown)=>void};vi.stubGlobal('self',scope);await import('../../src/features/native-tools/regex.worker');
 scope.onmessage({data:{pattern:'(hello)',flags:'gi',input:'Hello hello',replacement:'$1!'}});expect(postMessage).toHaveBeenLastCalledWith(expect.objectContaining({replaced:'Hello! hello!',count:2}));
 scope.onmessage({data:{pattern:'a',flags:'g',input:'a'.repeat(10000),replacement:"$'"}});expect(postMessage).toHaveBeenLastCalledWith({error:true});
 scope.onmessage({data:{pattern:'[',flags:'g',input:'test',replacement:''}});expect(postMessage).toHaveBeenLastCalledWith({error:true});
});

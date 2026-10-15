self.onmessage = (event: MessageEvent<{pattern:string;flags:string;input:string;replacement:string}>) => {
 try {
  const {pattern,flags,input,replacement}=event.data;
  const regex=new RegExp(pattern,flags);
  const matches=[];let count=0;
  const scanner=new RegExp(pattern,flags.includes('g')?flags:flags+'g');
  for(const match of input.matchAll(scanner)){count++;if(matches.length<5000)matches.push({index:match.index,text:match[0],groups:match.slice(1)});}
  // Bound replacement expansion before native replace allocates the result.
  const replacementCount=flags.includes('g')?count:Math.min(1,count);
  const contextExpansion=/\$[`']/.test(replacement)?input.length*replacement.length:0;
  if(input.length+replacementCount*(replacement.length+contextExpansion)>5000000)throw Error('output size');
  self.postMessage({matches,replaced:input.replace(regex,replacement),limited:count>5000,count});
 } catch { self.postMessage({error:true}); }
};
export {};

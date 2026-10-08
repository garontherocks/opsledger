// Bounded requests; writes are never automatically retried.
export async function api<T>(path:string,options?:RequestInit,timeoutMs=15000):Promise<T>{
 const signal=options?.signal?AbortSignal.any([options.signal,AbortSignal.timeout(timeoutMs)]):AbortSignal.timeout(timeoutMs);
 let response:Response;
 try{response=await fetch(path,{...options,signal,headers:{...(options?.body!==undefined?{'content-type':'application/json'}:{}),...options?.headers}});}
 catch(error){if(options?.signal?.aborted)throw error;throw new Error('Connection interrupted. Refresh to check the result before submitting again.');}
 const data=await response.json().catch(()=>null);
 if(!response.ok){const reference=data?.error?.requestId;throw Object.assign(new Error((data?.error?.message??data?.message??'Service unavailable')+(reference?' · Reference '+reference:'')),{status:response.status});}
 if(data===null)throw new Error('Unexpected response. Refresh before submitting again.');
 return data as T;
}

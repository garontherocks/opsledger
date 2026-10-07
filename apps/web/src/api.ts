export async function api<T>(path:string,options?:RequestInit):Promise<T>{
 const response=await fetch(path,{...options,headers:{...(options?.body!==undefined?{'content-type':'application/json'}:{}),...options?.headers}});
 const data=await response.json();
 if(!response.ok)throw Object.assign(new Error(data.error?.message??data.message??'Request failed'),{status:response.status});
 return data as T;
}

export interface Identity {id:number; name:string; email:string; role:string; permissions:string[]; csrf:string}
export interface RecordRow {[key:string]:unknown;id:number}
export interface Page {rows:RecordRow[]; total:number;page:number;pageSize:number}
export class ApiError extends Error {constructor(message:string,public status:number){super(message)}}
let csrf='';
export function setCsrf(value:string){csrf=value;}
export async function api<T>(path:string,body?:unknown):Promise<T>{
 const abort=new AbortController();const timer=setTimeout(()=>abort.abort(),15000);
 try{
  const response=await fetch('/api/admin'+path,{method:body===undefined?'GET':'POST',credentials:'same-origin',headers:body===undefined?{}:{'Content-Type':'application/json','X-Clyvo-Csrf':csrf},body:body===undefined?undefined:JSON.stringify(body),signal:abort.signal});
  const result=await response.json().catch(()=>null);
  if(!response.ok)throw new ApiError(result?.error?.message??(response.status===404?'O painel administrativo ainda não foi habilitado neste servidor.':'Não foi possível concluir a solicitação.'),response.status);
  if(!result?.success)throw new ApiError('Resposta inválida do servidor.',502);
  return result.data;
 }catch(error){if(error instanceof ApiError)throw error;throw new ApiError('Não foi possível conectar. Verifique sua conexão e tente novamente.',0);}finally{clearTimeout(timer);}
}

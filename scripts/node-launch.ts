// --import is an ESM specifier, not a platform filesystem argument.
// Callers retain their fixed reviewed URL allowlists; this grants no launch authority.
export function nodeImportSpecifier(url:URL):string{
 if(url.protocol!=='file:'||url.username||url.password||url.search||url.hash)throw new Error('node_import_file_url_required');
 return url.href;
}
// Never publish arbitrary child stderr: keep only bounded diagnostic codes and
// recognized startup explanations. Paths, source lines and credentials stay private.
export function summarizeChildStderr(stderr:string):string{
 const tail=stderr.slice(-8000);
 const codes=[...new Set(tail.match(/\b(?:ERR_[A-Z0-9_]+|MCP_EGRESS_DENIED)\b/g)??[])].slice(0,8);
 const windows=tail.includes('absolute paths must be valid file:// URLs')?'; Windows absolute paths must be valid file:// URLs':'';
 return codes.length?codes.join(', ')+windows:stderr?'stderr captured; unrecognized content withheld':'no child stderr captured';
}

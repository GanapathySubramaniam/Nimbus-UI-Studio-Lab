/** Download a local text artifact without loading the React package exporter. */
export function download(content:string,name:string,type:string){
  const url=URL.createObjectURL(new Blob([content],{type}));
  const link=document.createElement('a');
  link.href=url;link.download=name;link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

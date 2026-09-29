<%@ WebHandler Language="C#" Class="RailVisits" %>
using System;
using System.IO;
using System.Globalization;
using System.Threading;
using System.Web;

public class RailVisits : IHttpHandler {
 public bool IsReusable { get { return true; } }
 public void ProcessRequest(HttpContext c) {
  c.Response.ContentType="application/json";
  c.Response.Cache.SetCacheability(HttpCacheability.NoCache);
  c.Response.Cache.SetNoStore();
  c.Response.Headers["X-Content-Type-Options"]="nosniff";
  if(c.Request.HttpMethod!="POST") { c.Response.StatusCode=405;c.Response.Headers["Allow"]="POST";c.Response.Write("{\"error\":\"method\"}");return; }
  Uri origin;
  string incoming=c.Request.Headers["Origin"];
  if(c.Request.Headers["Sec-Fetch-Site"]=="cross-site" || (!String.IsNullOrEmpty(incoming)&&(!Uri.TryCreate(incoming,UriKind.Absolute,out origin)||origin.Authority!=c.Request.Url.Authority))) { c.Response.StatusCode=403;c.Response.Write("{\"error\":\"origin\"}");return; }
  Guid id;
  if(!Guid.TryParse(c.Request.Form["event"],out id)) { c.Response.StatusCode=400;c.Response.Write("{\"error\":\"event\"}");return; }
  string dir=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),"ZhenxingRail","Statistics");
  string file=Path.Combine(dir,"visits.txt"),temp=null;
  try {
   // Persistent external directory survives replacing the deployed website folder.
   using(FileStream gate=Acquire(Path.Combine(dir,"visits.lock"))) {
    string[] lines=File.ReadAllLines(file);long total;
    if(lines.Length==0||!Int64.TryParse(lines[0],NumberStyles.None,CultureInfo.InvariantCulture,out total)||total<0||total>=9007199254740991L)throw new IOException("Invalid counter");
    string key=id.ToString("D");bool duplicate=Array.IndexOf(lines,key,1)>=1;
    if(!duplicate){
     total++;int keep=Math.Min(1023,lines.Length-1);string[] next=new string[keep+2];next[0]=total.ToString(CultureInfo.InvariantCulture);next[1]=key;Array.Copy(lines,1,next,2,keep);
     temp=Path.Combine(dir,Guid.NewGuid().ToString("N")+".tmp");
     File.WriteAllLines(temp,next);File.Replace(temp,file,Path.Combine(dir,"visits.backup.txt"));temp=null;
    }
    c.Response.Write("{\"count\":"+total.ToString(CultureInfo.InvariantCulture)+"}");
   }
  } catch { c.Response.StatusCode=503;c.Response.TrySkipIisCustomErrors=true;c.Response.Write("{\"error\":\"unavailable\"}"); }
  finally { if(temp!=null)try{File.Delete(temp);}catch{} }
 }
 static FileStream Acquire(string path) {
  for(int i=0;;i++){try{return new FileStream(path,FileMode.OpenOrCreate,FileAccess.ReadWrite,FileShare.None);}catch(IOException){if(i>=40)throw;Thread.Sleep(50);}}
 }
}

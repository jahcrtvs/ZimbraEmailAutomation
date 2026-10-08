(function(){
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const fmt=d=>MONTHS[d.getMonth()]+" "+d.getDate()+", "+d.getFullYear();
const dict={hibernate:"Hibernate",criteria:"Criteria",api:"API",hql:"HQL",jdbc:"JDBC",sql:"SQL",java:"Java",id:"ID",crud:"CRUD",office:"Office",spring:"Spring",postgresql:"PostgreSQL",vs:"vs."};
const verbs=/^(worked|fixed|continued|studied|implemented|investigating|reviewed|learned|wrote|created|updated|tested|finish|continue|start|review|write|refactor|refactored|attended|set up|added)\b/i;
function polish(line,kind){
  let s=line.trim().replace(/^[-•*]\s*/,"");if(!s)return null;
  s=s.replace(/^tomorrow\s+/i,"");
  s=s.replace(/criteria query/i,"criteria API queries").replace(/duplicate result\b/i,"duplicate query results");
  const rules=[[/^continue (.+)/i,"continue work on the $1"],[/^continued (.+)/i,"continued work on the $1"],[/^still having (an )?issues? with (.+)/i,"investigating an issue with the $2"],[/^finish (.+)/i,"finish the $1"]];
  for(const [re,rep] of rules){if(re.test(s)){s=s.replace(re,rep);break;}}
  if(!verbs.test(s))s=(kind==="topics"?"studied ":kind==="plans"?"continue work on ":"worked on ")+s;
  s=s.split(" ").map(w=>dict[w.toLowerCase()]||w).join(" ").replace(/API API/g,"API");
  s=s.charAt(0).toUpperCase()+s.slice(1);
  if(!/[.!?]$/.test(s))s+=".";
  return s;
}
const lines=(t,k)=>(t||"").split("\n").map(l=>polish(l,k)).filter(Boolean);
function buildVars(n,user,date){
  return {date:fmt(date),name:user.name,role:user.role,
    tasks:[...lines(n.work,"tasks"),...lines(n.progress,"progress").map(s=>s.startsWith("Investigating")||s.startsWith("Continued")?s:"Still working on: "+s.charAt(0).toLowerCase()+s.slice(1))],
    topics:lines(n.topics,"topics"),weekly_plans:lines(n.tomorrow,"plans"),tomorrow:lines(n.tomorrow,"plans"),blockers:lines(n.blockers,"tasks")};
}
function render(template,vars){
  const blocks=[];let cur=null;
  template.split("\n").forEach(raw=>{
    const l=raw.trim();if(!l||/^[─-]{3,}$/.test(l))return;
    const v=l.match(/^\{(\w+)\}$/);
    if(v&&Array.isArray(vars[v[1]])){if(cur)cur.items.push(...vars[v[1]]);return;}
    if(!/[{}]/.test(l)&&l===l.toUpperCase()&&/[A-Z]/.test(l)){cur={type:"section",title:l,items:[]};blocks.push(cur);return;}
    cur=null;blocks.push({type:"text",text:l.replace(/\{(\w+)\}/g,(m,k)=>Array.isArray(vars[k])?vars[k].join(", "):(vars[k]??m))});
  });
  return blocks.filter(b=>b.type!=="section"||b.items.length);
}
const template=`TASK TODAY

{tasks}

PLANS FOR THE WEEK

{weekly_plans}

TOPICS

{topics}

BLOCKERS

{blockers}

Regards,
{name}
{role}`;
const user={name:"Mark Justine Dela Cruz",first:"Mark",role:"CDP Trainee"};
const today=new Date(2026,9,8);
const sampleNotes={work:"worked on hibernate\ncriteria query\nfixed duplicate result\ncontinued office repository",topics:"criteria api projections\nhql vs criteria",progress:"still having issue with embedded id",blockers:"",tomorrow:"tomorrow continue repository\nfinish embedded id mapping"};
const emptyNotes={work:"",topics:"",progress:"",blockers:"",tomorrow:""};
const past=[
  {d:7,time:"5:02 PM",notes:{work:"set up hibernate.cfg.xml\nmapped employee entity\nwrote first hql query",topics:"sessionfactory lifecycle",progress:"",blockers:"",tomorrow:"criteria queries"}},
  {d:6,time:"4:59 PM",notes:{work:"finished jdbc exercises\nreviewed prepared statements",topics:"transactions and rollback",progress:"",blockers:"local postgresql port conflict",tomorrow:"start hibernate setup"}},
  {d:5,time:"5:04 PM",notes:{work:"wrote window function queries\ncreated department summary view",topics:"rank vs dense_rank",progress:"",blockers:"",tomorrow:"jdbc exercises"}}
];
const history=past.map((p,i)=>{const date=new Date(2026,9,p.d);return {id:"h"+i,date,dateLabel:fmt(date),time:p.time,notes:p.notes,blocks:render(template,buildVars(p.notes,user,date))};});
window.DD={MONTHS,fmt,polish,buildVars,render,template,user,today,sampleNotes,emptyNotes,history,recipient:"manager@company.com",zimbraUrl:"https://mail.company.local"};
})();
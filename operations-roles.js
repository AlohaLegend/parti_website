(function(){
  let client;
  const defaultModel={roles:[
    {role:"Executive Producer",discovery:"15–20 hrs/week",creative:"10–15 hrs/week",production:"5–10 hrs/week",execution:"On-site oversight",responsibility:"Client leadership, commercial alignment, executive decisions"},
    {role:"Creative Director",discovery:"10–15 hrs/week",creative:"20–30 hrs/week",production:"10 hrs/week",execution:"As needed",responsibility:"Creative strategy, experience concept, design direction"},
    {role:"Production Designer",discovery:"As needed",creative:"20 hrs/week",production:"10–15 hrs/week",execution:"On-site",responsibility:"Design development, technical resolution, fabrication quality"},
    {role:"Project Manager",discovery:"As needed",creative:"25–30 hrs/week",production:"30 hrs/week",execution:"Full-time",responsibility:"Budget, schedule, approvals, vendors, logistics, run of show"},
    {role:"Coordinator",discovery:"—",creative:"—",production:"20 hrs/week",execution:"Full-time",responsibility:"Procurement, crew, documentation, tracking, site support"}
  ],packages:[
    {name:"Focused activation",description:"A contained footprint with a clear brief and limited complexity.",roles:["Executive Producer","Project Manager","Production Designer"]},
    {name:"Integrated experience",description:"A multi-layered brand environment requiring connected creative and production leadership.",roles:["Executive Producer","Creative Director","Production Designer","Project Manager","Coordinator"]},
    {name:"Large-scale / complex",description:"A high-stakes or multi-zone experience with deeper art direction, logistics, staffing, and on-site leadership.",roles:["Executive Producer","Creative Director","Art Director as scoped","Production Designer","Project Manager","Coordinator","Buyer / site team as scoped"]}
  ]};
  let model=structuredClone(defaultModel);const body=document.querySelector("#roles-body"),packages=document.querySelector("#package-grid"),status=document.querySelector("#roles-status");
  function esc(v){const d=document.createElement("div");d.textContent=String(v??"");return d.innerHTML;}
  function render(){body.innerHTML=model.roles.map((r,i)=>`<tr>${["role","discovery","creative","production","execution","responsibility"].map(k=>`<td><input data-role-index="${i}" data-role-key="${k}" value="${esc(r[k])}" aria-label="${esc(k)} for ${esc(r.role)}"></td>`).join("")}</tr>`).join("");packages.innerHTML=model.packages.map(p=>`<article class="package-card"><p class="portal-label">Team package</p><h3>${esc(p.name)}</h3><p>${esc(p.description)}</p><ul>${p.roles.map(r=>`<li>${esc(r)}</li>`).join("")}</ul></article>`).join("");body.querySelectorAll("input").forEach(input=>input.addEventListener("input",()=>{model.roles[Number(input.dataset.roleIndex)][input.dataset.roleKey]=input.value;}));}
  async function load(){const {data,error}=await client.from("operations_settings").select("value").eq("key","roles_and_packages").maybeSingle();if(error){status.textContent=error.message;status.dataset.tone="error";return;}if(data?.value)model=data.value;render();status.textContent="Planning model loaded.";status.dataset.tone="success";}
  async function save(){status.textContent="Saving model…";const {error}=await client.from("operations_settings").upsert({key:"roles_and_packages",value:model},{onConflict:"key"});if(error){status.textContent=error.message;status.dataset.tone="error";return;}status.textContent="Roles and packages saved.";status.dataset.tone="success";}
  document.querySelector("#save-roles").addEventListener("click",save);window.addEventListener("parti:operations-ready",e=>{client=e.detail.client;load();});render();
})();

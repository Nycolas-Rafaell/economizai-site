function toggleMenu(){document.getElementById('siteMenu')?.classList.toggle('open')}
async function contactSubmit(event){
  event.preventDefault();
  const form=event.currentTarget, status=document.getElementById('formStatus');
  const data=Object.fromEntries(new FormData(form).entries());
  status.textContent='Enviando mensagem…'; status.classList.add('show');
  try { const response=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}); const result=await response.json().catch(()=>({})); status.textContent=result.message||(response.ok?'Mensagem enviada.':'Não foi possível enviar a mensagem.'); if(response.ok) form.reset(); }
  catch { status.textContent='Não foi possível enviar a mensagem agora.'; }
}
if(!document.querySelector('script[src="page-shell.js"]')){const pageShell=document.createElement('script');pageShell.src='page-shell.js';document.body.append(pageShell)}

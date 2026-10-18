const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const store={
  get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
};

/* ---------- Yordamchilar ---------- */
const normPhone=p=>p.replace(/[\s()-]/g,'');
const validPhone=p=>/^\+998\d{9}$/.test(normPhone(p));
async function hash(s){
  if(window.crypto&&crypto.subtle){
    const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('bm:'+s));
    return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
  }
  return btoa(unescape(encodeURIComponent('bm:'+s)));
}
let toastT;
function toast(msg,bad){const t=$('#toast');t.textContent=msg;t.classList.toggle('bad',!!bad);t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),3200)}

/* ---------- Dark / Light rejim ---------- */
const root=document.documentElement,themeBtn=$('#theme');
function setTheme(t){root.dataset.theme=t;themeBtn.innerHTML=`<i class="fa-solid fa-${t==='dark'?'sun':'moon'}"></i>`;store.set('theme',t)}
setTheme(store.get('theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'));
themeBtn.onclick=()=>setTheme(root.dataset.theme==='dark'?'light':'dark');

/* ---------- Foydalanuvchi (demo: localStorage) ---------- */
const users=()=>store.get('bm_users',[]);
const saveUsers=u=>store.set('bm_users',u);
const current=()=>{const p=store.get('bm_session');return users().find(u=>u.phone===p)||null};

function renderAuthLinks(){
  const u=current();
  const html=u
    ?`<a href="#kabinet" class="btn sm"><i class="fa-solid fa-user"></i> ${u.name.split(' ')[0]}</a>`
    :`<a href="#kirish" class="btn sm ghost">Kirish</a><a href="#royxat" class="btn sm">Ro'yxatdan o'tish</a>`;
  $('#authLinks').innerHTML=html;
  let m=$('#menu .m-auth');if(!m){m=document.createElement('div');m.className='m-auth';$('#menu').append(m)}
  m.innerHTML=html;
  if(innerWidth>960)m.style.display='none';else m.style.display='';
  $$('.enroll').forEach(b=>{
    const done=u&&u.courses.includes(b.closest('.course').dataset.n);
    b.classList.toggle('done',!!done);
    b.innerHTML=done?'<i class="fa-solid fa-check"></i> Yozilgansiz':'Kursga yozilish';
  });
}

/* ---------- Router: bosh sahifa / auth / kabinet ---------- */
const views={main:$('#view-main'),auth:$('#view-auth'),cabinet:$('#view-cabinet')};
function show(v){Object.entries(views).forEach(([k,el])=>el.hidden=k!==v);$('#header').hidden=false;$('.tg').hidden=false}
function setTab(t){
  $('#loginForm').hidden=t!=='login';$('#regForm').hidden=t!=='reg';
  $('#tab-login').classList.toggle('on',t==='login');$('#tab-reg').classList.toggle('on',t==='reg');
  $('#tab-login').setAttribute('aria-selected',t==='login');$('#tab-reg').setAttribute('aria-selected',t==='reg');
}
function route(){
  const h=location.hash||'#bosh';
  $('#menu').classList.remove('open');burger.innerHTML='<i class="fa-solid fa-bars"></i>';
  if(h==='#kirish'||h==='#royxat'){
    if(current())return location.hash='#kabinet';
    show('auth');setTab(h==='#kirish'?'login':'reg');scrollTo(0,0);return;
  }
  if(h==='#kabinet'){
    if(!current())return location.hash='#kirish';
    show('cabinet');renderCabinet();scrollTo(0,0);return;
  }
  const wasMain=!views.main.hidden;show('main');
  const el=$(h);
  if(el&&(!wasMain||true))requestAnimationFrame(()=>el.scrollIntoView({behavior:wasMain?'smooth':'auto'}));
}
$$('[data-tab]').forEach(b=>b.onclick=()=>location.hash=b.dataset.tab==='login'?'#kirish':'#royxat');

/* ---------- Mobil menyu ---------- */
const menu=$('#menu'),burger=$('#burger');
burger.onclick=()=>{const o=menu.classList.toggle('open');burger.innerHTML=`<i class="fa-solid fa-${o?'xmark':'bars'}"></i>`};

/* ---------- Ro'yxatdan o'tish ---------- */
const eyeBtns=$$('.eye');
eyeBtns.forEach(b=>b.onclick=()=>{const i=b.previousElementSibling;const s=i.type==='password';i.type=s?'text':'password';b.innerHTML=`<i class="fa-solid fa-eye${s?'-slash':''}"></i>`});

function strength(p){let s=0;if(p.length>=6)s++;if(p.length>=10)s++;if(/[A-Z]/.test(p)&&/[a-z]/.test(p))s++;if(/\d/.test(p))s++;if(/[^\w]/.test(p))s++;return Math.min(s,4)}
$('#regForm').pass.oninput=e=>{
  const s=strength(e.target.value),bar=$('.meter i');
  bar.style.width=(s*25)+'%';bar.style.background=['#ef4444','#ef4444','#f59e0b','#22c55e','#16a34a'][s];
  $('#meterText').textContent=e.target.value?['Juda oddiy','Oddiy','O\'rtacha','Yaxshi','Kuchli'][s]:'Kamida 6 ta belgi';
};

$('#regForm').onsubmit=async e=>{
  e.preventDefault();const f=e.target,err=$('.err',f);
  const name=f.name.value.trim(),phone=normPhone(f.phone.value),pass=f.pass.value;
  if(name.length<2)return err.textContent="Ism familiyangizni kiriting.";
  if(!validPhone(phone))return err.textContent="Telefon raqamini +998901234567 ko'rinishida kiriting.";
  if(pass.length<6)return err.textContent="Parol kamida 6 ta belgidan iborat bo'lsin.";
  if(pass!==f.pass2.value)return err.textContent="Parollar bbir xil emas.";
  if(users().some(u=>u.phone===phone))return err.textContent="Bu raqam bilan hisob mavjud. Kirish sahifasiga o'ting.";
  const list=users();list.push({name,phone,pass:await hash(pass),courses:[]});saveUsers(list);
  store.set('bm_session',phone);err.textContent='';f.reset();
  toast('Hisob yaratildi. Xush kelibsiz!');renderAuthLinks();location.hash='#kabinet';
};

/* ---------- Kirish ---------- */
$('#loginForm').onsubmit=async e=>{
  e.preventDefault();const f=e.target,err=$('.err',f);
  const phone=normPhone(f.phone.value),u=users().find(x=>x.phone===phone);
  if(!validPhone(phone))return err.textContent="Telefon raqamini +998901234567 ko'rinishida kiriting.";
  if(!u||u.pass!==await hash(f.pass.value))return err.textContent="Telefon yoki parol noto'g'ri.";
  store.set('bm_session',phone);err.textContent='';f.reset();
  toast('Kirdingiz. Xush kelibsiz, '+u.name.split(' ')[0]+'!');renderAuthLinks();location.hash='#kabinet';
};

/* ---------- Kabinet ---------- */
function renderCabinet(){
  const u=current();if(!u)return;
  $('#ava').textContent=u.name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  $('#cabName').textContent=u.name;$('#cabPhone').textContent=u.phone;
  const box=$('#myCourses');box.innerHTML='';
  u.courses.forEach(n=>{
    const src=$(`.course[data-n="${n}"]`);if(!src)return;
    const d=document.createElement('div');d.className='card mycard';
    d.innerHTML=`<h3>${n}</h3><p>${$('p',src).textContent}</p><div class="meta"><span>${$('.meta span',src).textContent}</span><b>${$('.meta b',src).textContent}</b></div><button data-n="${n}"><i class="fa-solid fa-xmark"></i> Bekor qilish</button>`;
    box.append(d);
  });
  $('#noCourses').hidden=u.courses.length>0;
}
$('#myCourses').onclick=e=>{
  const b=e.target.closest('button');if(!b)return;
  const list=users(),u=list.find(x=>x.phone===current().phone);
  u.courses=u.courses.filter(c=>c!==b.dataset.n);saveUsers(list);renderCabinet();renderAuthLinks();toast('Kurs bekor qilindi');
};
$('#logout').onclick=()=>{try{localStorage.removeItem('bm_session')}catch(e){}renderAuthLinks();toast('Hisobdan chiqdingiz');location.hash='#bosh'};

/* ---------- Kursga yozilish ---------- */
$$('.enroll').forEach(b=>b.onclick=()=>{
  const u=current(),name=b.closest('.course').dataset.n;
  if(!u){toast("Avval ro'yxatdan o'ting yoki kiring",true);return location.hash='#royxat'}
  const list=users(),me=list.find(x=>x.phone===u.phone);
  if(!me.courses.includes(name))me.courses.push(name);
  saveUsers(list);renderAuthLinks();toast(`"${name}" kursiga yozildingiz`);
});

/* ---------- Kurs filtri va qidiruv ---------- */
let filter='all';
function applyFilter(){
  const q=$('#search').value.trim().toLowerCase();let n=0;
  $$('.course').forEach(c=>{
    const ok=(filter==='all'||c.dataset.c===filter)&&c.textContent.toLowerCase().includes(q);
    c.classList.toggle('hide',!ok);if(ok)n++;
  });
  $('#empty').hidden=n>0;
}
$$('.chip').forEach(b=>b.onclick=()=>{$$('.chip').forEach(c=>c.classList.remove('active'));b.classList.add('active');filter=b.dataset.f;applyFilter()});
$('#search').oninput=applyFilter;

/* ---------- FAQ ---------- */
$$('.q button').forEach(b=>b.onclick=()=>{
  const q=b.parentElement,open=q.classList.contains('open');
  $$('.q').forEach(x=>{x.classList.remove('open');$('.a',x).style.maxHeight=0;$('button',x).setAttribute('aria-expanded',false)});
  if(!open){q.classList.add('open');const a=$('.a',q);a.style.maxHeight=a.scrollHeight+'px';b.setAttribute('aria-expanded',true)}
});

/* ---------- Aloqa formasi ---------- */
$('#course').innerHTML=$$('.course').map(c=>`<option>${c.dataset.n}</option>`).join('');
$('#form').onsubmit=e=>{
  e.preventDefault();const f=e.target,err=$('#err');
  if(f.name.value.trim().length<2)return err.textContent="Ismingizni to'liq kiriting.";
  if(!validPhone(f.phone.value))return err.textContent="Telefon raqamini +998901234567 ko'rinishida kiriting.";
  err.textContent='';f.reset();toast("Arizangiz qabul qilindi. Tez orada bog'lanamiz!");
  // Bu yerga serverga yoki Telegram botga yuborish kodini qo'shing
};

/* ---------- Scroll effektlari ---------- */
const header=$('#header'),topBtn=$('#top'),secs=$$('main section[id]'),links=$$('#menu a');
addEventListener('scroll',()=>{
  header.classList.toggle('scrolled',scrollY>20);
  topBtn.classList.toggle('show',scrollY>600);
  let cur='bosh';secs.forEach(s=>{if(scrollY>=s.offsetTop-130)cur='#'+s.id===''?cur:s.id});
  links.forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+cur));
},{passive:true});
topBtn.onclick=()=>scrollTo({top:0,behavior:'smooth'});

function count(el){const end=+el.dataset.count,t0=performance.now();
  (function step(t){const p=Math.min((t-t0)/1600,1);el.textContent=Math.floor(end*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(step)})(t0)}
$$('#view-main .card,.q,.head,.steps li,.table-wrap').forEach(e=>e.classList.add('reveal'));
const io=new IntersectionObserver(es=>es.forEach(e=>{
  if(!e.isIntersecting)return;
  e.target.classList.add('in');if(e.target.dataset.count)count(e.target);io.unobserve(e.target);
}),{threshold:.12});
$$('.reveal,[data-count]').forEach(e=>io.observe(e));

/* ---------- Ishga tushirish ---------- */
addEventListener('hashchange',route);
addEventListener('resize',renderAuthLinks);
renderAuthLinks();route();
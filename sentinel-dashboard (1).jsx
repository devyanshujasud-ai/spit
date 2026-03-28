import { useState, useEffect, useRef, useCallback } from "react"
import * as THREE from "three"
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from "recharts"
import {
  AlertTriangle, Brain, Zap, Database, Bell, Send, LogOut, Eye,
  Globe, MessageSquare, Shield, Activity, Radio, Layers, BarChart2,
  Search, ChevronRight, TrendingUp, Cpu, Wifi, User, Lock, Scan,
  Map, Terminal, Menu, X, RefreshCw
} from "lucide-react"

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const C = { cyan:'#06b6d4', violet:'#8b5cf6', amber:'#f59e0b', red:'#ef4444', green:'#22c55e', blue:'#3b82f6' }
const glass = { background:'rgba(255,255,255,0.05)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', border:'1px solid rgba(255,255,255,0.10)', borderRadius:16 }
const glassDark = { background:'rgba(2,8,23,0.82)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16 }

const ANOMALIES = [
  { zone:'Zone 7 — Arabian Sea',   signal:'SST',       value:'+2.3°C', priority:0.91, days:8,  status:'CRITICAL', color:C.red,    lat:20, lon:65  },
  { zone:'Zone 3 — Bay of Bengal', signal:'Chlorophyll',value:'+180%', priority:0.67, days:3,  status:'HIGH',     color:C.amber,  lat:15, lon:88  },
  { zone:'Zone 12 — Indian Ocean', signal:'pH Level',   value:'−0.30', priority:0.45, days:12, status:'MODERATE', color:C.cyan,   lat:-10,lon:75  },
  { zone:'Zone 2 — Mediterranean', signal:'Salinity',   value:'+2.1ppt',priority:0.32,days:2,  status:'LOW',      color:C.violet, lat:35, lon:25  },
  { zone:'Zone 9 — S. Atlantic',   signal:'Wind Stress',value:'Normal', priority:0.12, days:0, status:'NOMINAL',  color:C.green,  lat:-30,lon:-40 },
]

const TEMPORAL = Array.from({length:30},(_,i)=>({
  day:`D${i+1}`,
  actual: parseFloat((26+Math.sin(i*.3)*2+(i>22?(i-22)*.35:0)).toFixed(2)),
  upper:  parseFloat((28.5+Math.sin(i*.3)*1.5).toFixed(2)),
  lower:  parseFloat((23.5+Math.sin(i*.3)*1.5).toFixed(2)),
  forecast: i>24 ? parseFloat((26+Math.sin(i*.3)*2+(i-22)*.4).toFixed(2)) : undefined,
}))

const HEALTH = [
  { label:'Data Ingestion', value:98,  unit:'%',  color:C.green,  icon:Database  },
  { label:'ML Pipeline',    value:95,  unit:'%',  color:C.green,  icon:Brain     },
  { label:'API Latency',    value:42,  unit:'ms', color:C.cyan,   icon:Zap       },
  { label:'Alert Engine',   value:100, unit:'%',  color:C.green,  icon:Bell      },
  { label:'Active Zones',   value:47,  unit:'',   color:C.violet, icon:Globe     },
  { label:'Model Acc.',     value:92,  unit:'%',  color:C.green,  icon:Eye       },
]

const HEATMAP = Array.from({length:48},(_,i)=>{
  const base=[0.91,0.67,0.45,0.32,0.12,0.23,0.55,0.78,0.34,0.61,0.43,0.87]
  return { id:i, v:Math.max(0,Math.min(1,base[i%12]+(Math.random()-.5)*.12)) }
})

const heatCol = v => v>.8?C.red : v>.6?C.amber : v>.4?C.cyan : v>.2?C.blue : C.green

const NAV = [
  { id:'overview', label:'Overview',  icon:Globe         },
  { id:'anomaly',  label:'Anomalies', icon:AlertTriangle  },
  { id:'temporal', label:'Temporal',  icon:BarChart2      },
  { id:'query',    label:'AI Query',  icon:MessageSquare  },
  { id:'heatmap',  label:'Heatmap',   icon:Map            },
  { id:'system',   label:'System',    icon:Cpu            },
]

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&family=Exo+2:wght@300;400;500;600;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{background:#020817;font-family:'Exo 2','Trebuchet MS',sans-serif;overflow:hidden;color:#e2e8f0}
    
    @keyframes glow-c{0%,100%{box-shadow:0 0 12px #06b6d450,0 0 24px #06b6d420}50%{box-shadow:0 0 28px #06b6d4cc,0 0 55px #06b6d440}}
    @keyframes glow-v{0%,100%{box-shadow:0 0 12px #8b5cf450}50%{box-shadow:0 0 28px #8b5cf6cc,0 0 55px #8b5cf440}}
    @keyframes glow-a{0%,100%{box-shadow:0 0 12px #f59e0b50}50%{box-shadow:0 0 28px #f59e0bcc}}
    @keyframes glow-r{0%,100%{box-shadow:0 0 12px #ef444450}50%{box-shadow:0 0 28px #ef4444cc}}
    @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
    @keyframes scanH{0%{top:-4px}100%{top:100%}}
    @keyframes pulse-ring{0%{transform:scale(.95);opacity:.8}50%{transform:scale(1.05);opacity:.4}100%{transform:scale(.95);opacity:.8}}
    @keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
    @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
    @keyframes blink{0%,100%{opacity:1}50%{opacity:.25}}
    @keyframes data-in{from{width:0}to{width:var(--w)}}
    @keyframes bounce-in{0%{transform:scale(0.5);opacity:0}70%{transform:scale(1.05)}100%{transform:scale(1);opacity:1}}
    
    .glow-c{animation:glow-c 5s ease-in-out infinite}
    .glow-v{animation:glow-v 5.5s ease-in-out infinite}
    .glow-a{animation:glow-a 6s ease-in-out infinite}
    .glow-r{animation:glow-r 4.5s ease-in-out infinite}
    .float{animation:float 6s ease-in-out infinite}
    .spin-s{animation:spin 20s linear infinite}
    .spin-r{animation:spin 28s linear infinite reverse}
    .fade-up{animation:fadeUp .8s ease-out forwards}
    .bounce-in{animation:bounce-in 1s ease-out forwards}
    .blink{animation:blink 2.5s ease-in-out infinite}
    
    .glass{background:rgba(255,255,255,0.05);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,0.10);border-radius:16px}
    .glass-dark{background:rgba(2,8,23,0.82);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.07);border-radius:16px}
    
    .nav-btn{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;cursor:pointer;transition:all .2s;color:#64748b;font-size:13px;font-weight:500;border:none;background:transparent;width:100%;text-align:left;font-family:'Exo 2',sans-serif;letter-spacing:.3px}
    .nav-btn:hover{background:rgba(6,182,212,0.08);color:#94a3b8}
    .nav-btn.active{background:rgba(6,182,212,0.12);color:#06b6d4;border-left:2px solid #06b6d4;padding-left:12px}
    
    .inp{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:13px 16px;color:#e2e8f0;font-size:14px;width:100%;outline:none;transition:all .25s;font-family:'Exo 2',sans-serif}
    .inp:focus{border-color:#06b6d4;box-shadow:0 0 0 3px rgba(6,182,212,0.12),0 0 12px rgba(6,182,212,0.08)}
    .inp::placeholder{color:#475569}
    
    .btn-grad{border:none;cursor:pointer;border-radius:10px;font-weight:600;transition:all .25s;background:linear-gradient(135deg,#06b6d4,#8b5cf6);background-size:200% 200%;font-family:'Exo 2',sans-serif}
    .btn-grad:hover{box-shadow:0 0 28px rgba(6,182,212,0.45),0 0 55px rgba(139,92,246,0.25);transform:translateY(-1px)}
    .btn-grad:active{transform:translateY(0)}
    
    .metric:hover{transform:translateY(-2px);transition:transform .2s;cursor:default}
    .alert-r:hover{background:rgba(255,255,255,0.03);cursor:pointer}
    .hcell:hover{transform:scale(1.2);z-index:10;cursor:pointer;border-radius:4px}
    
    ::-webkit-scrollbar{width:3px}
    ::-webkit-scrollbar-track{background:transparent}
    ::-webkit-scrollbar-thumb{background:rgba(6,182,212,0.25);border-radius:2px}
    
    .card-title{font-family:'Orbitron',monospace;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#475569;font-weight:500}
    .orb{font-family:'Orbitron',monospace}
    
    .shimmer-text{background:linear-gradient(90deg,#06b6d4,#8b5cf6,#f59e0b,#06b6d4);background-size:300% 100%;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;animation:shimmer 7s linear infinite}
  `}</style>
)

// ─── PARTICLE BACKGROUND ──────────────────────────────────────────────────────
const ParticleBg = () => {
  const ref = useRef()
  useEffect(()=>{
    const c=ref.current, ctx=c.getContext('2d')
    const resize=()=>{c.width=window.innerWidth;c.height=window.innerHeight}
    resize(); window.addEventListener('resize',resize)
    const pts=Array.from({length:75},()=>({
      x:Math.random()*c.width, y:Math.random()*c.height,
      r:Math.random()*1.4+.3, vx:(Math.random()-.5)*.07, vy:(Math.random()-.5)*.07,
      col:['#06b6d4','#8b5cf6','#ffffff','#06b6d4'][Math.floor(Math.random()*4)],
      o:Math.random()*.45+.08
    }))
    let id
    const draw=()=>{
      ctx.clearRect(0,0,c.width,c.height)
      pts.forEach(p=>{
        p.x+=p.vx; p.y+=p.vy
        if(p.x<0)p.x=c.width; if(p.x>c.width)p.x=0
        if(p.y<0)p.y=c.height; if(p.y>c.height)p.y=0
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2)
        ctx.fillStyle=p.col; ctx.globalAlpha=p.o; ctx.fill(); ctx.globalAlpha=1
      })
      pts.forEach((p,i)=>pts.slice(i+1).forEach(q=>{
        const d=Math.hypot(p.x-q.x,p.y-q.y)
        if(d<85){ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.strokeStyle='#06b6d4';ctx.globalAlpha=(1-d/85)*.07;ctx.lineWidth=.5;ctx.stroke();ctx.globalAlpha=1}
      }))
      id=requestAnimationFrame(draw)
    }
    draw()
    return()=>{cancelAnimationFrame(id);window.removeEventListener('resize',resize)}
  },[])
  return <canvas ref={ref} style={{position:'fixed',top:0,left:0,zIndex:0,pointerEvents:'none'}}/>
}

// ─── 3D GLOBE ─────────────────────────────────────────────────────────────────
const Globe3D = () => {
  const ref = useRef()
  useEffect(()=>{
    const el=ref.current; if(!el) return
    const W=el.clientWidth||360, H=el.clientHeight||360
    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true})
    renderer.setSize(W,H); renderer.setPixelRatio(Math.min(devicePixelRatio,2))
    el.appendChild(renderer.domElement)
    const scene=new THREE.Scene()
    const cam=new THREE.PerspectiveCamera(45,W/H,.1,100); cam.position.z=2.75

    scene.add(new THREE.AmbientLight(0x0a1628,5))
    const l1=new THREE.PointLight(0x06b6d4,7,14); l1.position.set(4,3,4); scene.add(l1)
    const l2=new THREE.PointLight(0x8b5cf6,5,14); l2.position.set(-4,-2,-3); scene.add(l2)
    const l3=new THREE.PointLight(0xf59e0b,3,8); l3.position.set(0,5,2); scene.add(l3)

    const sphere=new THREE.Mesh(
      new THREE.SphereGeometry(1,64,64),
      new THREE.MeshPhongMaterial({color:0x061428,emissive:0x010a1e,shininess:120})
    )
    scene.add(sphere)

    const wire=new THREE.Mesh(
      new THREE.SphereGeometry(1.012,18,18),
      new THREE.MeshBasicMaterial({color:0x06b6d4,wireframe:true,transparent:true,opacity:.11})
    )
    scene.add(wire)

    const atmo=new THREE.Mesh(
      new THREE.SphereGeometry(1.09,32,32),
      new THREE.MeshBasicMaterial({color:0x0891b2,transparent:true,opacity:.05,side:THREE.BackSide})
    )
    scene.add(atmo)

    const mkRing=(r,col,op,rx,ry,rz)=>{
      const m=new THREE.Mesh(new THREE.TorusGeometry(r,.005,8,128),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:op}))
      m.rotation.set(rx,ry,rz); scene.add(m); return m
    }
    const r1=mkRing(1.40,0x06b6d4,.8,0,0,0)
    const r2=mkRing(1.60,0x8b5cf6,.55,Math.PI/4,Math.PI/6,0)
    const r3=mkRing(1.80,0xf59e0b,.38,-Math.PI/3,0,Math.PI/5)

    const mkDot=(col,sz=.046)=>{
      const d=new THREE.Mesh(new THREE.SphereGeometry(sz,8,8),new THREE.MeshBasicMaterial({color:col}))
      scene.add(d); return d
    }
    const od1=mkDot(0x22d3ee,.055), od2=mkDot(0xa78bfa,.044), od3=mkDot(0xfbbf24,.044)

    const mkMarker=(lat,lon,col)=>{
      const phi=(90-lat)*Math.PI/180, theta=(lon+180)*Math.PI/180
      const m=new THREE.Mesh(new THREE.SphereGeometry(.038,8,8),new THREE.MeshBasicMaterial({color:col}))
      m.position.set(-Math.sin(phi)*Math.cos(theta), Math.cos(phi), Math.sin(phi)*Math.sin(theta))
      sphere.add(m)
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.07,.006,8,32),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.7}))
      ring.position.copy(m.position); sphere.add(ring)
    }
    mkMarker(20,65,0xff3333); mkMarker(15,88,0xf59e0b); mkMarker(-10,75,0x22d3ee)
    mkMarker(35,25,0xa78bfa); mkMarker(-30,-40,0x22c55e)

    let t=0, id
    const loop=()=>{
      id=requestAnimationFrame(loop); t+=.004
      sphere.rotation.y+=.0006; wire.rotation.y+=.0006
      r1.rotation.z+=.0015; r2.rotation.z-=.001; r3.rotation.y+=.0018
      od1.position.set(Math.cos(t)*1.40, Math.sin(t*.2)*.1, Math.sin(t)*1.40)
      od2.position.set(Math.cos(-t*.68)*1.60*Math.cos(Math.PI/4), Math.sin(-t*.68)*1.60*Math.sin(Math.PI/4), Math.sin(-t*.68)*1.60)
      od3.position.set(Math.cos(t*.48)*1.80*Math.cos(Math.PI/3), Math.sin(t*.82)*1.80*.5, Math.sin(t*.48)*1.80*Math.sin(Math.PI/3))
      renderer.render(scene,cam)
    }
    loop()
    return()=>{cancelAnimationFrame(id); if(el.contains(renderer.domElement)) el.removeChild(renderer.domElement); renderer.dispose()}
  },[])
  return <div ref={ref} style={{width:'100%',height:'100%'}}/>
}

// ─── CUSTOM TOOLTIP ───────────────────────────────────────────────────────────
const DarkTip = ({active,payload,label}) => {
  if(!active||!payload?.length) return null
  return (
    <div style={{...glassDark, padding:'8px 12px', fontSize:12}}>
      <div style={{color:'#64748b',marginBottom:4,fontFamily:'Orbitron,monospace',fontSize:10,letterSpacing:1}}>{label}</div>
      {payload.map((p,i)=>(
        <div key={i} style={{color:p.color,marginBottom:2}}>{p.name}: <b>{p.value}</b></div>
      ))}
    </div>
  )
}

// ─── REAL-TIME CHART HOOK ─────────────────────────────────────────────────────
const useRealtimeData = () => {
  const [data, setData] = useState(()=>Array.from({length:20},(_,i)=>({
    t:i, sst:parseFloat((26+Math.random()*2).toFixed(2)),
    chl:parseFloat((.5+Math.random()*.8).toFixed(2)),
    ph:parseFloat((8.0+Math.random()*.3).toFixed(2))
  })))
  useEffect(()=>{
    const iv=setInterval(()=>{
      setData(p=>[...p.slice(1),{
        t:p[p.length-1].t+1,
        sst:parseFloat((26+Math.random()*3+(Math.random()>.88?1.8:0)).toFixed(2)),
        chl:parseFloat((.4+Math.random()*1.6).toFixed(2)),
        ph:parseFloat((7.9+Math.random()*.4).toFixed(2))
      }])
    },1200)
    return()=>clearInterval(iv)
  },[])
  return data
}

// ─── LOGIN SCREEN ─────────────────────────────────────────────────────────────
const Login = ({onLogin}) => {
  const [email,setEmail]=useState('')
  const [pass,setPass]=useState('')
  const [scanning,setScanning]=useState(false)
  const [scanPct,setScanPct]=useState(0)
  const [err,setErr]=useState('')
  const [loading,setLoading]=useState(false)

  const doLogin=()=>{
    if(!email||!pass){setErr('Credentials required'); return}
    setLoading(true)
    setTimeout(()=>{setLoading(false);onLogin()},1200)
  }

  const doBio=()=>{
    setScanning(true); setScanPct(0); setErr('')
    const iv=setInterval(()=>setScanPct(p=>{
      if(p>=100){clearInterval(iv);setTimeout(onLogin,600);return 100}
      return p+2
    }),40)
  }

  return (
    <div style={{position:'fixed',inset:0,zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',background:'#020817'}}>
      <ParticleBg/>
      {/* Corner decorations */}
      {[{top:20,left:20},{top:20,right:20},{bottom:20,left:20},{bottom:20,right:20}].map((s,i)=>(
        <div key={i} style={{position:'absolute',...s,width:40,height:40,opacity:.4,zIndex:1}}>
          <div style={{position:'absolute',top:0,left:0,width:14,height:14,borderTop:`1.5px solid ${C.cyan}`,borderLeft:`1.5px solid ${C.cyan}`,transform:i%2===1?'scaleX(-1)':'none',...(i>1?{borderTop:'none',borderBottom:`1.5px solid ${C.cyan}`,top:'auto',bottom:0}:{})}}/>
        </div>
      ))}
      <div style={{position:'relative',zIndex:2,width:420,padding:40,...glass,boxShadow:`0 0 60px rgba(6,182,212,0.12),0 0 120px rgba(139,92,246,0.08)`}}>
        {/* Logo */}
        <div style={{textAlign:'center',marginBottom:32}}>
          <div className="float glow-c" style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:70,height:70,borderRadius:'50%',background:'rgba(6,182,212,0.1)',border:`1px solid rgba(6,182,212,0.3)`,marginBottom:16}}>
            <Globe size={32} color={C.cyan}/>
          </div>
          <div className="shimmer-text orb" style={{fontSize:22,fontWeight:700,marginBottom:4}}>SENTINEL AI</div>
          <div style={{fontSize:11,letterSpacing:2,color:'#475569',textTransform:'uppercase',fontFamily:'Orbitron,monospace'}}>Environmental Intelligence System</div>
        </div>
        {/* Status bar */}
        <div style={{display:'flex',gap:12,marginBottom:28}}>
          {['SYS ONLINE','SECURE','v3.0.1'].map((t,i)=>(
            <div key={i} style={{flex:1,textAlign:'center',padding:'5px 0',background:'rgba(6,182,212,0.07)',borderRadius:6,border:`1px solid rgba(6,182,212,0.15)`,fontSize:9,letterSpacing:1.2,color:C.cyan,fontFamily:'Orbitron,monospace'}}>
              <span className="blink" style={{marginRight:4}}>●</span>{t}
            </div>
          ))}
        </div>
        {/* Inputs */}
        <div style={{display:'flex',flexDirection:'column',gap:14,marginBottom:20}}>
          <div style={{position:'relative'}}>
            <User size={15} color="#475569" style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)'}}/>
            <input className="inp" type="email" placeholder="operator@sentinel.ai" value={email} onChange={e=>setEmail(e.target.value)} style={{paddingLeft:40}} onKeyDown={e=>e.key==='Enter'&&doLogin()}/>
          </div>
          <div style={{position:'relative'}}>
            <Lock size={15} color="#475569" style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)'}}/>
            <input className="inp" type="password" placeholder="Access code" value={pass} onChange={e=>setPass(e.target.value)} style={{paddingLeft:40}} onKeyDown={e=>e.key==='Enter'&&doLogin()}/>
          </div>
        </div>
        {err && <div style={{color:C.red,fontSize:12,marginBottom:12,textAlign:'center'}}>{err}</div>}
        <button className="btn-grad" onClick={doLogin} style={{width:'100%',padding:'13px 0',fontSize:14,letterSpacing:1.5,color:'#fff',marginBottom:14}}>
          {loading ? <RefreshCw size={16} style={{display:'inline',animation:'spin .8s linear infinite'}}/> : '◈  AUTHENTICATE'}
        </button>
        {/* Biometric */}
        <div style={{borderTop:'1px solid rgba(255,255,255,0.07)',paddingTop:16,textAlign:'center'}}>
          <div style={{fontSize:11,color:'#475569',marginBottom:12,letterSpacing:1,fontFamily:'Orbitron,monospace'}}>— OR BIOMETRIC SCAN —</div>
          <div onClick={!scanning?doBio:undefined} style={{position:'relative',display:'inline-flex',alignItems:'center',justifyContent:'center',width:80,height:80,borderRadius:'50%',background:scanning?'rgba(6,182,212,0.08)':'rgba(255,255,255,0.03)',border:`1px solid ${scanning?C.cyan:'rgba(255,255,255,0.12)'}`,cursor:scanning?'default':'pointer',overflow:'hidden',transition:'all .3s'}}>
            <Scan size={36} color={scanPct===100?C.green:scanning?C.cyan:'#475569'}/>
            {scanning && <div style={{position:'absolute',top:`${scanPct}%`,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${C.cyan},transparent)`,boxShadow:`0 0 8px ${C.cyan}`,animation:'scanH .05s linear',transition:'top .04s linear'}}/>}
          </div>
          {scanning && <div style={{marginTop:10,fontSize:11,color:C.cyan,fontFamily:'Orbitron,monospace',letterSpacing:1}}>{scanPct<100?`SCANNING ${scanPct}%`:'✓ VERIFIED'}</div>}
        </div>
      </div>
    </div>
  )
}

// ─── ANOMALY PANEL ────────────────────────────────────────────────────────────
const AnomalyPanel = ({compact=false}) => (
  <div style={{display:'flex',flexDirection:'column',gap:compact?8:10,height:'100%',overflowY:'auto'}}>
    {!compact && <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
      <div className="blink" style={{width:7,height:7,borderRadius:'50%',background:C.red,boxShadow:`0 0 8px ${C.red}`}}/>
      <span style={{fontSize:10,color:C.red,fontFamily:'Orbitron,monospace',letterSpacing:1}}>LIVE ANOMALY FEED  —  CAP. 1</span>
    </div>}
    {ANOMALIES.map((a,i)=>(
      <div key={i} className="alert-r fade-up" style={{padding:compact?'10px 12px':'12px 14px',borderRadius:10,...glass,borderLeft:`2px solid ${a.color}`,animationDelay:`${i*.07}s`,transition:'all .2s'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:compact?4:6}}>
          <div style={{fontSize:compact?11:12,fontWeight:600,color:'#e2e8f0'}}>{a.zone}</div>
          <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:2}}>
            <span style={{fontSize:9,padding:'2px 7px',borderRadius:4,background:`${a.color}22`,color:a.color,fontFamily:'Orbitron,monospace',letterSpacing:.8}}>{a.status}</span>
            <span style={{fontSize:10,fontWeight:700,color:a.color}}>{a.value}</span>
          </div>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{fontSize:11,color:'#64748b'}}>{a.signal}</span>
          <div style={{display:'flex',alignItems:'center',gap:6}}>
            {a.days>0&&<span style={{fontSize:10,color:'#64748b'}}>{a.days}d building</span>}
            <div style={{width:60,height:4,background:'rgba(255,255,255,0.06)',borderRadius:2,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${a.priority*100}%`,background:`linear-gradient(90deg,${a.color}88,${a.color})`,borderRadius:2,transition:'width .5s ease'}}/>
            </div>
            <span style={{fontSize:10,color:a.color,fontWeight:600}}>{(a.priority*100).toFixed(0)}</span>
          </div>
        </div>
      </div>
    ))}
  </div>
)

// ─── TEMPORAL CHART ───────────────────────────────────────────────────────────
const TemporalChart = ({height=200}) => (
  <div>
    <div style={{display:'flex',gap:12,marginBottom:10,flexWrap:'wrap'}}>
      {[{col:C.cyan,label:'Observed SST'},{col:C.violet,label:'Confidence Band'},{col:C.amber,label:'Anomaly Threshold'}].map((l,i)=>(
        <div key={i} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'#94a3b8'}}>
          <div style={{width:16,height:2,background:l.col,borderRadius:1}}/>
          {l.label}
        </div>
      ))}
    </div>
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={TEMPORAL} margin={{top:5,right:5,bottom:0,left:-20}}>
        <defs>
          <linearGradient id="gCyan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={C.cyan} stopOpacity={.35}/>
            <stop offset="95%" stopColor={C.cyan} stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="gViolet" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={C.violet} stopOpacity={.25}/>
            <stop offset="95%" stopColor={C.violet} stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/>
        <XAxis dataKey="day" tick={{fill:'#475569',fontSize:10}} tickLine={false} axisLine={false} interval={4}/>
        <YAxis tick={{fill:'#475569',fontSize:10}} tickLine={false} axisLine={false} domain={[22,32]}/>
        <Tooltip content={<DarkTip/>}/>
        <Area type="monotone" dataKey="upper" stroke={C.violet} strokeWidth={1} strokeDasharray="4 2" fill="url(#gViolet)" name="Upper band" dot={false}/>
        <Area type="monotone" dataKey="lower" stroke={C.violet} strokeWidth={1} strokeDasharray="4 2" fill="rgba(0,0,0,0)" name="Lower band" dot={false}/>
        <Area type="monotone" dataKey="actual" stroke={C.cyan} strokeWidth={2} fill="url(#gCyan)" name="SST °C" dot={false} activeDot={{r:4,fill:C.cyan}}/>
        <Area type="monotone" dataKey="forecast" stroke={C.amber} strokeWidth={2} strokeDasharray="6 3" fill="rgba(0,0,0,0)" name="Forecast" dot={false}/>
      </AreaChart>
    </ResponsiveContainer>
  </div>
)

// ─── REALTIME CHART ───────────────────────────────────────────────────────────
const RealtimeChart = ({data,height=140}) => (
  <ResponsiveContainer width="100%" height={height}>
    <LineChart data={data} margin={{top:5,right:5,bottom:0,left:-24}}>
      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
      <XAxis dataKey="t" tick={false} axisLine={false} tickLine={false}/>
      <YAxis tick={{fill:'#475569',fontSize:9}} tickLine={false} axisLine={false}/>
      <Tooltip content={<DarkTip/>}/>
      <Line type="monotone" dataKey="sst" stroke={C.cyan} strokeWidth={1.5} dot={false} name="SST °C" isAnimationActive={false}/>
      <Line type="monotone" dataKey="chl" stroke={C.green} strokeWidth={1.5} dot={false} name="Chl mg/m³" isAnimationActive={false}/>
      <Line type="monotone" dataKey="ph" stroke={C.amber} strokeWidth={1.5} dot={false} name="pH" isAnimationActive={false}/>
    </LineChart>
  </ResponsiveContainer>
)

// ─── SYSTEM HEALTH ────────────────────────────────────────────────────────────
const SystemHealth = ({compact=false}) => (
  <div style={{display:'grid',gridTemplateColumns:compact?'1fr 1fr':'1fr',gap:compact?8:10}}>
    {HEALTH.map((h,i)=>{
      const Icon=h.icon
      return (
        <div key={i} className="metric fade-up" style={{padding:'11px 14px',borderRadius:10,...glass,animationDelay:`${i*.06}s`,border:`1px solid ${h.color}18`}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
            <div style={{display:'flex',alignItems:'center',gap:7}}>
              <Icon size={13} color={h.color}/> <span style={{fontSize:11,color:'#64748b'}}>{h.label}</span>
            </div>
            <span style={{fontSize:13,fontWeight:700,color:h.color,fontFamily:'Orbitron,monospace'}}>{h.value}{h.unit}</span>
          </div>
          <div style={{height:3,background:'rgba(255,255,255,0.06)',borderRadius:2,overflow:'hidden'}}>
            <div style={{height:'100%',width:`${h.unit==='ms'?100-h.value/100*100:h.value}%`,background:`linear-gradient(90deg,${h.color}66,${h.color})`,borderRadius:2,boxShadow:`0 0 6px ${h.color}66`}}/>
          </div>
        </div>
      )
    })}
  </div>
)

// ─── HEATMAP ──────────────────────────────────────────────────────────────────
const HeatmapPanel = () => (
  <div>
    <div style={{display:'grid',gridTemplateColumns:'repeat(8,1fr)',gap:4}}>
      {HEATMAP.map((cell,i)=>(
        <div key={i} className="hcell" title={`Zone ${i+1}: Risk ${(cell.v*100).toFixed(0)}%`} style={{height:28,borderRadius:3,background:heatCol(cell.v),opacity:.75+cell.v*.25,transition:'all .2s',boxShadow:cell.v>.7?`0 0 8px ${heatCol(cell.v)}66`:undefined}}/>
      ))}
    </div>
    <div style={{display:'flex',gap:8,marginTop:12,alignItems:'center'}}>
      <span style={{fontSize:10,color:'#475569'}}>LOW</span>
      <div style={{flex:1,height:4,borderRadius:2,background:`linear-gradient(90deg,${C.green},${C.blue},${C.cyan},${C.amber},${C.red})`}}/>
      <span style={{fontSize:10,color:'#475569'}}>HIGH</span>
    </div>
  </div>
)

// ─── AI QUERY INTERFACE ───────────────────────────────────────────────────────
const AIQuery = ({full=false}) => {
  const [q,setQ]=useState('')
  const [msgs,setMsgs]=useState([
    {role:'system',text:'SENTINEL AI online. Monitoring 47 zones across 6 ocean regions. Type your query.'}
  ])
  const [loading,setLoading]=useState(false)
  const bottomRef=useRef()

  const PRESETS=['What needs attention right now?','Summarize Zone 7 trajectory','Risk forecast for next 72h','Compare all active anomalies']

  const ask=useCallback(async(query)=>{
    if(!query.trim()||loading) return
    const q2=query.trim()
    setQ(''); setMsgs(p=>[...p,{role:'user',text:q2}])
    setLoading(true)
    const ctx=ANOMALIES.map(a=>`${a.zone}: ${a.signal}=${a.value} | Priority:${a.priority} | Days:${a.days} | ${a.status}`).join('\n')
    try{
      const res=await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          model:'claude-sonnet-4-20250514', max_tokens:1000,
          system:`You are SENTINEL AI — an advanced ocean environmental intelligence system. You monitor marine zones for ecological anomalies using NASA Earthdata, NOAA ERDDAP, and Copernicus satellite data. Given prioritized anomaly data (Capability 1: Anomaly Prioritization) and temporal baselines (Capability 2: Temporal Pattern Modeling), provide concise action-oriented situational awareness. Lead with the most critical zone. Reference temporal trajectories when relevant. End with a recommended action. Under 130 words. Style: NASA mission controller — authoritative, structured, precise.`,
          messages:[{role:'user',content:`Current anomaly feed:\n${ctx}\n\nOperator query: ${q2}`}]
        })
      })
      const data=await res.json()
      const text=data.content?.[0]?.text||'No response from AI core.'
      setMsgs(p=>[...p,{role:'ai',text}])
    }catch{
      setMsgs(p=>[...p,{role:'ai',text:'⚠ Connection to AI core interrupted. Retry.'}])
    }
    setLoading(false)
  },[loading])

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:'smooth'}) },[msgs,loading])

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',minHeight:full?400:320}}>
      <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column',gap:10,marginBottom:12,paddingRight:4}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start'}}>
            <div style={{maxWidth:'86%',padding:'10px 14px',borderRadius:m.role==='user'?'12px 12px 4px 12px':'12px 12px 12px 4px',background:m.role==='user'?'rgba(6,182,212,0.15)':m.role==='system'?'rgba(139,92,246,0.1)':'rgba(255,255,255,0.05)',border:`1px solid ${m.role==='user'?'rgba(6,182,212,0.3)':m.role==='system'?'rgba(139,92,246,0.2)':'rgba(255,255,255,0.08)'}`,fontSize:13,lineHeight:1.6,color:m.role==='system'?'#8b5cf6':'#cbd5e1'}}>
              {m.role==='ai'&&<div style={{fontSize:9,color:C.cyan,fontFamily:'Orbitron,monospace',letterSpacing:1,marginBottom:6}}>◈ SENTINEL AI  |  CAP. 4</div>}
              {m.text}
            </div>
          </div>
        ))}
        {loading&&(
          <div style={{display:'flex',gap:5,padding:'12px 16px',borderRadius:'12px 12px 12px 4px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',width:'fit-content'}}>
            {[0,1,2].map(i=><div key={i} className="blink" style={{width:7,height:7,borderRadius:'50%',background:C.cyan,animationDelay:`${i*.2}s`}}/>)}
          </div>
        )}
        <div ref={bottomRef}/>
      </div>
      {/* Presets */}
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
        {PRESETS.map((p,i)=>(
          <button key={i} onClick={()=>ask(p)} style={{fontSize:10,padding:'4px 10px',borderRadius:6,border:`1px solid rgba(6,182,212,0.25)`,background:'rgba(6,182,212,0.06)',color:'#64748b',cursor:'pointer',transition:'all .2s',fontFamily:'Exo 2,sans-serif'}}
            onMouseEnter={e=>{e.target.style.color=C.cyan;e.target.style.borderColor='rgba(6,182,212,0.5)'}}
            onMouseLeave={e=>{e.target.style.color='#64748b';e.target.style.borderColor='rgba(6,182,212,0.25)'}}>
            {p}
          </button>
        ))}
      </div>
      {/* Input row */}
      <div style={{display:'flex',gap:8}}>
        <input className="inp" placeholder="Query the environmental AI..." value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&ask(q)} style={{flex:1}}/>
        <button className="btn-grad" onClick={()=>ask(q)} disabled={loading} style={{padding:'0 18px',borderRadius:10,color:'#fff',display:'flex',alignItems:'center',gap:7,fontSize:13,minWidth:52}}>
          <Send size={14}/>
        </button>
      </div>
    </div>
  )
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
const Dashboard = ({onLogout}) => {
  const [nav,setNav]=useState('overview')
  const rtData=useRealtimeData()
  const [sideOpen,setSideOpen]=useState(true)
  const [time,setTime]=useState(new Date())
  useEffect(()=>{const iv=setInterval(()=>setTime(new Date()),1000);return()=>clearInterval(iv)},[])

  const Card = ({title,children,style={}}) => (
    <div className="glass" style={{padding:'18px 20px',...style}}>
      {title&&<div className="card-title" style={{marginBottom:14}}>{title}</div>}
      {children}
    </div>
  )

  const renderView = () => {
    if(nav==='overview') return (
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 280px',gridTemplateRows:'1fr 1fr',gap:12,height:'100%'}}>
        {/* Globe */}
        <Card title="Live Monitoring Globe" style={{overflow:'hidden'}}>
          <div style={{height:230,position:'relative'}}>
            <Globe3D/>
            <div style={{position:'absolute',bottom:0,left:0,right:0,display:'flex',justifyContent:'center',gap:14}}>
              {[{col:C.red,label:'Critical'},{col:C.amber,label:'High'},{col:C.cyan,label:'Moderate'},{col:C.green,label:'Nominal'}].map((l,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:4,fontSize:10,color:'#64748b'}}>
                  <div style={{width:7,height:7,borderRadius:'50%',background:l.col,boxShadow:`0 0 5px ${l.col}`}}/>{l.label}
                </div>
              ))}
            </div>
          </div>
        </Card>
        {/* Anomaly alerts */}
        <Card title="Anomaly Priority Feed  ·  Capability 1" style={{overflow:'hidden'}}>
          <AnomalyPanel compact/>
        </Card>
        {/* System health spans full right column */}
        <Card title="System Health" style={{gridRow:'span 2',overflow:'auto'}}>
          <div style={{marginBottom:12}}>
            {[{label:'UPTIME',val:'99.97%',col:C.green},{label:'ZONES',val:'47/50',col:C.cyan},{label:'ALERTS',val:'4 ACTIVE',col:C.amber}].map((s,i)=>(
              <div key={i} style={{padding:'7px 10px',marginBottom:6,borderRadius:8,background:'rgba(255,255,255,0.03)',border:`1px solid ${s.col}20`}}>
                <div style={{fontSize:9,color:'#475569',letterSpacing:1,fontFamily:'Orbitron,monospace',marginBottom:2}}>{s.label}</div>
                <div style={{fontSize:15,fontWeight:700,color:s.col,fontFamily:'Orbitron,monospace'}}>{s.val}</div>
              </div>
            ))}
          </div>
          <SystemHealth compact/>
          <div style={{marginTop:14,borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:12}}>
            <div className="card-title" style={{marginBottom:10}}>Risk Heatmap</div>
            <HeatmapPanel/>
            <div style={{marginTop:8,fontSize:11,color:'#475569'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span>Critical Zones</span><span style={{color:C.red,fontWeight:600}}>6</span></div>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}><span>High Risk</span><span style={{color:C.amber,fontWeight:600}}>9</span></div>
              <div style={{display:'flex',justifyContent:'space-between'}}><span>Nominal</span><span style={{color:C.green,fontWeight:600}}>32</span></div>
            </div>
          </div>
        </Card>
        {/* Temporal */}
        <Card title="Temporal Pattern Model  ·  Capability 2" style={{overflow:'hidden'}}>
          <div style={{width:'100%',height:160}}>
            <TemporalChart height={160}/>
          </div>
        </Card>
        {/* Realtime + AI Query stacked */}
        <Card title="Real-Time Signal Feed  &  AI Query" style={{overflow:'hidden',display:'flex',flexDirection:'column'}}>
          <div style={{display:'flex',gap:14,marginBottom:8,flexWrap:'wrap'}}>
            {[{col:C.cyan,l:'SST °C'},{col:C.green,l:'Chl mg/m³'},{col:C.amber,l:'pH'}].map((x,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:5,fontSize:10,color:'#94a3b8'}}>
                <div style={{width:14,height:2,background:x.col,borderRadius:1}}/>{x.l}
              </div>
            ))}
          </div>
          <div style={{width:'100%',height:130}}>
            <RealtimeChart data={rtData} height={130}/>
          </div>
          <div style={{marginTop:12,borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:10,flex:1,overflow:'hidden'}}>
            <div className="card-title" style={{marginBottom:8}}>Context-Aware Query Interface  ·  Capability 4</div>
            <AIQuery/>
          </div>
        </Card>
      </div>
    )
    if(nav==='anomaly') return (
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <Card title="Priority-Ranked Anomaly Feed  ·  Capability 1" style={{gridColumn:'1/3'}}>
          <div style={{marginBottom:14,padding:'10px 14px',borderRadius:8,background:'rgba(6,182,212,0.06)',border:'1px solid rgba(6,182,212,0.15)',fontSize:12,color:'#94a3b8',lineHeight:1.7}}>
            Priority Score = <span style={{color:C.cyan}}>0.4 × Magnitude</span> + <span style={{color:C.violet}}>0.3 × Recency</span> + <span style={{color:C.amber}}>0.3 × Duration</span> — Isolation Forest anomaly detection with Z-score baseline correction
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {ANOMALIES.map((a,i)=>(
              <div key={i} className="alert-r" style={{padding:'16px 18px',borderRadius:12,...glass,borderLeft:`3px solid ${a.color}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:600,color:'#e2e8f0',marginBottom:3}}>{a.zone}</div>
                    <div style={{fontSize:11,color:'#64748b'}}>Signal: <span style={{color:'#94a3b8'}}>{a.signal}</span> · Building: <span style={{color:a.color}}>{a.days} days</span></div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:10,padding:'3px 10px',borderRadius:5,background:`${a.color}22`,color:a.color,fontFamily:'Orbitron,monospace',letterSpacing:.8,marginBottom:4}}>{a.status}</div>
                    <div style={{fontSize:20,fontWeight:700,color:a.color,fontFamily:'Orbitron,monospace'}}>{a.value}</div>
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <span style={{fontSize:11,color:'#475569',minWidth:80}}>Priority Score</span>
                  <div style={{flex:1,height:6,background:'rgba(255,255,255,0.06)',borderRadius:3,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${a.priority*100}%`,background:`linear-gradient(90deg,${a.color}66,${a.color})`,borderRadius:3,boxShadow:`0 0 8px ${a.color}88`}}/>
                  </div>
                  <span style={{fontSize:14,fontWeight:700,color:a.color,fontFamily:'Orbitron,monospace',minWidth:30}}>{(a.priority*100).toFixed(0)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Alert Distribution" style={{gridColumn:'1/2'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            {[{l:'Critical',n:1,c:C.red},{l:'High',n:1,c:C.amber},{l:'Moderate',n:1,c:C.cyan},{l:'Low',n:1,c:C.violet},{l:'Nominal',n:1,c:C.green}].map((s,i)=>(
              <div key={i} style={{padding:'14px 16px',borderRadius:10,...glass,border:`1px solid ${s.c}22`}}>
                <div style={{fontSize:22,fontWeight:700,color:s.c,fontFamily:'Orbitron,monospace'}}>{s.n}</div>
                <div style={{fontSize:11,color:'#64748b',marginTop:3}}>{s.l}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Signal Confidence Filter  ·  Capability 5" style={{gridColumn:'2/3'}}>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {['Confidence threshold: >70%','Redundant alert suppression: ON','Convergent signal gating: ACTIVE','False positive filter: ENABLED'].map((t,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:8,background:'rgba(34,197,94,0.05)',border:'1px solid rgba(34,197,94,0.15)'}}>
                <div style={{width:7,height:7,borderRadius:'50%',background:C.green,boxShadow:`0 0 6px ${C.green}`}}/>
                <span style={{fontSize:12,color:'#94a3b8'}}>{t}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    )
    if(nav==='temporal') return (
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        <Card title="Temporal Pattern Model  ·  Capability 2" style={{gridColumn:'1/3'}}>
          <div style={{padding:'10px 14px',borderRadius:8,background:'rgba(139,92,246,0.06)',border:'1px solid rgba(139,92,246,0.15)',fontSize:12,color:'#94a3b8',marginBottom:16,lineHeight:1.7}}>
            Facebook Prophet seasonal decomposition + LSTM ensemble. Learns zone-specific baselines. Anomaly = observation outside 95% confidence band. Horizon-bounded probabilistic forecast (30-day window).
          </div>
          <TemporalChart height={280}/>
        </Card>
        <Card title="Zone 7 — Arabian Sea Forecast" style={{gridColumn:'1/2'}}>
          <div style={{display:'flex',gap:10,marginBottom:12}}>
            {[{l:'Current SST',v:'+2.3°C',c:C.red},{l:'Baseline',v:'26.0°C',c:C.cyan},{l:'Forecast 7d',v:'27.8°C',c:C.amber}].map((s,i)=>(
              <div key={i} style={{flex:1,padding:'10px 12px',borderRadius:8,...glass,border:`1px solid ${s.c}22`}}>
                <div style={{fontSize:9,color:'#475569',marginBottom:4,fontFamily:'Orbitron,monospace',letterSpacing:.8}}>{s.l}</div>
                <div style={{fontSize:16,fontWeight:700,color:s.c,fontFamily:'Orbitron,monospace'}}>{s.v}</div>
              </div>
            ))}
          </div>
          <RealtimeChart data={rtData} height={160}/>
        </Card>
        <Card title="Seasonal Decomposition" style={{gridColumn:'2/3'}}>
          {['Trend component: ↑ +0.12°C/month','Seasonal pattern: ±2.3°C annual cycle','Residual noise: σ = 0.4°C','Anomaly magnitude: +2.3σ (99th pctile)'].map((t,i)=>(
            <div key={i} style={{padding:'11px 14px',marginBottom:8,borderRadius:8,...glass}}>
              <span style={{fontSize:12,color:'#94a3b8'}}>{t}</span>
            </div>
          ))}
          <div style={{marginTop:14,padding:'12px 14px',borderRadius:8,background:'rgba(239,68,68,0.06)',border:'1px solid rgba(239,68,68,0.2)'}}>
            <div style={{fontSize:10,color:C.red,fontFamily:'Orbitron,monospace',letterSpacing:.8,marginBottom:4}}>TRAJECTORY ASSESSMENT</div>
            <div style={{fontSize:12,color:'#94a3b8',lineHeight:1.7}}>Thermal accumulation pattern consistent with pre-bloom conditions. 87% probability of continued escalation over next 8 days unless oceanic mixing event occurs.</div>
          </div>
        </Card>
      </div>
    )
    if(nav==='query') return (
      <Card title="Context-Aware Query Interface  ·  Capability 4" style={{height:'calc(100vh - 160px)'}}>
        <div style={{marginBottom:14,padding:'10px 14px',borderRadius:8,background:'rgba(6,182,212,0.06)',border:'1px solid rgba(6,182,212,0.15)',fontSize:12,color:'#94a3b8',lineHeight:1.7}}>
          RAG-augmented Claude API. Context: ranked anomaly state + temporal baselines + zone history. Natural-language queries return structured, action-oriented situational awareness — not raw data dumps.
        </div>
        <AIQuery full/>
      </Card>
    )
    if(nav==='heatmap') return (
      <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:16}}>
        <Card title="Global Risk Heatmap — All 48 Zones" style={{gridColumn:'1/2'}}>
          <HeatmapPanel/>
          <div style={{marginTop:16,display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
            {[{v:'>80',c:C.red,l:'Critical'},{v:'60–80',c:C.amber,l:'High'},{v:'40–60',c:C.cyan,l:'Moderate'},{v:'<40',c:C.green,l:'Low'}].map((s,i)=>(
              <div key={i} style={{padding:'10px 12px',borderRadius:8,background:`${s.c}10`,border:`1px solid ${s.c}25`,textAlign:'center'}}>
                <div style={{fontSize:11,color:s.c,fontFamily:'Orbitron,monospace',fontWeight:600}}>{s.v}%</div>
                <div style={{fontSize:10,color:'#64748b',marginTop:2}}>{s.l}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Zone Risk Ranking" style={{gridColumn:'2/3',overflowY:'auto',maxHeight:'60vh'}}>
          {ANOMALIES.map((a,i)=>(
            <div key={i} className="alert-r" style={{padding:'10px 12px',marginBottom:8,borderRadius:8,...glass,borderLeft:`2px solid ${a.color}`}}>
              <div style={{fontSize:11,fontWeight:600,color:'#e2e8f0',marginBottom:4}}>{a.zone}</div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:10,color:'#64748b'}}>{a.signal}: {a.value}</span>
                <span style={{fontSize:11,fontWeight:700,color:a.color}}>{(a.priority*100).toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </Card>
      </div>
    )
    if(nav==='system') return (
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>
        <Card title="System Health Metrics" style={{gridColumn:'1/2'}}>
          <SystemHealth/>
        </Card>
        <Card title="Pipeline Status" style={{gridColumn:'2/3'}}>
          {['NASA Earthdata API','NOAA ERDDAP Feed','Copernicus Marine','Isolation Forest ML','Prophet Forecaster','LLM Query Engine'].map((s,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 12px',marginBottom:7,borderRadius:8,...glass}}>
              <span style={{fontSize:12,color:'#94a3b8'}}>{s}</span>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <div className="blink" style={{width:6,height:6,borderRadius:'50%',background:i<5?C.green:C.cyan,animationDelay:`${i*.3}s`,boxShadow:`0 0 5px ${i<5?C.green:C.cyan}`}}/>
                <span style={{fontSize:10,color:i<5?C.green:C.cyan,fontFamily:'Orbitron,monospace'}}>ONLINE</span>
              </div>
            </div>
          ))}
        </Card>
        <Card title="System Vitals" style={{gridColumn:'3/4'}}>
          {[{l:'CPU Load',v:'23%',c:C.cyan},{l:'Memory',v:'4.2GB',c:C.violet},{l:'Storage',v:'847GB',c:C.green},{l:'Network',v:'142Mbps',c:C.amber},{l:'Uptime',v:'99.97%',c:C.green},{l:'Alerts/hr',v:'2.4',c:C.cyan}].map((s,i)=>(
            <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 12px',marginBottom:7,borderRadius:8,...glass}}>
              <span style={{fontSize:12,color:'#64748b'}}>{s.l}</span>
              <span style={{fontSize:13,fontWeight:700,color:s.c,fontFamily:'Orbitron,monospace'}}>{s.v}</span>
            </div>
          ))}
        </Card>
        <Card title="Real-Time Signal Feed" style={{gridColumn:'1/4'}}>
          <div style={{display:'flex',gap:16,marginBottom:10}}>
            {[{col:C.cyan,l:'SST °C'},{col:C.green,l:'Chlorophyll'},{col:C.amber,l:'pH'}].map((x,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'#94a3b8'}}>
                <div style={{width:16,height:2,background:x.col,borderRadius:1}}/>{x.l}
              </div>
            ))}
          </div>
          <RealtimeChart data={rtData} height={180}/>
        </Card>
      </div>
    )
    return null
  }

  return (
    <div style={{display:'flex',height:'100vh',background:'#020817',position:'relative',overflow:'hidden'}}>
      <ParticleBg/>
      {/* Sidebar */}
      <div className="glass-dark" style={{width:sideOpen?210:64,zIndex:10,flexShrink:0,display:'flex',flexDirection:'column',transition:'width .3s ease',position:'relative',borderRight:'1px solid rgba(255,255,255,0.07)',borderRadius:0}}>
        <div style={{padding:'20px 16px 16px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',gap:10,overflow:'hidden'}}>
          <div className="glow-c" style={{width:36,height:36,borderRadius:'50%',background:'rgba(6,182,212,0.1)',border:`1px solid rgba(6,182,212,0.35)`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <Globe size={18} color={C.cyan}/>
          </div>
          {sideOpen&&<div><div className="orb" style={{fontSize:13,fontWeight:700,color:'#e2e8f0',letterSpacing:1}}>SENTINEL</div><div style={{fontSize:9,color:'#475569',letterSpacing:1.2,fontFamily:'Orbitron,monospace'}}>AI v3.0</div></div>}
          <div onClick={()=>setSideOpen(p=>!p)} style={{marginLeft:'auto',cursor:'pointer',color:'#475569',flexShrink:0}}>{sideOpen?<X size={14}/>:<Menu size={14}/>}</div>
        </div>
        <div style={{padding:'12px 8px',flex:1,overflowY:'auto'}}>
          {NAV.map(n=>{
            const Icon=n.icon
            return (
              <button key={n.id} className={`nav-btn ${nav===n.id?'active':''}`} onClick={()=>setNav(n.id)} style={{marginBottom:3}}>
                <Icon size={16}/> {sideOpen&&n.label}
              </button>
            )
          })}
        </div>
        <div style={{padding:'12px 8px',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
          <button className="nav-btn" onClick={onLogout} style={{color:'#475569'}}>
            <LogOut size={16}/> {sideOpen&&'Sign out'}
          </button>
        </div>
      </div>
      {/* Main */}
      <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',zIndex:1}}>
        {/* Top bar */}
        <div style={{padding:'14px 24px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',gap:16,background:'rgba(2,8,23,0.6)',backdropFilter:'blur(12px)'}}>
          <div className="orb shimmer-text" style={{fontSize:16,fontWeight:600,letterSpacing:1.5}}>{NAV.find(n=>n.id===nav)?.label.toUpperCase()}</div>
          <div className="blink" style={{width:6,height:6,borderRadius:'50%',background:C.green,boxShadow:`0 0 6px ${C.green}`}}/>
          <span style={{fontSize:10,color:C.green,fontFamily:'Orbitron,monospace',letterSpacing:.8}}>SYSTEMS NOMINAL</span>
          <div style={{marginLeft:'auto',display:'flex',alignItems:'center',gap:14}}>
            <Radio size={13} color="#475569" className="blink"/>
            <span style={{fontSize:11,color:'#475569',fontFamily:'Orbitron,monospace'}}>{time.toLocaleTimeString('en',{hour12:false})}</span>
            <div style={{padding:'4px 12px',borderRadius:6,background:'rgba(6,182,212,0.08)',border:'1px solid rgba(6,182,212,0.2)',fontSize:10,color:C.cyan,fontFamily:'Orbitron,monospace'}}>
              <span className="blink">●</span> LIVE
            </div>
          </div>
        </div>
        {/* Content */}
        <div style={{flex:1,overflowY:'auto',padding:'20px 24px',scrollBehavior:'smooth'}}>
          {renderView()}
        </div>
      </div>
    </div>
  )
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [page, setPage] = useState('login')
  return (
    <>
      <GlobalStyles/>
      {page==='login' ? <Login onLogin={()=>setPage('dashboard')}/> : <Dashboard onLogout={()=>setPage('login')}/>}
    </>
  )
}

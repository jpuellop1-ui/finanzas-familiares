import { useState, useEffect, useRef } from 'react'

// ── Storage ───────────────────────────────────────────────────────────────────
function storageGet(key) { try { return JSON.parse(localStorage.getItem(key)) } catch { return null } }
function storageSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)) } catch {} }

// ── Defaults ──────────────────────────────────────────────────────────────────
const DEFAULT_CAT_ING  = ['Salario','Freelance','Arriendo','Ventas','Transferencia','Inversión','Otro']
const DEFAULT_CAT_GAS  = ['Alimentación','Transporte','Servicios','Arriendo/Hipoteca','Salud','Entretenimiento','Ropa/Calzado','Mascotas','Educación','Cuota deuda','Ahorro','Otro']
const DEFAULT_CONTEXTOS = ['Personal','Edificio Baluarte','Tribuz','MediPet','Arrecife Joyería','Otro negocio']

const PERSONAS   = ['Angie','Juan','Compartido']
const FRECUENCIAS = [
  { value:'mensual',   label:'Mensual',   },
  { value:'quincenal', label:'Quincenal', },
  { value:'semanal',   label:'Semanal',   },
  { value:'anual',     label:'Anual',     },
]

const CTX_COLORS = ['#185FA5','#0F6E56','#993556','#854F0B','#534AB7','#BA7517','#D85A30','#3C3489','#639922','#D4537E']

const fmt = n => new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(n)
const todayStr = () => new Date().toISOString().split('T')[0]
const thisMes  = () => new Date().toISOString().slice(0,7)
const uid = () => Date.now().toString(36)+Math.random().toString(36).slice(2)

const daysUntil = fecha => {
  const [y,m,d] = fecha.split('-').map(Number)
  const target = new Date(y,m-1,d); const now = new Date(); now.setHours(0,0,0,0)
  return Math.round((target-now)/86400000)
}
function calcNextDue(ultimoPago, frecuencia) {
  if (!ultimoPago) return null
  const [y,m,d] = ultimoPago.split('-').map(Number); const last = new Date(y,m-1,d)
  switch(frecuencia) {
    case 'semanal':   { const t=new Date(last); t.setDate(t.getDate()+7);       return t }
    case 'quincenal': { const t=new Date(last); t.setDate(t.getDate()+15);      return t }
    case 'mensual':   { const t=new Date(last); t.setMonth(t.getMonth()+1);     return t }
    case 'anual':     { const t=new Date(last); t.setFullYear(t.getFullYear()+1); return t }
    default: return null
  }
}
const dateToStr = d => d ? d.toISOString().split('T')[0] : ''

const CAT_COLORS = {
  'Alimentación':'#1D9E75','Transporte':'#378ADD','Servicios':'#BA7517',
  'Arriendo/Hipoteca':'#534AB7','Salud':'#D4537E','Entretenimiento':'#D85A30',
  'Ropa/Calzado':'#993556','Mascotas':'#639922','Educación':'#3C3489',
  'Cuota deuda':'#E24B4A','Ahorro':'#0F6E56','Otro':'#888780',
  'Salario':'#1D9E75','Freelance':'#378ADD','Arriendo':'#BA7517',
  'Ventas':'#D85A30','Transferencia':'#534AB7','Inversión':'#639922',
}
const getCatColor = (cat, idx=0) => CAT_COLORS[cat] || CTX_COLORS[idx % CTX_COLORS.length]

const P_STYLE = {
  Angie:      {bg:'#FBEAF0',color:'#993556'},
  Juan:       {bg:'#E6F1FB',color:'#185FA5'},
  Compartido: {bg:'#EEEDFE',color:'#534AB7'},
}

function getCtxStyle(ctx, contextos) {
  if (!ctx || ctx==='Personal') return {bg:'#F1EFE8',color:'#5F5E5A'}
  const idx = contextos.indexOf(ctx)
  const color = CTX_COLORS[idx % CTX_COLORS.length]
  return { bg: color+'22', color }
}

// ── UI Atoms ──────────────────────────────────────────────────────────────────
function Badge({persona}) {
  const s = P_STYLE[persona]||{bg:'#F1EFE8',color:'#5F5E5A'}
  return <span style={{...s,fontSize:11,padding:'2px 7px',borderRadius:4,fontWeight:500,flexShrink:0,whiteSpace:'nowrap'}}>{persona}</span>
}
function CtxBadge({ctx, contextos}) {
  if (!ctx||ctx==='Personal') return null
  const s = getCtxStyle(ctx, contextos)
  return <span style={{...s,fontSize:10,padding:'2px 7px',borderRadius:4,fontWeight:500,flexShrink:0,whiteSpace:'nowrap'}}>{ctx}</span>
}
function ProgressBar({pct,color}) {
  return (
    <div style={{height:5,borderRadius:3,background:'var(--color-border-tertiary)',overflow:'hidden'}}>
      <div style={{height:'100%',width:`${Math.min(Math.max(pct,0),100)}%`,background:color,borderRadius:3,transition:'width 0.4s ease'}}/>
    </div>
  )
}
function Chip({active,onClick,children,color}) {
  const ac = color||'#1D9E75'
  return (
    <button onClick={onClick} style={{padding:'5px 13px',borderRadius:20,cursor:'pointer',fontSize:12,fontWeight:active?500:400,border:'0.5px solid',borderColor:active?ac:'var(--color-border-secondary)',background:active?ac:'var(--color-background-primary)',color:active?'white':'var(--color-text-secondary)',transition:'all 0.15s',fontFamily:'inherit'}}>
      {children}
    </button>
  )
}
function SumCard({label,val,color,icon,bg}) {
  return (
    <div style={{background:'var(--color-background-primary)',borderRadius:'var(--border-radius-md)',border:'0.5px solid var(--color-border-tertiary)',padding:'0.875rem'}}>
      <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:7}}>
        <div style={{width:28,height:28,borderRadius:6,background:bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <i className={`ti ${icon}`} style={{fontSize:14,color}} aria-hidden/>
        </div>
        <span style={{fontSize:11,color:'var(--color-text-secondary)',lineHeight:1.3}}>{label}</span>
      </div>
      <p style={{margin:0,fontSize:16,fontWeight:500,color}}>{fmt(val)}</p>
    </div>
  )
}
function DonutChart({items}) {
  const total = items.reduce((s,i)=>s+i.value,0)
  if (!total) return <p style={{textAlign:'center',color:'var(--color-text-tertiary)',fontSize:13,padding:'1rem 0'}}>Sin gastos este período</p>
  const R=58,C=2*Math.PI*R; let off=0
  const segs = items.map(i=>{const o=off; off+=i.value/total; return {...i,off:o}})
  return (
    <div style={{display:'flex',gap:20,alignItems:'center',flexWrap:'wrap'}}>
      <svg width={136} height={136} viewBox="0 0 136 136" style={{flexShrink:0}} aria-hidden="true">
        <circle cx={68} cy={68} r={R} fill="none" stroke="var(--color-border-tertiary)" strokeWidth={20}/>
        {segs.map((s,i)=>(
          <circle key={i} cx={68} cy={68} r={R} fill="none" stroke={s.color} strokeWidth={20}
            strokeDasharray={`${(s.value/total)*C} ${C}`} strokeDashoffset={-s.off*C} transform="rotate(-90 68 68)"/>
        ))}
        <text x={68} y={62} textAnchor="middle" fontSize={10} fill="var(--color-text-secondary)">Gastos</text>
        <text x={68} y={78} textAnchor="middle" fontSize={12} fontWeight={500} fill="var(--color-text-primary)">{(total/1000000).toFixed(1)}M</text>
      </svg>
      <div style={{flex:1,minWidth:120}}>
        {segs.slice(0,8).map((s,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:6,marginBottom:5}}>
            <div style={{width:9,height:9,borderRadius:2,background:s.color,flexShrink:0}}/>
            <span style={{fontSize:12,color:'var(--color-text-secondary)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.label}</span>
            <span style={{fontSize:12,fontWeight:500,flexShrink:0}}>{Math.round(s.value/total*100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
function Field({label,children,half,third}) {
  const flex = third?'1 1 calc(33% - 7px)':half?'1 1 calc(50% - 5px)':'1 1 100%'
  return (
    <div style={{marginBottom:11,flex}}>
      <label style={{fontSize:12,color:'var(--color-text-secondary)',display:'block',marginBottom:4}}>{label}</label>
      {children}
    </div>
  )
}
function FormCard({title,onCancel,accentColor='#1D9E75',children}) {
  return (
    <div className="fade-in" style={{background:'var(--color-background-primary)',border:`0.5px solid var(--color-border-tertiary)`,borderLeft:`3px solid ${accentColor}`,borderRadius:'var(--border-radius-lg)',padding:'1.25rem',marginBottom:'1rem'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
        <span style={{fontSize:14,fontWeight:500}}>{title}</span>
        <button onClick={onCancel} style={{border:'none',background:'none',cursor:'pointer',color:'var(--color-text-tertiary)',padding:4,borderRadius:6}} aria-label="Cerrar">
          <i className="ti ti-x" style={{fontSize:16}} aria-hidden/>
        </button>
      </div>
      {children}
    </div>
  )
}
function EmptyState({icon,text}) {
  return (
    <div style={{textAlign:'center',padding:'3rem 1rem',color:'var(--color-text-tertiary)'}}>
      <i className={`ti ${icon}`} style={{fontSize:44,display:'block',marginBottom:10}} aria-hidden/>
      <p style={{margin:0,fontSize:14}}>{text}</p>
    </div>
  )
}
function Btn({color,label,icon,onClick}) {
  return (
    <button onClick={onClick} style={{display:'flex',alignItems:'center',gap:5,padding:'7px 14px',borderRadius:8,border:'none',background:color,color:'white',cursor:'pointer',fontSize:13,fontWeight:500,fontFamily:'inherit',whiteSpace:'nowrap'}}>
      {icon && <i className={`ti ${icon}`} aria-hidden/>} {label}
    </button>
  )
}

// ── Category Manager (Settings) ───────────────────────────────────────────────
function CatList({title, items, onAdd, onDelete, onRename, accentColor, icon}) {
  const [newVal, setNewVal] = useState('')
  const [editIdx, setEditIdx] = useState(null)
  const [editVal, setEditVal] = useState('')

  function handleAdd() {
    const v = newVal.trim()
    if (!v || items.includes(v)) return
    onAdd(v); setNewVal('')
  }
  function startEdit(idx) { setEditIdx(idx); setEditVal(items[idx]) }
  function confirmEdit() {
    const v = editVal.trim()
    if (!v) return
    if (v !== items[editIdx]) onRename(editIdx, v)
    setEditIdx(null)
  }

  return (
    <div style={{background:'var(--color-background-primary)',borderRadius:'var(--border-radius-lg)',border:'0.5px solid var(--color-border-tertiary)',padding:'1.25rem',marginBottom:'1rem'}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:'0.875rem'}}>
        <div style={{width:28,height:28,borderRadius:6,background:accentColor+'22',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <i className={`ti ${icon}`} style={{fontSize:14,color:accentColor}} aria-hidden/>
        </div>
        <p style={{margin:0,fontSize:13,fontWeight:500}}>{title}</p>
        <span style={{fontSize:11,color:'var(--color-text-tertiary)',marginLeft:'auto'}}>{items.length} categorías</span>
      </div>

      {/* List */}
      <div style={{marginBottom:10}}>
        {items.map((item,idx)=>(
          <div key={idx} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 0',borderBottom:'0.5px solid var(--color-border-tertiary)'}}>
            <div style={{width:8,height:8,borderRadius:2,background:getCatColor(item,idx),flexShrink:0}}/>
            {editIdx===idx ? (
              <>
                <input autoFocus value={editVal} onChange={e=>setEditVal(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter')confirmEdit();if(e.key==='Escape')setEditIdx(null)}}
                  style={{flex:1,fontSize:13,padding:'3px 6px'}}/>
                <button onClick={confirmEdit} style={{border:'none',background:'#1D9E75',color:'white',borderRadius:5,cursor:'pointer',padding:'3px 8px',fontSize:12,fontFamily:'inherit'}}>✓</button>
                <button onClick={()=>setEditIdx(null)} style={{border:'0.5px solid var(--color-border-secondary)',background:'none',borderRadius:5,cursor:'pointer',padding:'3px 8px',fontSize:12,fontFamily:'inherit',color:'var(--color-text-secondary)'}}>✕</button>
              </>
            ) : (
              <>
                <span style={{flex:1,fontSize:13}}>{item}</span>
                <button onClick={()=>startEdit(idx)} style={{border:'none',background:'none',cursor:'pointer',color:'var(--color-text-tertiary)',padding:'2px 5px',borderRadius:4}} aria-label="Editar">
                  <i className="ti ti-pencil" style={{fontSize:13}} aria-hidden/>
                </button>
                <button onClick={()=>onDelete(idx)} style={{border:'none',background:'none',cursor:'pointer',color:'var(--color-text-tertiary)',padding:'2px 5px',borderRadius:4}} aria-label="Eliminar">
                  <i className="ti ti-trash" style={{fontSize:13}} aria-hidden/>
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Add new */}
      <div style={{display:'flex',gap:6}}>
        <input value={newVal} onChange={e=>setNewVal(e.target.value)} placeholder="Nueva categoría…"
          onKeyDown={e=>e.key==='Enter'&&handleAdd()}
          style={{flex:1,fontSize:13}}/>
        <button onClick={handleAdd} style={{padding:'7px 12px',borderRadius:7,border:'none',background:accentColor,color:'white',cursor:'pointer',fontSize:13,fontFamily:'inherit',fontWeight:500}}>
          + Agregar
        </button>
      </div>
    </div>
  )
}

function SettingsTab({catIng, catGas, contextos, setCatIng, setCatGas, setContextos}) {
  return (
    <div>
      <div style={{marginBottom:'1.25rem'}}>
        <p style={{margin:'0 0 4px',fontSize:15,fontWeight:500}}>Categorías y ámbitos</p>
        <p style={{margin:0,fontSize:12,color:'var(--color-text-tertiary)'}}>Personalizá las opciones que aparecen en el formulario de movimientos. Podés editar el nombre o eliminar las que no usás.</p>
      </div>

      <CatList
        title="Categorías de Ingresos"
        items={catIng}
        accentColor="#1D9E75"
        icon="ti-arrow-down-left"
        onAdd={v => setCatIng(p=>[...p,v])}
        onDelete={idx => setCatIng(p=>p.filter((_,i)=>i!==idx))}
        onRename={(idx,v) => setCatIng(p=>p.map((x,i)=>i===idx?v:x))}
      />

      <CatList
        title="Categorías de Gastos"
        items={catGas}
        accentColor="#E24B4A"
        icon="ti-arrow-up-right"
        onAdd={v => setCatGas(p=>[...p,v])}
        onDelete={idx => setCatGas(p=>p.filter((_,i)=>i!==idx))}
        onRename={(idx,v) => setCatGas(p=>p.map((x,i)=>i===idx?v:x))}
      />

      <div style={{background:'var(--color-background-secondary)',borderRadius:'var(--border-radius-md)',padding:'0.875rem',fontSize:12,color:'var(--color-text-tertiary)'}}>
        <i className="ti ti-info-circle" style={{marginRight:5}} aria-hidden/>
        Los cambios se guardan automáticamente. Si eliminás una categoría que ya tiene movimientos, esos movimientos conservan su categoría original.
      </div>
    </div>
  )
}

// ── Transaction form ──────────────────────────────────────────────────────────
function TransForm({onSave, onCancel, catIng, catGas, contextos}) {
  const [tipo, setTipo] = useState('gasto')
  const [f, setF] = useState({persona:'Compartido',categoria:'',contexto:contextos[0]||'Personal',monto:'',descripcion:'',fecha:todayStr()})
  const set = (k,v) => setF(p=>({...p,[k]:v}))
  const cats = tipo==='ingreso' ? catIng : catGas
  const color = tipo==='ingreso' ? '#1D9E75' : '#E24B4A'

  // auto-select first cat when tipo changes
  useEffect(()=>{ set('categoria', cats[0]||'') }, [tipo])

  function save() {
    if (!f.monto||isNaN(Number(f.monto))||Number(f.monto)<=0) return
    onSave({id:uid(),tipo,...f,monto:Number(f.monto),categoria:f.categoria||cats[0]||''})
  }
  return (
    <FormCard title="Nuevo movimiento" onCancel={onCancel} accentColor={color}>
      <div style={{display:'flex',gap:8,marginBottom:'1rem'}}>
        {['ingreso','gasto'].map(t=>{
          const c=t==='ingreso'?'#1D9E75':'#E24B4A', bg=t==='ingreso'?'#E1F5EE':'#FCEBEB'
          return (
            <button key={t} onClick={()=>setTipo(t)} style={{flex:1,padding:'8px',border:`0.5px solid ${tipo===t?c:'var(--color-border-secondary)'}`,cursor:'pointer',borderRadius:8,fontWeight:tipo===t?500:400,fontFamily:'inherit',background:tipo===t?bg:'none',color:tipo===t?c:'var(--color-text-secondary)',transition:'all 0.15s'}}>
              <i className={`ti ${t==='ingreso'?'ti-arrow-down-left':'ti-arrow-up-right'}`} style={{marginRight:4}} aria-hidden/>
              {t==='ingreso'?'Ingreso':'Gasto'}
            </button>
          )
        })}
      </div>
      <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
        <Field label="Persona" third><select value={f.persona} onChange={e=>set('persona',e.target.value)}>{PERSONAS.map(p=><option key={p}>{p}</option>)}</select></Field>
        <Field label="Categoría" third>
          <select value={f.categoria} onChange={e=>set('categoria',e.target.value)}>
            {cats.map(c=><option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Ámbito" third>
          <select value={f.contexto} onChange={e=>set('contexto',e.target.value)}>
            {contextos.map(c=><option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Monto (COP)" half><input type="number" value={f.monto} onChange={e=>set('monto',e.target.value)} placeholder="0" min="0"/></Field>
        <Field label="Fecha" half><input type="date" value={f.fecha} onChange={e=>set('fecha',e.target.value)}/></Field>
        <Field label="Descripción"><input type="text" value={f.descripcion} onChange={e=>set('descripcion',e.target.value)} placeholder="Ej: Mercado, pago Claro, venta Tribuz…"/></Field>
      </div>
      <button onClick={save} style={{width:'100%',padding:'10px',border:'none',background:color,color:'white',borderRadius:8,cursor:'pointer',fontWeight:500,fontFamily:'inherit',fontSize:13,marginTop:4}}>
        Guardar movimiento
      </button>
    </FormCard>
  )
}

function DeudaForm({onSave, onCancel}) {
  const [f,setF] = useState({acreedor:'',montoTotal:'',montoPagado:'0',descripcion:'',persona:'Compartido',proximoPago:''})
  const set=(k,v)=>setF(p=>({...p,[k]:v}))
  function save() {
    if(!f.acreedor.trim()||!f.montoTotal||Number(f.montoTotal)<=0) return
    onSave({id:uid(),...f,montoTotal:Number(f.montoTotal),montoPagado:Number(f.montoPagado||0)})
  }
  return (
    <FormCard title="Nueva deuda" onCancel={onCancel} accentColor="#BA7517">
      <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
        <Field label="Acreedor"><input type="text" value={f.acreedor} onChange={e=>set('acreedor',e.target.value)} placeholder="Ej: Davivienda, Falabella…"/></Field>
        <Field label="Monto total (COP)" half><input type="number" value={f.montoTotal} onChange={e=>set('montoTotal',e.target.value)} placeholder="0" min="0"/></Field>
        <Field label="Ya pagado (COP)" half><input type="number" value={f.montoPagado} onChange={e=>set('montoPagado',e.target.value)} placeholder="0" min="0"/></Field>
        <Field label="Responsable" half><select value={f.persona} onChange={e=>set('persona',e.target.value)}>{PERSONAS.map(p=><option key={p}>{p}</option>)}</select></Field>
        <Field label="Fecha próximo pago" half><input type="date" value={f.proximoPago} onChange={e=>set('proximoPago',e.target.value)}/></Field>
        <Field label="Descripción"><input type="text" value={f.descripcion} onChange={e=>set('descripcion',e.target.value)} placeholder="Ej: Cuota crédito carro, tarjeta…"/></Field>
      </div>
      <button onClick={save} style={{width:'100%',padding:'10px',border:'none',background:'#BA7517',color:'white',borderRadius:8,cursor:'pointer',fontWeight:500,fontFamily:'inherit',fontSize:13,marginTop:4}}>Guardar deuda</button>
    </FormCard>
  )
}

function PagoForm({onSave, onCancel}) {
  const [f,setF] = useState({descripcion:'',monto:'',fecha:'',persona:'Compartido'})
  const set=(k,v)=>setF(p=>({...p,[k]:v}))
  function save() {
    if(!f.descripcion.trim()||!f.monto||!f.fecha||Number(f.monto)<=0) return
    onSave({id:uid(),...f,monto:Number(f.monto)})
  }
  return (
    <FormCard title="Nuevo pago programado" onCancel={onCancel} accentColor="#534AB7">
      <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
        <Field label="Descripción"><input type="text" value={f.descripcion} onChange={e=>set('descripcion',e.target.value)} placeholder="Ej: Arriendo, Netflix, cuota tarjeta…"/></Field>
        <Field label="Monto (COP)" half><input type="number" value={f.monto} onChange={e=>set('monto',e.target.value)} placeholder="0" min="0"/></Field>
        <Field label="Vencimiento" half><input type="date" value={f.fecha} onChange={e=>set('fecha',e.target.value)}/></Field>
        <Field label="Responsable" half><select value={f.persona} onChange={e=>set('persona',e.target.value)}>{PERSONAS.map(p=><option key={p}>{p}</option>)}</select></Field>
      </div>
      <button onClick={save} style={{width:'100%',padding:'10px',border:'none',background:'#534AB7',color:'white',borderRadius:8,cursor:'pointer',fontWeight:500,fontFamily:'inherit',fontSize:13,marginTop:4}}>Guardar pago</button>
    </FormCard>
  )
}

function RecurrenteForm({onSave, onCancel, deudas, catGas, contextos}) {
  const [f,setF] = useState({descripcion:'',monto:'',frecuencia:'mensual',persona:'Compartido',categoria:catGas[0]||'',contexto:contextos[0]||'Personal',deudaId:'',ultimoPago:todayStr()})
  const set=(k,v)=>setF(p=>({...p,[k]:v}))
  function save() {
    if(!f.descripcion.trim()||!f.monto||Number(f.monto)<=0) return
    onSave({id:uid(),...f,monto:Number(f.monto),activo:true})
  }
  return (
    <FormCard title="Nuevo pago periódico" onCancel={onCancel} accentColor="#0F6E56">
      <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
        <Field label="Descripción"><input type="text" value={f.descripcion} onChange={e=>set('descripcion',e.target.value)} placeholder="Ej: Cuota crédito hipotecario, tarjeta Falabella…"/></Field>
        <Field label="Monto (COP)" half><input type="number" value={f.monto} onChange={e=>set('monto',e.target.value)} placeholder="0" min="0"/></Field>
        <Field label="Frecuencia" half><select value={f.frecuencia} onChange={e=>set('frecuencia',e.target.value)}>{FRECUENCIAS.map(fr=><option key={fr.value} value={fr.value}>{fr.label}</option>)}</select></Field>
        <Field label="Responsable" third><select value={f.persona} onChange={e=>set('persona',e.target.value)}>{PERSONAS.map(p=><option key={p}>{p}</option>)}</select></Field>
        <Field label="Categoría" third><select value={f.categoria} onChange={e=>set('categoria',e.target.value)}>{catGas.map(c=><option key={c}>{c}</option>)}</select></Field>
        <Field label="Ámbito" third><select value={f.contexto} onChange={e=>set('contexto',e.target.value)}>{contextos.map(c=><option key={c}>{c}</option>)}</select></Field>
        <Field label="Último pago / primer vencimiento" half><input type="date" value={f.ultimoPago} onChange={e=>set('ultimoPago',e.target.value)}/></Field>
        <Field label="Vincular a deuda (opcional)" half>
          <select value={f.deudaId} onChange={e=>set('deudaId',e.target.value)}>
            <option value="">— Ninguna —</option>
            {deudas.filter(d=>d.montoTotal-d.montoPagado>0).map(d=><option key={d.id} value={d.id}>{d.acreedor}</option>)}
          </select>
        </Field>
      </div>
      <div style={{background:'#E1F5EE',borderRadius:8,padding:'10px 12px',marginBottom:12,fontSize:12,color:'#0F6E56'}}>
        <i className="ti ti-info-circle" style={{marginRight:5}} aria-hidden/>
        Al registrar cada pago se crea un gasto automáticamente{f.deudaId?' y se abona a la deuda vinculada.':'.'}
      </div>
      <button onClick={save} style={{width:'100%',padding:'10px',border:'none',background:'#0F6E56',color:'white',borderRadius:8,cursor:'pointer',fontWeight:500,fontFamily:'inherit',fontSize:13}}>Guardar pago periódico</button>
    </FormCard>
  )
}

function AbonoInput({onAbonar}) {
  const [open,setOpen] = useState(false); const [val,setVal] = useState('')
  if(!open) return <button onClick={()=>setOpen(true)} style={{fontSize:12,padding:'4px 12px',borderRadius:6,border:'0.5px solid var(--color-border-secondary)',background:'none',cursor:'pointer',color:'#1D9E75',fontWeight:500,fontFamily:'inherit'}}>+ Registrar abono</button>
  return (
    <div style={{display:'flex',gap:6,alignItems:'center'}}>
      <input autoFocus type="number" value={val} onChange={e=>setVal(e.target.value)} placeholder="Monto abono" style={{width:130,fontSize:12}} min="0"/>
      <button onClick={()=>{if(val&&Number(val)>0){onAbonar(Number(val));setOpen(false);setVal('')}}} style={{padding:'6px 10px',borderRadius:6,border:'none',background:'#1D9E75',color:'white',cursor:'pointer',fontSize:13,fontFamily:'inherit'}}>✓</button>
      <button onClick={()=>{setOpen(false);setVal('')}} style={{padding:'6px 8px',borderRadius:6,border:'0.5px solid var(--color-border-secondary)',background:'none',cursor:'pointer',fontSize:13,fontFamily:'inherit',color:'var(--color-text-secondary)'}}>✕</button>
    </div>
  )
}

function TransRow({t, onDelete, contextos}) {
  return (
    <div style={{background:'var(--color-background-primary)',borderRadius:'var(--border-radius-md)',border:'0.5px solid var(--color-border-tertiary)',padding:'0.875rem',marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <div style={{display:'flex',gap:10,alignItems:'center',flex:1,minWidth:0}}>
        <div style={{width:36,height:36,borderRadius:8,background:t.tipo==='ingreso'?'#E1F5EE':'#FCEBEB',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <i className={`ti ${t.tipo==='ingreso'?'ti-arrow-down-left':'ti-arrow-up-right'}`} style={{fontSize:16,color:t.tipo==='ingreso'?'#1D9E75':'#E24B4A'}} aria-hidden/>
        </div>
        <div style={{minWidth:0}}>
          <p style={{margin:0,fontSize:13,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.descripcion||t.categoria}</p>
          <div style={{display:'flex',gap:5,alignItems:'center',marginTop:3,flexWrap:'wrap'}}>
            <span style={{fontSize:11,color:'var(--color-text-tertiary)'}}>{t.fecha} · {t.categoria}</span>
            <Badge persona={t.persona}/>
            <CtxBadge ctx={t.contexto} contextos={contextos}/>
          </div>
        </div>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
        <span style={{fontSize:14,fontWeight:500,color:t.tipo==='ingreso'?'#1D9E75':'#E24B4A',whiteSpace:'nowrap'}}>
          {t.tipo==='ingreso'?'+ ':'- '}{fmt(t.monto)}
        </span>
        <button onClick={()=>onDelete(t.id)} style={{border:'none',background:'none',cursor:'pointer',color:'var(--color-text-tertiary)',padding:2,borderRadius:4}} aria-label="Eliminar">
          <i className="ti ti-trash" style={{fontSize:15}} aria-hidden/>
        </button>
      </div>
    </div>
  )
}

function ResumenDia({trans, contextos}) {
  const hoy = todayStr()
  const transHoy = trans.filter(t=>t.fecha===hoy)
  const gastosHoy = transHoy.filter(t=>t.tipo==='gasto')
  const ingresosHoy = transHoy.filter(t=>t.tipo==='ingreso')
  const totalGastos = gastosHoy.reduce((s,t)=>s+t.monto,0)
  const totalIngresos = ingresosHoy.reduce((s,t)=>s+t.monto,0)
  const porCat = {}; gastosHoy.forEach(t=>{porCat[t.categoria]=(porCat[t.categoria]||0)+t.monto})
  const catItems = Object.entries(porCat).sort((a,b)=>b[1]-a[1])
  const porCtx = {}; gastosHoy.forEach(t=>{const c=t.contexto||'Personal';porCtx[c]=(porCtx[c]||0)+t.monto})
  const ctxItems = Object.entries(porCtx).sort((a,b)=>b[1]-a[1])
  const fechaHoy = new Date().toLocaleDateString('es-CO',{weekday:'long',day:'numeric',month:'long'})
  return (
    <div style={{background:'var(--color-background-primary)',borderRadius:'var(--border-radius-lg)',border:'0.5px solid var(--color-border-tertiary)',overflow:'hidden',marginBottom:'1rem'}}>
      <div style={{background:'#1D9E75',padding:'0.875rem 1.25rem',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div>
          <p style={{margin:0,fontSize:11,color:'rgba(255,255,255,0.75)',textTransform:'capitalize'}}>{fechaHoy}</p>
          <p style={{margin:0,fontSize:13,fontWeight:500,color:'white'}}>Resumen del día</p>
        </div>
        <div style={{textAlign:'right'}}>
          <p style={{margin:0,fontSize:11,color:'rgba(255,255,255,0.75)'}}>Total gastado</p>
          <p style={{margin:0,fontSize:20,fontWeight:500,color:'white'}}>{fmt(totalGastos)}</p>
        </div>
      </div>
      {transHoy.length===0 ? (
        <div style={{padding:'1.5rem',textAlign:'center',color:'var(--color-text-tertiary)',fontSize:13}}>Sin movimientos registrados hoy</div>
      ) : (
        <div style={{padding:'1rem 1.25rem'}}>
          <div style={{display:'flex',gap:10,marginBottom:'1rem'}}>
            {totalIngresos>0&&<div style={{flex:1,background:'#E1F5EE',borderRadius:8,padding:'8px 12px'}}>
              <p style={{margin:0,fontSize:11,color:'#0F6E56'}}>Ingresos hoy</p>
              <p style={{margin:0,fontSize:14,fontWeight:500,color:'#1D9E75'}}>+ {fmt(totalIngresos)}</p>
            </div>}
            <div style={{flex:1,background:'#FCEBEB',borderRadius:8,padding:'8px 12px'}}>
              <p style={{margin:0,fontSize:11,color:'#A32D2D'}}>Gastos hoy</p>
              <p style={{margin:0,fontSize:14,fontWeight:500,color:'#E24B4A'}}>- {fmt(totalGastos)}</p>
            </div>
            <div style={{flex:1,background:'var(--color-background-secondary)',borderRadius:8,padding:'8px 12px'}}>
              <p style={{margin:0,fontSize:11,color:'var(--color-text-tertiary)'}}>Movimientos</p>
              <p style={{margin:0,fontSize:14,fontWeight:500}}>{transHoy.length}</p>
            </div>
          </div>
          {catItems.length>0&&<>
            <p style={{margin:'0 0 8px',fontSize:12,fontWeight:500,color:'var(--color-text-secondary)'}}>Por categoría</p>
            {catItems.map(([cat,monto],idx)=>(
              <div key={cat} style={{display:'flex',alignItems:'center',gap:8,marginBottom:7}}>
                <div style={{width:8,height:8,borderRadius:2,background:getCatColor(cat,idx),flexShrink:0}}/>
                <span style={{fontSize:12,color:'var(--color-text-secondary)',flex:1}}>{cat}</span>
                <div style={{flex:2}}><ProgressBar pct={totalGastos>0?(monto/totalGastos)*100:0} color={getCatColor(cat,idx)}/></div>
                <span style={{fontSize:12,fontWeight:500,width:90,textAlign:'right',flexShrink:0}}>{fmt(monto)}</span>
              </div>
            ))}
          </>}
          {ctxItems.length>1&&<>
            <p style={{margin:'12px 0 8px',fontSize:12,fontWeight:500,color:'var(--color-text-secondary)'}}>Por ámbito</p>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {ctxItems.map(([ctx,monto])=>{
                const s=getCtxStyle(ctx,contextos)
                return <div key={ctx} style={{...s,borderRadius:6,padding:'5px 10px',fontSize:12}}><span style={{fontWeight:500}}>{ctx}</span><span style={{marginLeft:6,opacity:0.8}}>{fmt(monto)}</span></div>
              })}
            </div>
          </>}
          <p style={{margin:'12px 0 8px',fontSize:12,fontWeight:500,color:'var(--color-text-secondary)'}}>Detalle</p>
          {transHoy.map(t=>(
            <div key={t.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:'0.5px solid var(--color-border-tertiary)'}}>
              <div style={{display:'flex',gap:6,alignItems:'center',minWidth:0}}>
                <i className={`ti ${t.tipo==='ingreso'?'ti-arrow-down-left':'ti-arrow-up-right'}`} style={{fontSize:13,color:t.tipo==='ingreso'?'#1D9E75':'#E24B4A',flexShrink:0}} aria-hidden/>
                <span style={{fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.descripcion||t.categoria}</span>
                <CtxBadge ctx={t.contexto} contextos={contextos}/>
              </div>
              <span style={{fontSize:12,fontWeight:500,color:t.tipo==='ingreso'?'#1D9E75':'#E24B4A',flexShrink:0,marginLeft:8}}>
                {t.tipo==='ingreso'?'+ ':'- '}{fmt(t.monto)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function RecurrenteCard({rec, deuda, onPagar, onDelete, contextos}) {
  const nextDate = calcNextDue(rec.ultimoPago,rec.frecuencia)
  const nextStr = dateToStr(nextDate)
  const dias = nextStr?daysUntil(nextStr):null
  const vencido=dias!==null&&dias<0, urgente=dias!==null&&dias>=0&&dias<=5
  const freqLabel = FRECUENCIAS.find(f=>f.value===rec.frecuencia)?.label||rec.frecuencia
  return (
    <div style={{background:'var(--color-background-primary)',borderRadius:'var(--border-radius-lg)',border:`0.5px solid ${vencido?'#F09595':urgente?'#FAC775':'var(--color-border-tertiary)'}`,borderLeft:'3px solid #0F6E56',padding:'1rem',marginBottom:10}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap',marginBottom:4}}>
            <span style={{fontSize:13,fontWeight:500}}>{rec.descripcion}</span>
            <span style={{fontSize:10,padding:'2px 7px',borderRadius:4,background:'#E1F5EE',color:'#0F6E56',fontWeight:500}}>↻ {freqLabel}</span>
            <Badge persona={rec.persona}/>
            <CtxBadge ctx={rec.contexto} contextos={contextos}/>
          </div>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            <span style={{fontSize:15,fontWeight:500,color:'#E24B4A'}}>{fmt(rec.monto)}</span>
            {deuda&&<span style={{fontSize:11,color:'var(--color-text-tertiary)'}}>→ abona a <b style={{fontWeight:500}}>{deuda.acreedor}</b></span>}
          </div>
        </div>
        <button onClick={()=>onDelete(rec.id)} style={{border:'none',background:'none',cursor:'pointer',color:'var(--color-text-tertiary)',padding:2,flexShrink:0}} aria-label="Eliminar">
          <i className="ti ti-trash" style={{fontSize:15}} aria-hidden/>
        </button>
      </div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
        <div style={{fontSize:12}}>
          <span style={{color:'var(--color-text-tertiary)'}}>Próximo: </span>
          <span style={{fontWeight:500,color:vencido?'#E24B4A':urgente?'#BA7517':'var(--color-text-primary)'}}>{nextStr||'—'}</span>
          {dias!==null&&<span style={{marginLeft:6,fontSize:11,color:vencido?'#E24B4A':urgente?'#BA7517':'var(--color-text-tertiary)'}}>
            {vencido?`· Vencido hace ${Math.abs(dias)}d`:dias===0?'· ¡Hoy!':urgente?`· ⚠ En ${dias}d`:`· En ${dias}d`}
          </span>}
        </div>
        <button onClick={()=>onPagar(rec)} style={{display:'flex',alignItems:'center',gap:5,padding:'5px 12px',borderRadius:6,border:'none',background:'#0F6E56',color:'white',cursor:'pointer',fontSize:12,fontWeight:500,fontFamily:'inherit',whiteSpace:'nowrap'}}>
          <i className="ti ti-check" style={{fontSize:13}} aria-hidden/> Registrar pago
        </button>
      </div>
      {rec.ultimoPago&&<div style={{marginTop:8,fontSize:11,color:'var(--color-text-tertiary)'}}>Último pago: {rec.ultimoPago} · {rec.categoria}</div>}
    </div>
  )
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('inicio')
  const [trans, setTrans]           = useState(()=>storageGet('fam-trans')||[])
  const [deudas, setDeudas]         = useState(()=>storageGet('fam-deudas')||[])
  const [pagos, setPagos]           = useState(()=>storageGet('fam-pagos')||[])
  const [recurrentes, setRecurrentes] = useState(()=>storageGet('fam-recurrentes')||[])
  const [catIng, setCatIng]         = useState(()=>storageGet('fam-cat-ing')||DEFAULT_CAT_ING)
  const [catGas, setCatGas]         = useState(()=>storageGet('fam-cat-gas')||DEFAULT_CAT_GAS)
  const [contextos, setContextos]   = useState(()=>storageGet('fam-contextos')||DEFAULT_CONTEXTOS)

  const [showTF,setShowTF] = useState(false)
  const [showDF,setShowDF] = useState(false)
  const [showPF,setShowPF] = useState(false)
  const [showRF,setShowRF] = useState(false)
  const [filtroP,setFiltroP]   = useState('Todos')
  const [filtroCtx,setFiltroCtx] = useState('Todos')
  const [filtroM,setFiltroM]   = useState(thisMes)
  const [pagoMsg,setPagoMsg]   = useState(null)

  const initialized = useRef(false)
  useEffect(()=>{ if(initialized.current){ storageSet('fam-trans',trans) } },[trans])
  useEffect(()=>{ if(initialized.current){ storageSet('fam-deudas',deudas) } },[deudas])
  useEffect(()=>{ if(initialized.current){ storageSet('fam-pagos',pagos) } },[pagos])
  useEffect(()=>{ if(initialized.current){ storageSet('fam-recurrentes',recurrentes) } },[recurrentes])
  useEffect(()=>{ if(initialized.current){ storageSet('fam-cat-ing',catIng) } },[catIng])
  useEffect(()=>{ if(initialized.current){ storageSet('fam-cat-gas',catGas) } },[catGas])
  useEffect(()=>{ if(initialized.current){ storageSet('fam-contextos',contextos) } },[contextos])
  useEffect(()=>{ initialized.current=true },[])

  const transMes = trans.filter(t=>t.fecha?.startsWith(filtroM))
  let transView = filtroP==='Todos' ? transMes : transMes.filter(t=>t.persona===filtroP)
  if(filtroCtx!=='Todos') transView = transView.filter(t=>(t.contexto||contextos[0]||'Personal')===filtroCtx)

  const ingresos  = transView.filter(t=>t.tipo==='ingreso').reduce((s,t)=>s+t.monto,0)
  const gastos    = transView.filter(t=>t.tipo==='gasto').reduce((s,t)=>s+t.monto,0)
  const balance   = ingresos-gastos
  const totalDeuda = deudas.reduce((s,d)=>s+Math.max(d.montoTotal-d.montoPagado,0),0)

  const gastosPorCat = {}
  transView.filter(t=>t.tipo==='gasto').forEach(t=>{ gastosPorCat[t.categoria]=(gastosPorCat[t.categoria]||0)+t.monto })
  const donutItems = Object.entries(gastosPorCat).sort((a,b)=>b[1]-a[1]).map(([label,value],idx)=>({label,value,color:getCatColor(label,idx)}))

  const recSorted = [...recurrentes].filter(r=>r.activo).sort((a,b)=>{
    const da=calcNextDue(a.ultimoPago,a.frecuencia),db=calcNextDue(b.ultimoPago,b.frecuencia)
    if(!da&&!db)return 0; if(!da)return 1; if(!db)return -1; return da-db
  })

  const addTrans      = t => { setTrans(p=>[t,...p]); setShowTF(false) }
  const delTrans      = id => setTrans(p=>p.filter(t=>t.id!==id))
  const addDeuda      = d => { setDeudas(p=>[d,...p]); setShowDF(false) }
  const delDeuda      = id => setDeudas(p=>p.filter(d=>d.id!==id))
  const abonar        = (id,m) => setDeudas(p=>p.map(d=>d.id===id?{...d,montoPagado:Math.min(d.montoPagado+m,d.montoTotal)}:d))
  const addPago       = p => { setPagos(prev=>[p,...prev]); setShowPF(false) }
  const delPago       = id => setPagos(p=>p.filter(x=>x.id!==id))
  const addRec        = r => { setRecurrentes(p=>[r,...p]); setShowRF(false) }
  const delRec        = id => setRecurrentes(p=>p.filter(r=>r.id!==id))

  function pagarRec(rec) {
    const hoy=todayStr()
    setTrans(p=>[{id:uid(),tipo:'gasto',persona:rec.persona,categoria:rec.categoria,contexto:rec.contexto||contextos[0],monto:rec.monto,descripcion:rec.descripcion,fecha:hoy},...p])
    setRecurrentes(p=>p.map(r=>r.id===rec.id?{...r,ultimoPago:hoy}:r))
    if(rec.deudaId) abonar(rec.deudaId,rec.monto)
    setPagoMsg(`✓ Pago de ${fmt(rec.monto)} registrado${rec.deudaId?' y abonado a la deuda':''}`)
    setTimeout(()=>setPagoMsg(null),3500)
  }

  const proxPagos = [...pagos].sort((a,b)=>a.fecha>b.fecha?1:-1)

  const TABS = [
    {id:'inicio',      icon:'ti-layout-dashboard', label:'Inicio'},
    {id:'movimientos', icon:'ti-arrows-exchange',   label:'Movimientos'},
    {id:'deudas',      icon:'ti-credit-card',       label:'Deudas'},
    {id:'pagos',       icon:'ti-calendar-event',    label:'Pagos'},
    {id:'ajustes',     icon:'ti-adjustments-horizontal', label:'Categorías'},
  ]

  return (
    <div style={{minHeight:'100vh',background:'var(--color-background-tertiary)',fontFamily:'var(--font-sans)'}}>

      {pagoMsg&&(
        <div style={{position:'fixed',bottom:24,left:'50%',transform:'translateX(-50%)',background:'#0F6E56',color:'white',padding:'10px 20px',borderRadius:8,fontSize:13,fontWeight:500,zIndex:999,whiteSpace:'nowrap',boxShadow:'0 4px 12px rgba(0,0,0,0.2)'}}>
          {pagoMsg}
        </div>
      )}

      {/* HEADER */}
      <div style={{background:'var(--color-background-primary)',borderBottom:'0.5px solid var(--color-border-tertiary)',padding:'0.875rem 1.25rem',position:'sticky',top:0,zIndex:10}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',maxWidth:720,margin:'0 auto'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:36,height:36,borderRadius:9,background:'#1D9E75',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <i className="ti ti-report-money" style={{fontSize:19,color:'white'}} aria-hidden/>
            </div>
            <div>
              <p style={{margin:0,fontSize:14,fontWeight:500}}>Finanzas Familiares</p>
              <p style={{margin:0,fontSize:11,color:'var(--color-text-tertiary)'}}>Angie & Juan · Cartagena</p>
            </div>
          </div>
          <input type="month" value={filtroM} onChange={e=>setFiltroM(e.target.value)}
            style={{fontSize:12,padding:'5px 8px',borderRadius:6,border:'0.5px solid var(--color-border-secondary)',cursor:'pointer',width:'auto'}}/>
        </div>
      </div>

      {/* TABS */}
      <div style={{background:'var(--color-background-primary)',borderBottom:'0.5px solid var(--color-border-tertiary)',position:'sticky',top:61,zIndex:9}}>
        <div style={{display:'flex',maxWidth:720,margin:'0 auto',padding:'0 0.25rem'}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:'9px 2px',border:'none',background:'none',cursor:'pointer',fontSize:11,fontWeight:tab===t.id?500:400,fontFamily:'inherit',color:tab===t.id?'#1D9E75':'var(--color-text-secondary)',borderBottom:`2px solid ${tab===t.id?'#1D9E75':'transparent'}`,display:'flex',flexDirection:'column',alignItems:'center',gap:3,transition:'all 0.15s'}}>
              <i className={`ti ${t.icon}`} style={{fontSize:16}} aria-hidden/>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:'1.25rem',maxWidth:720,margin:'0 auto'}}>

        {/* ══ INICIO ══ */}
        {tab==='inicio'&&<>
          <ResumenDia trans={trans} contextos={contextos}/>
          <div style={{display:'flex',gap:6,marginBottom:'1rem',flexWrap:'wrap'}}>
            {['Todos','Angie','Juan','Compartido'].map(p=><Chip key={p} active={filtroP===p} onClick={()=>setFiltroP(p)}>{p}</Chip>)}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10,marginBottom:'1rem'}}>
            <SumCard label="Balance del mes" val={balance} color={balance>=0?'#1D9E75':'#E24B4A'} icon="ti-wallet" bg={balance>=0?'#E1F5EE':'#FCEBEB'}/>
            <SumCard label="Ingresos" val={ingresos} color="#1D9E75" icon="ti-trending-up" bg="#E1F5EE"/>
            <SumCard label="Gastos" val={gastos} color="#E24B4A" icon="ti-trending-down" bg="#FCEBEB"/>
            <SumCard label="Deudas pendientes" val={totalDeuda} color="#BA7517" icon="ti-credit-card" bg="#FAEEDA"/>
          </div>
          <div style={{background:'var(--color-background-primary)',borderRadius:'var(--border-radius-lg)',border:'0.5px solid var(--color-border-tertiary)',padding:'1.25rem',marginBottom:'1rem'}}>
            <p style={{margin:'0 0 0.875rem',fontSize:13,fontWeight:500,color:'var(--color-text-secondary)'}}>
              <i className="ti ti-chart-pie" style={{marginRight:6}} aria-hidden/>Distribución de gastos · {filtroM}
            </p>
            <DonutChart items={donutItems}/>
          </div>
          {recSorted.length>0&&(
            <div style={{background:'var(--color-background-primary)',borderRadius:'var(--border-radius-lg)',border:'0.5px solid var(--color-border-tertiary)',padding:'1.25rem',marginBottom:'1rem'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.75rem'}}>
                <p style={{margin:0,fontSize:13,fontWeight:500,color:'var(--color-text-secondary)'}}>↻ Pagos periódicos próximos</p>
                <button onClick={()=>setTab('pagos')} style={{fontSize:12,color:'#1D9E75',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>Ver todos →</button>
              </div>
              {recSorted.slice(0,3).map(rec=>{
                const nextStr=dateToStr(calcNextDue(rec.ultimoPago,rec.frecuencia))
                const dias=nextStr?daysUntil(nextStr):null
                const vencido=dias!==null&&dias<0,urgente=dias!==null&&dias>=0&&dias<=5
                return (
                  <div key={rec.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 0',borderBottom:'0.5px solid var(--color-border-tertiary)'}}>
                    <div style={{display:'flex',gap:6,alignItems:'center',minWidth:0}}>
                      <span style={{fontSize:11,color:'#0F6E56',fontWeight:500}}>↻</span>
                      <span style={{fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{rec.descripcion}</span>
                      <CtxBadge ctx={rec.contexto} contextos={contextos}/>
                    </div>
                    <div style={{display:'flex',gap:8,alignItems:'center',flexShrink:0,marginLeft:8}}>
                      <span style={{fontSize:11,color:vencido?'#E24B4A':urgente?'#BA7517':'var(--color-text-tertiary)',whiteSpace:'nowrap'}}>
                        {dias===null?'':vencido?'Vencido':dias===0?'¡Hoy!':`${dias}d`}
                      </span>
                      <span style={{fontSize:13,fontWeight:500,whiteSpace:'nowrap'}}>{fmt(rec.monto)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          <div style={{background:'var(--color-background-primary)',borderRadius:'var(--border-radius-lg)',border:'0.5px solid var(--color-border-tertiary)',padding:'1.25rem'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.75rem'}}>
              <p style={{margin:0,fontSize:13,fontWeight:500,color:'var(--color-text-secondary)'}}><i className="ti ti-receipt" style={{marginRight:6}} aria-hidden/>Últimos movimientos</p>
              <button onClick={()=>setTab('movimientos')} style={{fontSize:12,color:'#1D9E75',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit'}}>Ver todos →</button>
            </div>
            {transMes.slice(0,5).map(t=>(
              <div key={t.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'0.5px solid var(--color-border-tertiary)'}}>
                <div style={{display:'flex',gap:9,alignItems:'center',minWidth:0}}>
                  <div style={{width:32,height:32,borderRadius:7,background:t.tipo==='ingreso'?'#E1F5EE':'#FCEBEB',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <i className={`ti ${t.tipo==='ingreso'?'ti-arrow-down-left':'ti-arrow-up-right'}`} style={{fontSize:14,color:t.tipo==='ingreso'?'#1D9E75':'#E24B4A'}} aria-hidden/>
                  </div>
                  <div style={{minWidth:0}}>
                    <p style={{margin:0,fontSize:13,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.descripcion||t.categoria}</p>
                    <div style={{display:'flex',gap:5,alignItems:'center',marginTop:2}}>
                      <span style={{fontSize:11,color:'var(--color-text-tertiary)'}}>{t.categoria}</span>
                      <Badge persona={t.persona}/><CtxBadge ctx={t.contexto} contextos={contextos}/>
                    </div>
                  </div>
                </div>
                <span style={{fontSize:14,fontWeight:500,color:t.tipo==='ingreso'?'#1D9E75':'#E24B4A',flexShrink:0,marginLeft:8}}>
                  {t.tipo==='ingreso'?'+ ':'- '}{fmt(t.monto)}
                </span>
              </div>
            ))}
            {transMes.length===0&&<p style={{textAlign:'center',color:'var(--color-text-tertiary)',fontSize:13,padding:'1rem 0'}}>Sin movimientos este mes</p>}
          </div>
        </>}

        {/* ══ MOVIMIENTOS ══ */}
        {tab==='movimientos'&&<>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.75rem',flexWrap:'wrap',gap:8}}>
            <p style={{margin:0,fontSize:13,fontWeight:500}}>Movimientos · {filtroM}</p>
            <Btn color="#1D9E75" label="Agregar" icon="ti-plus" onClick={()=>setShowTF(v=>!v)}/>
          </div>
          <div style={{display:'flex',gap:6,marginBottom:'1rem',flexWrap:'wrap'}}>
            {['Todos','Angie','Juan','Compartido'].map(p=><Chip key={p} active={filtroP===p} onClick={()=>setFiltroP(p)}>{p}</Chip>)}
          </div>
          {showTF&&<TransForm onSave={addTrans} onCancel={()=>setShowTF(false)} catIng={catIng} catGas={catGas} contextos={contextos}/>}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:8,marginBottom:'1rem'}}>
            {[{label:'Ingresos',val:ingresos,color:'#1D9E75',bg:'#E1F5EE'},{label:'Gastos',val:gastos,color:'#E24B4A',bg:'#FCEBEB'},{label:'Balance',val:balance,color:balance>=0?'#1D9E75':'#E24B4A',bg:balance>=0?'#E1F5EE':'#FCEBEB'}].map(({label,val,color,bg})=>(
              <div key={label} style={{background:bg,borderRadius:'var(--border-radius-md)',padding:'8px 12px'}}>
                <p style={{margin:0,fontSize:11,color,opacity:0.7}}>{label}</p>
                <p style={{margin:0,fontSize:14,fontWeight:500,color}}>{fmt(val)}</p>
              </div>
            ))}
          </div>
          {transView.length===0&&!showTF&&<EmptyState icon="ti-receipt-off" text="Sin movimientos para este período"/>}
          {transView.map(t=><TransRow key={t.id} t={t} onDelete={delTrans} contextos={contextos}/>)}
        </>}

        {/* ══ DEUDAS ══ */}
        {tab==='deudas'&&<>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
            <div>
              <p style={{margin:0,fontSize:12,color:'var(--color-text-tertiary)'}}>Total pendiente</p>
              <p style={{margin:0,fontSize:22,fontWeight:500,color:'#BA7517'}}>{fmt(totalDeuda)}</p>
            </div>
            <Btn color="#BA7517" label="Agregar deuda" icon="ti-plus" onClick={()=>setShowDF(v=>!v)}/>
          </div>
          {showDF&&<DeudaForm onSave={addDeuda} onCancel={()=>setShowDF(false)}/>}
          {deudas.length===0&&!showDF&&<EmptyState icon="ti-credit-card-off" text="Sin deudas registradas"/>}
          {deudas.map(d=>{
            const pend=Math.max(d.montoTotal-d.montoPagado,0),pct=d.montoTotal>0?(d.montoPagado/d.montoTotal)*100:0
            const pagada=pend<=0,dias=d.proximoPago?daysUntil(d.proximoPago):null
            const recV=recurrentes.find(r=>r.deudaId===d.id&&r.activo)
            return (
              <div key={d.id} style={{background:'var(--color-background-primary)',borderRadius:'var(--border-radius-lg)',border:`0.5px solid ${pagada?'var(--color-border-success)':'var(--color-border-tertiary)'}`,padding:'1.25rem',marginBottom:12}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                  <div>
                    <div style={{display:'flex',gap:7,alignItems:'center',flexWrap:'wrap',marginBottom:3}}>
                      <p style={{margin:0,fontSize:14,fontWeight:500}}>{d.acreedor}</p>
                      <Badge persona={d.persona}/>
                      {pagada&&<span style={{fontSize:11,padding:'2px 7px',borderRadius:4,background:'#E1F5EE',color:'#0F6E56',fontWeight:500}}>✓ Pagada</span>}
                      {recV&&<span style={{fontSize:11,padding:'2px 7px',borderRadius:4,background:'#E1F5EE',color:'#0F6E56'}}>↻ {FRECUENCIAS.find(f=>f.value===recV.frecuencia)?.label}</span>}
                    </div>
                    {d.descripcion&&<p style={{margin:0,fontSize:12,color:'var(--color-text-tertiary)'}}>{d.descripcion}</p>}
                  </div>
                  <button onClick={()=>delDeuda(d.id)} style={{border:'none',background:'none',cursor:'pointer',color:'var(--color-text-tertiary)',padding:2,flexShrink:0,borderRadius:4}} aria-label="Eliminar">
                    <i className="ti ti-trash" style={{fontSize:15}} aria-hidden/>
                  </button>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'var(--color-text-secondary)',marginBottom:6}}>
                  <span>Pagado: <b style={{fontWeight:500,color:'#1D9E75'}}>{fmt(d.montoPagado)}</b></span>
                  <span>Total: <b style={{fontWeight:500}}>{fmt(d.montoTotal)}</b></span>
                </div>
                <ProgressBar pct={pct} color={pagada?'#1D9E75':'#BA7517'}/>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:10,flexWrap:'wrap',gap:8}}>
                  <div>
                    <span style={{fontSize:12,color:'var(--color-text-tertiary)'}}>Pendiente: </span>
                    <span style={{fontSize:15,fontWeight:500,color:pagada?'#1D9E75':'#E24B4A'}}>{fmt(pend)}</span>
                    <span style={{fontSize:11,color:'var(--color-text-tertiary)',marginLeft:6}}>{Math.round(pct)}% pagado</span>
                  </div>
                  {!pagada&&<AbonoInput onAbonar={m=>abonar(d.id,m)}/>}
                </div>
                {d.proximoPago&&dias!==null&&(
                  <div style={{marginTop:10,padding:'6px 10px',borderRadius:6,background:dias<0?'#FCEBEB':dias<=5?'#FAEEDA':'var(--color-background-secondary)',display:'flex',alignItems:'center',gap:6}}>
                    <i className="ti ti-calendar" style={{fontSize:13,color:dias<0?'#E24B4A':dias<=5?'#BA7517':'var(--color-text-secondary)'}} aria-hidden/>
                    <span style={{fontSize:12,color:dias<0?'#A32D2D':dias<=5?'#854F0B':'var(--color-text-secondary)'}}>
                      Próximo pago: {d.proximoPago}{dias<0?` · Vencido hace ${Math.abs(dias)}d`:dias===0?' · ¡Hoy!':`· En ${dias}d`}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </>}

        {/* ══ PAGOS ══ */}
        {tab==='pagos'&&<>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.75rem'}}>
            <div>
              <p style={{margin:0,fontSize:13,fontWeight:500}}>Pagos periódicos</p>
              <p style={{margin:0,fontSize:11,color:'var(--color-text-tertiary)'}}>{recSorted.length} activo(s) · {fmt(recSorted.reduce((s,r)=>s+r.monto,0))} por período</p>
            </div>
            <Btn color="#0F6E56" label="+ Periódico" onClick={()=>setShowRF(v=>!v)}/>
          </div>
          {showRF&&<RecurrenteForm onSave={addRec} onCancel={()=>setShowRF(false)} deudas={deudas} catGas={catGas} contextos={contextos}/>}

          {/* Periodic payments grouped by urgency */}
          {(()=>{
            if (recSorted.length===0&&!showRF) return (
              <div style={{background:'var(--color-background-primary)',borderRadius:'var(--border-radius-md)',border:'0.5px dashed var(--color-border-secondary)',padding:'1rem',marginBottom:12,textAlign:'center',color:'var(--color-text-tertiary)',fontSize:13}}>
                ↻ Agregá cuotas de crédito, tarjetas, servicios recurrentes…
              </div>
            )
            const grupos = [
              { key:'vencido', label:'Vencidos',        icon:'ti-alert-circle',    bg:'#FCEBEB', border:'#F09595', color:'#E24B4A', textColor:'#A32D2D', items: recSorted.filter(r=>{ const n=dateToStr(calcNextDue(r.ultimoPago,r.frecuencia)); return n&&daysUntil(n)<0 }) },
              { key:'hoy',     label:'Hoy',              icon:'ti-bell-ringing',    bg:'#FFF3E0', border:'#F5A623', color:'#E67E00', textColor:'#7A4000', items: recSorted.filter(r=>{ const n=dateToStr(calcNextDue(r.ultimoPago,r.frecuencia)); return n&&daysUntil(n)===0 }) },
              { key:'semana',  label:'Esta semana',      icon:'ti-clock-hour-4',    bg:'#FAEEDA', border:'#FAC775', color:'#BA7517', textColor:'#854F0B', items: recSorted.filter(r=>{ const d=daysUntil(dateToStr(calcNextDue(r.ultimoPago,r.frecuencia))||''); return d>=1&&d<=7 }) },
              { key:'mes',     label:'Este mes',         icon:'ti-calendar-month',  bg:'#E6F1FB', border:'#94C4F5', color:'#185FA5', textColor:'#0D3F72', items: recSorted.filter(r=>{ const d=daysUntil(dateToStr(calcNextDue(r.ultimoPago,r.frecuencia))||''); return d>=8&&d<=30 }) },
              { key:'futuro',  label:'Más adelante',     icon:'ti-calendar',        bg:'var(--color-background-secondary)', border:'var(--color-border-tertiary)', color:'var(--color-text-secondary)', textColor:'var(--color-text-secondary)', items: recSorted.filter(r=>{ const d=daysUntil(dateToStr(calcNextDue(r.ultimoPago,r.frecuencia))||''); return d>30 }) },
            ].filter(g=>g.items.length>0)
            return grupos.map(g=>(
              <div key={g.key} style={{marginBottom:16}}>
                <div style={{display:'flex',alignItems:'center',gap:8,padding:'7px 12px',borderRadius:'var(--border-radius-md)',background:g.bg,border:`0.5px solid ${g.border}`,marginBottom:8}}>
                  <i className={`ti ${g.icon}`} style={{fontSize:14,color:g.color,flexShrink:0}} aria-hidden/>
                  <span style={{fontSize:12,fontWeight:600,color:g.textColor}}>{g.label}</span>
                  <span style={{fontSize:11,color:g.textColor,opacity:0.7,marginLeft:'auto'}}>{g.items.length} pago(s) · {fmt(g.items.reduce((s,r)=>s+r.monto,0))}</span>
                </div>
                {g.items.map(rec=><RecurrenteCard key={rec.id} rec={rec} deuda={deudas.find(d=>d.id===rec.deudaId)} onPagar={pagarRec} onDelete={delRec} contextos={contextos}/>)}
              </div>
            ))
          })()}

          <div style={{display:'flex',alignItems:'center',gap:10,margin:'1.25rem 0 1rem'}}>
            <div style={{flex:1,height:'0.5px',background:'var(--color-border-tertiary)'}}/>
            <span style={{fontSize:12,color:'var(--color-text-tertiary)',whiteSpace:'nowrap'}}>Pagos puntuales</span>
            <div style={{flex:1,height:'0.5px',background:'var(--color-border-tertiary)'}}/>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.75rem'}}>
            <p style={{margin:0,fontSize:13,color:'var(--color-text-secondary)'}}>{pagos.length} pago(s) programado(s)</p>
            <Btn color="#534AB7" label="+ Pago" onClick={()=>setShowPF(v=>!v)}/>
          </div>
          {showPF&&<PagoForm onSave={addPago} onCancel={()=>setShowPF(false)}/>}
          {pagos.length===0&&!showPF&&<EmptyState icon="ti-calendar-off" text="Sin pagos puntuales programados"/>}

          {/* Puntuales also grouped */}
          {(()=>{
            if (proxPagos.length===0) return null
            const grupos = [
              { key:'vencido', label:'Vencidos',     icon:'ti-alert-circle',   bg:'#FCEBEB', border:'#F09595', color:'#E24B4A', textColor:'#A32D2D', items: proxPagos.filter(p=>daysUntil(p.fecha)<0) },
              { key:'hoy',     label:'Hoy',           icon:'ti-bell-ringing',   bg:'#FFF3E0', border:'#F5A623', color:'#E67E00', textColor:'#7A4000', items: proxPagos.filter(p=>daysUntil(p.fecha)===0) },
              { key:'semana',  label:'Esta semana',   icon:'ti-clock-hour-4',   bg:'#FAEEDA', border:'#FAC775', color:'#BA7517', textColor:'#854F0B', items: proxPagos.filter(p=>{const d=daysUntil(p.fecha);return d>=1&&d<=7}) },
              { key:'mes',     label:'Este mes',      icon:'ti-calendar-month', bg:'#E6F1FB', border:'#94C4F5', color:'#185FA5', textColor:'#0D3F72', items: proxPagos.filter(p=>{const d=daysUntil(p.fecha);return d>=8&&d<=30}) },
              { key:'futuro',  label:'Más adelante',  icon:'ti-calendar',       bg:'var(--color-background-secondary)', border:'var(--color-border-tertiary)', color:'var(--color-text-secondary)', textColor:'var(--color-text-secondary)', items: proxPagos.filter(p=>daysUntil(p.fecha)>30) },
            ].filter(g=>g.items.length>0)
            return grupos.map(g=>(
              <div key={g.key} style={{marginBottom:16}}>
                <div style={{display:'flex',alignItems:'center',gap:8,padding:'7px 12px',borderRadius:'var(--border-radius-md)',background:g.bg,border:`0.5px solid ${g.border}`,marginBottom:8}}>
                  <i className={`ti ${g.icon}`} style={{fontSize:14,color:g.color,flexShrink:0}} aria-hidden/>
                  <span style={{fontSize:12,fontWeight:600,color:g.textColor}}>{g.label}</span>
                  <span style={{fontSize:11,color:g.textColor,opacity:0.7,marginLeft:'auto'}}>{g.items.length} pago(s) · {fmt(g.items.reduce((s,p)=>s+p.monto,0))}</span>
                </div>
                {g.items.map(p=>{
                  const d=daysUntil(p.fecha),vencido=d<0
                  return (
                    <div key={p.id} style={{background:'var(--color-background-primary)',borderRadius:'var(--border-radius-md)',border:`0.5px solid ${g.border}`,padding:'0.875rem',marginBottom:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div style={{display:'flex',gap:10,alignItems:'center',flex:1,minWidth:0}}>
                        <div style={{width:36,height:36,borderRadius:8,flexShrink:0,background:g.bg,display:'flex',alignItems:'center',justifyContent:'center'}}>
                          <i className="ti ti-calendar" style={{fontSize:16,color:g.color}} aria-hidden/>
                        </div>
                        <div style={{minWidth:0}}>
                          <div style={{display:'flex',gap:6,alignItems:'center',flexWrap:'wrap',marginBottom:2}}>
                            <p style={{margin:0,fontSize:13,fontWeight:500}}>{p.descripcion}</p><Badge persona={p.persona}/>
                          </div>
                          <span style={{fontSize:11,color:g.textColor}}>
                            {p.fecha} · {vencido?`Vencido hace ${Math.abs(d)}d`:d===0?'¡Hoy!':`En ${d}d`}
                          </span>
                        </div>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                        <span style={{fontSize:14,fontWeight:500,color:g.color,whiteSpace:'nowrap'}}>{fmt(p.monto)}</span>
                        <button onClick={()=>delPago(p.id)} style={{border:'none',background:'none',cursor:'pointer',color:'var(--color-text-tertiary)',padding:2,borderRadius:4}} aria-label="Eliminar">
                          <i className="ti ti-trash" style={{fontSize:15}} aria-hidden/>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))
          })()}
        </>}

        {/* ══ AJUSTES ══ */}
        {tab==='ajustes'&&(
          <SettingsTab catIng={catIng} catGas={catGas} contextos={contextos} setCatIng={setCatIng} setCatGas={setCatGas} setContextos={setContextos}/>
        )}

      </div>
    </div>
  )
}

// helper used inline
function CTX_STYLE_MAP(c, contextos, i) {
  if(c==='Todos') return {color:'#1D9E75'}
  const idx = contextos.indexOf(c)
  const color = CTX_COLORS[(idx>=0?idx:i) % CTX_COLORS.length]
  return {color}
}

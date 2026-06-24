import { useState, useEffect } from 'react'
import { supabase } from './supabase'

const TIPOS = ['Individual', 'Doble', 'Matrimonial', 'Triple', 'Matrimonial+1']

// ── Helpers settings (localStorage) ─────────────────────────────────────────
function loadSettings() {
  try {
    return {
      precioDesayuno: parseFloat(localStorage.getItem('hm_desayuno') || '0') || 0,
      preciosHab: JSON.parse(localStorage.getItem('hm_precios') || 'null') ||
        Object.fromEntries(TIPOS.map(t => [t, 0])),
    }
  } catch {
    return { precioDesayuno: 0, preciosHab: Object.fromEntries(TIPOS.map(t => [t, 0])) }
  }
}

// ── Ícono engranaje ──────────────────────────────────────────────────────────
function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33
        1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06
        a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09
        A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9
        4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06
        a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09
        a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

// ── MODAL CONFIGURACIÓN ──────────────────────────────────────────────────────
function SettingsModal({ onClose }) {
  const saved = loadSettings()
  const [precioDesayuno, setPrecioDesayuno] = useState(saved.precioDesayuno)
  const [preciosHab, setPreciosHab] = useState(saved.preciosHab)

  const guardar = () => {
    localStorage.setItem('hm_desayuno', String(precioDesayuno))
    localStorage.setItem('hm_precios', JSON.stringify(preciosHab))
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">Configuración</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Precio por desayuno</p>
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden mb-5">
          <span className="px-3 text-sm text-gray-400 bg-gray-50 border-r border-gray-200 py-2">$</span>
          <input
            type="number"
            className="flex-1 px-3 py-2 text-sm text-gray-900 focus:outline-none"
            value={precioDesayuno || ''}
            placeholder="0"
            onChange={e => setPrecioDesayuno(parseFloat(e.target.value) || 0)}
          />
        </div>

        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Precio base por tipo</p>
        <div className="space-y-2 mb-6">
          {TIPOS.map(tipo => (
            <div key={tipo} className="flex items-center gap-3">
              <span className="text-sm text-gray-600 w-32 shrink-0">{tipo}</span>
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden flex-1">
                <span className="px-2 text-sm text-gray-400 bg-gray-50 border-r border-gray-200 py-1.5">$</span>
                <input
                  type="number"
                  className="flex-1 px-2 py-1.5 text-sm text-gray-900 focus:outline-none"
                  value={preciosHab[tipo] || ''}
                  placeholder="0"
                  onChange={e => setPreciosHab(p => ({ ...p, [tipo]: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition">
            Cancelar
          </button>
          <button onClick={guardar}
            className="flex-1 bg-gray-900 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-gray-800 transition">
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── MODAL HABITACIÓN ─────────────────────────────────────────────────────────
function RoomModal({ hab, onClose, onSave }) {
  const settings = loadSettings()
  const [form, setForm] = useState({
    no_cobrar_desayuno: false,
    no_cobrar_iva: false,
    estado_pago: 'por_cobrar',
    abono: 0,
    ...hab,
    precio_desayuno: hab.precio_desayuno ?? settings.precioDesayuno,
    precio_base: hab.precio_base || settings.preciosHab[hab.tipo] || 0,
  })

  const desayunosBruto = (form.desayunos || 0) * (form.precio_desayuno || 0)
  const desayunosAplicado = form.no_cobrar_desayuno ? 0 : desayunosBruto
  const baseTotal = (form.precio_base || 0) + desayunosAplicado
  const ivaBase = baseTotal * 0.19
  const ivaAplicado = form.no_cobrar_iva ? 0 : ivaBase
  const total = baseTotal + ivaAplicado
  const saldo = Math.round(total) - (form.abono || 0)

  const set = (field, value) => {
    setForm(prev => {
      const u = { ...prev, [field]: value }
      if (field === 'estado' && value === 'libre') {
        u.fecha_inicio = null
        u.fecha_fin = null
      }
      if (field === 'tipo') {
        const p = settings.preciosHab[value]
        if (p && !prev.precio_base) u.precio_base = p
      }
      return u
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-y-auto max-h-[92vh]">

        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Habitación</p>
            <h2 className="text-xl font-semibold text-gray-900">{hab.numero}</h2>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-xl transition">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* Tipo y Estado */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 text-xs font-medium text-gray-400 uppercase tracking-wider">Tipo</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:border-gray-400"
                value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                {TIPOS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-1 text-xs font-medium text-gray-400 uppercase tracking-wider">Estado</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:border-gray-400"
                value={form.estado} onChange={e => set('estado', e.target.value)}>
                <option value="libre">Libre</option>
                <option value="reservado">Reservado</option>
                <option value="ocupado">Ocupado</option>
              </select>
            </div>
          </div>

          {/* Fechas */}
          {form.estado !== 'libre' && (
            <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-xl p-3">
              <div>
                <label className="block mb-1 text-xs font-medium text-gray-400">Entrada</label>
                <input type="date" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 bg-white focus:outline-none"
                  value={form.fecha_inicio || ''} onChange={e => set('fecha_inicio', e.target.value)} />
              </div>
              <div>
                <label className="block mb-1 text-xs font-medium text-gray-400">Salida</label>
                <input type="date" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-900 bg-white focus:outline-none"
                  value={form.fecha_fin || ''} onChange={e => set('fecha_fin', e.target.value)} />
              </div>
            </div>
          )}

          {/* Precio base */}
          <div>
            <label className="block mb-1 text-xs font-medium text-gray-400 uppercase tracking-wider">Precio base</label>
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
              <span className="px-3 text-sm text-gray-400 bg-gray-50 border-r border-gray-200 py-2">$</span>
              <input type="number" className="flex-1 px-3 py-2 text-sm text-gray-900 focus:outline-none"
                value={form.precio_base || ''} placeholder="0"
                onChange={e => set('precio_base', parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          {/* Desayunos */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 text-xs font-medium text-gray-400 uppercase tracking-wider">Desayunos</label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none"
                value={form.desayunos || 0} onChange={e => set('desayunos', parseInt(e.target.value))}>
                <option value={0}>Ninguno</option>
                {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            {(form.desayunos || 0) > 0 && (
              <div>
                <label className="block mb-1 text-xs font-medium text-gray-400 uppercase tracking-wider">Precio c/u</label>
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  <span className="px-3 text-sm text-gray-400 bg-gray-50 border-r border-gray-200 py-2">$</span>
                  <input type="number" className="flex-1 px-3 py-2 text-sm text-gray-900 focus:outline-none"
                    value={form.precio_desayuno || ''} placeholder="0"
                    onChange={e => set('precio_desayuno', parseFloat(e.target.value) || 0)} />
                </div>
              </div>
            )}
          </div>

          {/* Checkboxes exenciones */}
          <div className="flex gap-5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={!!form.no_cobrar_desayuno}
                onChange={e => set('no_cobrar_desayuno', e.target.checked)}
                className="w-4 h-4 accent-gray-800" />
              <span className="text-sm text-gray-600">No cobrar desayuno</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={!!form.no_cobrar_iva}
                onChange={e => set('no_cobrar_iva', e.target.checked)}
                className="w-4 h-4 accent-gray-800" />
              <span className="text-sm text-gray-600">No cobrar IVA</span>
            </label>
          </div>

          {/* Estado de pago */}
          <div>
            <label className="block mb-1.5 text-xs font-medium text-gray-400 uppercase tracking-wider">Estado del pago</label>
            <div className="flex gap-2">
              <button onClick={() => set('estado_pago', 'pagada')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${form.estado_pago === 'pagada'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'border-gray-200 text-gray-400 hover:bg-gray-50'}`}>
                Reserva pagada
              </button>
              <button onClick={() => set('estado_pago', 'por_cobrar')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${form.estado_pago === 'por_cobrar'
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'border-gray-200 text-gray-400 hover:bg-gray-50'}`}>
                Por cobrar
              </button>
            </div>
          </div>

          {/* Abono */}
          <div>
            <label className="block mb-1 text-xs font-medium text-gray-400 uppercase tracking-wider">Abono</label>
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
              <span className="px-3 text-sm text-gray-400 bg-gray-50 border-r border-gray-200 py-2">$</span>
              <input type="number" className="flex-1 px-3 py-2 text-sm text-gray-900 focus:outline-none"
                value={form.abono || ''} placeholder="0"
                onChange={e => set('abono', parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          {/* Desglose */}
          <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2.5">
            <div className="flex justify-between text-gray-500">
              <span>Habitación</span>
              <span>${(form.precio_base || 0).toLocaleString('es-CL')}</span>
            </div>
            {(form.desayunos || 0) > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Desayunos ×{form.desayunos}{form.no_cobrar_desayuno ? ' — exento' : ''}</span>
                <span className={form.no_cobrar_desayuno ? 'line-through text-gray-300' : ''}>
                  ${desayunosBruto.toLocaleString('es-CL')}
                </span>
              </div>
            )}
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>${baseTotal.toLocaleString('es-CL')}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>IVA 19%{form.no_cobrar_iva ? ' — exento' : ''}</span>
              <span className={form.no_cobrar_iva ? 'line-through text-gray-300' : ''}>
                ${Math.round(ivaBase).toLocaleString('es-CL')}
              </span>
            </div>
            {(form.abono || 0) > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Abono</span>
                <span>−${(form.abono || 0).toLocaleString('es-CL')}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-2.5">
              <span>Total</span>
              <span>${Math.round(total).toLocaleString('es-CL')}</span>
            </div>
            {(form.abono || 0) > 0 && saldo > 0 && (
              <div className="flex justify-between font-medium text-amber-600">
                <span>Saldo pendiente</span>
                <span>${saldo.toLocaleString('es-CL')}</span>
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="flex gap-2 pb-1">
            <button onClick={onClose}
              className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button onClick={() => onSave(form)}
              className="flex-1 bg-gray-900 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-gray-800 transition">
              Guardar
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}

// ── PANEL SIGUIENTE ──────────────────────────────────────────────────────────
function SiguientePanel({ habitaciones, onSelectHab }) {
  const hoy = new Date().toISOString().split('T')[0]

  const reservas = habitaciones
    .filter(h => h.estado === 'reservado')
    .sort((a, b) => (a.fecha_inicio || '').localeCompare(b.fecha_inicio || ''))

  const checkouts = habitaciones
    .filter(h => h.estado === 'ocupado' && h.fecha_fin && h.fecha_fin <= hoy)
    .sort((a, b) => (a.fecha_fin || '').localeCompare(b.fecha_fin || ''))

  const totalDesayunos = habitaciones
    .filter(h => h.estado === 'ocupado')
    .reduce((sum, h) => sum + (h.desayunos || 0), 0)

  return (
    <div className="space-y-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Próximas acciones</p>

      {reservas.length === 0 && checkouts.length === 0 && (
        <p className="text-sm text-gray-300 italic">Sin pendientes.</p>
      )}

      {reservas.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-2">Recibir reserva</p>
          <div className="space-y-1.5">
            {reservas.map(h => (
              <button key={h.id} onClick={() => onSelectHab(h)}
                className="w-full text-left bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 hover:bg-amber-100 transition">
                <p className="text-sm font-medium text-gray-800">Hab. {h.numero} — {h.tipo}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {h.fecha_inicio ? `Entrada: ${h.fecha_inicio}` : 'Sin fecha asignada'}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {checkouts.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Checkout y cobrar</p>
          <div className="space-y-1.5">
            {checkouts.map(h => (
              <button key={h.id} onClick={() => onSelectHab(h)}
                className="w-full text-left bg-red-50 border border-red-100 rounded-xl px-3 py-2.5 hover:bg-red-100 transition">
                <p className="text-sm font-medium text-gray-800">Hab. {h.numero} — {h.tipo}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Salida: {h.fecha_fin} · {h.estado_pago === 'pagada' ? 'Pagada' : 'Por cobrar'}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Desayunos totales hoy</p>
        <p className="text-3xl font-semibold text-gray-800">{totalDesayunos}</p>
        <p className="text-xs text-gray-400 mt-0.5">en habitaciones ocupadas</p>
      </div>
    </div>
  )
}

// ── TARJETA HABITACIÓN ───────────────────────────────────────────────────────
function RoomCard({ hab, onClick }) {
  const dot = { libre: 'bg-emerald-400', reservado: 'bg-amber-400', ocupado: 'bg-red-400' }
  const ring = { libre: 'border-gray-100', reservado: 'border-amber-100', ocupado: 'border-red-100' }

  return (
    <div onClick={onClick}
      className={`bg-white border ${ring[hab.estado]} rounded-xl p-3 flex flex-col cursor-pointer hover:shadow-sm hover:border-gray-200 transition select-none`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-semibold text-gray-800">{hab.numero}</span>
        <span className={`w-2 h-2 rounded-full shrink-0 ${dot[hab.estado]}`} />
      </div>
      <span className="text-xs text-gray-400 leading-snug">{hab.tipo}</span>
      {hab.estado !== 'libre' && hab.fecha_inicio && (
        <span className="text-xs text-gray-400 mt-1">{hab.fecha_inicio}</span>
      )}
      {(hab.precio_base || 0) > 0 && (
        <span className="text-xs text-gray-500 mt-auto pt-2">
          ${hab.precio_base.toLocaleString('es-CL')}
        </span>
      )}
      {(hab.desayunos || 0) > 0 && (
        <span className="text-xs text-gray-400">{hab.desayunos} des.</span>
      )}
      {hab.estado_pago === 'por_cobrar' && hab.estado !== 'libre' && (
        <span className="text-xs text-amber-500 font-medium mt-0.5">Por cobrar</span>
      )}
    </div>
  )
}

// ── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [habitaciones, setHabitaciones] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [showSiguiente, setShowSiguiente] = useState(false)

  useEffect(() => {
    fetchHabitaciones()
    const channel = supabase
      .channel('habitaciones-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habitaciones' }, payload => {
        setHabitaciones(prev => prev.map(h => h.id === payload.new.id ? payload.new : h))
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  async function fetchHabitaciones() {
    const { data } = await supabase.from('habitaciones').select('*').order('numero')
    setHabitaciones(data || [])
    setLoading(false)
  }

  async function handleSave(form) {
    await supabase.from('habitaciones').update(form).eq('id', form.id)
    setSelected(null)
    fetchHabitaciones()
  }

  const pendingCount = habitaciones.filter(h => {
    const hoy = new Date().toISOString().split('T')[0]
    return h.estado === 'reservado' || (h.estado === 'ocupado' && h.fecha_fin && h.fecha_fin <= hoy)
  }).length

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="text-sm text-gray-400 tracking-wide">Cargando habitaciones...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between sticky top-0 z-30">
        <h1 className="text-sm font-semibold text-gray-700 tracking-wide">Hotel Manager</h1>
        <button onClick={() => setShowSettings(true)}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
          title="Configuración">
          <GearIcon />
        </button>
      </header>

      {/* ── Layout ── */}
      <div className="flex">

        {/* ── Grid principal ── */}
        <main className="flex-1 p-4 lg:p-6 pb-28 lg:pb-6">
          <div className="flex items-center gap-5 mb-4">
            {[['bg-emerald-400', 'Libre'], ['bg-amber-400', 'Reservado'], ['bg-red-400', 'Ocupado']].map(([c, l]) => (
              <div key={l} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${c}`} />
                <span className="text-xs text-gray-400">{l}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-5 gap-2 max-w-lg">
            {habitaciones.map(hab => (
              <RoomCard key={hab.id} hab={hab} onClick={() => setSelected(hab)} />
            ))}
          </div>
        </main>

        {/* ── Sidebar desktop ── */}
        <aside className="hidden lg:block w-64 shrink-0 border-l border-gray-100 bg-white p-5 min-h-[calc(100vh-53px)]">
          <SiguientePanel
            habitaciones={habitaciones}
            onSelectHab={h => setSelected(h)}
          />
        </aside>
      </div>

      {/* ── Tab inferior móvil ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-30 shadow-lg">
        <button onClick={() => setShowSiguiente(!showSiguiente)}
          className="w-full flex items-center justify-between px-5 py-3.5">
          <span className="text-sm font-semibold text-gray-700">Siguiente</span>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <span className="bg-amber-400 text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                {pendingCount}
              </span>
            )}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={`text-gray-400 transition-transform duration-200 ${showSiguiente ? 'rotate-180' : ''}`}>
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </div>
        </button>

        {showSiguiente && (
          <div className="px-5 pb-5 pt-3 max-h-72 overflow-y-auto border-t border-gray-100">
            <SiguientePanel
              habitaciones={habitaciones}
              onSelectHab={h => { setSelected(h); setShowSiguiente(false) }}
            />
          </div>
        )}
      </div>

      {/* ── Modales ── */}
      {selected && (
        <RoomModal hab={selected} onClose={() => setSelected(null)} onSave={handleSave} />
      )}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
  )
}
